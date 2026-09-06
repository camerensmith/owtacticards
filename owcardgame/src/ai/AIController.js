/**
 * AI Controller for Player 2
 * Handles all AI decision making, game state analysis, and automated gameplay
 */

import { dealDamage } from '../abilities/engine/damageBus';
import effectsBus, { Effects } from '../abilities/engine/effectsBus';
import { selectCardTarget, selectRowTarget } from '../abilities/engine/targeting';
import { isRedeployLocked } from '../game/rules';
import { showMessage as showToast, clearMessage as clearToast } from '../abilities/engine/targetingBus';
import { determineWinCondition, determineCardPlayCount, shouldHoldCard, WIN_CONDITIONS } from './strategicAnalysis';
import { shouldSkipAiControllerTurn } from './aiTurnGate';
import { determineBestRow } from './positioningIntelligence';
import { selectBestAction } from './tacticalPlanner';
import { evaluateBoard } from './boardEvaluator';
import BrowserGameAdapter from './adapters/BrowserGameAdapter'
import { pickAllyHealTarget, pickEnemyRemovalTarget, pickRowTarget, inferIntentFromAbilityKey, resolveRowTargetForEffect, inferRowEffectIntent } from './targetingEvaluator'
import { SeededRNG } from './utils/rng'
import { defaultAiProfile, noisyScore, pickFromRanked, rollAiProfile } from './aiProfile'

// AI Personality Types
export const AI_PERSONALITY = {
    BALANCED: 'balanced',
    AGGRESSIVE: 'aggressive',
    CALCULATED: 'calculated'
};

const ROW_CAP = 4

class Logger {
    constructor(level = 'info') { this.level = level }
    debug(...args) { if (['debug'].includes(this.level)) console.log(...args) }
    info(...args) { if (['debug','info'].includes(this.level)) console.log(...args) }
    warn(...args) { console.warn(...args) }
    error(...args) { console.error(...args) }
}

class AIController {
    constructor(personality = AI_PERSONALITY.BALANCED, adapter = null) {
        this.personality = personality;
        /*
         * One opponent, re-rolled every turn.
         *
         * There were three fixed tiers; this spans the whole range they covered
         * instead of sitting at one point in it, so the same opponent plays
         * sharply one turn and loosely the next. See ai/aiProfile.js.
         */
        this.profile = defaultAiProfile();
        this.isActive = false;
        this.gameState = null;
        this.decisionHistory = [];
        this.currentWinCondition = null;
        this.turnNumber = 0;
        this.adapter = adapter || new BrowserGameAdapter(null);
        this._turnCache = null;
        this.rng = new SeededRNG(Date.now() & 0xffffffff);
        this.log = new Logger('info');
        this._aiTurnsTaken = 0;
        this.decisionDelay = this.getDecisionDelay();
    }

    /** Thinking time for this turn, straight off the rolled profile. */
    getDecisionDelay() {
        const delay = this.profile?.decisionDelayMs || 5000;
        console.log(`AI decision delay: ${delay}ms`);
        return delay;
    }

    /**
     * Rolls how sharply the opponent plays this turn.
     *
     * Called once at the top of each AI turn, so every knob — thinking time,
     * how many ultimates it will spend, how much noise goes into its scoring —
     * moves together rather than being fixed for the match.
     */
    rollProfile() {
        this.profile = rollAiProfile(() => this.rng.next());
        this.decisionDelay = this.getDecisionDelay();
        console.log('AI profile for this turn:', this.profile);
        return this.profile;
    }

    // Initialize AI for a new game
    initialize(gameState) {
        this.gameState = gameState;
        if (this.adapter && typeof this.adapter === 'object') {
            this.adapter.gameState = gameState;
        }
        this.isActive = true;
        this.decisionHistory = [];
        this._aiTurnsTaken = 0;
        console.log(`AI Controller initialized: ${this.personality} personality`);
    }

    // Main AI turn handler. countAsTurn=false for nested re-plans in the same seat turn.
    async handleAITurn({ countAsTurn = true } = {}) {
        if (!this.isActive || !this.gameState) return;

        const maxTotalTurns = this.gameState?.maxTurns || 18;
        const currentTurn = this.gameState?.currentTurn || null; // expected 1-based
        if (shouldSkipAiControllerTurn({ currentTurn, maxTurns: maxTotalTurns })) {
            console.log(`Max turns reached (${maxTotalTurns}). Skipping AI turn.`);
            return;
        }

        console.log('AI Controller: Starting turn analysis...');

        // How sharply it plays this turn.
        this.rollProfile();

        // Initialize per-turn cache
        this._turnCache = { boards: {}, cardRow: new Map() };
        
        // First analysis
        let analysis = this.analyzeGameState();
        console.log('AI Game State Analysis:', analysis);

        // Determine win condition and intended number of plays
        const aiBoard = analysis.player2Board;
        const enemyBoard = analysis.player1Board;
        const winConditionResult = determineWinCondition(this.gameState, aiBoard, enemyBoard, analysis.player2Hand);
        this.currentWinCondition = winConditionResult.condition;
        const intendedPlays = Math.max(0, Math.min(6, determineCardPlayCount(analysis.player2Hand, aiBoard, this.currentWinCondition)));
        console.log(`AI intends to play up to ${intendedPlays} card(s) this turn under ${this.currentWinCondition}`);

        // Execute actions dynamically, re-evaluating play count after each action
        let playsDone = 0;
        let maxPlays = intendedPlays;
        
        while (playsDone < maxPlays) {
            // Make decision based on current analysis
            const decision = this.makeDecision(analysis);
            console.log('AI Decision:', decision);

            // If no play is recommended, stop early
            if (!decision || (decision.type !== 'play_card' && decision.type !== 'use_ability' && decision.type !== 'use_ultimate')) {
                console.log('No actionable decision; ending action loop.');
                break;
            }

            // Execute decision with delay between actions
            await this.executeDecision(decision);
            playsDone++;

            // Invalidate and rebuild cache; re-analyze after each action
            this._turnCache = { boards: {}, cardRow: new Map() };
            analysis = this.analyzeGameState();
            
            // Re-evaluate if we should continue playing more cards
            const newIntendedPlays = determineCardPlayCount(analysis.player2Hand, analysis.player2Board, this.currentWinCondition);
            const shouldContinue = this.shouldContinuePlaying(playsDone, newIntendedPlays, analysis);
            
            console.log(`After ${playsDone} plays: new intended=${newIntendedPlays}, should continue=${shouldContinue}`);
            
            if (!shouldContinue) {
                console.log('AI decides to stop playing more cards this turn');
                break;
            }
            
            // Update max plays to new evaluation
            maxPlays = Math.max(playsDone + 1, newIntendedPlays);
        }

        console.log(`AI completed ${playsDone} action(s) this turn.`);
        if (countAsTurn) {
            this._aiTurnsTaken += 1;
        }
        
        // Clear cache after actions complete
        this._turnCache = null;
    }

    // Determine if AI should continue playing more cards after current plays
    shouldContinuePlaying(playsDone, newIntendedPlays, analysis) {
        // Don't continue if we've already played more than intended
        if (playsDone >= newIntendedPlays) return false;
        
        // Don't continue if hand is empty
        if (analysis.player2Hand.length === 0) return false;
        
        // Don't continue if every row is already at capacity (4 per row)
        const boardSize = analysis.player2Board.front.length + analysis.player2Board.middle.length + analysis.player2Board.back.length;
        if (boardSize >= 12) return false;
        
        // Don't continue if we've played too many already (safety cap)
        if (playsDone >= 5) return false;
        
        // Continue if we have high-value cards in hand
        const hasHighValueCards = analysis.player2Hand.some(card => {
            const power = (card.front_power || 0) + (card.middle_power || 0) + (card.back_power || 0);
            return power >= 3 || card.health >= 5; // Lowered thresholds
        });
        
        if (hasHighValueCards) return true;
        
        // Continue if we're in an aggressive win condition
        if (this.currentWinCondition === 'POWER_DOMINANCE') return true;
        
        // Continue if hand is getting full (tempo pressure)
        if (analysis.player2Hand.length >= 5) return true;
        
        // Continue if we have synergy cards that can build up
        const hasSynergyCards = analysis.player2Hand.some(card => {
            const synergy = (card.synergy?.f || 0) + (card.synergy?.m || 0) + (card.synergy?.b || 0);
            return synergy >= 3; // Higher threshold
        });
        
        if (hasSynergyCards) return true;
        
        // Otherwise, be more conservative
        return playsDone < 2;
    }

    // Analyze current game state
    analyzeGameState() {
        // Get actual hand data from game state
        const player2Hand = this.getPlayerHand(2);
        const player1Hand = this.getPlayerHand(1);
        const player2Board = this.getPlayerBoard(2);
        const player1Board = this.getPlayerBoard(1);
        
        console.log('AI Game State Analysis:');
        console.log('Player 2 Hand:', player2Hand);
        console.log('Player 2 Hand Size:', player2Hand.length);
        console.log('Player 2 Board:', player2Board);
        
        return {
            // Hand analysis
            player2HandSize: player2Hand.length,
            player1HandSize: player1Hand.length,
            player2Hand: player2Hand,
            player1Hand: player1Hand,
            
            // Board analysis
            player2Board,
            player1Board,
            
            // Power analysis
            player2Power: this.calculatePlayerPower(2),
            player1Power: this.calculatePlayerPower(1),
            
            // Synergy analysis
            player2Synergy: this.calculatePlayerSynergy(2),
            player1Synergy: this.calculatePlayerSynergy(1),
            
            // Row analysis
            rows: this.analyzeRows(),
            
            // Threat analysis
            threats: this.analyzeThreats(),
            
            // Opportunity analysis
            opportunities: this.analyzeOpportunities()
        };
    }

    // Get player's hand cards
    getPlayerHand(playerNum) {
        try {
            const hand = this.adapter?.getHand(playerNum) || [];
            console.log(`Player ${playerNum} hand cards (${hand.length}):`, hand);
            return hand;
        } catch (e) {
            console.warn('Adapter.getHand failed, returning empty hand', e);
            return [];
        }
    }

    // Get all cards on player's board
    getPlayerBoard(playerNum) {
        try {
            if (this._turnCache?.boards?.[playerNum]) {
                return this._turnCache.boards[playerNum];
            }
            const board = this.adapter?.getBoard(playerNum) || { front: [], middle: [], back: [] };
            if (this._turnCache) {
                this._turnCache.boards[playerNum] = board;
                const map = this._turnCache.cardRow;
                const assign = (cards, rowKey) => {
                    cards.forEach(c => {
                        const id = c?.cardId || c?.id;
                        if (id) map.set(id, rowKey);
                    });
                };
                assign(board.front, 'front');
                assign(board.middle, 'middle');
                assign(board.back, 'back');
            }
            return board;
        } catch (e) {
            console.warn('Adapter.getBoard failed, returning empty board', e);
            return { front: [], middle: [], back: [] };
        }
    }

    // Calculate total power for a player
    calculatePlayerPower(playerNum) {
        const board = this.getPlayerBoard(playerNum);
        let totalPower = 0;
        
        Object.values(board).forEach(row => {
            row.forEach(card => {
                if (card && card.health > 0) {
                    const rowType = this.getCardRowType(card.id);
                    totalPower += this.getCardPower(card, rowType);
                }
            });
        });
        
        return totalPower;
    }

    // Calculate total synergy for a player
    calculatePlayerSynergy(playerNum) {
        const rows = [`${playerNum}f`, `${playerNum}m`, `${playerNum}b`];
        let totalSynergy = 0;
        
        rows.forEach(rowId => {
            let row = null;
            try { row = this.adapter?.getRow(rowId); } catch (e) { /* ignore */ }
            if (row && row.synergy) {
                totalSynergy += row.synergy;
            }
        });
        
        return totalSynergy;
    }

    // Get card's row type (front, middle, back)
    getCardRowType(cardId) {
        try {
            if (this._turnCache?.cardRow?.has(cardId)) {
                return this._turnCache.cardRow.get(cardId);
            }
            const rows = ['2f', '2m', '2b'];
            for (const rid of rows) {
                const row = this.adapter?.getRow(rid);
                if (row?.cardIds?.includes(cardId)) {
                    if (rid.endsWith('f')) return 'front';
                    if (rid.endsWith('m')) return 'middle';
                    return 'back';
                }
            }
        } catch (e) { /* ignore */ }
        return 'middle';
    }

    // Get card's power based on row
    getCardPower(card, rowType) {
        const powerMap = {
            front: card.front_power || 0,
            middle: card.middle_power || 0,
            back: card.back_power || 0
        };
        return powerMap[rowType] || 0;
    }

    // Analyze all rows for opportunities and threats
    analyzeRows() {
        const rows = ['1f', '1m', '1b', '2f', '2m', '2b'];
        const analysis = {};
        
        rows.forEach(rowId => {
            let row = null;
            try { row = this.adapter?.getRow(rowId); } catch (e) { /* ignore */ }
            if (row) {
                analysis[rowId] = {
                    power: row.power || 0,
                    synergy: row.synergy || 0,
                    cardCount: row.cardIds?.length || 0,
                    effects: row.allyEffects || [],
                    enemyEffects: row.enemyEffects || []
                };
            }
        });
        
        return analysis;
    }

    // Analyze threats from opponent
    analyzeThreats() {
        const threats = [];
        const player1Board = this.getPlayerBoard(1);
        
        Object.values(player1Board).forEach(row => {
            row.forEach(card => {
                if (card && card.health > 0) {
                    // Analyze card abilities for threats
                    if (card.ultimate) {
                        threats.push({
                            type: 'ultimate',
                            card: card,
                            threatLevel: this.evaluateUltimateThreat(card)
                        });
                    }
                    
                    if (card.on_enter1 || card.on_enter2) {
                        threats.push({
                            type: 'ability',
                            card: card,
                            threatLevel: this.evaluateAbilityThreat(card)
                        });
                    }
                }
            });
        });
        
        return threats;
    }

    // Analyze opportunities for AI
    analyzeOpportunities() {
        const opportunities = [];
        const player2Hand = this.getPlayerHand(2);
        
        player2Hand.forEach(card => {
            if (card) {
                const opportunity = this.evaluateCardOpportunity(card);
                if (opportunity.score > 0) {
                    opportunities.push(opportunity);
                }
            }
        });
        
        return opportunities.sort((a, b) => b.score - a.score);
    }

    // Evaluate threat level of an ultimate
    evaluateUltimateThreat(card) {
        // Simple threat evaluation based on card stats
        const baseThreat = (card.front_power || 0) + (card.middle_power || 0) + (card.back_power || 0);
        return Math.min(baseThreat / 10, 1); // Normalize to 0-1
    }

    // Evaluate threat level of an ability
    evaluateAbilityThreat(card) {
        // Similar to ultimate but lower weight
        const baseThreat = (card.front_power || 0) + (card.middle_power || 0) + (card.back_power || 0);
        return Math.min(baseThreat / 15, 1); // Normalize to 0-1
    }

    // Evaluate opportunity score for a card
    // Evaluate overall board advantage using board evaluator
    evaluateBoardAdvantage(aiBoard, enemyBoard) {
        try {
            const score = evaluateBoard(aiBoard, enemyBoard, this.gameState);
            return score;
        } catch (error) {
            console.error('Board evaluation error:', error);
            // Fallback: simple material count
            const aiCount = (aiBoard.front?.length || 0) + (aiBoard.middle?.length || 0) + (aiBoard.back?.length || 0);
            const enemyCount = (enemyBoard.front?.length || 0) + (enemyBoard.middle?.length || 0) + (enemyBoard.back?.length || 0);
            return (aiCount - enemyCount) * 2;
        }
    }

    evaluateCardOpportunity(card) {
        console.log('Evaluating card:', card.name);
        console.log('Card stats:', {
            front_power: card.front_power,
            middle_power: card.middle_power,
            back_power: card.back_power,
            front_synergy: card.front_synergy,
            middle_synergy: card.middle_synergy,
            back_synergy: card.back_synergy,
            health: card.health
        });

        let score = 0;

        // Base score from card stats
        score += (card.front_power || 0) * 0.3;
        score += (card.middle_power || 0) * 0.4;
        score += (card.back_power || 0) * 0.3;

        // Synergy bonus
        score += (card.front_synergy || 0) * 0.2;
        score += (card.middle_synergy || 0) * 0.3;
        score += (card.back_synergy || 0) * 0.2;

        // Health bonus
        score += (card.health || 0) * 0.1;

        // Role prioritization: prefer tanks and defense early for setup
        try {
            const role = (card.role || card.class || '').toLowerCase();
            const aiBoard = this.getPlayerBoard(2);
            const enemyBoard = this.getPlayerBoard(1);
            const earlyBoard = ((aiBoard.front?.length||0)+(aiBoard.middle?.length||0)+(aiBoard.back?.length||0)) < 2;
            if (earlyBoard) {
                if (role === 'tank') score *= 1.35;
                else if (role === 'defense') score *= 1.2;
            }
            // Mild deprioritization for fragile offense on empty board
            if (earlyBoard && role === 'offense') score *= 0.9;
        } catch {}

        // Check if this card needs allies to be effective
        const needsAlliesOnBoard = this.cardNeedsAllies(card);
        if (needsAlliesOnBoard) {
            const aiBoard = this.getPlayerBoard(2);
            const allyCount = (aiBoard.front?.length || 0) + (aiBoard.middle?.length || 0) + (aiBoard.back?.length || 0);

            if (allyCount === 0) {
                // Heavily penalize cards that need allies when board is empty
                score *= 0.3;
                console.log(`${card.name} needs allies but board is empty - score reduced to ${score}`);
            } else {
                // Bonus if we have allies to buff
                score *= 1.2;
            }
        } else {
            // Cards that work independently are better early
            score *= 1.1;
        }

        console.log('Calculated score:', score);

        return {
            card: card,
            score: score,
            recommendedRow: this.getRecommendedRow(card)
        };
    }

    // Check if card needs allies to be effective
    cardNeedsAllies(card) {
        const allyDependentHeroes = [
            'ramattra',  // Gives shield to another ally
            'brigitte',  // Repair pack targets ally
            'zenyatta',  // Orb of Harmony targets ally
            'ana',       // Biotic rifle can heal ally
            'mercy',     // Caduceus staff heals ally
            'lucio',     // Crossfade affects allies
            'baptiste',  // Regenerative burst/immortality helps allies
            'zarya',     // Projected barrier targets ally
            'lifeweaver' // Healing blossom targets ally
        ];

        return allyDependentHeroes.includes(card.id);
    }

    // Get recommended row for a card
    getRecommendedRow(card) {
        const role = (card.role || card.class || '').toLowerCase();
        const frontScore = (card.front_power || 0) + (card.front_synergy || 0) * 0.5 + (role === 'tank' ? 1.5 : 0);
        const middleScore = (card.middle_power || 0) + (card.middle_synergy || 0) * 0.5 + (role === 'damage' ? 1.0 : 0);
        const backScore = (card.back_power || 0) + (card.back_synergy || 0) * 0.5 + (role === 'support' ? 1.5 : 0);

        console.log(`Row scores for ${card.name}: front=${frontScore}, middle=${middleScore}, back=${backScore}`);

        // If all scores are equal, pick the least-filled row
        if (frontScore === middleScore && middleScore === backScore) {
            const preferred = this.chooseBalancedRow('middle') || 'middle';
            console.log(`All scores equal, balanced picked: ${preferred}`);
            return preferred;
        }

        if (frontScore > middleScore && frontScore > backScore) return 'front';
        if (middleScore > backScore) return 'middle';
        return 'back';
    }

    // Balance placement to avoid overfilling one row when others are sparse
    chooseBalancedRow(preferredRow) {
        try {
            const rowIds = { front: '2f', middle: '2m', back: '2b' };
            const counts = Object.entries(rowIds).reduce((acc, [k, id]) => {
                const row = this.adapter?.getRow(id);
                acc[k] = row?.cardIds?.length || 0;
                return acc;
            }, { front: 0, middle: 0, back: 0 });

            // Exclude full rows
            const available = Object.entries(counts).filter(([, n]) => n < ROW_CAP);
            if (available.length === 0) {
                console.log('All rows are at capacity; cannot place.');
                return null;
            }

            if (counts[preferredRow] < ROW_CAP) {
                const minCount = Math.min(counts.front, counts.middle, counts.back);
                // If preferred row is overloaded by 2+ relative to the least filled row, shift to the least filled available
                if (counts[preferredRow] >= minCount + 2) {
                    const least = available.sort((a, b) => a[1] - b[1])[0][0];
                    console.log(`Balancing row from ${preferredRow} -> ${least} due to distribution (${JSON.stringify(counts)})`);
                    return least;
                }
                return preferredRow;
            }

            // Preferred is full; choose least filled available
            const least = available.sort((a, b) => a[1] - b[1])[0][0];
            console.log(`Preferred row ${preferredRow} is full; choosing ${least}`);
            return least;
        } catch (e) {
            return preferredRow;
        }
    }

    // Main decision making logic
    makeDecision(analysis) {
        console.log('makeDecision called with profile:', this.profile);
        console.log('Analysis player2Hand:', analysis.player2Hand);

        const decision = {
            type: 'wait', // Default to waiting
            card: null,
            row: null,
            ability: null,
            target: null,
            reasoning: ''
        };

        // One planner. How loose it plays is the profile's business, not a
        // choice between three separate routines.
        if (!analysis) return decision;
        return this.makePlan(analysis);
    }

    /**
     * Plans one action.
     *
     * The only planner. It used to be the "hard" one of three, and still holds
     * the looser branches that were written for the easy and medium tiers —
     * those never ran, because the tier switch had already routed those
     * difficulties to their own routines. They are live now, driven by the
     * turn's rolled profile instead of a fixed setting.
     */
    makePlan(analysis) {
        this.turnNumber++;
        console.log(`===== HARD AI TURN ${this.turnNumber} =====`);

        // Use advanced tactical planner
        const aiBoard = analysis.player2Board;
        const enemyBoard = analysis.player1Board;

        try {
            const action = selectBestAction(
                analysis.player2Hand,
                aiBoard,
                enemyBoard,
                this.gameState,
                'hard',
                this.rng
            );

            console.log(`Tactical Planner Decision: ${action.type}`);
            return action;
        } catch (error) {
            console.error('Tactical planner error, falling back to strategic analysis:', error);
        }

        // Fallback to strategic analysis if planner fails
        if (analysis.player2Hand.length > 0) {
            // Evaluate board state to determine if we're ahead or behind
            const boardScore = this.evaluateBoardAdvantage(aiBoard, enemyBoard);
            console.log(`Board evaluation: ${boardScore > 0 ? 'AI ahead' : 'AI behind'} (score: ${boardScore.toFixed(1)})`);

            // Determine win condition strategy (adjusted by board state)
            const winConditionResult = determineWinCondition(this.gameState, aiBoard, enemyBoard, analysis.player2Hand);
            this.currentWinCondition = winConditionResult.condition;

            // Adjust strategy based on board position (CHECK EXTREMES FIRST!)
            let desperationMode = false;
            let victoryPush = false;

            if (boardScore < -25) {
                // DESPERATION: Losing badly - take big risks (CHECK THIS FIRST!)
                desperationMode = true;
                console.log('⚠️ AI DESPERATION MODE - losing badly, taking risks for comeback');
                this.currentWinCondition = WIN_CONDITIONS.SYNERGY_BURST; // Go for big plays
            } else if (boardScore < -15) {
                // Significantly behind - prioritize tempo/burst
                console.log('AI significantly behind - switching to aggressive tempo strategy');
                this.currentWinCondition = WIN_CONDITIONS.TEMPO_CONTROL;
            } else if (boardScore > 25) {
                // VICTORY PUSH: Winning big - press advantage and finish game (CHECK THIS FIRST!)
                victoryPush = true;
                console.log('🏆 AI VICTORY PUSH - crushing advantage, going for the win');
                this.currentWinCondition = WIN_CONDITIONS.POWER_DOMINANCE; // Maximize damage
            } else if (boardScore > 15) {
                // Significantly ahead - prioritize protection/attrition
                console.log('AI significantly ahead - switching to defensive attrition strategy');
                this.currentWinCondition = WIN_CONDITIONS.ATTRITION;
            }

            console.log(`AI Win Condition (fallback): ${this.currentWinCondition}`);

            // Filter cards based on hold logic (difficulty-adjusted)
            const playableCards = analysis.player2Hand.filter(card => {
                if (isRedeployLocked(card, window.__ow_getTurnCount?.())) return false;
                // DESPERATION MODE: Play everything, ignore holds
                if (desperationMode) {
                    console.log(`⚠️ Desperation: Playing ${card.name} (no holds)`);
                    return true;
                }

                // VICTORY PUSH: Play all damage and power cards, hold only supports
                if (victoryPush) {
                    const cardPower = (card.front_power || 0) + (card.middle_power || 0) + (card.back_power || 0);
                    if (card.role === 'Support' && cardPower < 3) {
                        console.log(`🏆 Victory Push: Holding ${card.name} (support with low power)`);
                        return false; // Hold weak supports
                    }
                    console.log(`🏆 Victory Push: Playing ${card.name} (press advantage)`);
                    return true;
                }

                // Some turns it plans combos, some turns it just plays out. On a
                // no-combo turn it still holds a support that has nobody to support.
                if (!this.profile.holdsForCombos) {
                    const boardSize = aiBoard.front.length + aiBoard.middle.length + aiBoard.back.length;
                    if (boardSize === 0 && ['ana', 'mercy', 'brigitte', 'zenyatta', 'lifeweaver'].includes(card.id)) {
                        console.log(`Holding ${card.name} - needs allies on board`);
                        return false;
                    }
                    return true;
                }

                // Hard AI: Full strategic holding
                const shouldHold = shouldHoldCard(card, aiBoard, enemyBoard, analysis.player2Hand, this.currentWinCondition);
                if (shouldHold) {
                    console.log(`Holding ${card.name} for strategic reasons`);
                }
                return !shouldHold;
            });

            if (playableCards.length === 0) {
                console.log('All cards being held strategically');
                return { type: 'wait', reasoning: 'Hard AI: Strategic hold - waiting for combo/setup' };
            }

            // PERFORMANCE OPTIMIZATION: Early exit for obvious plays
            // If only 1 playable card, skip evaluation and play it immediately
            if (playableCards.length === 1) {
                const card = playableCards[0];
                const smartRow = determineBestRow(card, aiBoard, enemyBoard, this.currentWinCondition);
                const balancedRow = this.chooseBalancedRow(smartRow);
                console.log(`Early exit: Only 1 playable card (${card.name}), playing immediately in ${balancedRow}`);
                return {
                    type: 'play_card',
                    card: card,
                    row: balancedRow || smartRow,
                    reasoning: `Only playable card - ${card.name}`
                };
            }

            // PERFORMANCE OPTIMIZATION: If hand is full (6+ cards), play highest power card immediately
            if (analysis.player2Hand.length >= 6 && playableCards.length > 0) {
                const powerScores = playableCards.map(c => ({
                    card: c,
                    power: (c.front_power || 0) + (c.middle_power || 0) + (c.back_power || 0)
                }));
                powerScores.sort((a, b) => b.power - a.power);
                const bestCard = powerScores[0].card;
                const smartRow = determineBestRow(bestCard, aiBoard, enemyBoard, this.currentWinCondition);
                const balancedRow = this.chooseBalancedRow(smartRow);
                console.log(`Early exit: Hand full (${analysis.player2Hand.length} cards), playing highest power card (${bestCard.name}) immediately`);
                return {
                    type: 'play_card',
                    card: bestCard,
                    row: balancedRow || smartRow,
                    reasoning: `Hand full - tempo pressure`
                };
            }

            // Evaluate playable cards with advanced positioning
            const cardEvaluations = [];

            playableCards.forEach(card => {
                const opportunity = this.evaluateCardOpportunity(card);

                // Use advanced positioning intelligence
                const smartRow = determineBestRow(card, aiBoard, enemyBoard, this.currentWinCondition);

                // Strategic multipliers based on win condition
                let strategicMultiplier = 1.0;

                // DESPERATION BONUSES: When losing badly, prioritize high-impact plays
                if (desperationMode) {
                    const cardPower = (card.front_power || 0) + (card.middle_power || 0) + (card.back_power || 0);
                    const cardSynergy = (card.synergy?.f || 0) + (card.synergy?.m || 0) + (card.synergy?.b || 0);

                    // Massive bonus for ultimate-ready heroes
                    if (card.ultimate) {
                        strategicMultiplier += 0.8;
                        console.log(`⚠️ Desperation: ${card.name} (+0.8) - has ultimate ability`);
                    }

                    // Big bonus for high-power cards (go for damage)
                    if (cardPower >= 5) {
                        strategicMultiplier += 0.6;
                        console.log(`⚠️ Desperation: ${card.name} (+0.6) - high power for comeback`);
                    }

                    // Bonus for high synergy (setup big plays)
                    if (cardSynergy >= 3) {
                        strategicMultiplier += 0.5;
                        console.log(`⚠️ Desperation: ${card.name} (+0.5) - high synergy for setup`);
                    }

                    // Bonus for on-enter abilities (immediate impact)
                    if (card.on_enter1 || card.on_enter2) {
                        strategicMultiplier += 0.4;
                        console.log(`⚠️ Desperation: ${card.name} (+0.4) - immediate impact ability`);
                    }
                }

                // VICTORY PUSH BONUSES: When winning big, maximize damage output
                if (victoryPush) {
                    const cardPower = (card.front_power || 0) + (card.middle_power || 0) + (card.back_power || 0);

                    // Huge bonus for high power (finish them)
                    if (cardPower >= 5) {
                        strategicMultiplier += 0.7;
                        console.log(`🏆 Victory Push: ${card.name} (+0.7) - high power to finish game`);
                    } else if (cardPower >= 3) {
                        strategicMultiplier += 0.4;
                        console.log(`🏆 Victory Push: ${card.name} (+0.4) - decent power`);
                    }

                    // Bonus for damage dealers
                    if (card.role === 'Damage' || card.role === 'Offense') {
                        strategicMultiplier += 0.5;
                        console.log(`🏆 Victory Push: ${card.name} (+0.5) - damage dealer for lethal`);
                    }

                    // Bonus for on-enter damage abilities
                    if (card.on_enter1 || card.on_enter2) {
                        strategicMultiplier += 0.35;
                        console.log(`🏆 Victory Push: ${card.name} (+0.35) - damage ability`);
                    }

                    // Penalty for weak supports (don't need them when crushing)
                    if (card.role === 'Support' && cardPower < 3) {
                        strategicMultiplier -= 0.5;
                        console.log(`🏆 Victory Push: ${card.name} (-0.5) - weak support not needed`);
                    }
                }

                // SEQUENCING BONUS: Play synergy generators early in the turn
                const currentBoardSize = (aiBoard.front?.length || 0) + (aiBoard.middle?.length || 0) + (aiBoard.back?.length || 0);
                const cardSynergy = (card.synergy?.f || 0) + (card.synergy?.m || 0) + (card.synergy?.b || 0);

                // If we have a small board, prioritize synergy generators
                {
                    if (currentBoardSize <= 1 && cardSynergy >= 2) {
                        strategicMultiplier += 0.4; // Play synergy generators first
                        console.log(`Sequencing bonus: ${card.name} (+0.4) - synergy generator played early`);
                    }
                    // If we have synergy on board, prioritize damage/power cards
                    if (currentBoardSize >= 2) {
                        const currentSynergy = (aiBoard.front[0]?.synergy?.f || 0) +
                                             (aiBoard.middle[0]?.synergy?.m || 0) +
                                             (aiBoard.back[0]?.synergy?.b || 0);
                        const cardPower = (card.front_power || 0) + (card.middle_power || 0) + (card.back_power || 0);

                        if (currentSynergy >= 2 && cardPower >= 4) {
                            strategicMultiplier += 0.3; // Play power cards after synergy setup
                            console.log(`Sequencing bonus: ${card.name} (+0.3) - power card with synergy on board`);
                        }
                    }
                }

                // ROLE-BASED SEQUENCING: Play tanks first for protection
                if (currentBoardSize === 0) {
                    if (card.role === 'Tank') {
                        strategicMultiplier += 0.35;
                        console.log(`Sequencing bonus: ${card.name} (+0.35) - tank played first for protection`);
                    }
                }

                if (this.currentWinCondition === WIN_CONDITIONS.POWER_DOMINANCE) {
                    const cardPower = (card.front_power || 0) + (card.middle_power || 0) + (card.back_power || 0);
                    strategicMultiplier += (cardPower / 15) * 0.4;
                }

                if (this.currentWinCondition === WIN_CONDITIONS.SYNERGY_BURST) {
                    const cardSynergy = (card.synergy?.f || 0) + (card.synergy?.m || 0) + (card.synergy?.b || 0);
                    strategicMultiplier += (cardSynergy / 3) * 0.5;
                }

                if (this.currentWinCondition === WIN_CONDITIONS.TEMPO_CONTROL) {
                    if (card.on_enter1 || card.on_enter2) {
                        strategicMultiplier += 0.3;
                    }
                }

                if (this.currentWinCondition === WIN_CONDITIONS.ATTRITION) {
                    if (card.health > 4 || card.role === 'Support') {
                        strategicMultiplier += 0.3;
                    }
                }

                // Personality adjustments
                if (this.personality === AI_PERSONALITY.AGGRESSIVE) {
                    strategicMultiplier += (card.front_power || 0) * 0.05;
                } else if (this.personality === AI_PERSONALITY.CALCULATED) {
                    const synergy = (card.synergy?.f || 0) + (card.synergy?.m || 0) + (card.synergy?.b || 0);
                    strategicMultiplier += synergy * 0.08;
                }

                // This turn's judgement, blurred by this turn's noise.
                const totalScore = noisyScore(
                    opportunity.score * strategicMultiplier,
                    this.profile,
                    () => this.rng.next(),
                );

                console.log(`Evaluating ${card.name}: base=${opportunity.score.toFixed(1)}, multiplier=${strategicMultiplier.toFixed(2)}, total=${totalScore.toFixed(1)}, smartRow=${smartRow}`);

                cardEvaluations.push({
                    card,
                    row: smartRow,
                    score: totalScore
                });
            });

            // Sort by score
            cardEvaluations.sort((a, b) => b.score - a.score);

            // One ladder. How often it takes the best card is the profile's
            // `bestPickChance`, which spans the three the tiers used to hold.
            const chosenIndex = pickFromRanked(
                cardEvaluations.length,
                this.profile,
                () => this.rng.next(),
            );
            const chosenEval = cardEvaluations[chosenIndex] || cardEvaluations[0];

            if (chosenEval && chosenEval.score > 0.2) {
                const balancedRow = this.chooseBalancedRow(chosenEval.row);
                if (!balancedRow) {
                    console.log('No available row under cap; skipping play.');
                    return { type: 'wait', reasoning: 'No available row under cap' };
                }
                console.log(`>>> PLAYING: ${chosenEval.card.name} in ${balancedRow} (score: ${chosenEval.score.toFixed(1)}, win condition: ${this.currentWinCondition})`);
                return {
                    type: 'play_card',
                    card: chosenEval.card,
                    row: balancedRow,
                    reasoning: `Hard AI (${this.currentWinCondition}): ${chosenEval.card.name} in ${balancedRow} (${chosenEval.score.toFixed(1)})`
                };
            }
        }

        console.log('Hard AI: No good plays available');
        return {
            type: 'wait',
            reasoning: 'Hard AI: Strategic pass'
        };
    }

    // Evaluate strategic value of a play
    evaluateStrategicValue(opportunity, analysis) {
        let value = opportunity.score;
        
        // Add strategic bonuses based on game state
        if (analysis.player1Power > analysis.player2Power) {
            value += 0.2; // Bonus for catching up
        }
        
        if (analysis.player2Synergy < 3) {
            value += 0.1; // Bonus for building synergy
        }
        
        return Math.min(value, 1); // Normalize to 0-1
    }

    // Execute the AI's decision
    async executeDecision(decision) {
        console.log(`AI executing decision: ${decision.type} - ${decision.reasoning}`);
        
        // Add delay for realistic AI behavior
        await new Promise(resolve => setTimeout(resolve, this.decisionDelay));
        
        switch (decision.type) {
            case 'play_card':
                await this.playCard(decision.card, decision.row);
                break;
            case 'use_ability':
                await this.useAbility(decision.card, decision.ability, decision.target);
                break;
            case 'use_ultimate':
                await this.useUltimate(decision.card, decision.target);
                break;
            case 'wait':
                // AI chooses to wait this turn
                break;
        }
    }

    // Play a card
    async playCard(card, row) {
        try {
            console.log(`AI playing ${card.name} in ${row} row`);
            if (this.adapter && card.cardId) {
                await this.adapter.playCard(card.cardId, row);
            }
        } catch (error) {
            console.error('AI card play error:', error);
        }
    }

    // Use an ability
    async useAbility(card, ability, target) {
        try {
            console.log(`AI using ${ability} on ${card.name}`);
            let resolvedTarget = target;
            if (!resolvedTarget) {
                const intent = inferIntentFromAbilityKey(ability);
                if (intent === 'ally') {
                    resolvedTarget = pickAllyHealTarget(this.adapter);
                } else if (intent === 'enemy') {
                    resolvedTarget = pickEnemyRemovalTarget(this.adapter);
                } else if (intent === 'row') {
                    // Determine correct ownership for the row effect
                    const effectIntent = inferRowEffectIntent(ability);
                    const rt = resolveRowTargetForEffect(this.adapter, effectIntent);
                    resolvedTarget = { type: 'row', row: rt.row, player: rt.player };
                }
            }
            if (this.adapter && card.cardId) {
                await this.adapter.useAbility(card.cardId, ability, resolvedTarget);
            }
        } catch (error) {
            console.error('AI ability use error:', error);
        }
    }

    // Use an ultimate
    async useUltimate(card, target) {
        try {
            console.log(`AI using ultimate on ${card.name}`);
            let resolvedTarget = target;
            if (!resolvedTarget) {
                // Fallback: prioritize enemy removal row if ultimate likely offensive
                const rowKey = pickRowTarget(this.adapter, true);
                resolvedTarget = { type: 'row', row: rowKey };
            }
            if (this.adapter && card.cardId) {
                await this.adapter.useUltimate(card.cardId, resolvedTarget);
            }
        } catch (error) {
            console.error('AI ultimate use error:', error);
        }
    }

    // Set personality type
    setPersonality(personality) {
        this.personality = personality;
        console.log(`AI personality changed to: ${personality}`);
    }

    // Get current AI status
    getStatus() {
        return {
            personality: this.personality,
            profile: this.profile,
            isActive: this.isActive,
            decisionDelay: this.decisionDelay
        };
    }

    // AI Ability System Status:
    // ✅ OnEnter abilities - Automatically triggered when cards are played
    // ✅ Modal choices - AI evaluates and selects best option (handleAIModalChoice)
    // ✅ Targeting - AI selects appropriate targets based on ability type
    // ✅ Ultimates - AI evaluates and uses ultimates strategically (tryUseUltimate)
    // ✅ Special cards - Auto-play BOB, MEKA, Turret after ultimates
    // ✅ Mercy resurrection - Intelligent target selection
    // ✅ Barrier toggles - Reinhardt/Winston barrier management
    // ⚠️ Mid-turn abilities (ability1/ability2) - Not yet implemented (rare use case)
}

export default AIController;
