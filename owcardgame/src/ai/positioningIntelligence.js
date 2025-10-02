/**
 * Positioning Intelligence for AI
 * Understands row/column tactics, Reinhardt shield lanes, targeting priorities
 */

/**
 * Determine best row for a card based on game state and strategy
 */
export function determineBestRow(card, aiBoard, enemyBoard, winCondition) {
    const heroId = card.id;

    // Get base power/synergy for each row
    const rowScores = {
        front: evaluateRowFit(card, 'front', aiBoard, enemyBoard),
        middle: evaluateRowFit(card, 'middle', aiBoard, enemyBoard),
        back: evaluateRowFit(card, 'back', aiBoard, enemyBoard)
    };

    console.log(`Positioning ${card.name}:`, rowScores);

    // Apply specific hero positioning logic
    rowScores.front += getFrontRowBonus(heroId, card, aiBoard, enemyBoard);
    rowScores.middle += getMiddleRowBonus(heroId, card, aiBoard, enemyBoard);
    rowScores.back += getBackRowBonus(heroId, card, aiBoard, enemyBoard);

    // Reinhardt special positioning
    if (heroId === 'reinhardt') {
        return positionReinhardt(card, aiBoard, enemyBoard, rowScores);
    }

    // D.Va MEKA special positioning (maximize net kills: enemy kills - ally kills)
    if (heroId === 'dvameka') {
        return positionDvaMeka(card, aiBoard, enemyBoard);
    }

    // PHARAH: Position in highest synergy row for ultimate value
    if (heroId === 'pharah') {
        return positionPharah(card, aiBoard, enemyBoard, rowScores);
    }

    // Find best row
    let bestRow = 'middle';
    let highestScore = rowScores.middle;

    if (rowScores.front > highestScore) {
        highestScore = rowScores.front;
        bestRow = 'front';
    }
    if (rowScores.back > highestScore) {
        highestScore = rowScores.back;
        bestRow = 'back';
    }

    console.log(`Best row for ${card.name}: ${bestRow} (score: ${highestScore.toFixed(1)})`);
    return bestRow;
}

/**
 * Evaluate how well a card fits in a specific row
 */
function evaluateRowFit(card, row, aiBoard, enemyBoard) {
    let score = 0;

    // Base power contribution
    score += (card[`${row}_power`] || 0) * 10;

    // Synergy contribution
    score += (card[`${row}_synergy`] || 0) * 8;

    // Health value (survivability)
    score += (card.health || 0) * 2;

    // Row density (prefer filling gaps vs stacking)
    const rowSize = aiBoard[row]?.length || 0;
    if (rowSize === 0) score += 15; // Prefer establishing presence
    if (rowSize >= 2) score -= 10; // Penalize overcrowding
    if (rowSize >= 3) score -= 30; // CRITICAL: Heavy penalty for overstacking (AOE vulnerability)

    // Enemy threat assessment
    const enemyRowSize = enemyBoard[row]?.length || 0;
    const enemyRowPower = enemyBoard[row]?.reduce((sum, c) => sum + (c[`${row}_power`] || 0), 0) || 0;

    // Avoid rows with overwhelming enemy presence
    if (enemyRowPower > 10) score -= 15;

    // Consider matching enemy rows (for combat)
    if (enemyRowSize > 0 && card.health > 3) score += 10;

    // === CRITICAL: ROW HAZARDS AND BUFFS ===
    const rowId = `2${row[0]}`; // 2f, 2m, 2b
    const rowData = window.__ow_getRow?.(rowId);

    // Check for enemy debuffs (hazards to avoid)
    if (rowData?.enemyEffects) {
        rowData.enemyEffects.forEach(effect => {
            if (effect.type === 'damage-reduction') {
                // Hanzo sonic arrow - damage reduced by 1
                score -= 20;
                console.log(`Row ${row}: Hanzo token detected (-20 score)`);
            }
            if (effect.type === 'visibility' || effect.id === 'widowmaker-sight') {
                // Widowmaker infra-sight - enemies see this row
                score -= 15;
                console.log(`Row ${row}: Widowmaker sight detected (-15 score)`);
            }
            if (effect.id === 'bob-token') {
                // BOB token - ultimates cost +2
                score -= 25;
                console.log(`Row ${row}: BOB token detected (-25 score)`);
            }
        });
    }

    // Check for ally buffs (bonuses to seek)
    if (rowData?.allyEffects) {
        rowData.allyEffects.forEach(effect => {
            if (effect.type === 'damageReduction' || effect.id === 'orisa-barrier') {
                // Orisa protective barrier - take 1 less damage
                score += 25;
                console.log(`Row ${row}: Orisa barrier detected (+25 score)`);
            }
            if (effect.type === 'heal-over-time' || effect.id === 'lucio-heal-token') {
                // Lucio heal token - heal 1 HP at turn start
                score += 15;
                console.log(`Row ${row}: Lucio heal token detected (+15 score)`);
            }
            if (effect.type === 'synergyBoost' || effect.id === 'orisa-supercharger') {
                // Orisa supercharger - +1 synergy per hero
                score += 20;
                console.log(`Row ${row}: Orisa supercharger detected (+20 score)`);
            }
        });
    }

    // === ANTI-SYNERGY: Avoid feeding enemy ultimates ===
    const enemyRowId = `1${row[0]}`; // Opposite row (1f for 2f, etc.)
    const enemyRowData = window.__ow_getRow?.(enemyRowId);

    if (enemyRowData) {
        const enemySynergy = (enemyRowData.synergy?.f || 0) + (enemyRowData.synergy?.m || 0) + (enemyRowData.synergy?.b || 0);
        const enemyCardCount = enemyRowData.cardIds?.length || 0;

        // Heavy penalty if enemy row has high synergy (close to ultimate)
        if (enemySynergy >= 4 && enemyCardCount >= 2) {
            score -= 35;
            console.log(`Row ${row}: Enemy opposite row has high synergy (${enemySynergy}) - avoid feeding ultimate (-35 score)`);
        } else if (enemySynergy >= 2 && enemyCardCount >= 1) {
            score -= 15;
            console.log(`Row ${row}: Enemy opposite row building synergy (${enemySynergy}) - penalty (-15 score)`);
        }

        // Check if enemy has high-value AOE ultimates ready
        enemyRowData.cardIds?.forEach(cardId => {
            const enemyCard = window.__ow_getCard?.(cardId);
            if (enemyCard && ['pharah', 'hanzo', 'junkrat', 'zarya', 'dva'].includes(enemyCard.id)) {
                const isReady = typeof window.__ow_isUltimateReady === 'function' ?
                              window.__ow_isUltimateReady(cardId) : false;
                if (isReady && enemySynergy >= 3) {
                    score -= 40;
                    console.log(`Row ${row}: Enemy ${enemyCard.name} has ultimate ready with high synergy - avoid grouping (-40 score)`);
                }
            }
        });
    }

    return score;
}

/**
 * Front row bonuses for specific hero types
 */
function getFrontRowBonus(heroId, card, aiBoard, enemyBoard) {
    let bonus = 0;

    // Tanks should generally go front
    if (card.role === 'Tank') {
        bonus += 25;

        // Extra bonus if no front line yet
        if (aiBoard.front.length === 0) bonus += 20;
    }

    // Brawlers (close range damage)
    if (['reaper', 'mei', 'doomfist', 'winston', 'wreckingball', 'junkerqueen'].includes(heroId)) {
        bonus += 20;
    }

    // Reinhardt wants front for shield positioning
    if (heroId === 'reinhardt') bonus += 30;

    // D.Va wants front
    if (heroId === 'dva' || heroId === 'dvameka') bonus += 25;

    // Penalty for squishy heroes in front
    if (card.health < 3 && card.role !== 'Tank') bonus -= 20;

    return bonus;
}

/**
 * Middle row bonuses
 */
function getMiddleRowBonus(heroId, card, aiBoard, enemyBoard) {
    let bonus = 0;

    // Middle row is versatile - good default
    bonus += 10;

    // Flankers and mobile heroes
    if (['genji', 'tracer', 'sombra', 'echo', 'lucio'].includes(heroId)) {
        bonus += 15;
    }

    // Flex damage dealers
    if (['pharah', 'junkrat', 'soldier', 'mccree', 'ashe'].includes(heroId)) {
        bonus += 12;
    }

    return bonus;
}

/**
 * Back row bonuses
 */
function getBackRowBonus(heroId, card, aiBoard, enemyBoard) {
    let bonus = 0;

    // Snipers and long-range heroes
    if (['widowmaker', 'hanzo', 'ana', 'ashe', 'baptiste'].includes(heroId)) {
        bonus += 25;
    }

    // Supports want back row for safety
    if (card.role === 'Support') {
        bonus += 20;

        // Extra bonus if already have frontline
        if (aiBoard.front.length > 0) bonus += 15;
    }

    // Squishy heroes prefer back
    if (card.health < 3) bonus += 10;

    // Bastion wants back for artillery mode
    if (heroId === 'bastion') bonus += 20;

    // Torbjorn back for turret placement
    if (heroId === 'torbjorn') bonus += 15;

    return bonus;
}

/**
 * Special positioning logic for Reinhardt
 */
function positionReinhardt(card, aiBoard, enemyBoard, baseScores) {
    console.log('Positioning Reinhardt with shield column strategy');

    // Reinhardt should go where he can protect the most valuable allies
    const columnAnalysis = analyzeColumnValue(aiBoard);

    // Find column with most value or establish new column
    let bestRow = 'front'; // Default
    let bestColumnValue = 0;

    // Check each row for column potential
    ['front', 'middle', 'back'].forEach(row => {
        const rowCards = aiBoard[row] || [];
        rowCards.forEach((allyCard, columnIndex) => {
            // Calculate value of this column
            const columnValue = calculateColumnValue(columnIndex, aiBoard);

            if (columnValue > bestColumnValue) {
                bestColumnValue = columnValue;
                bestRow = row;
            }
        });
    });

    // If no strong column exists, check if we have backline damage in hand to deploy next
    if (bestColumnValue < 15) {
        // Place in front, will deploy backline after
        console.log('Reinhardt: No strong column yet, placing front for future backline');
        return 'front';
    }

    // Check if there's already a tank in front - maybe middle is better
    if (aiBoard.front.length > 0 && aiBoard.front.some(c => c.role === 'Tank')) {
        if (baseScores.middle > baseScores.back) {
            console.log('Reinhardt: Front has tank, placing middle');
            return 'middle';
        }
    }

    console.log(`Reinhardt: Best row is ${bestRow} (column value: ${bestColumnValue})`);
    return bestRow;
}

/**
 * Analyze value of each column for Reinhardt shield
 */
function analyzeColumnValue(aiBoard) {
    const columns = [{}, {}, {}, {}, {}, {}]; // Up to 6 columns

    ['front', 'middle', 'back'].forEach(row => {
        const rowCards = aiBoard[row] || [];
        rowCards.forEach((card, index) => {
            if (!columns[index]) columns[index] = { cards: [], value: 0 };

            columns[index].cards.push(card);
            // Value based on power, synergy, and health
            columns[index].value += (card.front_power || 0) + (card.middle_power || 0) + (card.back_power || 0);
            columns[index].value += (card.health || 0) * 2;
        });
    });

    return columns;
}

/**
 * Calculate total value of a specific column
 */
function calculateColumnValue(columnIndex, aiBoard) {
    let value = 0;

    ['front', 'middle', 'back'].forEach(row => {
        const rowCards = aiBoard[row] || [];
        const card = rowCards[columnIndex];

        if (card) {
            value += (card[`${row}_power`] || 0) * 2;
            value += (card.health || 0) * 1.5;

            // Backline damage dealers are high priority to protect
            if (['widowmaker', 'hanzo', 'ana', 'soldier', 'ashe'].includes(card.id)) {
                value += 15;
            }
        }
    });

    return value;
}

/**
 * Determine best column position within a row
 */
export function determineBestColumn(card, row, aiBoard, enemyBoard) {
    const heroId = card.id;
    const currentRowCards = aiBoard[row] || [];
    const numColumns = currentRowCards.length;

    // If first card in row, doesn't matter
    if (numColumns === 0) return 0;

    // For Reinhardt, place in column with backline
    if (heroId === 'reinhardt') {
        // Find column with backline damage
        for (let col = 0; col < numColumns; col++) {
            const backCard = aiBoard.back?.[col];
            if (backCard && ['widowmaker', 'hanzo', 'ana', 'soldier', 'ashe'].includes(backCard.id)) {
                console.log(`Reinhardt: Aligning with backline ${backCard.name} at column ${col}`);
                return col;
            }
        }
    }

    // For backline damage, try to align with Reinhardt if present
    if (['widowmaker', 'hanzo', 'ana', 'soldier', 'ashe'].includes(heroId)) {
        for (let col = 0; col < numColumns; col++) {
            const frontCard = aiBoard.front?.[col];
            if (frontCard && frontCard.id === 'reinhardt') {
                console.log(`${card.name}: Aligning with Reinhardt shield at column ${col}`);
                return col;
            }
        }
    }

    // Default: place at end
    return numColumns;
}

/**
 * Check if this is a good time to toggle Reinhardt shield
 */
export function shouldToggleReinhardtShield(reinhardtCard, aiBoard, enemyBoard, turnPhase) {
    // Enable shield when there are vulnerable allies behind Reinhardt
    const reinhardtRow = findCardRow(reinhardtCard.id, aiBoard);
    if (!reinhardtRow) return false;

    const columnIndex = aiBoard[reinhardtRow].findIndex(c => c.id === reinhardtCard.id);
    if (columnIndex === -1) return false;

    // Check if there are valuable allies in this column
    let alliesInColumn = 0;
    let vulnerableAllies = 0;

    ['front', 'middle', 'back'].forEach(row => {
        const card = aiBoard[row]?.[columnIndex];
        if (card && card.id !== 'reinhardt') {
            alliesInColumn++;
            if (card.health < 4) vulnerableAllies++;
        }
    });

    // Enable shield if there are vulnerable allies to protect
    const shouldEnable = vulnerableAllies > 0;

    console.log(`Reinhardt shield decision: ${alliesInColumn} allies, ${vulnerableAllies} vulnerable - ${shouldEnable ? 'ENABLE' : 'DISABLE'}`);
    return shouldEnable;
}

function findCardRow(heroId, aiBoard) {
    for (const row of ['front', 'middle', 'back']) {
        if (aiBoard[row]?.some(c => c.id === heroId)) {
            return row;
        }
    }
    return null;
}

/**
 * Position D.Va MEKA to maximize net kills (enemy kills - ally kills)
 * Ultimate: Self Destruct (3) - Deal 4 damage to all in MEKA's row and opposing row
 */
function positionDvaMeka(card, aiBoard, enemyBoard) {
    console.log('Positioning D.Va MEKA for maximum Self Destruct value...');

    const rows = ['front', 'middle', 'back'];
    let bestRow = 'middle'; // Default fallback
    let bestNetValue = -999;

    for (const row of rows) {
        // Check if row has space
        const rowSize = aiBoard[row]?.length || 0;
        if (rowSize >= 4) {
            console.log(`  ${row}: FULL (skipped)`);
            continue;
        }

        // Calculate ally casualties (4 damage to all in our row)
        const allyRow = aiBoard[row] || [];
        let allyKills = 0;
        let allyValueLost = 0;

        for (const ally of allyRow) {
            if (ally && ally.health > 0 && ally.health <= 4) {
                allyKills++;
                // Value allies by health + power
                const allyValue = (ally.health || 0) + (ally[`${row}_power`] || 0);
                allyValueLost += allyValue;
            }
        }

        // Calculate enemy casualties (4 damage to all in opposing row)
        const enemyRow = enemyBoard[row] || [];
        let enemyKills = 0;
        let enemyValueGained = 0;

        for (const enemy of enemyRow) {
            if (enemy && enemy.health > 0 && enemy.health <= 4) {
                enemyKills++;
                // Value enemies by health + power
                const enemyValue = (enemy.health || 0) + (enemy[`${row}_power`] || 0);
                enemyValueGained += enemyValue;
            }
        }

        // Net value = enemies killed - allies killed (with value weighting)
        const netKills = enemyKills - allyKills;
        const netValue = enemyValueGained - allyValueLost;

        console.log(`  ${row}: ${enemyKills} enemies (value: ${enemyValueGained}) - ${allyKills} allies (value: ${allyValueLost}) = NET ${netKills} kills, ${netValue.toFixed(1)} value`);

        // Prefer positive net value, but accept neutral if no better option
        if (netValue > bestNetValue || (netValue === bestNetValue && netKills > 0)) {
            bestNetValue = netValue;
            bestRow = row;
        }
    }

    console.log(`D.Va MEKA best row: ${bestRow} (net value: ${bestNetValue.toFixed(1)})`);
    return bestRow;
}

/**
 * Position Pharah in row with highest synergy for ultimate maximization
 * Barrage ultimate benefits from high synergy rows
 */
function positionPharah(card, aiBoard, enemyBoard, rowScores) {
    console.log('Positioning Pharah for ultimate synergy maximization...');

    const rows = ['front', 'middle', 'back'];
    let bestRow = 'middle'; // Default
    let bestScore = -999;

    for (const row of rows) {
        // Check if row has space
        const rowSize = aiBoard[row]?.length || 0;
        if (rowSize >= 4) {
            console.log(`  ${row}: FULL (skipped)`);
            continue;
        }

        // Get current synergy in this row
        const rowId = `2${row[0]}`; // 2f, 2m, 2b
        const currentSynergy = window.__ow_getRow?.(rowId)?.synergy || 0;

        // Pharah's synergy contribution in this row
        const pharahSynergy = card[`${row}_synergy`] || 0;

        // Future synergy potential (current + pharah's contribution)
        const futureSynergy = currentSynergy + pharahSynergy;

        // Score based on synergy potential for ultimate
        // Prioritize rows that will reach 3+ synergy (ultimate threshold)
        let score = futureSynergy * 10;

        // Bonus if this row will reach ultimate threshold (3+ synergy)
        if (futureSynergy >= 3) {
            score += 30;
        }

        // Also consider power contribution
        const pharahPower = card[`${row}_power`] || 0;
        score += pharahPower * 5;

        console.log(`  ${row}: current synergy ${currentSynergy} + pharah ${pharahSynergy} = ${futureSynergy} total, score: ${score}`);

        if (score > bestScore) {
            bestScore = score;
            bestRow = row;
        }
    }

    console.log(`Pharah best row: ${bestRow} (synergy setup score: ${bestScore})`);
    return bestRow;
}

export default {
    determineBestRow,
    determineBestColumn,
    shouldToggleReinhardtShield
};