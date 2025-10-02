/**
 * AI Controller for Player 2
 * Handles all AI decision making, game state analysis, and automated gameplay
 */

import { dealDamage } from '../abilities/engine/damageBus';
import effectsBus, { Effects } from '../abilities/engine/effectsBus';
import { selectCardTarget, selectRowTarget } from '../abilities/engine/targeting';
import { showMessage as showToast, clearMessage as clearToast } from '../abilities/engine/targetingBus';
import { determineWinCondition, determineCardPlayCount, shouldHoldCard, WIN_CONDITIONS } from './strategicAnalysis';
import { determineBestRow } from './positioningIntelligence';
import { selectBestAction } from './tacticalPlanner';
import { evaluateBoard } from './boardEvaluator';
import BrowserGameAdapter from './adapters/BrowserGameAdapter'
import { pickAllyHealTarget, pickEnemyRemovalTarget, pickRowTarget, inferIntentFromAbilityKey, resolveRowTargetForEffect, inferRowEffectIntent } from './targetingEvaluator'
import { SeededRNG } from './utils/rng'

// AI Difficulty Levels
export const AI_DIFFICULTY = {
    EASY: 'easy',
    MEDIUM: 'medium', 
    HARD: 'hard'
};

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
    constructor(difficulty = AI_DIFFICULTY.MEDIUM, personality = AI_PERSONALITY.BALANCED, adapter = null) {
        this.difficulty = difficulty;
        this.personality = personality;
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

    // Get decision delay based on difficulty with human-like variance
    getDecisionDelay() {
        const baseDelays = {
            [AI_DIFFICULTY.EASY]: 3000,    // 3 seconds base
            [AI_DIFFICULTY.MEDIUM]: 5000,  // 5 seconds base
            [AI_DIFFICULTY.HARD]: 7000     // 7 seconds base
        };

        const baseDelay = baseDelays[this.difficulty] || 5000;

        // Add random variance (±30%) to make timing more human-like
        const variance = 0.3;
        const rand = (this.rng && typeof this.rng.next === 'function') ? this.rng.next() : Math.random();
        const randomFactor = 1 + (rand * 2 - 1) * variance; // 0.7 to 1.3
        const finalDelay = Math.floor(baseDelay * randomFactor);

        console.log(`AI decision delay: ${finalDelay}ms (base: ${baseDelay}ms, factor: ${randomFactor.toFixed(2)})`);
        return finalDelay;
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
        console.log(`AI Controller initialized: ${this.difficulty} difficulty, ${this.personality} personality`);
    }

    // Main AI turn handler
    async handleAITurn() {
        if (!this.isActive || !this.gameState) return;

        // Enforce global turn cap: prefer gameState counters if present
        const maxTotalTurns = this.gameState?.maxTurns || 14;
        const currentTurn = this.gameState?.currentTurn || null; // expected 1-based
        if (typeof currentTurn === 'number' && currentTurn > maxTotalTurns) {
            console.log(`Max turns reached (${maxTotalTurns}). Skipping AI turn.`);
            return;
        }
        if (this._aiTurnsTaken >= 7) {
            console.log('AI has already taken 7 turns. Skipping.');
            return;
        }

        console.log('AI Controller: Starting turn analysis...');
        
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
        this._aiTurnsTaken += 1;
        
        // Clear cache after actions complete
        this._turnCache = null;
    }

    // Determine if AI should continue playing more cards after current plays
    shouldContinuePlaying(playsDone, newIntendedPlays, analysis) {
        // Don't continue if we've already played more than intended
        if (playsDone >= newIntendedPlays) return false;
        
        // Don't continue if hand is empty
        if (analysis.player2Hand.length === 0) return false;
        
        // Don't continue if we've hit the 6-hero limit
        const boardSize = analysis.player2Board.front.length + analysis.player2Board.middle.length + analysis.player2Board.back.length;
        if (boardSize >= 6) return false;
        
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
        console.log('makeDecision called with difficulty:', this.difficulty);
        console.log('Analysis player2Hand:', analysis.player2Hand);

        const decision = {
            type: 'wait', // Default to waiting
            card: null,
            row: null,
            ability: null,
            target: null,
            reasoning: ''
        };

        // Decision logic based on difficulty and personality
        switch (this.difficulty) {
            case AI_DIFFICULTY.EASY:
                console.log('Calling makeEasyDecision');
                return this.makeEasyDecision(analysis);
            case AI_DIFFICULTY.MEDIUM:
                console.log('Calling makeMediumDecision');
                return this.makeMediumDecision(analysis);
            case AI_DIFFICULTY.HARD:
                console.log('Calling makeHardDecision');
                return this.makeHardDecision(analysis);
            default:
                console.log('No difficulty matched, returning default wait decision');
                return decision;
        }
    }

    // Easy AI decision making
    makeEasyDecision(analysis) {
        console.log('Easy AI Decision Making:');
        console.log('Player 2 Hand Length:', analysis.player2Hand.length);
        console.log('Player 2 Hand Cards:', analysis.player2Hand);

        // Easy AI has high randomness - sometimes plays, sometimes waits
        const shouldPlayCard = this.rng.next() < 0.75; // 75% chance to play a card

        console.log('Should play card:', shouldPlayCard);

        if (shouldPlayCard && analysis.player2Hand.length > 0) {
            // 50% of the time, pick randomly (human mistakes)
            // 50% of the time, evaluate cards but with poor judgment
            let chosenCard;
            let chosenRow;

            if (this.rng.next() < 0.5) {
                // Completely random choice
                chosenCard = analysis.player2Hand[Math.floor(this.rng.next() * analysis.player2Hand.length)];
                console.log('Easy AI: Random card selection');
            } else {
                // Evaluate cards but poorly
                const cardScores = analysis.player2Hand.map(card => {
                    // Simple scoring - just add up all stats without strategy
                    const score = (card.front_power || 0) + (card.middle_power || 0) +
                                (card.back_power || 0) + (card.health || 0);
                    return { card, score };
                });

                cardScores.sort((a, b) => b.score - a.score);

                // 60% best, 40% random from top 3
                if (this.rng.next() < 0.6) {
                    chosenCard = cardScores[0].card;
                } else {
                    const topCards = cardScores.slice(0, Math.min(3, cardScores.length));
                    chosenCard = topCards[Math.floor(this.rng.next() * topCards.length)].card;
                }
                console.log('Easy AI: Semi-evaluated card selection');
            }

            // Row selection with slight preference for middle, but often suboptimal
            const rowWeights = [0.3, 0.4, 0.3]; // front, middle, back
            const rand = this.rng.next();
            if (rand < rowWeights[0]) {
                chosenRow = 'front';
            } else if (rand < rowWeights[0] + rowWeights[1]) {
                chosenRow = 'middle';
            } else {
                chosenRow = 'back';
            }

            console.log('Selected card:', chosenCard.name);
            console.log('Selected row:', chosenRow);

            return {
                type: 'play_card',
                card: chosenCard,
                row: chosenRow,
                reasoning: `Easy AI: Playing ${chosenCard.name} in ${chosenRow} row (casual play)`
            };
        }

        console.log('Easy AI: No cards to play or chose to wait');
        return {
            type: 'wait',
            reasoning: 'Easy AI: Ending turn'
        };
    }

    // Medium AI decision making
    makeMediumDecision(analysis) {
        console.log('Medium AI Decision Making:');
        console.log('Player 2 Hand Length:', analysis.player2Hand.length);

        // Strategic with some randomization
        if (analysis.player2Hand.length > 0) {
            // Evaluate all cards and build weighted choices
            const cardEvaluations = [];

            analysis.player2Hand.forEach(card => {
                const opportunity = this.evaluateCardOpportunity(card);
                console.log(`Card ${card.name}: base score ${opportunity.score}, recommended row: ${opportunity.recommendedRow}`);

                // Add personality-based scoring
                let adjustedScore = opportunity.score;

                if (this.personality === AI_PERSONALITY.AGGRESSIVE) {
                    // Prefer high power cards and front row
                    adjustedScore += (card.front_power || 0) * 0.3;
                    adjustedScore += (card.health || 0) * 0.15; // Value survivability
                    console.log(`Aggressive personality: boosting score by power/health`);
                } else if (this.personality === AI_PERSONALITY.CALCULATED) {
                    // Prefer synergy cards and strategic positioning
                    const cardSynergy = (card.synergy?.f || 0) + (card.synergy?.m || 0) + (card.synergy?.b || 0);
                    adjustedScore += cardSynergy * 0.2;
                    // Prefer cards with on-enter abilities (calculated play)
                    if (card.on_enter1 || card.on_enter2) {
                        adjustedScore *= 1.15;
                    }
                    console.log(`Calculated personality: boosting score by synergy/abilities`);
                } else {
                    // Balanced - slight boost to versatile cards
                    const avgPower = ((card.front_power || 0) + (card.middle_power || 0) + (card.back_power || 0)) / 3;
                    const avgSynergy = ((card.synergy?.f || 0) + (card.synergy?.m || 0) + (card.synergy?.b || 0)) / 3;
                    adjustedScore += (avgPower + avgSynergy) * 0.1;
                }

                console.log(`Card ${card.name}: adjusted score ${adjustedScore}`);

                cardEvaluations.push({
                    card,
                    row: opportunity.recommendedRow,
                    score: adjustedScore
                });
            });

            // Sort by score
            cardEvaluations.sort((a, b) => b.score - a.score);

            console.log('All card evaluations:', cardEvaluations.map(e => `${e.card.name}: ${e.score.toFixed(1)}`));

            // 70% chance to pick best, 20% second best, 10% random (human-like imperfection)
            const rand = this.rng.next();
            let chosenEval;
            if (rand < 0.7 && cardEvaluations.length > 0) {
                chosenEval = cardEvaluations[0];
            } else if (rand < 0.9 && cardEvaluations.length > 1) {
                chosenEval = cardEvaluations[1];
            } else {
                chosenEval = cardEvaluations[Math.floor(this.rng.next() * cardEvaluations.length)];
            }

            console.log('Chosen card:', chosenEval?.card?.name, 'score:', chosenEval?.score);
            console.log('Score threshold check:', chosenEval?.score, '> 0.25 =', chosenEval?.score > 0.25);

            // Try to use an ability if no good card play exists and enemy has threats
            if (!chosenEval || chosenEval.score <= 0.25) {
                const enemyBoard = analysis.player1Board;
                const hasThreats = Object.values(enemyBoard).some(arr => (arr||[]).length > 0);
                if (hasThreats) {
                    // Minimal heuristic: use ability of the highest impact card in hand if available
                    const abilityUser = analysis.player2Hand.find(c => c.on_enter1 || c.on_enter2 || c.ultimate);
                    if (abilityUser) {
                        const abilityKey = abilityUser.on_enter1 ? 'on_enter1' : (abilityUser.on_enter2 ? 'on_enter2' : 'ultimate');
                        return {
                            type: abilityKey === 'ultimate' ? 'use_ultimate' : 'use_ability',
                            card: abilityUser,
                            ability: abilityKey,
                            reasoning: 'Medium AI: Using ability due to low quality card plays'
                        };
                    }
                }
            }

            // Lower threshold - Medium AI should play if score > 0.25 (very low threshold to ensure it plays)
            if (chosenEval && chosenEval.score > 0.25) {
                const balancedRow = this.chooseBalancedRow(chosenEval.row);
                if (!balancedRow) {
                    console.log('No available row under cap; skipping play.');
                    return { type: 'wait', reasoning: 'No available row under cap' };
                }
                return {
                    type: 'play_card',
                    card: chosenEval.card,
                    row: balancedRow,
                    reasoning: `Medium AI (${this.personality}): Playing ${chosenEval.card.name} in ${balancedRow} row (score: ${chosenEval.score.toFixed(1)})`
                };
            }
        }

        console.log('Medium AI: No cards with sufficient score');
        return {
            type: 'wait',
            reasoning: 'Medium AI: Ending turn'
        };
    }

    // Hard AI decision making
    makeHardDecision(analysis) {
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

                // Easy/Medium AI: Disable combo planning, only hold supports with no board
                if (this.difficulty === 'easy' || this.difficulty === 'medium') {
                    // Only apply basic holds (supports needing allies)
                    const boardSize = aiBoard.front.length + aiBoard.middle.length + aiBoard.back.length;
                    if (boardSize === 0 && ['ana', 'mercy', 'brigitte', 'zenyatta', 'lifeweaver'].includes(card.id)) {
                        console.log(`Holding ${card.name} - needs allies on board (${this.difficulty} AI)`);
                        return false;
                    }
                    return true; // Don't hold for combos
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
                if (this.difficulty === 'hard') {
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
                if (this.difficulty === 'hard' && currentBoardSize === 0) {
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

                // Apply difficulty-based scoring adjustments
                let difficultyAdjusted = opportunity.score * strategicMultiplier;

                // Easy AI: Add random noise (-30% to +30%) to make decisions less consistent
                if (this.difficulty === 'easy') {
                    const noise = (this.rng.next() * 0.6 - 0.3); // -0.3 to +0.3
                    difficultyAdjusted *= (1 + noise);
                }

                // Medium AI: Add smaller random noise (-15% to +15%)
                if (this.difficulty === 'medium') {
                    const noise = (this.rng.next() * 0.3 - 0.15); // -0.15 to +0.15
                    difficultyAdjusted *= (1 + noise);
                }

                const totalScore = difficultyAdjusted;

                console.log(`Evaluating ${card.name}: base=${opportunity.score.toFixed(1)}, multiplier=${strategicMultiplier.toFixed(2)}, total=${totalScore.toFixed(1)}, smartRow=${smartRow} (${this.difficulty} AI)`);

                cardEvaluations.push({
                    card,
                    row: smartRow,
                    score: totalScore
                });
            });

            // Sort by score
            cardEvaluations.sort((a, b) => b.score - a.score);

            // Difficulty-based card selection
            const rand = this.rng.next();
            let chosenEval;

            if (this.difficulty === 'easy') {
                // Easy AI: 30% best, 70% random (very inconsistent)
                if (rand < 0.30 && cardEvaluations.length > 0) {
                    chosenEval = cardEvaluations[0];
                } else {
                    const randomIndex = Math.floor(this.rng.next() * cardEvaluations.length);
                    chosenEval = cardEvaluations[randomIndex];
                }
            } else if (this.difficulty === 'medium') {
                // Medium AI: 60% best, 30% second best, 10% random
                if (rand < 0.60 && cardEvaluations.length > 0) {
                    chosenEval = cardEvaluations[0];
                } else if (rand < 0.90 && cardEvaluations.length > 1) {
                    chosenEval = cardEvaluations[1];
                } else {
                    const randomIndex = Math.floor(this.rng.next() * Math.min(3, cardEvaluations.length));
                    chosenEval = cardEvaluations[randomIndex];
                }
            } else {
                // Hard AI: 90% best, 8% second best, 2% third best (unchanged)
                if (rand < 0.90 && cardEvaluations.length > 0) {
                    chosenEval = cardEvaluations[0];
                } else if (rand < 0.98 && cardEvaluations.length > 1) {
                    chosenEval = cardEvaluations[1];
                } else if (cardEvaluations.length > 2) {
                    chosenEval = cardEvaluations[2];
                } else {
                    chosenEval = cardEvaluations[0];
                }
            }

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

    // Set difficulty level
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        this.decisionDelay = this.getDecisionDelay();
        console.log(`AI difficulty changed to: ${difficulty}`);
    }

    // Set personality type
    setPersonality(personality) {
        this.personality = personality;
        console.log(`AI personality changed to: ${personality}`);
    }

    // Get current AI status
    getStatus() {
        return {
            difficulty: this.difficulty,
            personality: this.personality,
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
