/**
 * Action Generator - Generates smart candidate actions
 * Only enumerates "good" moves to keep search bounded
 */

import { evaluateBoard } from './boardEvaluator';

/**
 * Generate top candidate actions for current game state
 * Returns 6-12 best actions to consider
 */
export function generateCandidateActions(aiHand, aiBoard, enemyBoard, gameState, gameplan) {
    const actions = [];

    // 1. Deploy actions (smart placement)
    actions.push(...generateDeployActions(aiHand, aiBoard, enemyBoard, gameplan));

    // 2. Ultimate actions (timing-based)
    actions.push(...generateUltimateActions(aiBoard, enemyBoard, gameState));

    // 3. Pass/end turn action
    actions.push({
        type: 'pass',
        priority: 0.1,
        description: 'End turn'
    });

    // Sort by priority and take top candidates
    actions.sort((a, b) => b.priority - a.priority);

    // Return top 6-12 actions
    const topCount = Math.min(12, Math.max(6, actions.length));
    return actions.slice(0, topCount);
}

/**
 * Generate smart deploy actions
 */
function generateDeployActions(aiHand, aiBoard, enemyBoard, gameplan) {
    const actions = [];

    if (!aiHand || aiHand.length === 0) return actions;

    aiHand.forEach(card => {
        // Determine good rows for this card
        const goodRows = evaluateDeploymentRows(card, aiBoard, enemyBoard, gameplan);

        goodRows.forEach(({ row, priority, reasoning }) => {
            actions.push({
                type: 'deploy',
                card: card,
                row: row,
                priority: priority,
                description: `Deploy ${card.name} to ${row} - ${reasoning}`
            });
        });
    });

    return actions;
}

/**
 * Evaluate which rows are good for deploying a card
 */
function evaluateDeploymentRows(card, aiBoard, enemyBoard, gameplan) {
    const rows = [];

    ['front', 'middle', 'back'].forEach(row => {
        let priority = 0;
        const reasons = [];

        // Base priority from card stats
        priority += (card[`${row}_power`] || 0) * 0.3;
        priority += (card[`${row}_synergy`] || 0) * 0.25;

        // Row occupancy considerations
        const currentCount = aiBoard[row]?.length || 0;

        // Avoid overcrowding (stacking risk)
        if (currentCount >= 3) {
            priority -= 2.0;
            reasons.push('overcrowded');
        } else if (currentCount === 0) {
            priority += 1.0;
            reasons.push('establish presence');
        }

        // Gameplan bonuses
        if (gameplan === 'row_crush') {
            // Prefer filling rows to create threats
            if (currentCount === 2) {
                priority += 1.5;
                reasons.push('complete row threat');
            }
        }

        if (gameplan === 'column_control') {
            // Prefer aligning in columns
            priority += evaluateColumnAlignment(row, card, aiBoard, enemyBoard);
        }

        if (gameplan === 'protect_scale') {
            // Prefer safe positioning
            if (row === 'back' && card.role === 'Support') {
                priority += 1.5;
                reasons.push('safe support position');
            }

            if (row === 'front' && card.role === 'Tank') {
                priority += 1.5;
                reasons.push('frontline protection');
            }
        }

        // Immediate threat creation
        const threatIncrease = estimateThreatIncrease(card, row, aiBoard, enemyBoard);
        if (threatIncrease > 2) {
            priority += 1.0;
            reasons.push('creates threat');
        }

        // Protection value
        if (needsProtection(aiBoard, row)) {
            if (card.role === 'Tank' || card.health > 4) {
                priority += 0.8;
                reasons.push('protects vulnerable allies');
            }
        }

        // Only add if priority is reasonable
        if (priority > -1.0) {
            rows.push({
                row,
                priority,
                reasoning: reasons.join(', ')
            });
        }
    });

    return rows;
}

/**
 * Evaluate column alignment value
 */
function evaluateColumnAlignment(row, card, aiBoard, enemyBoard) {
    let value = 0;

    // Check existing columns
    for (let col = 0; col < (aiBoard[row]?.length || 0); col++) {
        // Value aligned columns (same column across rows)
        let columnStrength = 0;
        ['front', 'middle', 'back'].forEach(r => {
            if (aiBoard[r]?.[col]) columnStrength++;
        });

        if (columnStrength >= 1) {
            value += 0.5;
        }

        // Extra value if Reinhardt is in this column
        ['front', 'middle', 'back'].forEach(r => {
            if (aiBoard[r]?.[col]?.id === 'reinhardt') {
                value += 0.8;
            }
        });
    }

    return value;
}

/**
 * Estimate threat increase from deployment
 */
function estimateThreatIncrease(card, row, aiBoard, enemyBoard) {
    const power = card[`${row}_power`] || 0;
    const synergy = card[`${row}_synergy`] || 0;

    let threat = power + synergy * 0.5;

    // Bonus if this threatens to kill an enemy
    const enemyRow = enemyBoard[row] || [];
    enemyRow.forEach(enemy => {
        if ((enemy.health || 0) <= power + 2) {
            threat += 2; // Lethal threat
        }
    });

    return threat;
}

/**
 * Check if a row needs protection
 */
function needsProtection(aiBoard, row) {
    const rowCards = aiBoard[row] || [];

    return rowCards.some(card => {
        // Vulnerable supports or low HP heroes
        return (card.role === 'Support' || (card.health || 0) < 3);
    });
}

/**
 * Generate ultimate actions
 */
function generateUltimateActions(aiBoard, enemyBoard, gameState) {
    const actions = [];

    ['front', 'middle', 'back'].forEach(row => {
        aiBoard[row]?.forEach((card, index) => {
            if (card.ultimate && !card.ultimateUsed) {
                const ultAction = evaluateUltimateUse(card, row, index, aiBoard, enemyBoard);

                if (ultAction && ultAction.priority > 0) {
                    actions.push(ultAction);
                }
            }
        });
    });

    return actions;
}

/**
 * Evaluate if and when to use an ultimate
 */
function evaluateUltimateUse(card, row, index, aiBoard, enemyBoard) {
    const heroId = card.id;
    let priority = 0;
    const reasons = [];

    // Row wipes (Pharah, Junkrat, Reaper)
    if (['pharah', 'junkrat', 'reaper'].includes(heroId)) {
        const targetRow = findBestEnemyRow(enemyBoard);
        const enemiesInRow = enemyBoard[targetRow]?.length || 0;
        const enemyHP = sumRowHP(enemyBoard[targetRow]);

        const synergy = aiBoard[row]?.reduce((s, c) => s + (c[`${row}_synergy`] || 0), 0) || 0;
        const expectedDamage = 2 + synergy * 0.5; // Base 2, scales with synergy

        // Fire if: hit ≥2 enemies for ≥5 total OR secure ≥1 kill
        if (enemiesInRow >= 2 && expectedDamage >= 5) {
            priority = 8.0;
            reasons.push(`row wipe: ${enemiesInRow} enemies, ${expectedDamage.toFixed(1)} dmg`);
        } else if (enemyHP <= expectedDamage && enemiesInRow > 0) {
            priority = 7.0;
            reasons.push('secure kills');
        } else {
            priority = 2.0; // Hold for better opportunity
            reasons.push('waiting for better target');
        }
    }

    // Column wipes (Reinhardt, Hanzo, Sigma)
    if (['reinhardt', 'hanzo', 'sigma'].includes(heroId)) {
        const bestColumn = findBestEnemyColumn(enemyBoard);
        const enemiesInColumn = countColumnEnemies(enemyBoard, bestColumn);

        // Fire if: hit ≥2 enemies for ≥4 effective
        if (enemiesInColumn >= 2) {
            priority = 7.5;
            reasons.push(`column wipe: ${enemiesInColumn} enemies`);
        } else if (enemiesInColumn === 1 && hasHighValueTarget(enemyBoard, bestColumn)) {
            priority = 6.0;
            reasons.push('remove key piece');
        } else {
            priority = 1.0;
            reasons.push('no good column target');
        }
    }

    // Global chip (Hazard, D.Va bomb)
    if (['hazard', 'dva'].includes(heroId)) {
        const vulnerableEnemies = countVulnerableEnemies(enemyBoard);

        if (vulnerableEnemies >= 2) {
            priority = 7.0;
            reasons.push(`chip setup: ${vulnerableEnemies} vulnerable`);
        }
    }

    // Support ultimates (Mercy, Lucio, Baptiste)
    if (['mercy', 'lucio', 'baptiste', 'zenyatta'].includes(heroId)) {
        const woundedAllies = countWoundedAllies(aiBoard);

        if (woundedAllies >= 2) {
            priority = 6.5;
            reasons.push(`heal ${woundedAllies} wounded`);
        }
    }

    // Orisa Supercharger
    if (heroId === 'orisa') {
        const alliesInRow = aiBoard[row]?.length || 0;

        if (alliesInRow >= 3) {
            priority = 7.0;
            reasons.push(`supercharger: boost ${alliesInRow} allies`);
        }
    }

    if (priority > 0) {
        return {
            type: 'ultimate',
            card: card,
            row: row,
            priority: priority,
            description: `Ultimate: ${card.name} - ${reasons.join(', ')}`
        };
    }

    return null;
}

// ========== HELPER FUNCTIONS ==========

function findBestEnemyRow(enemyBoard) {
    let bestRow = 'front';
    let maxValue = 0;

    ['front', 'middle', 'back'].forEach(row => {
        const enemies = enemyBoard[row]?.length || 0;
        const hp = sumRowHP(enemyBoard[row]);
        const value = enemies * 2 + hp * 0.5;

        if (value > maxValue) {
            maxValue = value;
            bestRow = row;
        }
    });

    return bestRow;
}

function sumRowHP(rowCards) {
    if (!rowCards) return 0;
    return rowCards.reduce((sum, card) => sum + (card.health || 0), 0);
}

function findBestEnemyColumn(enemyBoard) {
    let bestColumn = 0;
    let maxEnemies = 0;

    for (let col = 0; col < 6; col++) {
        let count = 0;
        ['front', 'middle', 'back'].forEach(row => {
            if (enemyBoard[row]?.[col]) count++;
        });

        if (count > maxEnemies) {
            maxEnemies = count;
            bestColumn = col;
        }
    }

    return bestColumn;
}

function countColumnEnemies(enemyBoard, column) {
    let count = 0;
    ['front', 'middle', 'back'].forEach(row => {
        if (enemyBoard[row]?.[column]) count++;
    });
    return count;
}

function hasHighValueTarget(enemyBoard, column) {
    const highValueHeroes = ['mercy', 'orisa', 'soldier', 'widowmaker', 'hanzo'];

    return ['front', 'middle', 'back'].some(row => {
        const card = enemyBoard[row]?.[column];
        return card && highValueHeroes.includes(card.id);
    });
}

function countVulnerableEnemies(enemyBoard) {
    let count = 0;

    ['front', 'middle', 'back'].forEach(row => {
        enemyBoard[row]?.forEach(card => {
            if ((card.health || 0) <= 3 || (card.shield || 0) > 0) {
                count++;
            }
        });
    });

    return count;
}

function countWoundedAllies(aiBoard) {
    let count = 0;

    ['front', 'middle', 'back'].forEach(row => {
        aiBoard[row]?.forEach(card => {
            // Wounded if below 80% health (assuming max ~5-6 HP)
            if ((card.health || 0) < 4) {
                count++;
            }
        });
    });

    return count;
}

export default {
    generateCandidateActions,
    generateDeployActions,
    generateUltimateActions
};