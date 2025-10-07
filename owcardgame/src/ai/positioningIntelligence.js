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
    
    // Apply scenario-based positioning bonuses
    try {
        const { getScenarioBasedPositioning } = require('./scenarioAnalysis');
        const gameState = { rows: aiBoard, playerCards: { player1cards: { cards: enemyBoard } } };
        const scenarioBonuses = getScenarioBasedPositioning(card, aiBoard, enemyBoard, gameState);
        
        rowScores.front += scenarioBonuses.front || 0;
        rowScores.middle += scenarioBonuses.middle || 0;
        rowScores.back += scenarioBonuses.back || 0;
        
        console.log(`${card.name} scenario bonuses - Front: +${scenarioBonuses.front || 0}, Middle: +${scenarioBonuses.middle || 0}, Back: +${scenarioBonuses.back || 0}`);
    } catch (error) {
        console.log('Scenario analysis not available:', error.message);
    }

    console.log(`Positioning ${card.name}:`, rowScores);

    // Apply specific hero positioning logic
    const frontBonus = getFrontRowBonus(heroId, card, aiBoard, enemyBoard);
    const middleBonus = getMiddleRowBonus(heroId, card, aiBoard, enemyBoard);
    const backBonus = getBackRowBonus(heroId, card, aiBoard, enemyBoard);
    
    rowScores.front += frontBonus;
    rowScores.middle += middleBonus;
    rowScores.back += backBonus;
    
    console.log(`${card.name} bonuses - Front: +${frontBonus}, Middle: +${middleBonus}, Back: +${backBonus}`);
    console.log(`${card.name} final scores - Front: ${rowScores.front}, Middle: ${rowScores.middle}, Back: ${rowScores.back}`);

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

    // ORISA: Backline protector with front synergy - balance between safety and synergy
    if (heroId === 'orisa') {
        return positionOrisa(card, aiBoard, enemyBoard, rowScores);
    }

    // WRECKING BALL: Favor entering on a row whose opposite enemy row is most populated
    if (heroId === 'wreckingball') {
        const enemyCounts = {
            front: (enemyBoard.front?.length || 0),
            middle: (enemyBoard.middle?.length || 0),
            back: (enemyBoard.back?.length || 0)
        };
        let preferred = 'front';
        let maxCount = enemyCounts.front;
        if (enemyCounts.middle > maxCount) { preferred = 'middle'; maxCount = enemyCounts.middle; }
        if (enemyCounts.back > maxCount) { preferred = 'back'; maxCount = enemyCounts.back; }
        // Nudge scores toward the preferred row to bias selection
        const bias = Math.min(30, maxCount * 10); // up to +30 bias
        rowScores[preferred] += bias;
        console.log(`Wrecking Ball: Opposite enemy counts F:${enemyCounts.front} M:${enemyCounts.middle} B:${enemyCounts.back} -> biasing ${preferred} by +${bias}`);
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

    // Tanks should generally go front, but consider their synergy/power distribution
    if (card.role === 'Tank') {
        // Base tank bonus
        bonus += 15;
        
        // Extra bonus if no front line yet
        if (aiBoard.front.length === 0) bonus += 20;
        
        // Consider synergy distribution - if front synergy is significantly higher
        const frontSynergy = card.synergy?.f || 0;
        const middleSynergy = card.synergy?.m || 0;
        const backSynergy = card.synergy?.b || 0;
        const maxSynergy = Math.max(frontSynergy, middleSynergy, backSynergy);
        
        if (frontSynergy === maxSynergy && frontSynergy > 0) {
            bonus += 15; // Front synergy bonus
            console.log(`${heroId}: Front synergy bonus (+15) - front:${frontSynergy} vs others`);
        }
        
        // Consider power distribution - if front power is significantly higher
        const frontPower = card.power?.f || 0;
        const middlePower = card.power?.m || 0;
        const backPower = card.power?.b || 0;
        const maxPower = Math.max(frontPower, middlePower, backPower);
        
        if (frontPower === maxPower && frontPower > 0) {
            bonus += 10; // Front power bonus
            console.log(`${heroId}: Front power bonus (+10) - front:${frontPower} vs others`);
        }
    }

    // Orisa and Ramattra prefer not to commit to front line; bias away from front
    if (heroId === 'orisa' || heroId === 'ramattra') {
        bonus -= 20;
        console.log(`${heroId}: Prefers mid/back - front penalty (-20)`);
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

    // Orisa and Ramattra favor mid for protection + aura effects
    if (heroId === 'orisa' || heroId === 'ramattra') {
        bonus += 20;
        console.log(`${heroId}: Mid preference (+20)`);
    }

    // Flex damage dealers
    if (['pharah', 'junkrat', 'soldier', 'mccree', 'ashe'].includes(heroId)) {
        bonus += 12;
    }

    // Consider synergy distribution - if middle synergy is significantly higher
    const frontSynergy = card.synergy?.f || 0;
    const middleSynergy = card.synergy?.m || 0;
    const backSynergy = card.synergy?.b || 0;
    const maxSynergy = Math.max(frontSynergy, middleSynergy, backSynergy);
    
    if (middleSynergy === maxSynergy && middleSynergy > 0) {
        bonus += 15; // Middle synergy bonus
        console.log(`${heroId}: Middle synergy bonus (+15) - middle:${middleSynergy} vs others`);
    }
    
    // Consider power distribution - if middle power is significantly higher
    const frontPower = card.power?.f || 0;
    const middlePower = card.power?.m || 0;
    const backPower = card.power?.b || 0;
    const maxPower = Math.max(frontPower, middlePower, backPower);
    
    if (middlePower === maxPower && middlePower > 0) {
        bonus += 10; // Middle power bonus
        console.log(`${heroId}: Middle power bonus (+10) - middle:${middlePower} vs others`);
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

    // Orisa and Ramattra: prefer back when frontline is risky
    if (heroId === 'orisa' || heroId === 'ramattra') {
        bonus += 10;
        console.log(`${heroId}: Back preference (+10)`);
    }

    // Squishy heroes prefer back
    if (card.health < 3) bonus += 10;

    // Bastion wants back for artillery mode
    if (heroId === 'bastion') bonus += 20;

    // Torbjorn back for turret placement
    if (heroId === 'torbjorn') bonus += 15;

    // Consider synergy distribution - if back synergy is significantly higher
    const frontSynergy = card.synergy?.f || 0;
    const middleSynergy = card.synergy?.m || 0;
    const backSynergy = card.synergy?.b || 0;
    const maxSynergy = Math.max(frontSynergy, middleSynergy, backSynergy);
    
    if (backSynergy === maxSynergy && backSynergy > 0) {
        bonus += 15; // Back synergy bonus
        console.log(`${heroId}: Back synergy bonus (+15) - back:${backSynergy} vs others`);
    }
    
    // Consider power distribution - if back power is significantly higher
    const frontPower = card.power?.f || 0;
    const middlePower = card.power?.m || 0;
    const backPower = card.power?.b || 0;
    const maxPower = Math.max(frontPower, middlePower, backPower);
    
    if (backPower === maxPower && backPower > 0) {
        bonus += 10; // Back power bonus
        console.log(`${heroId}: Back power bonus (+10) - back:${backPower} vs others`);
    }

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

/**
 * Special positioning logic for Orisa
 * Orisa is a backline protector with front synergy - needs to balance safety vs synergy
 */
function positionOrisa(card, aiBoard, enemyBoard, baseScores) {
    console.log('Positioning Orisa - backline protector with front synergy');
    
    // Orisa's stats: Front synergy=3, Back power=3, Front power=1
    const frontSynergy = card.synergy?.f || 0;
    const backPower = card.power?.b || 0;
    
    // Calculate safety vs synergy trade-off
    const safetyScore = baseScores.back + 20; // Extra safety bonus for backline protector
    const synergyScore = baseScores.front + 25; // Extra synergy bonus for front placement
    
    // Consider enemy threats - if front row is dangerous, prioritize safety
    const frontThreatLevel = calculateRowThreatLevel('front', enemyBoard);
    const backThreatLevel = calculateRowThreatLevel('back', enemyBoard);
    
    let finalScores = { ...baseScores };
    
    // If front row is very dangerous, heavily favor back
    if (frontThreatLevel > 50) {
        finalScores.front -= 30;
        finalScores.back += 20;
        console.log('Orisa: Front row dangerous, prioritizing safety');
    }
    // If back row is safer and we have allies to protect, go back
    else if (backThreatLevel < frontThreatLevel && aiBoard.back.length > 0) {
        finalScores.back += 15;
        console.log('Orisa: Back row safer with allies to protect');
    }
    // If front row is safe and we need synergy, go front
    else if (frontThreatLevel < 30 && aiBoard.front.length < 2) {
        finalScores.front += 20;
        console.log('Orisa: Front row safe, prioritizing synergy');
    }
    
    // Find best row based on final scores
    let bestRow = 'middle';
    let highestScore = finalScores.middle;
    
    if (finalScores.front > highestScore) {
        highestScore = finalScores.front;
        bestRow = 'front';
    }
    if (finalScores.back > highestScore) {
        highestScore = finalScores.back;
        bestRow = 'back';
    }
    
    console.log(`Orisa best row: ${bestRow} (safety vs synergy: front=${finalScores.front}, back=${finalScores.back})`);
    return bestRow;
}

/**
 * Calculate threat level for a specific row
 */
function calculateRowThreatLevel(row, enemyBoard) {
    const enemyRow = enemyBoard[row] || [];
    let threatLevel = 0;
    
    enemyRow.forEach(card => {
        // High damage cards are more threatening
        const cardPower = card.power?.[row[0]] || 0;
        threatLevel += cardPower * 10;
        
        // Cards with high synergy are more threatening (closer to ultimate)
        const cardSynergy = card.synergy?.[row[0]] || 0;
        threatLevel += cardSynergy * 15;
        
        // Specific high-threat heroes
        if (['pharah', 'hanzo', 'junkrat', 'zarya', 'dva'].includes(card.id)) {
            threatLevel += 20;
        }
    });
    
    return threatLevel;
}

export default {
    determineBestRow,
    determineBestColumn,
    shouldToggleReinhardtShield
};