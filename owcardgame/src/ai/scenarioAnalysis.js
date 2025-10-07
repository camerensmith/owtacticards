/**
 * Scenario Analysis for AI Decision Making
 * Analyzes game state to determine optimal scenarios for hero abilities and positioning
 */

/**
 * Analyze scenarios for hero positioning and ability usage
 */
export function analyzeScenarios(gameState, heroId, ability = null) {
    const scenarios = {
        positioning: analyzePositioningScenarios(gameState, heroId),
        ultimate: analyzeUltimateScenarios(gameState, heroId),
        onEnter: analyzeOnEnterScenarios(gameState, heroId)
    };
    
    return scenarios;
}

/**
 * Analyze positioning scenarios based on hero characteristics
 */
function analyzePositioningScenarios(gameState, heroId) {
    const scenarios = [];
    
    // Pharah: Favor high-synergy rows for ultimate value
    if (heroId === 'pharah') {
        const synergyAnalysis = analyzeRowSynergy(gameState);
        scenarios.push({
            type: 'synergy_positioning',
            priority: 'high',
            description: 'Position in high-synergy row for ultimate value',
            targetRows: synergyAnalysis.highSynergyRows,
            score: synergyAnalysis.maxSynergy * 20
        });
    }
    
    // Junker Queen: Favor entering when 2+ enemies are unshielded
    if (heroId === 'junkerqueen') {
        const unshieldedAnalysis = analyzeUnshieldedEnemies(gameState);
        if (unshieldedAnalysis.count >= 2) {
            scenarios.push({
                type: 'wound_opportunity',
                priority: 'high',
                description: 'Enter when 2+ enemies are unshielded for wound value',
                unshieldedCount: unshieldedAnalysis.count,
                score: unshieldedAnalysis.count * 15
            });
        }
    }
    
    // Bastion: Favor back row for artillery mode
    if (heroId === 'bastion') {
        scenarios.push({
            type: 'artillery_positioning',
            priority: 'medium',
            description: 'Position in back row for artillery mode',
            targetRows: ['back'],
            score: 25
        });
    }
    
    return scenarios;
}

/**
 * Analyze ultimate usage scenarios
 */
function analyzeUltimateScenarios(gameState, heroId) {
    const scenarios = [];
    
    // Pharah: Target high-synergy rows for maximum damage
    if (heroId === 'pharah') {
        const synergyAnalysis = analyzeRowSynergy(gameState);
        scenarios.push({
            type: 'synergy_ultimate',
            priority: 'high',
            description: 'Use ultimate on high-synergy row for maximum damage',
            targetRows: synergyAnalysis.highSynergyRows,
            score: synergyAnalysis.maxSynergy * 25
        });
    }
    
    // Junkrat: Target high-synergy rows for maximum damage
    if (heroId === 'junkrat') {
        const synergyAnalysis = analyzeRowSynergy(gameState);
        scenarios.push({
            type: 'synergy_ultimate',
            priority: 'high',
            description: 'Use RIP-Tire on high-synergy row for maximum damage',
            targetRows: synergyAnalysis.highSynergyRows,
            score: synergyAnalysis.maxSynergy * 30
        });
    }
    
    // Bastion: Target highest HP enemies
    if (heroId === 'bastion') {
        const hpAnalysis = analyzeEnemyHP(gameState);
        scenarios.push({
            type: 'high_hp_targeting',
            priority: 'high',
            description: 'Target highest HP enemies with Tank Mode',
            targetRows: hpAnalysis.highHPRows,
            score: hpAnalysis.maxHP * 20
        });
    }
    
    return scenarios;
}

/**
 * Analyze on-enter ability scenarios
 */
function analyzeOnEnterScenarios(gameState, heroId) {
    const scenarios = [];
    
    // Junker Queen: Favor entering when enemies are unshielded
    if (heroId === 'junkerqueen') {
        const unshieldedAnalysis = analyzeUnshieldedEnemies(gameState);
        if (unshieldedAnalysis.count >= 2) {
            scenarios.push({
                type: 'wound_opportunity',
                priority: 'high',
                description: 'Enter when 2+ enemies are unshielded for Jagged Blade value',
                unshieldedCount: unshieldedAnalysis.count,
                score: unshieldedAnalysis.count * 20
            });
        }
    }
    
    return scenarios;
}

/**
 * Analyze row synergy levels
 */
function analyzeRowSynergy(gameState) {
    const enemyRows = ['1f', '1m', '1b'];
    const rowSynergies = {};
    let maxSynergy = 0;
    let highSynergyRows = [];
    
    enemyRows.forEach(rowId => {
        const row = gameState.rows?.[rowId];
        const synergy = row?.synergy || 0;
        rowSynergies[rowId] = synergy;
        
        if (synergy > maxSynergy) {
            maxSynergy = synergy;
            highSynergyRows = [rowId];
        } else if (synergy === maxSynergy && synergy > 0) {
            highSynergyRows.push(rowId);
        }
    });
    
    return {
        rowSynergies,
        maxSynergy,
        highSynergyRows
    };
}

/**
 * Analyze unshielded enemies
 */
function analyzeUnshieldedEnemies(gameState) {
    const enemyRows = ['1f', '1m', '1b'];
    let unshieldedCount = 0;
    const unshieldedEnemies = [];
    
    enemyRows.forEach(rowId => {
        const row = gameState.rows?.[rowId];
        if (row?.cardIds) {
            row.cardIds.forEach(cardId => {
                const card = gameState.playerCards?.player1cards?.cards?.[cardId];
                if (card && card.health > 0) {
                    const shieldCount = card.shield || 0;
                    if (shieldCount === 0) {
                        unshieldedCount++;
                        unshieldedEnemies.push({
                            cardId,
                            rowId,
                            health: card.health
                        });
                    }
                }
            });
        }
    });
    
    return {
        count: unshieldedCount,
        enemies: unshieldedEnemies
    };
}

/**
 * Analyze enemy HP distribution
 */
function analyzeEnemyHP(gameState) {
    const enemyRows = ['1f', '1m', '1b'];
    const rowHPs = {};
    let maxHP = 0;
    let highHPRows = [];
    
    enemyRows.forEach(rowId => {
        const row = gameState.rows?.[rowId];
        let totalHP = 0;
        let cardCount = 0;
        
        if (row?.cardIds) {
            row.cardIds.forEach(cardId => {
                const card = gameState.playerCards?.player1cards?.cards?.[cardId];
                if (card && card.health > 0) {
                    totalHP += card.health;
                    cardCount++;
                }
            });
        }
        
        const avgHP = cardCount > 0 ? totalHP / cardCount : 0;
        rowHPs[rowId] = avgHP;
        
        if (avgHP > maxHP) {
            maxHP = avgHP;
            highHPRows = [rowId];
        } else if (avgHP === maxHP && avgHP > 0) {
            highHPRows.push(rowId);
        }
    });
    
    return {
        rowHPs,
        maxHP,
        highHPRows
    };
}

/**
 * Get scenario-based positioning recommendation
 */
export function getScenarioBasedPositioning(card, aiBoard, enemyBoard, gameState) {
    const heroId = card.id;
    const scenarios = analyzeScenarios(gameState, heroId);
    
    // Apply scenario bonuses to positioning scores
    const baseScores = {
        front: 0,
        middle: 0,
        back: 0
    };
    
    // Apply positioning scenarios
    scenarios.positioning.forEach(scenario => {
        if (scenario.type === 'synergy_positioning') {
            scenario.targetRows.forEach(rowId => {
                const rowName = rowId[1]; // f, m, b
                baseScores[rowName] += scenario.score;
            });
        } else if (scenario.type === 'artillery_positioning') {
            baseScores.back += scenario.score;
        }
    });
    
    return baseScores;
}

/**
 * Get scenario-based ultimate targeting recommendation
 */
export function getScenarioBasedUltimateTargeting(heroId, gameState) {
    const scenarios = analyzeScenarios(gameState, heroId);
    
    // Find the best ultimate scenario
    let bestScenario = null;
    let bestScore = 0;
    
    scenarios.ultimate.forEach(scenario => {
        if (scenario.score > bestScore) {
            bestScore = scenario.score;
            bestScenario = scenario;
        }
    });
    
    return bestScenario;
}

export default {
    analyzeScenarios,
    getScenarioBasedPositioning,
    getScenarioBasedUltimateTargeting
};
