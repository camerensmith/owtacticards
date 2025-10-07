/**
 * AI Game Integration Service
 * Handles the integration between AI Controller and the actual game mechanics
 */

import AIController, { AI_DIFFICULTY, AI_PERSONALITY } from './AIController';
import { dealDamage } from '../abilities/engine/damageBus';
import effectsBus, { Effects } from '../abilities/engine/effectsBus';
import * as targeting from '../abilities/engine/targeting';
import { showMessage as showToast, clearMessage as clearToast } from '../abilities/engine/targetingBus';
import { setAIAutoSelect, clearAIAutoSelect } from '../abilities/engine/modalController';
import { getAbilityMetadata, abilityMetadata } from './abilityMetadata';
import { assessThreats, getKillPriority, assessAllyProtection, recommendDefensiveAction } from './threatAssessment';
import data from '../data';

class AIGameIntegration {
    constructor() {
        this.aiController = new AIController();
        this.isAITurn = false;
        this.currentDecision = null;
        this.gameState = null;
        this.endTurnCallback = null;
        this.cardsPlayedThisTurn = 0;
        this.MAX_CARDS_PER_TURN = 6; // Maximum possible, but AI will decide situationally
    }

    // Initialize AI integration
    initialize(gameState, endTurnCallback = null) {
        this.gameState = gameState;
        this.endTurnCallback = endTurnCallback;
        this.aiController.initialize(gameState);
        this.setupAITargetingOverrides();
        
        // Set up AI modal choice callback
        this.setupAIModalChoiceCallback();
        
        console.log('AI Game Integration initialized with targeting overrides');
    }

    // Set up AI modal choice callback for automatic decision making
    setupAIModalChoiceCallback() {
        try {
            // Import the modal controller to set up AI auto-select
            import('../abilities/engine/modalController').then(({ setAIAutoSelect }) => {
                setAIAutoSelect((heroName, choices) => {
                    console.log(`AI auto-selecting for ${heroName} from ${choices.length} choices:`, choices.map(c => c.title));
                    return this.handleAIModalChoice(choices);
                });
                console.log('AI modal choice callback set up successfully');
            }).catch(error => {
                console.error('Failed to set up AI modal choice callback:', error);
            });
        } catch (error) {
            console.error('Error setting up AI modal choice callback:', error);
        }
    }

    // Set AI difficulty and personality
    setAISettings(difficulty, personality) {
        this.aiController.setDifficulty(difficulty);
        this.aiController.setPersonality(personality);
    }

    // Check if it's AI's turn
    isPlayer2Turn() { return true; }

    // Handle AI turn
    async handleAITurn() {
        // Enforce Player 2 turn ownership
        const currentPlayer = window.__ow_getPlayerTurn?.() || 2;
        if (currentPlayer !== 2) {
            console.warn('AI handleAITurn called outside of Player 2 turn; ignoring');
            return null;
        }
        this.isAITurn = true;
        window.__ow_isAITurn = true; // Set global flag for targeting system
        console.log('AI taking turn...');

        try {
            console.log('Current game state:', this.gameState);
            console.log('Game state rows:', this.gameState?.rows);

            // Track actions performed this AI turn
            window.__ow_aiActionsThisTurn = 0;

            // Reset turn economy counter
            this.cardsPlayedThisTurn = 0;
            console.log(`AI turn started - card play limit: ${this.MAX_CARDS_PER_TURN}`);

            // Smart dead card cleanup - consider Mercy probability and board state
            await this.smartDeadCardCleanup();

            // CRITICAL: Check if D.Va was returned to hand and play her immediately
            const returnedDva = await this.checkAndPlayReturnedDva();
            if (returnedDva) {
                console.log('AI immediately played returned D.Va');
            }

            // CRITICAL: Auto-play Special and Turret cards immediately
            await this.autoPlaySpecialAndTurretCards();
            // Double-check after a short delay to catch async add-to-hand race
            try { await new Promise(r => setTimeout(r, 250)); } catch {}
            await this.autoPlaySpecialAndTurretCards();

            // Try beneficial reposition
            await this.tryRepositionIfBeneficial();

            // Delegate full turn (multi-play + delay) to AIController
            await this.aiController.handleAITurn();

            // Try to use abilities (ability1/ability2) if beneficial
            await this.tryUseAbilitiesThisTurn();

            // Try to use one or more ultimates this turn if conditions are favorable
            const difficulty = this.aiController?.difficulty || 'hard';
            const maxUltimates = difficulty === 'easy' ? 1 : (difficulty === 'medium' ? 2 : 3);
            let ultimatesUsed = 0;
            while (ultimatesUsed < maxUltimates) {
                const fired = await this.tryUseUltimateThisTurn();
                if (!fired) break;
                ultimatesUsed++;
                // brief delay to let state settle between ultimates
                try { await new Promise(r => setTimeout(r, 150)); } catch {}
            }

            // Check if barriers should be toggled (Reinhardt/Winston)
            await this.manageBarrierToggles();

            // If we only made 0-1 actions and still have hand space/board space, try one more pass
            const actions = window.__ow_aiActionsThisTurn || 0;
            const stillOurTurn = (window.__ow_getPlayerTurn?.() || 2) === 2;
            if (actions < 2 && stillOurTurn) {
                try {
                    const handRow = window.__ow_getRow?.('player2hand');
                    const handSize = handRow?.cardIds?.length || 0;
                    const rows = ['2f','2m','2b'].map(id => window.__ow_getRow?.(id)?.cardIds?.length || 0);
                    const boardHasSpace = rows.some(n => n < 4);
                    if (handSize > 0 && boardHasSpace) {
                        console.log('AI performed <2 actions; attempting an extra tactical play');
                        await this.aiController.handleAITurn();
                        // One more chance to ult after extra play
                        await this.tryUseUltimateThisTurn();
                    }
                } catch {}
            }

            // End the AI's turn
            console.log('AI turn complete - switching turn');
            if (this.endTurnCallback) {
                console.log('AI ending turn via callback after delay');
                setTimeout(() => {
                    console.log('AI executing endTurnCallback now');
                    this.endTurnCallback();
                }, 1500); // Give time to show the last move and for abilities to resolve
            } else {
                console.warn('AI: No endTurnCallback available!');
            }

            return null;

        } catch (error) {
            console.error('AI turn error:', error);
            return null;
        } finally {
            this.isAITurn = false;
            window.__ow_isAITurn = false; // Clear global flag
            this.currentDecision = null;
        }
    }

    // Execute AI decision
    async executeAIDecision(decision) {
        console.log('Executing AI decision:', decision);

        switch (decision.type) {
            case 'play_card':
                await this.executePlayCard(decision);
                break;
            case 'use_ability':
                await this.executeUseAbility(decision);
                break;
            case 'use_ultimate':
                await this.executeUseUltimate(decision);
                break;
            case 'wait':
                await this.executeWait(decision);
                break;
            default:
                console.log('Unknown AI decision type:', decision.type);
        }
    }

    // Execute play card decision
    async executePlayCard(decision) {
        const { card } = decision;
        let row = decision.row;

        // Enforce Player 2 turn ownership before placing
        const currentPlayer = window.__ow_getPlayerTurn?.() || 2;
        if (currentPlayer !== 2) {
            console.warn('AI attempted to place a card outside of Player 2 turn; skipping');
            return;
        }

        // CRITICAL: Enforce turn economy limit
        if (this.cardsPlayedThisTurn >= this.MAX_CARDS_PER_TURN) {
            console.log(`AI turn economy limit reached (${this.cardsPlayedThisTurn}/${this.MAX_CARDS_PER_TURN} cards played)`);
            return;
        }

        if (!card || !row) {
            // Recover: compute a row via AIController if missing
            const recommended = this.aiController.getRecommendedRow(card);
            row = this.aiController.chooseBalancedRow(recommended) || recommended || 'middle';
        }

        try {
            // Convert row name to row ID
            const legalRows = ['front','middle','back'];
            if (!legalRows.includes(row)) {
                const fallback = this.aiController.getRecommendedRow(card) || 'middle';
                row = this.aiController.chooseBalancedRow(fallback) || fallback;
            }

            console.log(`AI placing ${card.name} in ${row} row`);
            console.log('Card object:', card);

            // Use the adapter to place the card (includes 6-hero limit check)
            const playerHeroId = card.cardId;
            await this.aiController.adapter.playCard(playerHeroId, row);

            // Count action for this turn
            try { window.__ow_aiActionsThisTurn = (window.__ow_aiActionsThisTurn || 0) + 1; } catch {}

            // Defensive: verify it is still Player 2's turn after dispatch
            const afterPlayer = window.__ow_getPlayerTurn?.() || 2;
            if (afterPlayer !== 2) {
                console.warn('Turn changed unexpectedly during AI placement; further actions skipped this move');
                return;
            }

            // Trigger onEnter abilities for the card
            if (window.__ow_triggerOnEnter) {
                console.log(`Triggering onEnter abilities for ${card.name}`);

                // Set AI auto-select callback for ability choices
                setAIAutoSelect((heroName, choices) => {
                    // AI chooses based on difficulty and card/game state
                    console.log(`AI auto-select called for ${heroName} with choices:`, choices);
                    const choice = this.handleAIModalChoice(choices, playerHeroId);
                    console.log(`AI auto-select returning choice ${choice} for ${heroName}`);
                    return choice;
                });

                // Add a delay to let the card placement complete and appear more deliberate
                setTimeout(() => {
                    console.log(`Triggering onEnter for ${card.name}`);
                    // Mark AI-triggering context and current hero for targeting inference
                    window.__ow_aiTriggering = true;
                    window.__ow_currentAICardId = playerHeroId;
                    window.__ow_currentAIHero = playerHeroId.slice(1);
                    window.__ow_currentAIAbility = 'onEnter';
                    try {
                        const rowId = `2${row[0]}`; // derive row id (2f/2m/2b) from selected row
                        window.__ow_triggerOnEnter(playerHeroId, rowId, 2);
                    } finally {
                        // Clear auto-select and AI-triggering context after a short delay
                        setTimeout(() => {
                            console.log('Clearing AI auto-select and AI-triggering flags');
                            clearAIAutoSelect();
                            window.__ow_aiTriggering = false;
                            window.__ow_currentAICardId = null;
                            window.__ow_currentAIHero = null;
                            window.__ow_currentAIAbility = null;
                        }, 500);
                    }
                }, 300);
            }

            // Increment turn economy counter
            this.cardsPlayedThisTurn++;
            console.log(`AI played card (${this.cardsPlayedThisTurn}/${this.MAX_CARDS_PER_TURN} this turn)`);

            showToast(`AI plays ${card.name} in ${row} row`);
            setTimeout(() => clearToast(), 2000);

        } catch (error) {
            console.error('AI play card error:', error);
            console.error('Error stack:', error.stack);
            
            // Handle specific error cases
            if (error.message === 'Side capacity reached') {
                console.log('AI hit 6-hero limit, stopping card plays this turn');
                this.cardsPlayedThisTurn = this.MAX_CARDS_PER_TURN; // Stop trying to play more cards
                showToast('AI reached maximum heroes (6/6)');
                setTimeout(() => clearToast(), 2000);
            } else if (error.message === 'All rows full') {
                console.log('AI cannot place card - all rows are full');
                showToast('AI cannot place card - all rows full');
                setTimeout(() => clearToast(), 2000);
            }
        }
    }

    // Execute use ability decision
    async executeUseAbility(decision) {
        const { card, ability, target } = decision;
        
        if (!card || !ability) {
            console.error('Invalid use ability decision:', decision);
            return;
        }

        try {
            console.log(`AI using ${ability} on ${card.name}`);
            
            // This would integrate with the actual ability system
            showToast(`AI uses ${ability} on ${card.name}`);
            setTimeout(() => clearToast(), 2000);
            
        } catch (error) {
            console.error('AI use ability error:', error);
        }
    }

    // Execute use ultimate decision
    async executeUseUltimate(decision) {
        const { card, target } = decision;
        
        if (!card) {
            console.error('Invalid use ultimate decision:', decision);
            return;
        }

        try {
            console.log(`AI using ultimate on ${card.name}`);
            
            // This would integrate with the actual ultimate system
            showToast(`AI uses ultimate on ${card.name}`);
            setTimeout(() => clearToast(), 2000);
            
        } catch (error) {
            console.error('AI use ultimate error:', error);
        }
    }

    // Execute wait decision
    async executeWait(decision) {
        console.log('AI chooses to wait this turn');
        showToast('AI waits this turn');
        setTimeout(() => clearToast(), 2000);
    }

    // Get current AI decision for display
    getCurrentDecision() {
        return this.currentDecision;
    }

    // Check if AI is currently thinking
    isAIThinking() {
        return this.isAITurn;
    }

    // Get AI status
    getAIStatus() {
        return this.aiController.getStatus();
    }

    // Get scenario-based ultimate target
    getScenarioBasedUltimateTarget(heroId) {
        try {
            const { getScenarioBasedUltimateTargeting } = require('./scenarioAnalysis');
            const gameState = this.gameState;
            const scenario = getScenarioBasedUltimateTargeting(heroId, gameState);
            
            if (scenario && scenario.targetRows && scenario.targetRows.length > 0) {
                // Convert row ID to row name for targeting
                const rowId = scenario.targetRows[0]; // Use first target row
                const rowName = rowId[1]; // f, m, b
                return {
                    type: 'row',
                    row: rowName,
                    reasoning: scenario.description
                };
            }
        } catch (error) {
            console.log('Scenario-based ultimate targeting not available:', error.message);
        }
        return null;
    }

    // Handle card and row targeting for AI
    async handleAITargeting(targetType, options = {}) {
        console.log('AI Targeting:', targetType, options);
        
        // Apply scenario-based targeting for ultimates
        if (targetType === 'row' && options.isDamage) {
            const heroIdContext = window.__ow_currentAIHero;
            const scenarioTarget = this.getScenarioBasedUltimateTarget(heroIdContext);
            if (scenarioTarget) {
                console.log(`Scenario-based targeting for ${heroIdContext}:`, scenarioTarget);
                return scenarioTarget;
            }
        }

        // Infer intent from current AI context if options are not explicit
        const heroIdContext = window.__ow_currentAIHero;
        const abilityPhase = window.__ow_currentAIAbility || 'unknown';
        let inferred = { isDamage: false, isHeal: false, isBuff: false, isDebuff: false, allowAnyRow: false };
        try {
            if (heroIdContext) {
                const meta = getAbilityMetadata(heroIdContext, abilityPhase);
                if (meta) {
                    const desc = JSON.stringify(meta).toLowerCase();
                    inferred.isDamage = /damage|deal|enemy/.test(desc) && !/heal/.test(desc);
                    inferred.isHeal = /heal|restore/.test(desc);
                    inferred.isBuff = /buff|shield|barrier|protect|gain|increase/.test(desc);
                    inferred.isDebuff = /debuff|reduce|weaken/.test(desc) && !inferred.isBuff;
                    inferred.allowAnyRow = /shuffle|any row|either side/.test(desc);
                }
                // Hard-code a few known intents
                if (heroIdContext === 'roadhog' && abilityPhase === 'onEnter') inferred.isDamage = true;
                if (heroIdContext === 'doomfist' && abilityPhase === 'onEnter') inferred.isDamage = true;
                if (heroIdContext === 'reaper' && abilityPhase === 'onEnter') inferred.isDamage = true;
                if (heroIdContext === 'baptiste' && abilityPhase === 'onEnter') { 
                    // Baptiste can choose damage or heal - default to damage for AI
                    inferred.isDamage = true; 
                    inferred.isHeal = false; 
                }
                if (heroIdContext === 'sigma' && abilityPhase === 'onEnter') { inferred.isBuff = true; inferred.isDamage = false; inferred.allowAnyRow = false; }
                if (heroIdContext === 'reinhardt' && abilityPhase === 'onEnter') { inferred.isBuff = true; inferred.isDamage = false; inferred.allowAnyRow = false; }
                if (heroIdContext === 'winston' && abilityPhase === 'onEnter') { inferred.isBuff = true; inferred.isDamage = false; inferred.allowAnyRow = false; }
                if (heroIdContext === 'zarya' && abilityPhase === 'onEnter') { inferred.isBuff = true; inferred.isDamage = false; inferred.allowAnyRow = false; }
                if (heroIdContext === 'ramattra' && abilityPhase === 'onEnter') { inferred.isBuff = true; inferred.isDamage = false; inferred.allowAnyRow = false; }
                if (heroIdContext === 'zenyatta' && abilityPhase === 'onEnter1') { inferred.isHeal = true; inferred.isBuff = true; inferred.isDamage = false; }
                if (heroIdContext === 'zenyatta' && abilityPhase === 'onEnter2') { inferred.isDamage = true; inferred.isDebuff = true; inferred.isHeal = false; }
            }
        } catch {}

        if (targetType === 'card') {
            const isDamageAbility = options.isDamage ?? inferred.isDamage;
            const isHealAbility = options.isHeal ?? inferred.isHeal;
            const isBuffAbility = options.isBuff ?? inferred.isBuff;

            // For damage abilities, exclude AI's own cards
            const excludeOwnCards = isDamageAbility;

            // If no targets provided, find all valid card targets
            let targets = options.targets || this.getAllValidCardTargets(excludeOwnCards);

            // Additional filtering for damage abilities - only enemy cards
            if (isDamageAbility) {
                targets = targets.filter(t => !t.rowId.startsWith('2'));
            }

            // Filter for heal/buff - only friendly cards
            if (isHealAbility || isBuffAbility) {
                targets = targets.filter(t => t.rowId.startsWith('2'));
            }

            if (targets.length === 0) {
                console.log('No valid card targets found after filtering');
                return null;
            }

            console.log(`AI selecting from ${targets.length} card targets (damage: ${isDamageAbility}, heal: ${isHealAbility}, buff: ${isBuffAbility})`);

            // === HERO-SPECIFIC ADVANCED TARGETING ===

            // GENJI: Target damaged high-power heroes OR non-ulted threats
            if (heroIdContext === 'genji') {
                return this.selectGenjiTarget(targets);
            }

            // SOLDIER 76: Pick off weakened/killable targets
            if (heroIdContext === 'soldier76' || heroIdContext === 'soldier') {
                return this.selectSoldier76Target(targets);
            }

            // MEI Cryo-Freeze: Target enemies who haven't ulted yet (block their ultimate)
            if (heroIdContext === 'mei' && abilityPhase === 'onUltimate') {
                return this.selectMeiCryoFreezeTarget(targets);
            }

            // BRIGITTE Shield Bash: Block high-value enemy ultimates
            if (heroIdContext === 'brigitte' && abilityPhase === 'onUltimate') {
                return this.selectBriShieldBashTarget(targets);
            }

            // HAZARD: Look for pickoff opportunities (low HP high value)
            if (heroIdContext === 'hazard') {
                return this.selectHazardPickoffTarget(targets);
            }

            // ANA Biotic Grenade: Maximize damage AND healing
            if (heroIdContext === 'ana' && abilityPhase === 'onEnter') {
                return this.selectAnaBioticGrenadeTarget(targets);
            }

            // REAPER: Assess power differential before self-sacrifice
            if (heroIdContext === 'reaper' && abilityPhase === 'onEnter') {
                return this.selectReaperTradeoffTarget(targets);
            }

            // Generic targeting
            if (isDamageAbility) {
                // Use threat assessment for intelligent targeting
                return this.selectBestDamageTargetWithThreatAssessment(targets);
            } else if (isHealAbility) {
                // Use protection assessment for healing priority
                return this.selectBestHealTargetWithProtection(targets);
            } else if (isBuffAbility) {
                // Target friendly cards with highest power
                return this.selectBestBuffTarget(targets);
            }

            // Default: pick highest value target (prefer enemies)
            const enemyTargets = targets.filter(t => !t.rowId.startsWith('2'));
            return this.selectHighestValueTarget(enemyTargets.length > 0 ? enemyTargets : targets);
        } else if (targetType === 'row') {
            const isDamageAbility = options.isDamage ?? inferred.isDamage;
            const isBuffAbility = options.isBuff ?? inferred.isBuff;
            const isDebuffAbility = options.isDebuff ?? inferred.isDebuff;
            const allowAnyRow = options.allowAnyRow ?? inferred.allowAnyRow; // For abilities like Lucio shuffle

            console.log(`AI row targeting - damage: ${isDamageAbility}, buff: ${isBuffAbility}, debuff: ${isDebuffAbility}, allowAny: ${allowAnyRow}`);

            // If no rows provided, get all valid rows
            let rows = options.rows || this.getAllValidRowTargets();

            // Filter rows based on ability type unless allowAnyRow is true
            if (!allowAnyRow) {
                if (isDamageAbility || isDebuffAbility) {
                    // Only enemy rows
                    rows = rows.filter(r => r.startsWith('1'));
                } else if (isBuffAbility) {
                    // Only friendly rows
                    rows = rows.filter(r => r.startsWith('2'));
                }
            }

            if (rows.length === 0) {
                console.log('No valid row targets found after filtering');
                return null;
            }

            console.log(`AI selecting from ${rows.length} row targets:`, rows);

            // Smart row selection based on game state
            if (isDamageAbility) {
                // McCree Dead Eye optimization: Target row with FEWEST enemies (9 damage split = more per target)
                if (heroIdContext === 'mccree' && abilityPhase === 'onUltimate') {
                    const enemyOnly = rows.filter(r => r.startsWith('1'));
                    return this.selectBestMcCreeUltimateRow(enemyOnly.length ? enemyOnly : rows);
                }

                // DOOMFIST: Look for clusters (most enemies in row)
                if (heroIdContext === 'doomfist') {
                    const enemyOnly = rows.filter(r => r.startsWith('1'));
                    return this.selectDoomfistClusterRow(enemyOnly.length ? enemyOnly : rows);
                }

                // ANA Biotic Grenade: Maximize damage to enemies + healing to allies
                if (heroIdContext === 'ana' && abilityPhase === 'onEnter') {
                    return this.selectAnaBioticGrenadeRow(rows);
                }

                // Target enemy row with highest power or most cards
                const enemyOnly = rows.filter(r => r.startsWith('1'));
                return this.selectBestDamageRow(enemyOnly.length ? enemyOnly : rows);
            } else if (isBuffAbility) {
                // Ana Nano Boost optimization: Place token in row with most heroes (X synergy where X = hero count)
                if (heroIdContext === 'ana' && abilityPhase === 'onUltimate') {
                    const allyOnly = rows.filter(r => r.startsWith('2'));
                    return this.selectBestAnaUltimateRow(allyOnly.length ? allyOnly : rows);
                }
                // Prefer ally row that needs healing or has most cards
                const allyOnly = rows.filter(r => r.startsWith('2'));
                if (allyOnly.length) return this.selectBestBuffRow(allyOnly);
                return this.selectBestBuffRow(rows);
            } else if (isDebuffAbility) {
                // Target enemy row with highest power
                return this.selectBestDebuffRow(rows);
            } else if (allowAnyRow) {
                // For abilities that can target any row (like Lucio shuffle)
                // Decide whether to help allies or hinder enemies
                // Bias: if metadata indicates damage/debuff, prefer enemy rows; if buff, prefer ally rows
                if (isDamageAbility || isDebuffAbility) {
                    const enemyOnly = rows.filter(r => r.startsWith('1'));
                    return this.selectBestDamageRow(enemyOnly.length ? enemyOnly : rows);
                }
                const allyOnly = rows.filter(r => r.startsWith('2'));
                return this.selectBestBuffRow(allyOnly.length ? allyOnly : rows);
            }

            // Default: pick enemy row with most power
            return this.selectHighestPowerRow(rows);
        }

        return null;
    }

    // Get all valid card targets on the board
    getAllValidCardTargets(excludeOwnCards = false) {
        const targets = [];
        const rows = ['1f', '1m', '1b', '2f', '2m', '2b'];

        rows.forEach(rowId => {
            const row = window.__ow_getRow?.(rowId);
            if (row && row.cardIds) {
                row.cardIds.forEach(cardId => {
                    const card = window.__ow_getCard?.(cardId);
                    if (card && card.health > 0) {
                        // If excludeOwnCards is true, filter out AI's own cards (player 2)
                        if (excludeOwnCards && rowId.startsWith('2')) {
                            return; // Skip AI's own cards
                        }
                        targets.push({ cardId, rowId });
                    }
                });
            }
        });

        return targets;
    }

    // Get all valid row targets
    getAllValidRowTargets() {
        return ['1f', '1m', '1b', '2f', '2m', '2b'];
    }

    // Select best damage target using threat assessment
    selectBestDamageTargetWithThreatAssessment(targets) {
        try {
            // Easy AI: 50% chance to skip threat assessment and just pick random/highest health
            const difficulty = this.aiController?.difficulty || 'hard';
            if (difficulty === 'easy' && this.aiController.rng.next() < 0.5) {
                console.log('Easy AI: Skipping threat assessment - picking suboptimal target');
                // 50% random, 50% highest health
                if (this.aiController.rng.next() < 0.5) {
                    const randomIndex = Math.floor(this.aiController.rng.next() * targets.length);
                    return targets[randomIndex];
                }
                return this.selectBestDamageTarget(targets);
            }

            // Medium AI: 25% chance to skip threat assessment
            if (difficulty === 'medium' && this.aiController.rng.next() < 0.25) {
                console.log('Medium AI: Skipping threat assessment - picking highest health');
                return this.selectBestDamageTarget(targets);
            }

            // Build enemy board from targets
            const enemyBoard = { front: [], middle: [], back: [] };
            const aiBoard = { front: [], middle: [], back: [] };

            targets.forEach(target => {
                const card = window.__ow_getCard?.(target.cardId);
                if (!card) return;

                const rowId = target.rowId;
                if (rowId.endsWith('f')) enemyBoard.front.push({ ...card, cardId: target.cardId });
                else if (rowId.endsWith('m')) enemyBoard.middle.push({ ...card, cardId: target.cardId });
                else if (rowId.endsWith('b')) enemyBoard.back.push({ ...card, cardId: target.cardId });
            });

            // Get AI board for context
            const aiRows = ['2f', '2m', '2b'];
            aiRows.forEach(rowId => {
                const row = window.__ow_getRow?.(rowId);
                if (!row?.cardIds) return;

                row.cardIds.forEach(cardId => {
                    const card = window.__ow_getCard?.(cardId);
                    if (!card || card.health <= 0) return;

                    if (rowId.endsWith('f')) aiBoard.front.push({ ...card, cardId });
                    else if (rowId.endsWith('m')) aiBoard.middle.push({ ...card, cardId });
                    else if (rowId.endsWith('b')) aiBoard.back.push({ ...card, cardId });
                });
            });

            // Run threat assessment
            const threats = assessThreats(enemyBoard, aiBoard);
            const killPriority = getKillPriority(threats);

            if (killPriority) {
                console.log(`AI Kill Priority (${difficulty}): ${killPriority.card.name} - ${killPriority.reason}`);

                // Find matching target
                const match = targets.find(t => t.cardId === killPriority.cardId);
                if (match) return match;
            }

            // Fallback
            return this.selectBestDamageTarget(targets);
        } catch (error) {
            console.error('Threat assessment error:', error);
            return this.selectBestDamageTarget(targets);
        }
    }

    // Fallback: Select damage target (enemy with highest health)
    selectBestDamageTarget(targets) {
        let bestTarget = null;
        let highestHealth = 0;

        targets.forEach(target => {
            const card = window.__ow_getCard?.(target.cardId);
            if (card && card.health > highestHealth) {
                highestHealth = card.health;
                bestTarget = target;
            }
        });

        return bestTarget || targets[0];
    }

    // Select best heal target using protection assessment
    selectBestHealTargetWithProtection(targets) {
        try {
            // Build AI board from targets
            const aiBoard = { front: [], middle: [], back: [] };
            const enemyBoard = { front: [], middle: [], back: [] };

            targets.forEach(target => {
                const card = window.__ow_getCard?.(target.cardId);
                if (!card) return;

                const rowId = target.rowId;
                if (rowId.endsWith('f')) aiBoard.front.push({ ...card, cardId: target.cardId });
                else if (rowId.endsWith('m')) aiBoard.middle.push({ ...card, cardId: target.cardId });
                else if (rowId.endsWith('b')) aiBoard.back.push({ ...card, cardId: target.cardId });
            });

            // Run protection assessment
            const protectionNeeds = assessAllyProtection(aiBoard, enemyBoard);
            const defensive = recommendDefensiveAction(protectionNeeds);

            if (defensive && defensive.action === 'heal') {
                console.log(`AI Heal Priority: ${defensive.reason} (${defensive.priority})`);

                // Find matching target
                const match = targets.find(t => t.cardId === defensive.target);
                if (match) return match;
            }

            // Fallback to simple logic
            return this.selectBestHealTarget(targets);
        } catch (error) {
            console.error('Protection assessment error:', error);
            return this.selectBestHealTarget(targets);
        }
    }

    // Original simple heal target selection (fallback)
    selectBestHealTarget(targets) {
        let bestTarget = null;
        let lowestHealth = Infinity;

        targets.forEach(target => {
            const card = window.__ow_getCard?.(target.cardId);
            if (card && card.health > 0 && card.health < lowestHealth) {
                lowestHealth = card.health;
                bestTarget = target;
            }
        });

        return bestTarget || targets[0];
    }

    // Select best buff target (ally with highest power)
    selectBestBuffTarget(targets) {
        let bestTarget = null;
        let highestPower = 0;

        targets.forEach(target => {
            const card = window.__ow_getCard?.(target.cardId);
            if (card) {
                const power = (card.front_power || 0) + (card.middle_power || 0) + (card.back_power || 0);
                if (power > highestPower) {
                    highestPower = power;
                    bestTarget = target;
                }
            }
        });

        return bestTarget || targets[0];
    }

    // Select highest value target
    selectHighestValueTarget(targets) {
        let bestTarget = null;
        let highestValue = 0;

        targets.forEach(target => {
            const card = window.__ow_getCard?.(target.cardId);
            if (card) {
                const value = (card.health || 0) + (card.front_power || 0) + (card.middle_power || 0) + (card.back_power || 0);
                if (value > highestValue) {
                    highestValue = value;
                    bestTarget = target;
                }
            }
        });

        return bestTarget || targets[0];
    }

    // Select highest power row
    selectHighestPowerRow(rows) {
        let bestRow = null;
        let highestPower = -1;

        rows.forEach(rowId => {
            const row = window.__ow_getRow?.(rowId);
            if (row) {
                const power = row.power || 0;
                if (power > highestPower) {
                    highestPower = power;
                    bestRow = rowId;
                }
            }
        });

        return bestRow ? { rowId: bestRow, rowPosition: bestRow[1] } : { rowId: rows[0], rowPosition: rows[0][1] };
    }

    // Select best row for damage abilities (highest enemy power/card count)
    selectBestDamageRow(rows) {
        let bestRow = null;
        let highestScore = -1;

        rows.forEach(rowId => {
            const row = window.__ow_getRow?.(rowId);
            if (row) {
                const power = row.power || 0;
                const cardCount = row.cardIds?.length || 0;
                // Score = power + (cardCount * 5) to prioritize rows with multiple targets
                const score = power + (cardCount * 5);

                if (score > highestScore) {
                    highestScore = score;
                    bestRow = rowId;
                }
            }
        });

        console.log(`Best damage row: ${bestRow} with score ${highestScore}`);
        return bestRow ? { rowId: bestRow, rowPosition: bestRow[1] } : { rowId: rows[0], rowPosition: rows[0][1] };
    }

    // Select best row for buff abilities (ally row with most cards or lowest health)
    selectBestBuffRow(rows) {
        let bestRow = null;
        let highestScore = -1;

        rows.forEach(rowId => {
            const row = window.__ow_getRow?.(rowId);
            if (row) {
                const cardCount = row.cardIds?.length || 0;
                let healthDeficit = 0;

                // Calculate health deficit for all cards in row
                row.cardIds?.forEach(cardId => {
                    const card = window.__ow_getCard?.(cardId);
                    if (card && card.health > 0) {
                        const maxHealth = window.__ow_getMaxHealth?.(cardId) || card.health;
                        healthDeficit += (maxHealth - card.health);
                    }
                });

                // Prioritize rows with wounded allies or many cards
                const score = (cardCount * 10) + (healthDeficit * 5);

                if (score > highestScore) {
                    highestScore = score;
                    bestRow = rowId;
                }
            }
        });

        console.log(`Best buff row: ${bestRow} with score ${highestScore}`);
        return bestRow ? { rowId: bestRow, rowPosition: bestRow[1] } : { rowId: rows[0], rowPosition: rows[0][1] };
    }

    // Select best row for debuff abilities (highest enemy power)
    selectBestDebuffRow(rows) {
        return this.selectBestDamageRow(rows); // Same logic as damage
    }

    // McCree Dead Eye: Select row with FEWEST enemies (9 damage split among fewer = more damage per target)
    selectBestMcCreeUltimateRow(rows) {
        let bestRow = null;
        let bestScore = -1;

        console.log('McCree Dead Eye: Analyzing rows for optimal damage distribution...');

        rows.forEach(rowId => {
            const row = window.__ow_getRow?.(rowId);
            if (row) {
                const livingEnemies = (row.cardIds || []).filter(cardId => {
                    const card = window.__ow_getCard?.(cardId);
                    return card && card.health > 0;
                });

                const enemyCount = livingEnemies.length;

                if (enemyCount === 0) {
                    console.log(`  ${rowId}: 0 enemies (skipped)`);
                    return; // Skip empty rows
                }

                // Calculate average damage per enemy (9 total damage)
                const avgDamagePerEnemy = 9 / enemyCount;

                // Score = damage per enemy + bonus for killing potential
                // Prefer rows where we can kill enemies (enemies with <=3 HP get killed by 3+ damage)
                let killPotential = 0;
                livingEnemies.forEach(enemyId => {
                    const enemy = window.__ow_getCard?.(enemyId);
                    if (enemy && enemy.health <= avgDamagePerEnemy) {
                        killPotential += 10; // Bonus for potential kills
                    }
                });

                const score = (avgDamagePerEnemy * 10) + killPotential;

                console.log(`  ${rowId}: ${enemyCount} enemies, ${avgDamagePerEnemy.toFixed(1)} dmg/enemy, ${killPotential} kill potential = score ${score.toFixed(1)}`);

                // Add randomness to make it less predictable (±20% variance)
                const randomFactor = 0.8 + (this.aiController.rng.next() * 0.4); // 0.8 to 1.2
                const finalScore = score * randomFactor;

                if (finalScore > bestScore) {
                    bestScore = finalScore;
                    bestRow = rowId;
                }
            }
        });

        console.log(`McCree Dead Eye targeting: ${bestRow} (score: ${bestScore.toFixed(1)})`);
        return bestRow ? { rowId: bestRow, rowPosition: bestRow[1] } : { rowId: rows[0], rowPosition: rows[0][1] };
    }

    // Ana Nano Boost: Select row with MOST heroes (token gives X synergy where X = hero count)
    selectBestAnaUltimateRow(rows) {
        let bestRow = null;
        let bestScore = -1;

        console.log('Ana Nano Boost: Analyzing rows for maximum synergy value...');

        rows.forEach(rowId => {
            const row = window.__ow_getRow?.(rowId);
            if (row) {
                const heroCount = row.cardIds?.length || 0;
                const currentSynergy = row.synergy || 0;

                // Score = hero count (which equals bonus synergy) + current synergy
                // More heroes = more synergy from token
                const synergyGain = heroCount; // Token adds X synergy where X = hero count
                const score = (synergyGain * 10) + (currentSynergy * 2);

                console.log(`  ${rowId}: ${heroCount} heroes = +${synergyGain} synergy, current synergy ${currentSynergy} = score ${score}`);

                // Add slight randomness (±10% variance)
                const randomFactor = 0.9 + (this.aiController.rng.next() * 0.2); // 0.9 to 1.1
                const finalScore = score * randomFactor;

                if (finalScore > bestScore) {
                    bestScore = finalScore;
                    bestRow = rowId;
                }
            }
        });

        console.log(`Ana Nano Boost targeting: ${bestRow} (score: ${bestScore.toFixed(1)})`);
        return bestRow ? { rowId: bestRow, rowPosition: bestRow[1] } : { rowId: rows[0], rowPosition: rows[0][1] };
    }

    // Select best strategic row (for abilities like Lucio that can target any row)
    selectBestStrategicRow(rows) {
        const allyRows = rows.filter(r => r.startsWith('2'));
        const enemyRows = rows.filter(r => r.startsWith('1'));

        // Analyze which side benefits more
        const gameContext = this.analyzeGameContext();

        // If we have wounded allies, buff them
        if (gameContext.allyHealthDeficit > 3) {
            console.log('AI strategic choice: Buff ally row (wounded allies)');
            return this.selectBestBuffRow(allyRows.length > 0 ? allyRows : rows);
        }

        // If enemies are strong, debuff them
        if (gameContext.powerDifferential < -5) {
            console.log('AI strategic choice: Debuff enemy row (losing in power)');
            return this.selectBestDamageRow(enemyRows.length > 0 ? enemyRows : rows);
        }

        // If we have many allies, buff them
        if (gameContext.allyBoardCount > 2) {
            console.log('AI strategic choice: Buff ally row (strong board presence)');
            return this.selectBestBuffRow(allyRows.length > 0 ? allyRows : rows);
        }

        // Default: target enemy row with most cards/power
        console.log('AI strategic choice: Debuff enemy row (default)');
        return this.selectBestDamageRow(enemyRows.length > 0 ? enemyRows : rows);
    }

    // Select best ally row for barrier/buff placement (most allies)
    selectBestAllyRow(rows) {
        let bestRow = null;
        let bestCount = -1;
        rows.forEach(rowId => {
            const row = window.__ow_getRow?.(rowId);
            const cnt = row?.cardIds?.length || 0;
            if (cnt > bestCount) { bestCount = cnt; bestRow = rowId; }
        });
        return bestRow ? { rowId: bestRow, rowPosition: bestRow[1] } : { rowId: rows[0], rowPosition: rows[0][1] };
    }

    // Handle modal choices for AI - returns the INDEX of the chosen option
    handleAIModalChoice(choices, playerHeroId = null) {
        console.log('AI Modal Choice - evaluating:', choices, 'for hero:', playerHeroId);

        if (!choices || choices.length === 0) return 0;

        // If only one choice, pick it
        if (choices.length === 1) return 0;

        // Get hero metadata if available
        let heroMetadata = null;
        if (playerHeroId) {
            const heroId = playerHeroId.slice(1); // Remove player number prefix
            heroMetadata = getAbilityMetadata(heroId, 'onEnter');
            console.log('Hero ability metadata:', heroMetadata);
        }

        // Analyze game state for context-aware decisions
        const gameContext = this.analyzeGameContext();

        // Extract hero ID for hero-specific logic
        const heroId = playerHeroId ? playerHeroId.slice(1) : null;

        // Evaluate each choice and score them
        const scoredChoices = choices.map((choice, index) => {
            let score = 0;

            const desc = (choice.description || choice.title || '').toLowerCase();
            const title = (choice.title || '').toLowerCase();

            // === HERO-SPECIFIC MODAL CHOICE LOGIC ===
            // Baptiste: Prioritize heal when allies wounded, damage when they're healthy
            if (heroId === 'baptiste') {
                if (desc.includes('heal') && gameContext.allyHealthDeficit > 3) {
                    score += 50; // Strong preference for healing when needed
                } else if (desc.includes('damage') && gameContext.allyHealthDeficit <= 1) {
                    score += 40; // Prefer damage when allies are healthy
                }
            }

            // Bastion: Prioritize token on high-value enemy rows, damage otherwise
            if (heroId === 'bastion') {
                if (desc.includes('token')) {
                    // Count enemies in each row to find densest row
                    const enemyRows = ['1f', '1m', '1b'];
                    const maxEnemies = Math.max(...enemyRows.map(r => window.__ow_getRow?.(r)?.cardIds?.length || 0));
                    if (maxEnemies >= 2) {
                        score += 50; // Strong preference for token if enemy has 2+ in a row
                    } else if (maxEnemies >= 1) {
                        score += 40; // Still prefer token for area denial
                    }
                } else if (desc.includes('damage')) {
                    score += 30; // Lower priority for single target damage
                }
            }

            // Ashe: Two-target damage if enemies clustered, single target for precision
            if (heroId === 'ashe') {
                if (desc.includes('two enemies')) {
                    const enemyRows = ['1f', '1m', '1b'];
                    const hasRowWith2Plus = enemyRows.some(r => (window.__ow_getRow?.(r)?.cardIds?.length || 0) >= 2);
                    if (hasRowWith2Plus) {
                        score += 40; // Prefer two-target if enemies are clustered
                    }
                } else if (desc.includes('2 damage')) {
                    score += 35; // Single high-value target
                }
            }

            // Lucio: Prioritize healing token when allies wounded, shuffle otherwise
            if (heroId === 'lucio') {
                if (desc.includes('healing') && gameContext.allyHealthDeficit > 2) {
                    score += 50;
                } else if (desc.includes('shuffle')) {
                    score += 30;
                }
            }

            // Tracer: Prefer dual target when multiple enemies available, single for precision
            if (heroId === 'tracer') {
                if (desc.includes('dual') || desc.includes('two')) {
                    const enemyRows = ['1f', '1m', '1b'];
                    const totalEnemies = enemyRows.reduce((sum, r) => sum + (window.__ow_getRow?.(r)?.cardIds?.length || 0), 0);
                    if (totalEnemies >= 2) {
                        score += 45; // Prefer dual when multiple targets
                    }
                } else if (desc.includes('single') || desc.includes('2 damage')) {
                    score += 35; // Single target for precision
                }
            }

            // Zenyatta: Prefer Discord when enemies present, Harmony for healing
            if (heroId === 'zenyatta') {
                if (desc.includes('discord') && gameContext.enemyCount > 0) {
                    score += 50; // Strong preference for Discord when enemies exist
                } else if (desc.includes('harmony') && gameContext.allyHealthDeficit > 1) {
                    score += 45; // Prefer Harmony when allies need healing
                }
            }

            // Ana: Prefer healing when allies wounded, damage when they're healthy
            if (heroId === 'ana') {
                if (desc.includes('heal') && gameContext.allyHealthDeficit > 2) {
                    score += 50;
                } else if (desc.includes('damage') && gameContext.allyHealthDeficit <= 1) {
                    score += 40;
                }
            }

            // Base scoring from description
            // Damage abilities
            if (desc.includes('damage') || desc.includes('deal')) {
                const damageMatch = desc.match(/(\d+)\s*damage/);
                if (damageMatch) {
                    score += parseInt(damageMatch[1]) * 10;
                } else {
                    score += 30;
                }

                // Bonus if enemies have high health
                if (gameContext.enemyAverageHealth > 5) {
                    score += 20;
                }
            }

            // Healing abilities
            if (desc.includes('heal') || desc.includes('restore')) {
                const healMatch = desc.match(/(\d+)\s*(health|healing)/);
                if (healMatch) {
                    score += parseInt(healMatch[1]) * 8;
                } else {
                    score += 20;
                }

                // Higher priority if allies are wounded
                if (gameContext.allyHealthDeficit > 0) {
                    score += gameContext.allyHealthDeficit * 5;
                }
            }

            // Draw cards
            if (desc.includes('draw')) {
                const drawMatch = desc.match(/draw\s*(\d+)/);
                if (drawMatch) {
                    score += parseInt(drawMatch[1]) * 15;
                } else {
                    score += 25;
                }

                // Higher priority if hand is small
                if (gameContext.handSize < 3) {
                    score += 30;
                }
            }

            // Buff/debuff effects
            if (desc.includes('buff') || desc.includes('gain') || desc.includes('increase') || desc.includes('power')) {
                score += 25;

                // Higher if we have strong board presence
                if (gameContext.allyBoardCount > 2) {
                    score += 15;
                }
            }

            // AOE effects (very valuable)
            if (desc.includes('all') || desc.includes('each') || desc.includes('area') || desc.includes('row')) {
                score += 20;

                // Higher if enemy has many cards
                if (gameContext.enemyBoardCount > 2) {
                    score += 25;
                }
            }

            // Target selection (prefer targeted abilities for precision)
            if (desc.includes('target') || desc.includes('select')) {
                score += 10;
            }

            // Summon/Deploy (good for board presence)
            if (desc.includes('summon') || desc.includes('deploy') || desc.includes('turret')) {
                score += 30;

                // Higher if we have board space
                if (gameContext.allyBoardCount < 4) {
                    score += 15;
                }
            }

            // Movement/repositioning
            if (desc.includes('move') || desc.includes('pull') || desc.includes('push')) {
                score += 15;
            }

            // Protection/immunity
            if (desc.includes('shield') || desc.includes('barrier') || desc.includes('protect') || desc.includes('immortal')) {
                score += 20;

                // Higher if we're losing
                if (gameContext.powerDifferential < -10) {
                    score += 25;
                }
            }

            console.log(`Choice ${index}: "${title}" - base score: ${score}`);
            return { index, score, choice };
        });

        // Sort by score descending
        scoredChoices.sort((a, b) => b.score - a.score);

        console.log('Sorted choices:', scoredChoices.map(c => `[${c.index}] ${c.choice.title}: ${c.score}`));

        const difficulty = this.aiController.difficulty;

        let chosenIndex;
        if (difficulty === 'easy') {
            // Easy: 40% best choice, 60% random
            if (this.aiController.rng.next() < 0.4) {
                chosenIndex = scoredChoices[0].index;
            } else {
                chosenIndex = Math.floor(this.aiController.rng.next() * choices.length);
            }
        } else if (difficulty === 'medium') {
            // Medium: 70% best, 20% second best, 10% random
            const rand = this.aiController.rng.next();
            if (rand < 0.7) {
                chosenIndex = scoredChoices[0].index;
            } else if (rand < 0.9 && scoredChoices.length > 1) {
                chosenIndex = scoredChoices[1].index;
            } else {
                chosenIndex = Math.floor(this.aiController.rng.next() * choices.length);
            }
        } else {
            // Hard: 90% best, 8% second best, 2% random
            const rand = this.aiController.rng.next();
            if (rand < 0.9) {
                chosenIndex = scoredChoices[0].index;
            } else if (rand < 0.98 && scoredChoices.length > 1) {
                chosenIndex = scoredChoices[1].index;
            } else {
                chosenIndex = Math.floor(this.aiController.rng.next() * choices.length);
            }
        }

        console.log(`AI chose option ${chosenIndex}: "${choices[chosenIndex]?.title}"`);
        return chosenIndex;
    }

    // Analyze game context for better modal decisions
    analyzeGameContext() {
        const context = {
            handSize: 0,
            allyBoardCount: 0,
            enemyBoardCount: 0,
            allyHealthDeficit: 0,
            enemyAverageHealth: 0,
            powerDifferential: 0,
        };

        // Get AI hand size
        const handRow = window.__ow_getRow?.('player2hand');
        context.handSize = handRow?.cardIds?.length || 0;

        // Count board presence and health
        const allyRows = ['2f', '2m', '2b'];
        const enemyRows = ['1f', '1m', '1b'];

        let allyTotalHealth = 0;
        let allyMaxHealth = 0;
        let enemyTotalHealth = 0;
        let enemyCount = 0;

        allyRows.forEach(rowId => {
            const row = window.__ow_getRow?.(rowId);
            if (row?.cardIds) {
                row.cardIds.forEach(cardId => {
                    const card = window.__ow_getCard?.(cardId);
                    if (card && card.health > 0) {
                        context.allyBoardCount++;
                        allyTotalHealth += card.health;
                        const maxHealth = window.__ow_getMaxHealth?.(cardId) || card.health;
                        allyMaxHealth += maxHealth;
                    }
                });
            }
        });

        enemyRows.forEach(rowId => {
            const row = window.__ow_getRow?.(rowId);
            if (row?.cardIds) {
                row.cardIds.forEach(cardId => {
                    const card = window.__ow_getCard?.(cardId);
                    if (card && card.health > 0) {
                        context.enemyBoardCount++;
                        enemyTotalHealth += card.health;
                        enemyCount++;
                    }
                });
            }
        });

        context.allyHealthDeficit = allyMaxHealth - allyTotalHealth;
        context.enemyAverageHealth = enemyCount > 0 ? enemyTotalHealth / enemyCount : 0;

        // Calculate power differential
        const player2Power = this.aiController.calculatePlayerPower(2);
        const player1Power = this.aiController.calculatePlayerPower(1);
        context.powerDifferential = player2Power - player1Power;

        console.log('Game context:', context);
        return context;
    }

    // Override targeting functions for AI via window wrappers
    setupAITargetingOverrides() {
        const self = this;

        // Store original targeting functions
        window.__ow_originalSelectCardTarget = targeting.selectCardTarget;
        window.__ow_originalSelectRowTarget = targeting.selectRowTarget;

        // Create wrapper functions that check if AI is active
        window.__ow_selectCardTarget = async function(options = {}) {
            console.log('selectCardTarget called, isAITurn:', self.isAITurn, 'aiTriggering:', window.__ow_aiTriggering);
            if (self.isAITurn || window.__ow_aiTriggering) {
                console.log('AI selecting card target');
                const result = await self.handleAITargeting('card', options);
                // Safety check: ensure result has valid cardId
                if (result && (!result.cardId || typeof result.cardId !== 'string')) {
                    console.warn('AI targeting returned invalid result:', result);
                    return null;
                }
                return result;
            }
            return await window.__ow_originalSelectCardTarget(options);
        };

        window.__ow_selectRowTarget = async function(options = {}) {
            console.log('selectRowTarget called, isAITurn:', self.isAITurn, 'aiTriggering:', window.__ow_aiTriggering);
            if (self.isAITurn || window.__ow_aiTriggering) {
                console.log('AI selecting row target');
                return await self.handleAITargeting('row', options);
            }
            return await window.__ow_originalSelectRowTarget(options);
        };

        console.log('AI targeting overrides installed on window');
    }

    // Cleanup AI targeting overrides
    cleanupAITargetingOverrides() {
        // Restore original targeting functions
        // This would restore the original functions
    }

    // Smart dead card cleanup - considers Mercy probability, board state, and hand value
    async smartDeadCardCleanup() {
        try {
            const handRow = window.__ow_getRow?.('player2hand');
            const handIds = handRow?.cardIds || [];
            const handSize = handIds.length;
            
            // Count dead cards on board
            const allyRows = ['2f','2m','2b'];
            const deadCards = [];
            let totalBoardSlots = 0;
            let livingCards = 0;
            
            for (const r of allyRows) {
                const row = window.__ow_getRow?.(r);
                if (!row?.cardIds) continue;
                totalBoardSlots += row.cardIds.length;
                for (const pid of row.cardIds) {
                    const card = window.__ow_getCard?.(pid);
                    if (card) {
                        if (card.health <= 0) {
                            deadCards.push({ cardId: pid, rowId: r, card });
                        } else {
                            livingCards++;
                        }
                    }
                }
            }
            
            if (deadCards.length === 0) return;
            
            console.log(`AI dead card analysis: ${deadCards.length} dead, ${livingCards} living, ${handSize} in hand`);
            
            // Check if Mercy is in hand or on board
            const hasMercyInHand = handIds.some(id => id.endsWith('mercy'));
            const hasMercyOnBoard = deadCards.some(d => d.cardId.endsWith('mercy')) || 
                allyRows.some(r => {
                    const row = window.__ow_getRow?.(r);
                    return row?.cardIds?.some(id => id.endsWith('mercy'));
                });
            
            // Calculate Mercy probability based on deck state
            const mercyProbability = this.calculateMercyProbability(handIds, hasMercyInHand, hasMercyOnBoard);
            
            // Calculate board pressure (how much we need the space)
            const boardPressure = this.calculateBoardPressure(handSize, livingCards, totalBoardSlots);
            
            // Calculate dead card value (what we'd lose by cleaning them)
            const deadCardValue = this.calculateDeadCardValue(deadCards);
            
            console.log(`Mercy probability: ${mercyProbability}, Board pressure: ${boardPressure}, Dead value: ${deadCardValue}`);
            
            // Decision logic
            const shouldCleanup = this.shouldCleanupDeadCards(mercyProbability, boardPressure, deadCardValue, deadCards.length);
            
            if (shouldCleanup) {
                // Clean up the least valuable dead card
                const sortedDead = deadCards.sort((a, b) => this.scoreDeadCard(a.card) - this.scoreDeadCard(b.card));
                const toRemove = sortedDead[0];
                
                window.__ow_dispatch?.({ type: 'remove-dead-card', payload: { cardId: toRemove.cardId } });
                console.log(`AI smart cleanup: removed ${toRemove.cardId} (score: ${this.scoreDeadCard(toRemove.card)})`);
            } else {
                console.log('AI preserving dead cards for potential Mercy rez');
            }
            
        } catch (e) {
            console.warn('Smart dead card cleanup error:', e);
        }
    }
    
    // Calculate probability that Mercy will be available for rez
    calculateMercyProbability(handIds, hasMercyInHand, hasMercyOnBoard) {
        if (hasMercyInHand) return 0.9; // Very high if in hand
        if (hasMercyOnBoard) return 0.7; // High if on board (could use ultimate)
        
        // Estimate based on deck size and typical Mercy frequency
        // This is a rough heuristic - in a real game you'd track deck composition
        const deckSize = 30; // Approximate deck size
        const mercyCount = 1; // Typically 1 Mercy per deck
        const remainingDeck = deckSize - handIds.length;
        
        if (remainingDeck <= 0) return 0;
        return Math.min(0.4, mercyCount / remainingDeck); // Cap at 40% max
    }
    
    // Calculate how much we need board space
    calculateBoardPressure(handSize, livingCards, totalSlots) {
        const maxSlots = 12; // 4 per row × 3 rows
        const availableSlots = maxSlots - livingCards;
        const handValue = handSize * 0.3; // Each card in hand is worth some pressure
        
        // High pressure if we have many cards in hand but few board slots
        return handValue / Math.max(1, availableSlots);
    }
    
    // Calculate value of dead cards (what we'd lose by cleaning them)
    calculateDeadCardValue(deadCards) {
        return deadCards.reduce((total, dead) => total + this.scoreDeadCard(dead.card), 0);
    }
    
    // Score a dead card for resurrection value
    scoreDeadCard(card) {
        let score = 0;
        
        // Role priority
        if (card.role === 'Offense' || card.role === 'Damage') score += 50;
        else if (card.role === 'Support') score += 35;
        else if (card.role === 'Defense') score += 25;
        else if (card.role === 'Tank') score += 15;
        
        // Power value
        const power = (card.front_power || 0) + (card.middle_power || 0) + (card.back_power || 0);
        score += power * 5;
        
        // Health value
        score += (card.maxHealth || card.health || 4) * 3;
        
        // Ultimate value
        if (['pharah', 'hanzo', 'reinhardt', 'zarya', 'dva', 'ashe', 'tracer', 'genji'].includes(card.id)) {
            score += 30;
        }
        
        return score;
    }
    
    // Decide whether to cleanup dead cards
    shouldCleanupDeadCards(mercyProb, boardPressure, deadValue, deadCount) {
        // Always cleanup if no Mercy possibility
        if (mercyProb < 0.1) return true;
        
        // Always cleanup if board is very pressured and dead cards are low value
        if (boardPressure > 2.0 && deadValue < 100) return true;
        
        // Cleanup if we have many dead cards and low Mercy probability
        if (deadCount >= 3 && mercyProb < 0.3) return true;
        
        // Cleanup if board pressure is high and Mercy probability is moderate
        if (boardPressure > 1.5 && mercyProb < 0.5) return true;
        
        // Don't cleanup if Mercy probability is high and dead cards are valuable
        if (mercyProb > 0.6 && deadValue > 150) return false;
        
        // Default: be conservative but not overly so
        return mercyProb < 0.4;
    }

    // Clear dead allies helper when no Mercy is available (legacy function)
    cleanupDeadAlliesIfNoMercy() {
        try {
            const handRow = window.__ow_getRow?.('player2hand');
            const handIds = handRow?.cardIds || [];
            const hasMercyInHand = handIds.some(id => id.endsWith('mercy'));
            if (hasMercyInHand) return;
            const allyRows = ['2f','2m','2b'];
            for (const r of allyRows) {
                const row = window.__ow_getRow?.(r);
                if (!row?.cardIds) continue;
                for (const pid of row.cardIds) {
                    const card = window.__ow_getCard?.(pid);
                    if (card && card.health <= 0) {
                        // Use existing dispatcher to remove dead
                        window.__ow_dispatch?.({ type: 'remove-dead-card', payload: { cardId: pid } });
                        console.log('AI removed dead ally card:', pid);
                        return; // remove one per turn to keep tempo
                    }
                }
            }
        } catch {}
    }

    // Check if D.Va was returned to hand (from MEKA death) and play her immediately
    async checkAndPlayReturnedDva() {
        try {
            const handRow = window.__ow_getRow?.('player2hand');
            const handIds = handRow?.cardIds || [];
            const dvaCardId = '2dva';

            // Check if D.Va is in hand
            if (!handIds.includes(dvaCardId)) {
                return null;
            }

            // Check if D.Va was just returned (has the special return flag or we just lost MEKA)
            const card = window.__ow_getCard?.(dvaCardId);
            if (!card) return null;

            // Check if MEKA is no longer on board (indicating it died/was replaced)
            const allyRows = ['2f','2m','2b'];
            const hasMekaOnBoard = allyRows.some(r => {
                const row = window.__ow_getRow?.(r);
                return row?.cardIds?.some(id => id.endsWith('dvameka'));
            });

            // If MEKA is gone and D.Va is in hand, she was likely returned - play her!
            if (!hasMekaOnBoard) {
                console.log('AI detected returned D.Va from MEKA death - playing immediately');

                // Find best available row (prefer middle for safety)
                const rowCounts = {
                    middle: window.__ow_getRow?.('2m')?.cardIds?.length || 0,
                    front: window.__ow_getRow?.('2f')?.cardIds?.length || 0,
                    back: window.__ow_getRow?.('2b')?.cardIds?.length || 0
                };

                const availableRows = Object.entries(rowCounts)
                    .filter(([_, count]) => count < 4)
                    .sort((a, b) => a[1] - b[1]);

                if (availableRows.length > 0) {
                    const bestRow = availableRows[0][0];
                    await this.playCard(dvaCardId, bestRow);
                    return dvaCardId;
                }
            }

            return null;
        } catch (error) {
            console.error('Error checking/playing returned D.Va:', error);
            return null;
        }
    }

    // Auto-play Special and Turret cards immediately when in hand
    async autoPlaySpecialAndTurretCards() {
        try {
            const handRow = window.__ow_getRow?.('player2hand');
            const handIds = handRow?.cardIds || [];

            if (handIds.length === 0) return;

            // Find all Special and Turret cards in hand
            const priorityCards = [];
            for (const cardId of handIds) {
                const heroId = cardId.slice(1); // Remove player number
                const heroData = data.heroes?.[heroId];

                if (heroData && (heroData.attribute === 'Special' || heroData.attribute === 'Turret')) {
                    priorityCards.push({ cardId, heroId, attribute: heroData.attribute });
                }
            }

            if (priorityCards.length === 0) return;

            console.log(`AI found ${priorityCards.length} Special/Turret cards to auto-play:`, priorityCards.map(c => c.heroId));

            // Play each priority card
            for (const { cardId, heroId, attribute } of priorityCards) {
                // Find best available row
                const rowCounts = {
                    middle: window.__ow_getRow?.('2m')?.cardIds?.length || 0,
                    front: window.__ow_getRow?.('2f')?.cardIds?.length || 0,
                    back: window.__ow_getRow?.('2b')?.cardIds?.length || 0
                };

                // Turrets prefer back row, Special cards prefer middle/front
                let targetRow;
                if (attribute === 'Turret') {
                    // Turret: prefer back, then middle, then front
                    if (rowCounts.back < 4) targetRow = 'back';
                    else if (rowCounts.middle < 4) targetRow = 'middle';
                    else if (rowCounts.front < 4) targetRow = 'front';
                } else {
                    // Special: prefer middle, then front, then back
                    if (rowCounts.middle < 4) targetRow = 'middle';
                    else if (rowCounts.front < 4) targetRow = 'front';
                    else if (rowCounts.back < 4) targetRow = 'back';
                }

                if (targetRow) {
                    console.log(`AI auto-playing ${attribute} card ${heroId} to ${targetRow}`);
                    await this.playCard(cardId, targetRow);
                    await this.delay(800); // Brief delay between auto-plays
                } else {
                    console.log(`AI cannot auto-play ${heroId} - no board space available`);
                }
            }
        } catch (error) {
            console.error('Error auto-playing Special/Turret cards:', error);
        }
    }

    // Opportunistic on-enter reposition usage (Lifeweaver/Symmetra) when payoff exists
    async tryRepositionIfBeneficial() {
        try {
            const allyRows = ['2f','2m','2b'];
            // Detect if a support is trapped front or a damage is back with low payoff; very simple heuristic
            const mispositions = [];
            for (const r of allyRows) {
                const row = window.__ow_getRow?.(r);
                if (!row?.cardIds) continue;
                for (const pid of row.cardIds) {
                    const c = window.__ow_getCard?.(pid);
                    if (!c) continue;
                    const role = (c.role || c.class || '').toLowerCase();
                    if ((role === 'support' && r.endsWith('f')) || (role === 'damage' && r.endsWith('b'))) {
                        mispositions.push({ pid, r });
                    }
                }
            }
            if (mispositions.length === 0) return false;
            // If Symmetra or Lifeweaver in hand, attempt relocation
            const handIds = window.__ow_getRow?.('player2hand')?.cardIds || [];
            const hasSym = handIds.some(id => id.endsWith('symmetra'));
            const hasLife = handIds.some(id => id.endsWith('lifeweaver'));
            if (!hasSym && !hasLife) return false;
            // Very light implementation; real reposition would call their abilities; here we skip to avoid modal
            return false;
        } catch { return false; }
    }

    // Manage Reinhardt and Winston barrier toggles based on board threats
    async manageBarrierToggles() {
        try {
            const allyRows = ['2f','2m','2b'];
            const allies = allyRows.flatMap(r => (window.__ow_getRow?.(r)?.cardIds || []).map(id => ({ cardId: id, rowId: r })));

            // Find Reinhardt and Winston on board
            const reinhardt = allies.find(a => a.cardId.endsWith('reinhardt'));
            const winston = allies.find(a => a.cardId.endsWith('winston'));

            if (!reinhardt && !winston) return;

            // Analyze enemy threats in opposing rows
            const enemyRows = ['1f','1m','1b'];
            let totalEnemyPower = 0;
            let enemyCardCount = 0;

            for (const r of enemyRows) {
                const row = window.__ow_getRow?.(r);
                if (!row) continue;
                totalEnemyPower += (row.power?.f || 0) + (row.power?.m || 0) + (row.power?.b || 0);
                enemyCardCount += row.cardIds?.length || 0;
            }

            // Determine if barriers should be enabled
            const highThreat = totalEnemyPower >= 12 || enemyCardCount >= 4;
            console.log(`Barrier check: Enemy power=${totalEnemyPower}, cards=${enemyCardCount}, highThreat=${highThreat}`);

            // Manage Reinhardt's Barrier Field
            if (reinhardt) {
                const reinhardtCard = window.__ow_getCard?.(reinhardt.cardId);
                const hasBarrier = Array.isArray(reinhardtCard?.effects) &&
                    reinhardtCard.effects.some(e => e?.id === 'barrier-field' && e?.type === 'barrier');

                if (hasBarrier) {
                    const barrier = reinhardtCard.effects.find(e => e?.id === 'barrier-field' && e?.type === 'barrier');
                    const isAbsorbing = barrier?.absorbing;

                    // ALWAYS enable barrier if not already absorbing (protection is always valuable)
                    if (!isAbsorbing) {
                        console.log('AI enabling Reinhardt barrier (ALWAYS ON for column protection)');
                        const reinhardtFunctions = window.__ow_getReinhardtFunctions?.();
                        reinhardtFunctions?.toggleBarrierAbsorption?.(reinhardt.cardId);
                    }
                }
            }

            // Manage Winston's Barrier Protector
            if (winston) {
                const winstonCard = window.__ow_getCard?.(winston.cardId);
                const hasBarrier = Array.isArray(winstonCard?.effects) &&
                    winstonCard.effects.some(e => e?.id === 'barrier-protector' && e?.type === 'barrier');

                if (hasBarrier) {
                    const barrier = winstonCard.effects.find(e => e?.id === 'barrier-protector' && e?.type === 'barrier');
                    const isActive = barrier?.active;

                    // ALWAYS enable barrier if not already active (protection is always valuable)
                    if (!isActive) {
                        console.log('AI enabling Winston barrier (ALWAYS ON for ally protection)');
                        // Import and call Winston's toggle function
                        const winstonModule = await import('../abilities/heroes/winston');
                        winstonModule.toggleBarrierProtector(winston.cardId);
                    }
                }
            }
        } catch (error) {
            console.error('Barrier management error:', error);
        }
    }

    // Check if Mercy is on board with ultimate ready and there are valuable dead allies to resurrect
    async tryMercyResurrection() {
        try {
            const allyRows = ['2f','2m','2b'];
            const allies = allyRows.flatMap(r => (window.__ow_getRow?.(r)?.cardIds || []).map(id => ({ cardId: id, rowId: r })));

            // Check if Mercy is on board and has ultimate ready
            const mercy = allies.find(a => a.cardId.endsWith('mercy'));
            if (!mercy) return false;

            // Check if Mercy's ultimate is ready
            const isReady = typeof window.__ow_isUltimateReady === 'function' ? window.__ow_isUltimateReady(mercy.cardId) : false;
            if (!isReady) return false;

            // Find all dead allies on the board
            const deadAllies = [];
            for (const r of allyRows) {
                const row = window.__ow_getRow?.(r);
                if (!row?.cardIds) continue;
                for (const cardId of row.cardIds) {
                    const card = window.__ow_getCard?.(cardId);
                    if (card && card.health <= 0) {
                        deadAllies.push({ cardId, rowId: r, card });
                    }
                }
            }

            if (deadAllies.length === 0) {
                console.log('Mercy: No dead allies to resurrect');
                return false;
            }

            console.log(`Mercy: Found ${deadAllies.length} dead allies to consider for resurrection`);

            // Score each dead ally for resurrection priority
            const scored = deadAllies.map(ally => {
                const card = ally.card;
                let score = 0;

                // Role-based priority: Offense > Support > Defense > Tank
                if (card.role === 'Offense' || card.role === 'Damage') score += 50; // Offense highest priority
                if (card.role === 'Support') score += 35; // Support second
                if (card.role === 'Defense') score += 25; // Defense third
                if (card.role === 'Tank') score += 15; // Tank last priority

                // Power-based priority
                const power = (card.front_power || 0) + (card.middle_power || 0) + (card.back_power || 0);
                score += power * 5; // Multiply power for emphasis

                // Health-based priority (higher max health = more valuable)
                score += (card.maxHealth || card.health || 4) * 3;

                // Ultimate value (heroes with strong ultimates)
                if (['pharah', 'hanzo', 'reinhardt', 'zarya', 'dva', 'ashe'].includes(card.id)) {
                    score += 30; // Bonus for heroes with powerful ultimates
                }

                return { ...ally, score };
            });

            // Sort by score (highest first)
            scored.sort((a, b) => b.score - a.score);

            const bestTarget = scored[0];
            console.log(`Mercy: Best resurrection target is ${bestTarget.cardId} (score: ${bestTarget.score})`);

            // Use Mercy's ultimate
            window.__ow_aiTriggering = true;
            window.__ow_currentAICardId = mercy.cardId;
            window.__ow_currentAIHero = 'mercy';
            window.__ow_currentAIAbility = 'ultimate';

            try {
                const success = await window.__ow_useUltimate(mercy.cardId, bestTarget);
                if (success) {
                    console.log(`Mercy: Successfully resurrected ${bestTarget.cardId}`);
                    try { window.__ow_aiActionsThisTurn = (window.__ow_aiActionsThisTurn || 0) + 1; } catch {}
                    return true;
                }
            } finally {
                window.__ow_aiTriggering = false;
                window.__ow_currentAICardId = null;
                window.__ow_currentAIHero = null;
                window.__ow_currentAIAbility = null;
            }

            return false;
        } catch (error) {
            console.error('Mercy resurrection error:', error);
            return false;
        }
    }

    // Check if ultimate spawned a special card and play it immediately
    async checkAndPlaySpawnedSpecialCard(heroId) {
        try {
            // Map heroes to their spawned special cards
            const specialCardMap = {
                'ashe': 'bob',
                'dva': 'dvameka',
                'torbjorn': 'turret',
                'ramattra': 'nemesis'
            };

            const expectedSpecialCard = specialCardMap[heroId];
            if (!expectedSpecialCard) {
                return null; // This hero doesn't spawn special cards
            }

            console.log(`AI checking for spawned special card: ${expectedSpecialCard} from ${heroId} ultimate`);

            // Wait a moment for the special card to be added to hand
            await new Promise(resolve => setTimeout(resolve, 500));

            // Check if the special card is in AI's hand
            const handRow = window.__ow_getRow?.('player2hand');
            const handIds = handRow?.cardIds || [];
            const specialCardId = `2${expectedSpecialCard}`;

            if (!handIds.includes(specialCardId)) {
                console.log(`Special card ${expectedSpecialCard} not found in hand after ${heroId} ultimate`);
                return null;
            }

            console.log(`AI detected spawned special card: ${specialCardId} - MUST PLAY IMMEDIATELY`);

            // Determine best row for the special card
            let bestRow = 'middle'; // Default

            // BOB: Front row for tanking
            if (expectedSpecialCard === 'bob') {
                bestRow = 'front';
            }
            // MEKA: Front row for tanking
            else if (expectedSpecialCard === 'dvameka') {
                bestRow = 'front';
            }
            // Turret: Back row for safety
            else if (expectedSpecialCard === 'turret') {
                bestRow = 'back';
            }

            // Check row capacity and adjust if needed
            const rowCounts = {
                front: window.__ow_getRow?.('2f')?.cardIds?.length || 0,
                middle: window.__ow_getRow?.('2m')?.cardIds?.length || 0,
                back: window.__ow_getRow?.('2b')?.cardIds?.length || 0
            };

            // If preferred row is full, find least-filled row
            if (rowCounts[bestRow] >= 4) {
                const availableRows = Object.entries(rowCounts)
                    .filter(([_, count]) => count < 4)
                    .sort((a, b) => a[1] - b[1]);

                if (availableRows.length > 0) {
                    bestRow = availableRows[0][0];
                    console.log(`AI: Preferred row full, using ${bestRow} row instead`);
                } else {
                    console.log('AI cannot play special card: all rows full');
                    return null;
                }
            }

            // Play the special card immediately - this is MANDATORY
            console.log(`AI MANDATORY PLAY: ${specialCardId} in ${bestRow} row`);
            const playResult = await this.playCard(specialCardId, bestRow);
            
            if (playResult) {
                console.log(`AI successfully played mandatory special card: ${specialCardId}`);
                return specialCardId;
            } else {
                console.error(`AI failed to play mandatory special card: ${specialCardId}`);
                return null;
            }
        } catch (error) {
            console.error('Error checking/playing spawned special card:', error);
            return null;
        }
    }

    // Heuristic: try to use abilities (ability1/ability2) this turn if beneficial
    async tryUseAbilitiesThisTurn() {
        try {
            const turnNumber = this.aiController?._aiTurnsTaken || 0;
            console.log(`\n========================================`);
            console.log(`AI ABILITY CHECK - Turn ${turnNumber + 1}`);
            console.log(`========================================`);

            const allyRows = ['2f','2m','2b'];
            const allies = allyRows.flatMap(r => (window.__ow_getRow?.(r)?.cardIds || []).map(id => ({ cardId: id, rowId: r })));
            console.log(`AI board: ${allies.length} allies`);
            if (allies.length === 0) {
                console.log('❌ No allies on board, skipping ability check\n');
                return false;
            }

            // Check each ally for available abilities
            const abilityUsers = [];
            for (const ally of allies) {
                const card = window.__ow_getCard?.(ally.cardId);
                if (card) {
                    // Check for ability1
                    if (card.ability1 && !card.ability1Used) {
                        abilityUsers.push({
                            cardId: ally.cardId,
                            rowId: ally.rowId,
                            ability: 'ability1',
                            card: card
                        });
                    }
                    // Check for ability2
                    if (card.ability2 && !card.ability2Used) {
                        abilityUsers.push({
                            cardId: ally.cardId,
                            rowId: ally.rowId,
                            ability: 'ability2',
                            card: card
                        });
                    }
                }
            }

            console.log(`AI found ${abilityUsers.length} available abilities`);
            if (abilityUsers.length === 0) {
                console.log('AI: No abilities available, skipping');
                return false;
            }

            // Analyze game state for context-aware ability usage
            const gameContext = this.analyzeGameContext();
            const difficulty = this.aiController?.difficulty || 'hard';

            // Score each ability based on game state
            const scoredAbilities = abilityUsers.map(abilityUser => {
                let score = 0;
                const heroId = abilityUser.cardId.slice(1);
                const ability = abilityUser.ability;
                const card = abilityUser.card;

                // Base score for having an ability available
                score += 20;

                // Hero-specific ability scoring
                if (heroId === 'reinhardt' && ability === 'ability1') {
                    // Reinhardt's barrier - use when enemies are threatening
                    if (gameContext.enemyCount >= 2) {
                        score += 40;
                    }
                } else if (heroId === 'winston' && ability === 'ability1') {
                    // Winston's barrier - use when allies need protection
                    if (gameContext.allyHealthDeficit > 2) {
                        score += 35;
                    }
                } else if (heroId === 'genji' && ability === 'ability1') {
                    // Genji's deflect - use when enemies are attacking
                    if (gameContext.enemyCount >= 1) {
                        score += 30;
                    }
                } else if (heroId === 'tracer' && ability === 'ability1') {
                    // Tracer's blink - use for positioning
                    score += 25;
                } else if (heroId === 'pharah' && ability === 'ability1') {
                    // Pharah's jump jet - use for positioning
                    score += 25;
                } else if (heroId === 'mercy' && ability === 'ability1') {
                    // Mercy's guardian angel - use when allies need healing
                    if (gameContext.allyHealthDeficit > 1) {
                        score += 35;
                    }
                } else if (heroId === 'lucio' && ability === 'ability1') {
                    // Lucio's speed boost - use when allies need positioning
                    score += 30;
                } else if (heroId === 'zenyatta' && ability === 'ability1') {
                    // Zenyatta's orb - use when enemies are present
                    if (gameContext.enemyCount >= 1) {
                        score += 30;
                    }
                } else if (heroId === 'ana' && ability === 'ability1') {
                    // Ana's sleep dart - use when enemies are threatening
                    if (gameContext.enemyCount >= 1) {
                        score += 35;
                    }
                } else if (heroId === 'baptiste' && ability === 'ability1') {
                    // Baptiste's immortality field - use when allies are in danger
                    if (gameContext.allyHealthDeficit > 2) {
                        score += 40;
                    }
                } else if (heroId === 'moira' && ability === 'ability1') {
                    // Moira's fade - use for positioning or escape
                    score += 25;
                } else if (heroId === 'brigitte' && ability === 'ability1') {
                    // Brigitte's shield bash - use when enemies are close
                    if (gameContext.enemyCount >= 1) {
                        score += 30;
                    }
                } else if (heroId === 'sigma' && ability === 'ability1') {
                    // Sigma's kinetic grasp - use when enemies are attacking
                    if (gameContext.enemyCount >= 1) {
                        score += 30;
                    }
                } else if (heroId === 'doomfist' && ability === 'ability1') {
                    // Doomfist's seismic slam - use for damage
                    if (gameContext.enemyCount >= 1) {
                        score += 35;
                    }
                } else if (heroId === 'hanzo' && ability === 'ability1') {
                    // Hanzo's storm arrows - use for damage
                    if (gameContext.enemyCount >= 1) {
                        score += 30;
                    }
                } else if (heroId === 'widowmaker' && ability === 'ability1') {
                    // Widowmaker's grappling hook - use for positioning
                    score += 25;
                } else if (heroId === 'ashe' && ability === 'ability1') {
                    // Ashe's coach gun - use for positioning
                    score += 25;
                } else if (heroId === 'sombra' && ability === 'ability1') {
                    // Sombra's translocator - use for positioning
                    score += 25;
                } else if (heroId === 'echo' && ability === 'ability1') {
                    // Echo's flight - use for positioning
                    score += 25;
                } else if (heroId === 'ramattra' && ability === 'ability1') {
                    // Ramattra's nemesis form - use when enemies are present
                    if (gameContext.enemyCount >= 1) {
                        score += 30;
                    }
                } else if (heroId === 'junkerqueen' && ability === 'ability1') {
                    // Junker Queen's commanding shout - use when allies need buffs
                    if (gameContext.allyCount >= 2) {
                        score += 30;
                    }
                } else if (heroId === 'mauga' && ability === 'ability1') {
                    // Mauga's overrun - use for damage
                    if (gameContext.enemyCount >= 1) {
                        score += 30;
                    }
                } else if (heroId === 'lifeweaver' && ability === 'ability1') {
                    // Lifeweaver's petal platform - use for positioning
                    score += 25;
                } else if (heroId === 'hazard' && ability === 'ability1') {
                    // Hazard's trap - use for area denial
                    if (gameContext.enemyCount >= 1) {
                        score += 30;
                    }
                } else if (heroId === 'torbjorn' && ability === 'ability1') {
                    // Torbjorn's overload - use for damage
                    if (gameContext.enemyCount >= 1) {
                        score += 30;
                    }
                } else if (heroId === 'orisa' && ability === 'ability1') {
                    // Orisa's fortify - use when taking damage
                    if (gameContext.enemyCount >= 1) {
                        score += 30;
                    }
                } else if (heroId === 'dva' && ability === 'ability1') {
                    // D.Va's defense matrix - use when enemies are attacking
                    if (gameContext.enemyCount >= 1) {
                        score += 30;
                    }
                } else if (heroId === 'roadhog' && ability === 'ability1') {
                    // Roadhog's take a breather - use when low on health
                    if (card.health < card.maxHealth * 0.6) {
                        score += 40;
                    }
                } else if (heroId === 'zarya' && ability === 'ability1') {
                    // Zarya's bubble - use when allies need protection
                    if (gameContext.allyHealthDeficit > 1) {
                        score += 35;
                    }
                } else if (heroId === 'soldier76' && ability === 'ability1') {
                    // Soldier 76's sprint - use for positioning
                    score += 25;
                } else if (heroId === 'reaper' && ability === 'ability1') {
                    // Reaper's wraith form - use for escape
                    if (card.health < card.maxHealth * 0.5) {
                        score += 35;
                    }
                } else if (heroId === 'junkrat' && ability === 'ability1') {
                    // Junkrat's concussion mine - use for damage
                    if (gameContext.enemyCount >= 1) {
                        score += 30;
                    }
                } else if (heroId === 'mei' && ability === 'ability1') {
                    // Mei's ice wall - use for area denial
                    if (gameContext.enemyCount >= 1) {
                        score += 30;
                    }
                } else if (heroId === 'symmetra' && ability === 'ability1') {
                    // Symmetra's teleporter - use for positioning
                    score += 25;
                } else if (heroId === 'bastion' && ability === 'ability1') {
                    // Bastion's reconfigure - use for damage
                    if (gameContext.enemyCount >= 1) {
                        score += 30;
                    }
                }

                // Add randomness based on difficulty
                const randomFactor = 0.8 + (this.aiController.rng.next() * 0.4); // 0.8 to 1.2
                score *= randomFactor;

                return { ...abilityUser, score };
            });

            // Sort by score and pick the best ability
            scoredAbilities.sort((a, b) => b.score - a.score);
            const bestAbility = scoredAbilities[0];

            // Only use ability if score is above threshold
            const threshold = difficulty === 'easy' ? 30 : difficulty === 'medium' ? 40 : 50;
            if (bestAbility.score < threshold) {
                console.log(`AI: Best ability score ${bestAbility.score} below threshold ${threshold}, skipping`);
                return false;
            }

            console.log(`✅ AI using ${bestAbility.ability} on ${bestAbility.cardId} (score: ${bestAbility.score.toFixed(1)})`);

            // Execute the ability
            try {
                window.__ow_aiTriggering = true;
                window.__ow_currentAICardId = bestAbility.cardId;
                window.__ow_currentAIHero = bestAbility.cardId.slice(1);
                window.__ow_currentAIAbility = bestAbility.ability;

                // Use the ability via the bridge
                if (typeof window.__ow_useAbility === 'function') {
                    const success = await window.__ow_useAbility(bestAbility.cardId, bestAbility.ability);
                    if (success) {
                        console.log(`AI successfully used ${bestAbility.ability} on ${bestAbility.cardId}`);
                        try { window.__ow_aiActionsThisTurn = (window.__ow_aiActionsThisTurn || 0) + 1; } catch {}
                        return true;
                    } else {
                        console.log(`AI failed to use ${bestAbility.ability} on ${bestAbility.cardId}`);
                    }
                } else {
                    console.log('AI: window.__ow_useAbility function not available');
                }
            } catch (error) {
                console.error('AI ability execution error:', error);
            } finally {
                // Clear AI context
                window.__ow_aiTriggering = false;
                window.__ow_currentAICardId = null;
                window.__ow_currentAIHero = null;
                window.__ow_currentAIAbility = null;
            }

            return false;
        } catch (error) {
            console.error('AI ability check error:', error);
            return false;
        }
    }

    // Heuristic: try to use one ultimate this turn if beneficial or randomly
    async tryUseUltimateThisTurn() {
        try {
            const turnNumber = this.aiController?._aiTurnsTaken || 0;
            console.log(`\n========================================`);
            console.log(`AI ULTIMATE CHECK - Turn ${turnNumber + 1}`);
            console.log(`========================================`);

            const allyRows = ['2f','2m','2b'];
            const enemyRows = ['1f','1m','1b'];
            const allies = allyRows.flatMap(r => (window.__ow_getRow?.(r)?.cardIds || []).map(id => ({ cardId: id, rowId: r })));
            console.log(`AI board: ${allies.length} allies`);
            if (allies.length === 0) {
                console.log('❌ No allies on board, skipping ultimate check\n');
                return false;
            }

            // SPECIAL CASE: Check for Mercy resurrection opportunity FIRST
            const mercyResurrected = await this.tryMercyResurrection();
            if (mercyResurrected) {
                console.log('AI used Mercy resurrection ultimate');
                return true;
            }

            // Gather ready ultimates via bridge helper
            console.log(`Checking ${allies.length} allies for ready ultimates...`);
            console.log(`window.__ow_isUltimateReady exists: ${typeof window.__ow_isUltimateReady === 'function'}`);

            const ready = allies.filter(a => {
                const isReady = typeof window.__ow_isUltimateReady === 'function' ? window.__ow_isUltimateReady(a.cardId) : false;
                if (isReady) {
                    console.log(`✓ Ultimate READY for ${a.cardId}`);
                } else {
                    console.log(`✗ Ultimate not ready for ${a.cardId}`);
                }
                return isReady;
            });
            console.log(`AI found ${ready.length} ready ultimates out of ${allies.length} allies`);
            
            if (ready.length === 0) {
                // Small random chance to attempt anyway if helper missing
                if (typeof window.__ow_isUltimateReady !== 'function' && this.aiController.rng.next() < 0.15) {
                    console.log('AI attempting random ultimate due to missing helper');
                    ready.push(allies[0]);
                } else {
                    console.log('AI: No ultimates ready, skipping');
                    return false;
                }
            }

            // Compute simple context
            const enemyRowInfos = enemyRows.map(r => ({ rowId: r, count: window.__ow_getRow?.(r)?.cardIds?.length || 0, power: window.__ow_getRow?.(r)?.power || 0 }));
            const enemyDenseRow = enemyRowInfos.sort((a,b) => (b.count*10 + b.power) - (a.count*10 + a.power))[0];

            // Pick a candidate ultimate: prefer damage AOE when enemies are dense; else first ready
            let chosen = ready[0];
            let chosenIntent = { isDamage: false, isBuff: false, isDebuff: false, isHeal: false, allowAnyRow: false };
            try {
                const heroId = chosen.cardId.slice(1);
                console.log(`AI ultimate analysis for ${heroId}`);

                // Try metadata first, then fall back to data.js ultimate description
                let meta = getAbilityMetadata(heroId, 'onUltimate');
                let desc = '';

                if (meta) {
                    desc = JSON.stringify(meta).toLowerCase();
                    console.log(`Ultimate metadata from abilityMetadata.js for ${heroId}:`, meta);
                } else {
                    // Fallback to data.js ultimate string
                    const heroData = data.heroes[heroId];
                    if (heroData?.ultimate) {
                        desc = heroData.ultimate.toLowerCase();
                        console.log(`Ultimate from data.js for ${heroId}: ${heroData.ultimate}`);
                    } else {
                        console.log(`No ultimate data found for ${heroId}`);
                    }
                }

                // Parse description to determine intent
                chosenIntent.isDamage = /damage|deal|enemy|aoe|row|defeat|kill/.test(desc) && !/heal/.test(desc);
                chosenIntent.isBuff = /buff|shield|barrier|protect|gain|increase|ally|invulnerable/.test(desc) && !/heal|damage.*enem/.test(desc);
                chosenIntent.isHeal = /heal|restore|health|recover/.test(desc);
                chosenIntent.isDebuff = /debuff|reduce|weaken|lock|stun/.test(desc) && !chosenIntent.isBuff && !chosenIntent.isHeal;

                console.log(`Ultimate intent for ${heroId}:`, chosenIntent);
            } catch (e) {
                console.error('Error analyzing ultimate metadata:', e);
                // Emergency fallback - assume damage if nothing else works
                const heroId = chosen.cardId.slice(1);
                chosenIntent.isDamage = true;
            }

            // Enhanced ultimate timing based on difficulty and game state
            let shouldFire = false;
            const heroId = chosen.cardId.slice(1);
            const difficulty = this.aiController?.difficulty || 'hard';

            // Get current synergy levels (synergy is a number, not an object!)
            const currentSynergy = (window.__ow_getRow?.('2f')?.synergy || 0) +
                                 (window.__ow_getRow?.('2m')?.synergy || 0) +
                                 (window.__ow_getRow?.('2b')?.synergy || 0);

            console.log(`Ultimate timing check: hero=${heroId}, synergy=${currentSynergy}, difficulty=${difficulty}`);

            // Add randomness factor - AI will sometimes use ultimates even when not optimal (±30% variance)
            const randomFactor = 0.7 + (this.aiController.rng.next() * 0.6); // 0.7 to 1.3
            console.log(`Randomness factor: ${randomFactor.toFixed(2)}`);

            // === HERO-SPECIFIC ULTIMATE CONDITIONS (CRITICAL PRIORITY) ===

            // D.VA: ALWAYS use ultimate ASAP to get MEKA
            if (heroId === 'dva') {
                shouldFire = true;
                console.log('D.Va: CRITICAL - Call Mech ASAP to deploy MEKA');
            }

            // ASHE: ALWAYS use ultimate ASAP to get BOB
            else if (heroId === 'ashe') {
                shouldFire = true;
                console.log('Ashe: CRITICAL - Deploy BOB ASAP for board presence');
            }

            // TORBJORN: ONLY use ultimate if turret is active
            else if (heroId === 'torbjorn') {
                const allyRows = ['2f', '2m', '2b'];
                let hasTurret = allyRows.some(r => {
                    const row = window.__ow_getRow?.(r);
                    return row?.cardIds?.some(id => id.endsWith('turret'));
                });

                // If no turret on board, but turret is in hand, force-play it first
                if (!hasTurret) {
                    try {
                        const handIds = window.__ow_getRow?.('player2hand')?.cardIds || [];
                        const turretId = handIds.find(id => id === '2turret');
                        if (turretId) {
                            console.log('Torbjorn: Turret found in hand - force playing to back row');
                            // Prefer back row; fallback handled by adapter
                            await this.adapter.playCard(turretId, 'back');
                            // Re-check for turret on board after placement
                            hasTurret = allyRows.some(r => {
                                const row = window.__ow_getRow?.(r);
                                return row?.cardIds?.some(id => id.endsWith('turret'));
                            });
                        }
                    } catch (e) {
                        console.warn('Torbjorn: Failed to auto-play turret from hand before ultimate:', e);
                    }
                }

                if (hasTurret) {
                    shouldFire = true;
                    console.log('Torbjorn: Turret active - Molten Core ready!');
                } else {
                    // HARD STOP: never fire without turret
                    shouldFire = false;
                    console.log('Torbjorn: NO TURRET - holding ultimate until turret is deployed');
                }
            }

            // LUCIO Sound Barrier: Protect valuable/vulnerable units  
            else if (heroId === 'lucio' && chosenIntent.isBuff) {
                // Find Lucio's row
                const lucioRow = ['2f', '2m', '2b'].find(r => window.__ow_getRow?.(r)?.cardIds?.includes(chosen.cardId));
                if (lucioRow) {
                    const rowCards = window.__ow_getRow?.(lucioRow)?.cardIds || [];
                    const heroCount = rowCards.filter(id => {
                        const card = window.__ow_getCard?.(id);
                        return card && card.health > 0;
                    }).length;

                    // Fire if Lucio's row has 3+ heroes (including Lucio)
                    if (heroCount >= 3) {
                        shouldFire = true;
                        console.log(`Lucio Sound Barrier: ${heroCount} heroes in Lucio's row (including Lucio)`);
                    } else {
                        console.log(`Lucio Sound Barrier: Only ${heroCount} heroes in row, need 3+`);
                    }
                }
            }

            // ORISA Supercharger: Only if 3+ heroes on Orisa's own row
            else if (heroId === 'orisa') {
                const orisaRow = ['2f','2m','2b'].find(r => window.__ow_getRow?.(r)?.cardIds?.includes(chosen.cardId));
                if (orisaRow) {
                    const rowCards = window.__ow_getRow?.(orisaRow)?.cardIds || [];
                    const livingCount = rowCards.filter(id => {
                        const c = window.__ow_getCard?.(id);
                        return c && c.health > 0;
                    }).length;
                    if (livingCount >= 3) {
                        shouldFire = true;
                        console.log(`Orisa Supercharger: ${livingCount} heroes on Orisa's row`);
                    } else {
                        console.log(`Orisa Supercharger: Only ${livingCount} heroes on row, need 3+`);
                    }
                }
            }

            // BAPTISTE Immortality Field: Protect allies in danger
            else if (heroId === 'baptiste') {
                const allyCards = [];
                ['2f', '2m', '2b'].forEach(rowId => {
                    const rowData = window.__ow_getRow?.(rowId);
                    rowData?.cardIds?.forEach(cardId => {
                        const card = window.__ow_getCard?.(cardId);
                        if (card && card.health > 0) allyCards.push(card);
                    });
                });

                const criticalAllies = allyCards.filter(c => c.health <= 2); // Low HP allies
                const valuableAllies = allyCards.filter(c => !c.ultimateUsed && c.health <= 3);

                if (criticalAllies.length >= 2 || valuableAllies.length >= 1) {
                    shouldFire = true;
                    console.log(`Baptiste Immortality Field: ${criticalAllies.length} critical, ${valuableAllies.length} valuable allies in danger`);
                }
            }

            // BASTION Tank Mode: Aggressive but don't steal synergy from Pharah/AOE ultimates
            else if (heroId === 'bastion') {
                const pharahOnBoard = ['2f', '2m', '2b'].some(r => window.__ow_getRow?.(r)?.cardIds?.some(id => id.endsWith('pharah')));

                // If Pharah is on board and we have high synergy, hold back
                if (pharahOnBoard && currentSynergy >= 4) {
                    shouldFire = false;
                    console.log('Bastion Tank Mode: Holding back - Pharah needs synergy');
                } else if (enemyDenseRow.count >= 2 || enemyDenseRow.power >= 8) {
                    shouldFire = true;
                    console.log('Bastion Tank Mode: Aggressive - good targets available');
                }
            }

            // ZENYATTA Transcendence: Mass healing when team is wounded
            else if (heroId === 'zenyatta') {
                const allyCards = [];
                ['2f', '2m', '2b'].forEach(rowId => {
                    const rowData = window.__ow_getRow?.(rowId);
                    rowData?.cardIds?.forEach(cardId => {
                        const card = window.__ow_getCard?.(cardId);
                        if (card) allyCards.push(card);
                    });
                });

                const woundedAllies = allyCards.filter(c => c.health < c.maxHealth);
                const totalHealthDeficit = woundedAllies.reduce((sum, c) => sum + (c.maxHealth - c.health), 0);

                if (totalHealthDeficit >= 6 || woundedAllies.length >= 3) {
                    shouldFire = true;
                    console.log(`Zenyatta Transcendence: ${woundedAllies.length} wounded, ${totalHealthDeficit} HP deficit`);
                }
            }

            // MOIRA Coalescence: Dual damage + healing when valuable
            else if (heroId === 'moira') {
                const woundedAllies = [];
                ['2f', '2m', '2b'].forEach(rowId => {
                    const rowData = window.__ow_getRow?.(rowId);
                    rowData?.cardIds?.forEach(cardId => {
                        const card = window.__ow_getCard?.(cardId);
                        if (card && card.health < card.maxHealth) woundedAllies.push(card);
                    });
                });

                // Fire if we can damage enemies AND heal allies
                if ((woundedAllies.length >= 2 && enemyDenseRow.count >= 1) || woundedAllies.length >= 3) {
                    shouldFire = true;
                    console.log(`Moira Coalescence: ${woundedAllies.length} wounded allies, ${enemyDenseRow.count} enemies`);
                }
            }

            // LIFEWEAVER Tree of Life: Save for critical moments
            else if (heroId === 'lifeweaver') {
                const allyCards = [];
                ['2f', '2m', '2b'].forEach(rowId => {
                    const rowData = window.__ow_getRow?.(rowId);
                    rowData?.cardIds?.forEach(cardId => {
                        const card = window.__ow_getCard?.(cardId);
                        if (card && card.health > 0) allyCards.push(card);
                    });
                });

                const criticalAllies = allyCards.filter(c => c.health <= 1);
                if (criticalAllies.length >= 2) {
                    shouldFire = true;
                    console.log(`Lifeweaver Tree: ${criticalAllies.length} allies at critical HP`);
                }
            }

            // GENJI Dragonblade: Use when enemies are clustered and weakened
            else if (heroId === 'genji') {
                const weakenedEnemies = [];
                ['1f', '1m', '1b'].forEach(rowId => {
                    const rowData = window.__ow_getRow?.(rowId);
                    rowData?.cardIds?.forEach(cardId => {
                        const card = window.__ow_getCard?.(cardId);
                        if (card && card.health <= 3) weakenedEnemies.push(card);
                    });
                });

                if (weakenedEnemies.length >= 2 || enemyDenseRow.count >= 3) {
                    shouldFire = true;
                    console.log(`Genji Dragonblade: ${weakenedEnemies.length} weakened enemies, ${enemyDenseRow.count} in dense row`);
                }
            }

            // REAPER Death Blossom: Target dense enemy rows
            else if (heroId === 'reaper') {
                if (enemyDenseRow.count >= 2) {
                    shouldFire = true;
                    console.log(`Reaper Death Blossom: ${enemyDenseRow.count} enemies in opposing row`);
                }
            }

            // REINHARDT Earthshatter: Target clustered enemies
            else if (heroId === 'reinhardt') {
                if (enemyDenseRow.count >= 2 || enemyDenseRow.power >= 10) {
                    shouldFire = true;
                    console.log(`Reinhardt Earthshatter: ${enemyDenseRow.count} enemies, power ${enemyDenseRow.power}`);
                }
            }

            // SIGMA Gravitic Flux: Target high-value enemies
            else if (heroId === 'sigma') {
                if (enemyDenseRow.power >= 8 || enemyDenseRow.count >= 2) {
                    shouldFire = true;
                    console.log(`Sigma Gravitic Flux: Power ${enemyDenseRow.power}, count ${enemyDenseRow.count}`);
                }
            }

            // WINSTON Primal Rage: Disrupt enemy positioning
            else if (heroId === 'winston') {
                if (enemyDenseRow.count >= 2) {
                    shouldFire = true;
                    console.log(`Winston Primal Rage: ${enemyDenseRow.count} enemies to disrupt`);
                }
            }

            // ZARYA Graviton Surge: Lock down enemy row
            else if (heroId === 'zarya') {
                if (enemyDenseRow.count >= 2 || enemyDenseRow.power >= 10) {
                    shouldFire = true;
                    console.log(`Zarya Graviton Surge: ${enemyDenseRow.count} enemies, power ${enemyDenseRow.power}`);
                }
            }

            // ROADHOG Whole Hog: Push back and damage
            else if (heroId === 'roadhog') {
                if (enemyDenseRow.count >= 2) {
                    shouldFire = true;
                    console.log(`Roadhog Whole Hog: ${enemyDenseRow.count} enemies`);
                }
            }

            // DOOMFIST Meteor Strike: Already implemented in targeting
            else if (heroId === 'doomfist') {
                if (enemyDenseRow.count >= 2) {
                    shouldFire = true;
                    console.log(`Doomfist Meteor Strike: ${enemyDenseRow.count} enemies clustered`);
                }
            }

            // SOLDIER 76 Tactical Visor: Finish off weakened enemies
            else if (heroId === 'soldier76' || heroId === 'soldier') {
                const weakenedEnemies = [];
                ['1f', '1m', '1b'].forEach(rowId => {
                    const rowData = window.__ow_getRow?.(rowId);
                    rowData?.cardIds?.forEach(cardId => {
                        const card = window.__ow_getCard?.(cardId);
                        if (card && card.health <= 2) weakenedEnemies.push(card);
                    });
                });

                if (weakenedEnemies.length >= 2) {
                    shouldFire = true;
                    console.log(`Soldier 76 Tactical Visor: ${weakenedEnemies.length} killable enemies`);
                }
            }

            // HAZARD: Use when pickoff opportunities exist
            else if (heroId === 'hazard') {
                const lowHPEnemies = [];
                ['1f', '1m', '1b'].forEach(rowId => {
                    const rowData = window.__ow_getRow?.(rowId);
                    rowData?.cardIds?.forEach(cardId => {
                        const card = window.__ow_getCard?.(cardId);
                        if (card && card.health <= 2) lowHPEnemies.push(card);
                    });
                });

                if (lowHPEnemies.length >= 2) {
                    shouldFire = true;
                    console.log(`Hazard: ${lowHPEnemies.length} pickoff opportunities`);
                }
            }

            // JUNKER QUEEN Rampage: Against clustered enemies
            else if (heroId === 'junkerqueen') {
                if (enemyDenseRow.count >= 2) {
                    shouldFire = true;
                    console.log(`Junker Queen Rampage: ${enemyDenseRow.count} enemies`);
                }
            }

            // MAUGA Cage Fight: Lock strongest enemy
            else if (heroId === 'mauga') {
                if (enemyDenseRow.power >= 8 || enemyDenseRow.count >= 3) {
                    shouldFire = true;
                    console.log(`Mauga Cage Fight: Lock enemy row with power ${enemyDenseRow.power}`);
                }
            }

            // RAMATTRA Annihilation: Sustained AOE damage
            else if (heroId === 'ramattra') {
                if (enemyDenseRow.count >= 2) {
                    shouldFire = true;
                    console.log(`Ramattra Annihilation: ${enemyDenseRow.count} enemies`);
                }
            }

            // SYMMETRA Photon Barrier: Protect valuable allies
            else if (heroId === 'symmetra') {
                const allyCount = ['2f', '2m', '2b'].reduce((sum, r) => sum + (window.__ow_getRow?.(r)?.cardIds?.length || 0), 0);
                if (allyCount >= 3) {
                    shouldFire = true;
                    console.log(`Symmetra Photon Barrier: Protect ${allyCount} allies`);
                }
            }

            // WIDOWMAKER Infra-Sight: Reveal enemies (information advantage)
            else if (heroId === 'widowmaker') {
                const enemyCount = ['1f', '1m', '1b'].reduce((sum, r) => sum + (window.__ow_getRow?.(r)?.cardIds?.length || 0), 0);
                if (enemyCount >= 3) {
                    shouldFire = true;
                    console.log(`Widowmaker Infra-Sight: Reveal ${enemyCount} enemies`);
                }
            }

            // ECHO Duplicate: Copy last powerful ultimate used
            else if (heroId === 'echo') {
                // Echo's ultimate is complex - copy last ultimate
                // Fire if any ultimate was recently used
                shouldFire = true;
                console.log('Echo Duplicate: Copy last ultimate');
            }

            // GENERAL FALLBACK: If hero-specific conditions not met, consider firing anyway
            if (!shouldFire) {
                // Apply randomness - sometimes fire even without perfect conditions
                const shouldTryAnyway = randomFactor > 1.1 || currentSynergy >= 4;
                if (shouldTryAnyway) {
                    shouldFire = true;
                    console.log(`General fallback: Firing ultimate anyway (randomFactor=${randomFactor.toFixed(2)}, synergy=${currentSynergy})`);
                }
            }

            // DAMAGE ULTIMATES: Check for good opportunities
            if (!shouldFire && chosenIntent.isDamage) {
                // High-value AOE ultimates (Pharah, Hanzo, Junkrat) - wait for better synergy
                if (['pharah', 'hanzo', 'junkrat'].includes(heroId)) {
                    if (difficulty === 'hard') {
                        // Hard AI: Apply randomness to thresholds
                        const synergyThreshold = Math.max(1, Math.floor(3 * randomFactor));
                        if (currentSynergy >= synergyThreshold || (enemyDenseRow.count >= 2 && enemyDenseRow.power >= 8)) {
                            shouldFire = true;
                            console.log(`High-value AOE ultimate ready with synergy ${currentSynergy} >= ${synergyThreshold}`);
                        }
                    } else if (difficulty === 'medium') {
                        // Medium AI: Lower threshold with randomness
                        const synergyThreshold = Math.max(1, Math.floor(2 * randomFactor));
                        if (currentSynergy >= synergyThreshold || enemyDenseRow.count >= 2) {
                            shouldFire = true;
                        }
                    } else {
                        // Easy AI: Very low threshold with randomness
                        const synergyThreshold = Math.max(1, Math.floor(1 * randomFactor));
                        if (currentSynergy >= synergyThreshold || enemyDenseRow.count >= 1) {
                            shouldFire = true;
                        }
                    }
                }
                // Regular damage ultimates - fire more readily with randomness
                else {
                    const enemyCountThreshold = randomFactor > 0.9 ? 1 : Math.max(1, Math.floor(1 * randomFactor));
                    const powerThreshold = Math.max(3, Math.floor(5 * randomFactor));
                    if (enemyDenseRow.count >= enemyCountThreshold || enemyDenseRow.power >= powerThreshold) {
                        shouldFire = true;
                        console.log(`Regular damage ultimate ready: enemies=${enemyDenseRow.count}>=${enemyCountThreshold}, power=${enemyDenseRow.power}>=${powerThreshold}`);
                    }
                }
            }

            // HEAL ULTIMATES: Check for wounded allies
            if (!shouldFire && chosenIntent.isHeal) {
                const allyCards = [];
                ['2f', '2m', '2b'].forEach(rowId => {
                    const rowData = window.__ow_getRow?.(rowId);
                    rowData?.cardIds?.forEach(cardId => {
                        const card = window.__ow_getCard?.(cardId);
                        if (card) allyCards.push(card);
                    });
                });

                const woundedAllies = allyCards.filter(c => c.currentHealth < c.maxHealth);
                const criticalAllies = allyCards.filter(c => c.currentHealth <= Math.floor(c.maxHealth * 0.4));

                if (difficulty === 'hard') {
                    // Hard AI: Wait for 2+ wounded OR 1+ critical
                    if (criticalAllies.length >= 1 || woundedAllies.length >= 2) {
                        shouldFire = true;
                        console.log(`Heal ultimate ready: ${criticalAllies.length} critical, ${woundedAllies.length} wounded`);
                    }
                } else {
                    // Easy/Medium: Fire with any wounded ally
                    if (woundedAllies.length >= 1) {
                        shouldFire = true;
                        console.log(`Heal ultimate ready: ${woundedAllies.length} wounded allies`);
                    }
                }
            }

            // BUFF ULTIMATES: Check for allies to buff
            if (!shouldFire && chosenIntent.isBuff) {
                const allyCounts = allyRows.map(r => window.__ow_getRow?.(r)?.cardIds?.length || 0);
                const maxAllyRow = Math.max(...allyCounts);

                if (difficulty === 'hard') {
                    // Hard AI: Apply randomness to ally threshold
                    const allyThreshold = Math.max(1, Math.floor(2 * randomFactor));
                    if (maxAllyRow >= allyThreshold || (enemyDenseRow.power >= 12 && maxAllyRow >= 1)) {
                        shouldFire = true;
                        console.log(`Buff ultimate ready for ${maxAllyRow} allies (threshold: ${allyThreshold})`);
                    }
                } else {
                    // Easy/Medium: Very aggressive with randomness
                    const allyThreshold = randomFactor > 0.8 ? 1 : Math.max(1, Math.floor(1 * randomFactor));
                    if (maxAllyRow >= allyThreshold) {
                        shouldFire = true;
                        console.log(`Buff ultimate ready for ${maxAllyRow} allies (threshold: ${allyThreshold})`);
                    }
                }
            }

            // Difficulty-based random fire chance - INCREASED AGGRESSIVENESS
            if (!shouldFire) {
                const randomThreshold = difficulty === 'easy' ? 0.7 : difficulty === 'medium' ? 0.5 : 0.3;
                if (this.aiController.rng.next() < randomThreshold) {
                    shouldFire = true;
                    console.log(`${difficulty} AI: Random ultimate fire (increased aggressiveness)`);
                }
            }

            // ADDITIONAL AGGRESSIVE CONDITIONS: Fire ultimates more readily
            if (!shouldFire) {
                // Fire if we have high synergy (3+) regardless of other conditions
                if (currentSynergy >= 3) {
                    shouldFire = true;
                    console.log(`High synergy (${currentSynergy}) - firing ultimate aggressively`);
                }
                // Fire if enemy has significant board presence (4+ cards)
                else if (enemyDenseRow.count >= 4) {
                    shouldFire = true;
                    console.log(`Enemy has ${enemyDenseRow.count} cards - firing ultimate aggressively`);
                }
                // Fire if we're behind on board presence
                else {
                    const allyCount = allyRows.reduce((sum, r) => sum + (window.__ow_getRow?.(r)?.cardIds?.length || 0), 0);
                    const enemyCount = enemyRows.reduce((sum, r) => sum + (window.__ow_getRow?.(r)?.cardIds?.length || 0), 0);
                    if (enemyCount > allyCount + 1) {
                        shouldFire = true;
                        console.log(`Behind on board (${allyCount} vs ${enemyCount}) - firing ultimate aggressively`);
                    }
                }
            }

            if (!shouldFire) {
                console.log(`❌ Ultimate NOT fired for ${heroId}: insufficient value/setup`);
                console.log(`   Type: ${chosenIntent.isDamage ? 'Damage' : chosenIntent.isBuff ? 'Buff' : chosenIntent.isHeal ? 'Heal' : 'Unknown'}`);
                console.log(`   Synergy: ${currentSynergy}, Enemies: ${enemyDenseRow?.count}, Difficulty: ${difficulty}\n`);
                return false;
            }

            console.log(`✅ Ultimate FIRING for ${heroId}!`);
            console.log(`   Reason: ${chosenIntent.isDamage ? 'Damage' : chosenIntent.isBuff ? 'Buff' : chosenIntent.isHeal ? 'Heal' : 'Unknown'} ultimate`);
            console.log(`   Synergy: ${currentSynergy}, Enemies: ${enemyDenseRow?.count}`);

            // Resolve target if needed via AI targeting
            let resolvedTarget = null;
            try {
                window.__ow_aiTriggering = true;
                window.__ow_currentAICardId = chosen.cardId;
                window.__ow_currentAIHero = chosen.cardId.slice(1);
                window.__ow_currentAIAbility = 'ultimate';
                if (chosenIntent.isDamage) {
                    const rowPick = await this.handleAITargeting('row', { isDamage: true });
                    resolvedTarget = rowPick || { rowId: enemyDenseRow?.rowId || '1m', rowPosition: (enemyDenseRow?.rowId || '1m')[1] };
                } else if (chosenIntent.isBuff) {
                    const rowPick = await this.handleAITargeting('row', { isBuff: true });
                    resolvedTarget = rowPick || { rowId: '2m', rowPosition: 'm' };
                }
            } catch {}

            // Execute via bridge
            if (typeof window.__ow_useUltimate === 'function') {
                console.log('AI using ultimate:', chosen.cardId, 'target:', resolvedTarget);

                const heroId = chosen.cardId.slice(1);

                try {
                    const success = await window.__ow_useUltimate(chosen.cardId, resolvedTarget);
                    console.log('AI ultimate execution result:', success);
                    if (success) {
                        try { window.__ow_aiActionsThisTurn = (window.__ow_aiActionsThisTurn || 0) + 1; } catch {}

                        // CRITICAL: Check if ultimate spawned a special card that needs immediate deployment
                        // Ashe → BOB, D.Va → MEKA, Torbjorn → Turret
                        const spawnedSpecialCard = await this.checkAndPlaySpawnedSpecialCard(heroId);
                        if (spawnedSpecialCard) {
                            console.log(`AI immediately played spawned special card: ${spawnedSpecialCard}`);
                        }

                        return true;
                    }
                } catch (e) {
                    console.error('AI ultimate execution error:', e);
                }
            } else {
                console.warn('AI: window.__ow_useUltimate function not available');
            }
            return false;
        } catch (e) {
            console.error('AI tryUseUltimateThisTurn CRITICAL ERROR:', e);
            console.error('Error stack:', e?.stack);
            console.error('Error message:', e?.message);
            return false;
        } finally {
            window.__ow_aiTriggering = false;
            window.__ow_currentAICardId = null;
            window.__ow_currentAIHero = null;
            window.__ow_currentAIAbility = null;
        }
    }

    // === HERO-SPECIFIC TARGETING FUNCTIONS ===

    // GENJI: Target damaged high-power heroes OR non-ulted threats
    selectGenjiTarget(targets) {
        console.log('Genji targeting: Looking for damaged high-power OR non-ulted enemies...');

        const scored = targets.map(t => {
            const card = window.__ow_getCard?.(t.cardId);
            if (!card) return { target: t, score: 0 };

            const heroId = t.cardId.slice(1);
            const heroData = data.heroes?.[heroId];
            const power = heroData?.[`${t.rowId[1]}_power`] || 0;
            const isDamaged = card.health < card.maxHealth;
            const hasNotUlted = !card.ultimateUsed;

            let score = power * 10;
            if (isDamaged) score += 40; // Prefer damaged targets
            if (hasNotUlted) score += 30; // Prefer non-ulted threats

            console.log(`  ${t.cardId}: power=${power}, damaged=${isDamaged}, noUlt=${hasNotUlted}, score=${score}`);
            return { target: t, score };
        });

        scored.sort((a, b) => b.score - a.score);
        return scored[0]?.target || targets[0];
    }

    // SOLDIER 76: Pick off weakened/killable targets
    selectSoldier76Target(targets) {
        console.log('Soldier 76 targeting: Looking for killable/weakened targets...');

        const scored = targets.map(t => {
            const card = window.__ow_getCard?.(t.cardId);
            if (!card) return { target: t, score: 0 };

            const canKill = card.health <= 3; // Soldier deals 3 damage
            const weakened = card.health <= card.maxHealth / 2;

            let score = 0;
            if (canKill) score += 100; // PRIORITY: Finish them off
            else if (weakened) score += 50; // Weaken further
            score += (card.maxHealth - card.health) * 5; // Prefer already damaged

            console.log(`  ${t.cardId}: HP=${card.health}/${card.maxHealth}, canKill=${canKill}, score=${score}`);
            return { target: t, score };
        });

        scored.sort((a, b) => b.score - a.score);
        return scored[0]?.target || targets[0];
    }

    // MEI Cryo-Freeze: Target enemies who haven't ulted (block their ultimate)
    selectMeiCryoFreezeTarget(targets) {
        console.log('Mei Cryo-Freeze targeting: Looking for non-ulted high-value enemies...');

        const scored = targets.map(t => {
            const card = window.__ow_getCard?.(t.cardId);
            if (!card) return { target: t, score: 0 };

            const heroId = t.cardId.slice(1);
            const heroData = data.heroes?.[heroId];
            const hasNotUlted = !card.ultimateUsed;
            const power = heroData?.[`${t.rowId[1]}_power`] || 0;

            let score = power * 5;
            if (hasNotUlted) score += 80; // PRIORITY: Block their ultimate

            console.log(`  ${t.cardId}: power=${power}, noUlt=${hasNotUlted}, score=${score}`);
            return { target: t, score };
        });

        scored.sort((a, b) => b.score - a.score);
        return scored[0]?.target || targets[0];
    }

    // BRIGITTE Shield Bash: Block high-value enemy ultimates
    selectBriShieldBashTarget(targets) {
        console.log('Brigitte Shield Bash: Looking for high-threat non-ulted enemies...');

        const scored = targets.map(t => {
            const card = window.__ow_getCard?.(t.cardId);
            if (!card) return { target: t, score: 0 };

            const heroId = t.cardId.slice(1);
            const heroData = data.heroes?.[heroId];
            const hasNotUlted = !card.ultimateUsed;
            const power = heroData?.[`${t.rowId[1]}_power`] || 0;
            const isDamageDealer = heroData?.class === 'offense';

            let score = power * 10;
            if (hasNotUlted) score += 100; // PRIORITY: Block ultimates
            if (isDamageDealer) score += 30; // Prefer damage dealers

            console.log(`  ${t.cardId}: power=${power}, noUlt=${hasNotUlted}, dmgDealer=${isDamageDealer}, score=${score}`);
            return { target: t, score };
        });

        scored.sort((a, b) => b.score - a.score);
        return scored[0]?.target || targets[0];
    }

    // HAZARD: Pickoff opportunities (low HP high value)
    selectHazardPickoffTarget(targets) {
        console.log('Hazard targeting: Looking for pickoff opportunities...');

        const scored = targets.map(t => {
            const card = window.__ow_getCard?.(t.cardId);
            if (!card) return { target: t, score: 0 };

            const heroId = t.cardId.slice(1);
            const heroData = data.heroes?.[heroId];
            const power = heroData?.[`${t.rowId[1]}_power`] || 0;
            const isLowHP = card.health <= 2;
            const isHighValue = power >= 2 || heroData?.class === 'support';

            let score = power * 10;
            if (isLowHP && isHighValue) score += 80; // PRIORITY: Low HP high value
            else if (isLowHP) score += 40;
            else if (isHighValue) score += 20;

            console.log(`  ${t.cardId}: HP=${card.health}, power=${power}, lowHP=${isLowHP}, highVal=${isHighValue}, score=${score}`);
            return { target: t, score };
        });

        scored.sort((a, b) => b.score - a.score);
        return scored[0]?.target || targets[0];
    }

    // ANA Biotic Grenade (card target): This is for column targeting actually, but keeping for completeness
    selectAnaBioticGrenadeTarget(targets) {
        // Ana's grenade targets a row, not individual cards
        // Fall back to generic damage targeting
        return this.selectBestDamageTargetWithThreatAssessment(targets);
    }

    // REAPER: Assess power differential before self-sacrifice
    selectReaperTradeoffTarget(targets) {
        console.log('Reaper targeting: Assessing power tradeoff for self-sacrifice...');

        const reaperCard = window.__ow_getCard?.('2reaper');
        const reaperPower = reaperCard ? (data.heroes?.reaper?.[`${reaperCard.rowId?.[1] || 'm'}_power`] || 0) : 0;

        const scored = targets.map(t => {
            const card = window.__ow_getCard?.(t.cardId);
            if (!card) return { target: t, score: 0 };

            const heroId = t.cardId.slice(1);
            const heroData = data.heroes?.[heroId];
            const enemyPower = heroData?.[`${t.rowId[1]}_power`] || 0;
            const rowCardCount = window.__ow_getRow?.(t.rowId)?.cardIds?.length || 0;

            // Net value: enemy row damage - losing Reaper
            const damageDealt = rowCardCount * 2; // Reaper does 2 to all in row
            const netValue = damageDealt - reaperPower;

            let score = netValue * 10;
            if (rowCardCount >= 3) score += 50; // Prefer hitting multiple enemies

            console.log(`  ${t.rowId}: ${rowCardCount} enemies, deal ${damageDealt} dmg, lose ${reaperPower} power, net=${netValue}, score=${score}`);
            return { target: t, score };
        });

        scored.sort((a, b) => b.score - a.score);

        // Only fire if net value is positive
        if (scored[0].score > 0) {
            console.log(`Reaper: Favorable trade (net value ${scored[0].score})`);
            return scored[0]?.target;
        } else {
            console.log(`Reaper: Unfavorable trade - skip ability`);
            return null; // Don't use ability
        }
    }

    // ANA Biotic Grenade (row target): Maximize damage + healing
    selectAnaBioticGrenadeRow(rows) {
        console.log('Ana Biotic Grenade: Maximize damage to enemies + healing to allies...');

        const scored = rows.map(rowId => {
            const isEnemyRow = rowId.startsWith('1');
            const isAllyRow = rowId.startsWith('2');

            const row = window.__ow_getRow?.(rowId);
            const cardCount = row?.cardIds?.length || 0;

            // Get opposing row
            const opposingRowId = isEnemyRow ? rowId.replace('1', '2') : rowId.replace('2', '1');
            const opposingRow = window.__ow_getRow?.(opposingRowId);
            const opposingCardCount = opposingRow?.cardIds?.length || 0;

            // Calculate wounded allies in opposing row (if we target enemy row)
            let woundedAllies = 0;
            if (isEnemyRow && opposingRow) {
                (opposingRow.cardIds || []).forEach(cardId => {
                    const card = window.__ow_getCard?.(cardId);
                    if (card && card.health < card.maxHealth) woundedAllies++;
                });
            }


            // Score = enemy damage + ally healing
            let score = 0;
            if (isEnemyRow) {
                score = (cardCount * 10) + (woundedAllies * 15); // Damage enemies + heal allies
            } else if (isAllyRow) {
                score = (woundedAllies * 20); // Just healing allies (less valuable than combo)
            }

            console.log(`  ${rowId}: ${cardCount} targets, ${woundedAllies} wounded allies in opposing, score=${score}`);
            return { rowId, score };
        });

        scored.sort((a, b) => b.score - a.score);
        const bestRow = scored[0]?.rowId || rows[0];
        return { rowId: bestRow, rowPosition: bestRow[1] };
    }

    // DOOMFIST: Look for clusters (most enemies in row)
    selectDoomfistClusterRow(rows) {
        console.log('Doomfist targeting: Looking for enemy clusters...');

        const scored = rows.map(rowId => {
            const row = window.__ow_getRow?.(rowId);
            const cardCount = row?.cardIds?.length || 0;
            const rowPower = row?.power || 0;

            // Doomfist Meteor Strike: 3 damage to 1 enemy + 1 to adjacent
            // More enemies = more adjacent targets hit
            const score = (cardCount * 20) + (rowPower * 5);

            console.log(`  ${rowId}: ${cardCount} enemies, power=${rowPower}, score=${score}`);
            return { rowId, score };
        });

        scored.sort((a, b) => b.score - a.score);
        const bestRow = scored[0]?.rowId || rows[0];
        return { rowId: bestRow, rowPosition: bestRow[1] };
    }
}

export default AIGameIntegration;
