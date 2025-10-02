/**
 * Strategic AI - Deep game understanding and advanced decision-making
 *
 * This module implements:
 * - Win condition analysis (power race, synergy banking, attrition)
 * - Tempo management (1-card vs 2-card plays, combo setups)
 * - Threat prioritization (eliminate damage dealers, block ultimates)
 * - Resource optimization (synergy banking, ultimate timing)
 * - Hero-specific mastery (optimal plays for each hero)
 * - Positioning theory (column protection, row synergy stacking)
 */

import data from '../data';

/**
 * Analyze current win condition and recommend strategy
 */
export function analyzeWinCondition(gameState) {
    const analysis = {
        winCondition: null, // 'power_race', 'synergy_banking', 'attrition', 'tempo'
        confidence: 0,
        reasoning: '',
        recommendations: []
    };

    // Calculate board metrics
    const metrics = calculateBoardMetrics(gameState);

    // Power Race: We're ahead/even in power, push for endgame victory
    if (metrics.powerDifferential >= -5 && metrics.turnNumber >= 4) {
        analysis.winCondition = 'power_race';
        analysis.confidence = 0.8;
        analysis.reasoning = 'Power advantage or parity - focus on building board power for endgame';
        analysis.recommendations = [
            'Play high-power cards',
            'Protect power-generating units',
            'Use ultimates to eliminate enemy threats'
        ];
    }
    // Synergy Banking: Need big ultimate plays to swing game
    else if (metrics.powerDifferential < -10 && metrics.totalSynergy >= 6) {
        analysis.winCondition = 'synergy_banking';
        analysis.confidence = 0.9;
        analysis.reasoning = 'Behind in power - bank synergy for devastating ultimate plays';
        analysis.recommendations = [
            'Stack synergy in one row (3+ for AOE ultimates)',
            'Protect synergy-generating units',
            'Use Pharah/Junkrat/Hanzo ultimates when ready'
        ];
    }
    // Attrition: Eliminate their threats, outlast them
    else if (metrics.enemyDamageThreats >= 3 || metrics.enemyBoardCount > metrics.allyBoardCount) {
        analysis.winCondition = 'attrition';
        analysis.confidence = 0.7;
        analysis.reasoning = 'Enemy has multiple threats - eliminate damage dealers and sustain';
        analysis.recommendations = [
            'Target enemy damage dealers',
            'Use healing/shields to sustain',
            'Trade favorably (our weak for their strong)'
        ];
    }
    // Tempo: Early game, establish board control
    else {
        analysis.winCondition = 'tempo';
        analysis.confidence = 0.6;
        analysis.reasoning = 'Early game - establish board presence and control';
        analysis.recommendations = [
            'Play 2 cards per turn when possible',
            'Fill all rows for synergy',
            'Set up future combos (Torbjorn+Turret, D.Va→MEKA)'
        ];
    }

    return analysis;
}

/**
 * Calculate comprehensive board metrics
 */
function calculateBoardMetrics(gameState) {
    const metrics = {
        // Power metrics
        allyPower: 0,
        enemyPower: 0,
        powerDifferential: 0,

        // Synergy metrics
        totalSynergy: 0,
        frontSynergy: 0,
        middleSynergy: 0,
        backSynergy: 0,

        // Board presence
        allyBoardCount: 0,
        enemyBoardCount: 0,

        // Threat assessment
        enemyDamageThreats: 0,
        allySupportUnits: 0,

        // Turn info
        turnNumber: 0,

        // Ultimate tracking
        allyUltimatesReady: 0,
        enemyPotentialUltimates: 0
    };

    // Calculate ally metrics
    ['2f', '2m', '2b'].forEach(rowId => {
        const row = window.__ow_getRow?.(rowId);
        if (row) {
            metrics.allyPower += row.power || 0;
            metrics.totalSynergy += row.synergy || 0;

            if (rowId === '2f') metrics.frontSynergy = row.synergy || 0;
            if (rowId === '2m') metrics.middleSynergy = row.synergy || 0;
            if (rowId === '2b') metrics.backSynergy = row.synergy || 0;

            (row.cardIds || []).forEach(cardId => {
                const card = window.__ow_getCard?.(cardId);
                if (card && card.health > 0) {
                    metrics.allyBoardCount++;
                    const heroId = cardId.slice(1);
                    const heroData = data.heroes?.[heroId];
                    if (heroData?.class === 'support') {
                        metrics.allySupportUnits++;
                    }

                    // Check if ultimate ready
                    if (typeof window.__ow_isUltimateReady === 'function' && window.__ow_isUltimateReady(cardId)) {
                        metrics.allyUltimatesReady++;
                    }
                }
            });
        }
    });

    // Calculate enemy metrics
    ['1f', '1m', '1b'].forEach(rowId => {
        const row = window.__ow_getRow?.(rowId);
        if (row) {
            metrics.enemyPower += row.power || 0;

            (row.cardIds || []).forEach(cardId => {
                const card = window.__ow_getCard?.(cardId);
                if (card && card.health > 0) {
                    metrics.enemyBoardCount++;
                    const heroId = cardId.slice(1);
                    const heroData = data.heroes?.[heroId];
                    if (heroData?.class === 'offense' || heroData?.class === 'defense') {
                        metrics.enemyDamageThreats++;
                    }

                    // Estimate if they could ultimate soon (has 2+ synergy in row)
                    if ((row.synergy || 0) >= 2) {
                        metrics.enemyPotentialUltimates++;
                    }
                }
            });
        }
    });

    metrics.powerDifferential = metrics.allyPower - metrics.enemyPower;

    return metrics;
}

/**
 * Determine optimal card play count this turn (1 or 2 cards)
 */
export function determineOptimalCardCount(gameState, handCards) {
    const metrics = calculateBoardMetrics(gameState);
    const winCondition = analyzeWinCondition(gameState);

    // Tempo strategy: Play 2 cards to establish board
    if (winCondition.winCondition === 'tempo' && handCards.length >= 2) {
        return { count: 2, reasoning: 'Tempo: Establish board presence' };
    }

    // Synergy banking: Play 1 card, save hand for later
    if (winCondition.winCondition === 'synergy_banking' && metrics.totalSynergy >= 6) {
        return { count: 1, reasoning: 'Synergy banking: Conserve resources for ultimate turns' };
    }

    // Combo setup: Play specific combos
    const hasCombo = detectCombo(handCards);
    if (hasCombo) {
        return { count: 2, reasoning: `Combo detected: ${hasCombo.description}` };
    }

    // Default: Play 1-2 cards based on hand size and board state
    if (handCards.length <= 2) {
        return { count: 1, reasoning: 'Low hand count: Conserve cards' };
    }

    if (metrics.allyBoardCount < 3 && handCards.length >= 3) {
        return { count: 2, reasoning: 'Fill board for synergy generation' };
    }

    return { count: 1, reasoning: 'Default: Measured play' };
}

/**
 * Detect combos in hand
 */
function detectCombo(handCards) {
    const heroIds = handCards.map(c => c.id);

    // Torbjorn + Turret
    if (heroIds.includes('torbjorn') && heroIds.includes('turret')) {
        return { heroes: ['torbjorn', 'turret'], description: 'Torbjorn + Turret synergy' };
    }

    // D.Va → Call Mech → MEKA
    if (heroIds.includes('dva')) {
        return { heroes: ['dva'], description: 'D.Va → MEKA transformation' };
    }

    // Ashe → BOB
    if (heroIds.includes('ashe')) {
        return { heroes: ['ashe'], description: 'Ashe → BOB summon' };
    }

    // Ana + damage dealers (Nano Boost targets)
    if (heroIds.includes('ana') && heroIds.some(id => {
        const hero = data.heroes?.[id];
        return hero?.class === 'offense';
    })) {
        return { heroes: ['ana', 'damage'], description: 'Ana + damage dealer for Nano Boost' };
    }

    // Reinhardt + squishy allies (column protection)
    if (heroIds.includes('reinhardt') && heroIds.some(id => {
        const hero = data.heroes?.[id];
        return hero?.hp <= 3;
    })) {
        return { heroes: ['reinhardt', 'squishy'], description: 'Reinhardt column protection' };
    }

    return null;
}

/**
 * Hero-specific strategic recommendations
 */
export const heroStrategies = {
    // REINHARDT: Always enable barrier, front row for column protection
    reinhardt: {
        onEnter: (context) => {
            return {
                enableBarrier: true, // ALWAYS enable on entry
                preferredRow: 'front', // Front row for protection
                reasoning: 'Reinhardt: Enable barrier for column protection'
            };
        }
    },

    // WINSTON: Always enable barrier
    winston: {
        onEnter: (context) => {
            return {
                enableBarrier: true, // ALWAYS enable on entry
                reasoning: 'Winston: Enable barrier for ally protection'
            };
        }
    },

    // PHARAH: Position in high-synergy row for ultimate
    pharah: {
        positioning: (context) => {
            const rows = ['2f', '2m', '2b'];
            const synergyLevels = rows.map(rowId => ({
                rowId,
                synergy: window.__ow_getRow?.(rowId)?.synergy || 0,
                cardCount: window.__ow_getRow?.(rowId)?.cardIds?.length || 0
            }));

            // Find row with highest synergy (prioritize synergy > 0)
            synergyLevels.sort((a, b) => b.synergy - a.synergy);

            const bestRow = synergyLevels[0];
            return {
                preferredRow: bestRow.rowId.slice(1), // 'front', 'middle', or 'back'
                reasoning: `Pharah: Maximize ultimate value (row synergy: ${bestRow.synergy})`
            };
        }
    },

    // TORBJORN: Setup turret first, only ult with turret active
    torbjorn: {
        ultimateCondition: (context) => {
            // Check if turret is active on board
            const allyRows = ['2f', '2m', '2b'];
            const hasTurret = allyRows.some(rowId => {
                const row = window.__ow_getRow?.(rowId);
                return row?.cardIds?.some(id => id.endsWith('turret'));
            });

            return {
                shouldUltimate: hasTurret,
                reasoning: hasTurret ? 'Turret active - Molten Core ready' : 'NO TURRET - WAIT for turret deployment'
            };
        },
        priority: 'high' // Play turret ASAP
    },

    // D.VA: Ultimate ASAP to get MEKA
    dva: {
        ultimatePriority: 'critical', // Use ultimate as soon as possible
        reasoning: 'D.Va: Call Mech ASAP to get MEKA on board'
    },

    // ASHE: Ultimate ASAP to get BOB
    ashe: {
        ultimatePriority: 'critical', // Use ultimate as soon as possible
        reasoning: 'Ashe: Deploy BOB ASAP for board presence and suppression'
    },

    // BOB: Suppress most advantageous row
    bob: {
        onEnter: (context) => {
            // Find enemy row with highest power or most cards
            const enemyRows = ['1f', '1m', '1b'];
            const rowScores = enemyRows.map(rowId => {
                const row = window.__ow_getRow?.(rowId);
                const power = row?.power || 0;
                const cardCount = row?.cardIds?.length || 0;
                return { rowId, score: power + (cardCount * 5) };
            });

            rowScores.sort((a, b) => b.score - a.score);
            const bestRow = rowScores[0];

            return {
                targetRow: bestRow.rowId,
                reasoning: `BOB: Suppress enemy's strongest row (${bestRow.rowId}, score: ${bestRow.score})`
            };
        }
    },

    // JUNKRAT: Target high-synergy enemy rows
    junkrat: {
        ultimateTargeting: (context) => {
            const enemyRows = ['1f', '1m', '1b'];
            const rowSynergies = enemyRows.map(rowId => ({
                rowId,
                synergy: window.__ow_getRow?.(rowId)?.synergy || 0
            }));

            rowSynergies.sort((a, b) => b.synergy - a.synergy);
            const bestRow = rowSynergies[0];

            return {
                targetRow: bestRow.rowId,
                reasoning: `Junkrat: Target enemy synergy buildup (${bestRow.synergy} synergy in ${bestRow.rowId})`
            };
        }
    },

    // SYMMETRA: Smart sendback strategy
    symmetra: {
        sendbackStrategy: (context) => {
            // Analyze sendback targets
            const enemyRows = ['1f', '1m', '1b'];
            const allyRows = ['2f', '2m', '2b'];

            // Enemy disruption: Send back high-power enemy (loses positioning)
            const enemyTargets = [];
            enemyRows.forEach(rowId => {
                const row = window.__ow_getRow?.(rowId);
                (row?.cardIds || []).forEach(cardId => {
                    const card = window.__ow_getCard?.(cardId);
                    if (card && card.health > 0) {
                        const heroId = cardId.slice(1);
                        const heroData = data.heroes?.[heroId];
                        const power = heroData?.[`${rowId[1]}_power`] || 0;
                        enemyTargets.push({ cardId, rowId, power, type: 'enemy_disrupt' });
                    }
                });
            });

            // Ally repositioning: Send back ally for better positioning (rare)
            const allyTargets = [];
            allyRows.forEach(rowId => {
                const row = window.__ow_getRow?.(rowId);
                (row?.cardIds || []).forEach(cardId => {
                    const card = window.__ow_getCard?.(cardId);
                    if (card && card.health > 0) {
                        const heroId = cardId.slice(1);
                        // Only send back Symmetra herself or mispositioned units
                        if (heroId === 'symmetra' || (heroData?.class === 'support' && rowId === '2f')) {
                            allyTargets.push({ cardId, rowId, type: 'ally_reposition' });
                        }
                    }
                });
            });

            // Prioritize enemy disruption unless we need to reposition badly
            if (enemyTargets.length > 0) {
                enemyTargets.sort((a, b) => b.power - a.power);
                return {
                    target: enemyTargets[0],
                    reasoning: 'Symmetra: Disrupt enemy high-power unit (lose positioning)'
                };
            }

            if (allyTargets.length > 0) {
                return {
                    target: allyTargets[0],
                    reasoning: 'Symmetra: Reposition misplaced ally'
                };
            }

            return null;
        }
    }
};

export default {
    analyzeWinCondition,
    calculateBoardMetrics,
    determineOptimalCardCount,
    heroStrategies
};
