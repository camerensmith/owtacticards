/**
 * Board Evaluation System
 * Fast scoring function for board state evaluation
 */

/**
 * Evaluate board state and return numerical score
 * Positive = AI advantage, Negative = Enemy advantage
 */
export function evaluateBoard(aiBoard, enemyBoard, gameState) {
    let score = 0;

    // 1. Material & Durability
    score += evaluateMaterial(aiBoard, enemyBoard);

    // 2. Pressure & Geometry
    score += evaluatePressure(aiBoard, enemyBoard);

    // 3. Tempo & Conversion
    score += evaluateTempo(aiBoard, enemyBoard);

    // 4. Synergy Economy
    score += evaluateSynergy(aiBoard, enemyBoard);

    // 5. Token/Marker Effects
    score += evaluateEffects(aiBoard, enemyBoard);

    return score;
}

/**
 * Material & Durability (HP, shields, board presence)
 */
function evaluateMaterial(aiBoard, enemyBoard) {
    let score = 0;

    // Count HP for both sides
    const aiHP = countTotalHP(aiBoard);
    const enemyHP = countTotalHP(enemyBoard);

    score += aiHP * 1.0;
    score -= enemyHP * 1.0;

    // Count shields (worth 0.6 each)
    const aiShields = countTotalShields(aiBoard);
    const enemyShields = countTotalShields(enemyBoard);

    score += aiShields * 0.6;
    score -= enemyShields * 0.6;

    // Board presence (number of deployed heroes)
    const aiCount = countHeroes(aiBoard);
    const enemyCount = countHeroes(enemyBoard);

    score += aiCount * 0.5;
    score -= enemyCount * 0.5;

    return score;
}

/**
 * Pressure & Geometry (row advantage, column threats, flanks)
 */
function evaluatePressure(aiBoard, enemyBoard) {
    let score = 0;

    // Row advantage (bodies in each row)
    ['front', 'middle', 'back'].forEach(row => {
        const aiCount = aiBoard[row]?.length || 0;
        const enemyCount = enemyBoard[row]?.length || 0;
        score += (aiCount - enemyCount) * 0.3;
    });

    // Column threats (heroes lined up with multiple enemies)
    score += evaluateColumnThreats(aiBoard, enemyBoard);
    score -= evaluateColumnThreats(enemyBoard, aiBoard);

    // Flank value (exposed enemies in front without tank cover)
    score += evaluateExposedTargets(enemyBoard);
    score -= evaluateExposedTargets(aiBoard);

    return score;
}

/**
 * Tempo & Conversion (imminent kills, overkill penalty, ult equity)
 */
function evaluateTempo(aiBoard, enemyBoard) {
    let score = 0;

    // Imminent kills (enemies within kill range)
    const aiKills = evaluateImminentKills(aiBoard, enemyBoard);
    const enemyKills = evaluateImminentKills(enemyBoard, aiBoard);

    score += aiKills.thisTurn * 2.0;
    score += aiKills.nextTurn * 1.0;
    score -= enemyKills.thisTurn * 2.0;
    score -= enemyKills.nextTurn * 1.0;

    // Overkill penalty (wasted damage)
    const aiOverkill = estimateOverkill(aiBoard, enemyBoard);
    const enemyOverkill = estimateOverkill(enemyBoard, aiBoard);

    score -= aiOverkill * 0.5;
    score += enemyOverkill * 0.5;

    // Ult equity (value of unspent ultimates)
    score += evaluateUltEquity(aiBoard, enemyBoard, true);
    score -= evaluateUltEquity(enemyBoard, aiBoard, false);

    return score;
}

/**
 * Synergy Economy (synergy points, stacking risk)
 */
function evaluateSynergy(aiBoard, enemyBoard) {
    let score = 0;

    // Synergy points (higher if have burst ultimates)
    const aiHasBurst = hasUltimateBurstHero(aiBoard);
    const enemyHasBurst = hasUltimateBurstHero(enemyBoard);

    const aiSynergy = countTotalSynergy(aiBoard);
    const enemySynergy = countTotalSynergy(enemyBoard);

    const aiMultiplier = aiHasBurst ? 0.3 : 0.2;
    const enemyMultiplier = enemyHasBurst ? 0.3 : 0.2;

    score += aiSynergy * aiMultiplier;
    score -= enemySynergy * enemyMultiplier;

    // Stacking risk (penalty for >3 heroes in any row)
    ['front', 'middle', 'back'].forEach(row => {
        const aiCount = aiBoard[row]?.length || 0;
        const enemyCount = enemyBoard[row]?.length || 0;

        if (aiCount > 3) score -= (aiCount - 3) * 0.15;
        if (enemyCount > 3) score += (enemyCount - 3) * 0.15;
    });

    return score;
}

/**
 * Token/Marker Effects (ongoing effects value)
 */
function evaluateEffects(aiBoard, enemyBoard) {
    let score = 0;

    // Count valuable ongoing effects
    score += countOngoingEffectValue(aiBoard, true);
    score -= countOngoingEffectValue(enemyBoard, false);

    return score;
}

// ========== HELPER FUNCTIONS ==========

function countTotalHP(board) {
    let hp = 0;
    ['front', 'middle', 'back'].forEach(row => {
        board[row]?.forEach(card => {
            hp += card.health || 0;
        });
    });
    return hp;
}

function countTotalShields(board) {
    let shields = 0;
    ['front', 'middle', 'back'].forEach(row => {
        board[row]?.forEach(card => {
            shields += card.shield || 0;
        });
    });
    return shields;
}

function countHeroes(board) {
    let count = 0;
    ['front', 'middle', 'back'].forEach(row => {
        count += board[row]?.length || 0;
    });
    return count;
}

function evaluateColumnThreats(attackBoard, defenseBoard) {
    let threats = 0;

    // Check each column for heroes with column AOE
    for (let col = 0; col < 6; col++) {
        // Check if attacker has column AOE hero
        let hasColumnAOE = false;
        ['front', 'middle', 'back'].forEach(row => {
            const card = attackBoard[row]?.[col];
            if (card && hasColumnAOEAbility(card.id)) {
                hasColumnAOE = true;
            }
        });

        if (hasColumnAOE) {
            // Count defenders in this column
            let defendersInColumn = 0;
            ['front', 'middle', 'back'].forEach(row => {
                if (defenseBoard[row]?.[col]) defendersInColumn++;
            });

            if (defendersInColumn >= 2) {
                threats += 0.4;
            }
        }
    }

    return threats;
}

function hasColumnAOEAbility(heroId) {
    return ['hanzo', 'reinhardt', 'sigma', 'junkrat'].includes(heroId);
}

function evaluateExposedTargets(board) {
    let exposed = 0;

    // Check front row for non-tanks without protection
    const frontRow = board.front || [];
    frontRow.forEach((card, index) => {
        if (card.role !== 'Tank' && card.health < 4) {
            // Check if there's a tank in adjacent position
            const hasTankCover = frontRow.some((c, i) =>
                c.role === 'Tank' && Math.abs(i - index) <= 1
            );

            if (!hasTankCover) {
                exposed += 0.3;
            }
        }
    });

    return exposed;
}

function evaluateImminentKills(attackBoard, defenseBoard) {
    const kills = { thisTurn: 0, nextTurn: 0 };

    // Calculate total available damage this turn
    const totalDamage = calculateAvailableDamage(attackBoard);

    // Find vulnerable targets
    ['front', 'middle', 'back'].forEach(row => {
        defenseBoard[row]?.forEach(card => {
            const effectiveHP = (card.health || 0) + (card.shield || 0) * 0.6;

            if (effectiveHP <= totalDamage * 0.3) {
                // Can kill this turn with focused fire
                kills.thisTurn += 1;
            } else if (effectiveHP <= totalDamage * 0.6) {
                // Can kill next turn
                kills.nextTurn += 1;
            }
        });
    });

    return kills;
}

function calculateAvailableDamage(board) {
    let damage = 0;

    ['front', 'middle', 'back'].forEach(row => {
        board[row]?.forEach(card => {
            // Base power from row
            damage += card[`${row}_power`] || 0;

            // Damage from on-enter abilities
            if (hasDamageAbility(card.id)) {
                damage += estimateDamageAbilityValue(card.id);
            }
        });
    });

    return damage;
}

function hasDamageAbility(heroId) {
    return ['roadhog', 'genji', 'reaper', 'hanzo', 'widowmaker', 'mccree',
            'soldier', 'junkrat', 'pharah', 'tracer', 'doomfist'].includes(heroId);
}

function estimateDamageAbilityValue(heroId) {
    const damageMap = {
        'roadhog': 2,
        'genji': 2,
        'hanzo': 3,
        'widowmaker': 2,
        'soldier': 3,
        'doomfist': 4
    };
    return damageMap[heroId] || 2;
}

function estimateOverkill(attackBoard, defenseBoard) {
    // Simplified: assume some damage is wasted on kills
    const totalDamage = calculateAvailableDamage(attackBoard);
    const totalDefenseHP = countTotalHP(defenseBoard);

    if (totalDamage > totalDefenseHP * 1.5) {
        return (totalDamage - totalDefenseHP) * 0.3;
    }

    return 0;
}

function evaluateUltEquity(board, opponentBoard, isAI) {
    let equity = 0;

    ['front', 'middle', 'back'].forEach(row => {
        board[row]?.forEach(card => {
            if (card.ultimate && !card.ultimateUsed) {
                // Estimate ultimate value
                const ultValue = estimateUltimateValue(card.id, board, opponentBoard);

                // Discount by expected turns until use (assume 1-2 turns)
                const discountedValue = ultValue * 0.9;

                // Add 60-70% of that value
                equity += discountedValue * 0.65;
            }
        });
    });

    return equity;
}

function estimateUltimateValue(heroId, board, opponentBoard) {
    // High damage ultimates
    if (['pharah', 'hanzo', 'junkrat', 'reaper', 'mccree'].includes(heroId)) {
        const synergy = countTotalSynergy(board);
        return 3 + synergy * 0.5; // Base 3, +0.5 per synergy
    }

    // Column wipes
    if (['reinhardt', 'sigma', 'doomfist'].includes(heroId)) {
        return 4;
    }

    // Support ultimates
    if (['mercy', 'lucio', 'zenyatta', 'baptiste'].includes(heroId)) {
        return 3;
    }

    return 2; // Default
}

function countTotalSynergy(board) {
    // Simplified: count synergy contributions
    let synergy = 0;

    ['front', 'middle', 'back'].forEach(row => {
        board[row]?.forEach(card => {
            synergy += card[`${row}_synergy`] || 0;
        });
    });

    return synergy;
}

function hasUltimateBurstHero(board) {
    const burstHeroes = ['pharah', 'junkrat', 'hanzo', 'orisa', 'reaper'];

    return ['front', 'middle', 'back'].some(row =>
        board[row]?.some(card => burstHeroes.includes(card.id))
    );
}

function countOngoingEffectValue(board, isAI) {
    let value = 0;

    // Check for ongoing effects like Lucio tokens, Torb turrets, etc.
    ['front', 'middle', 'back'].forEach(row => {
        board[row]?.forEach(card => {
            // Healers provide ongoing value
            if (['lucio', 'mercy', 'zenyatta'].includes(card.id)) {
                value += 1.0;
            }

            // Turret/Supercharger provide ongoing value
            if (['turret', 'orisa'].includes(card.id)) {
                value += 1.5;
            }
        });
    });

    return value;
}

export default {
    evaluateBoard,
    evaluateMaterial,
    evaluatePressure,
    evaluateTempo,
    evaluateSynergy,
    evaluateEffects
};