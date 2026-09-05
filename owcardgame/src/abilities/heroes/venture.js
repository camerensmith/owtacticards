import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';
import { playAudioByKey } from '../../assets/imageImports';
import { selectCardTarget } from '../engine/targeting';
import {
    bestColumn,
    collectShufflable,
    columnTargets,
    enemyRowIdsFor,
    shuffledRowStates,
} from '../../game/ventureRules';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';

// Helper function to calculate row distance
function getRowDistance(ventureRow, targetRow) {
    const rowValues = { 'f': 1, 'm': 2, 'b': 3 };
    const ventureValue = rowValues[ventureRow[1]] || 2; // Default to middle if invalid
    const targetValue = rowValues[targetRow[1]] || 2;
    
    // Calculate distance: back->front=3, back->middle=2, back->back=1, middle->front=2, middle->middle=1, front->front=1
    let distance;
    if (ventureValue === 3 && targetValue === 1) distance = 3; // Back to Front
    else if (ventureValue === 3 && targetValue === 2) distance = 2; // Back to Middle  
    else if (ventureValue === 3 && targetValue === 3) distance = 1; // Back to Back
    else if (ventureValue === 2 && targetValue === 1) distance = 2; // Middle to Front
    else if (ventureValue === 2 && targetValue === 2) distance = 1; // Middle to Middle
    else if (ventureValue === 2 && targetValue === 3) distance = 2; // Middle to Back
    else if (ventureValue === 1 && targetValue === 1) distance = 1; // Front to Front
    else if (ventureValue === 1 && targetValue === 2) distance = 2; // Front to Middle
    else if (ventureValue === 1 && targetValue === 3) distance = 3; // Front to Back
    else distance = Math.abs(ventureValue - targetValue); // Fallback
    
    console.log(`getRowDistance: ventureRow=${ventureRow}, targetRow=${targetRow}, ventureValue=${ventureValue}, targetValue=${targetValue}, distance=${distance}`);
    return distance;
}

// Helper function to get row name from rowId
function getRowName(rowId) {
    const rowNames = { 'f': 'Front', 'm': 'Middle', 'b': 'Back' };
    return rowNames[rowId[1]] || 'Middle';
}

export async function onEnter({ playerHeroId, rowId }) {
    try { playAudioByKey('venture-enter'); } catch {}
    
    const playerNum = parseInt(playerHeroId[0]);
    const enemyPlayer = playerNum === 1 ? 2 : 1;
    
    // Get all enemy heroes
    const enemyRows = [`${enemyPlayer}f`, `${enemyPlayer}m`, `${enemyPlayer}b`];
    const enemyHeroes = [];
    enemyRows.forEach(rid => {
        const row = window.__ow_getRow?.(rid);
        if (!row || !row.cardIds) return;
        row.cardIds.forEach(cid => {
            const card = window.__ow_getCard?.(cid);
            if (card && card.health > 0 && card.id !== 'turret' && card.id !== 'bob' && card.id !== 'nemesis') {
                enemyHeroes.push({ cardId: cid, rowId: rid });
            }
        });
    });
    
    if (enemyHeroes.length === 0) {
        showToast('Venture: No enemy targets available');
        setTimeout(() => clearToast(), 2000);
        return;
    }
    
    // For AI, automatically select a random enemy hero
    if (window.__ow_aiTriggering || window.__ow_isAITurn) {
        const randomEnemy = enemyHeroes[Math.floor(Math.random() * enemyHeroes.length)];
        
        // Calculate distance-based damage
        const distance = getRowDistance(rowId, randomEnemy.rowId);
        const damage = Math.max(1, distance); // Minimum 1 damage, maximum 3
        console.log(`Venture AI Drill Dash: ${rowId} → ${randomEnemy.rowId}, distance=${distance}, damage=${damage}`);
        
        // Play ability1 sound on successful targeting
        try { playAudioByKey('venture-ability1'); } catch {}
        
        // Deal damage
        // Venture tunnels across and erupts under the target.
        try { effectsBus.publish(Effects.burrow(playerHeroId, randomEnemy.cardId)); } catch {}
        dealDamage(randomEnemy.cardId, randomEnemy.rowId, damage, false, playerHeroId, false, { skipProjectileFx: true });
        try { effectsBus.publish(Effects.showDamage(randomEnemy.cardId, damage)); } catch {}
        
        const ventureRowName = getRowName(rowId);
        const targetRowName = getRowName(randomEnemy.rowId);
        showToast(`Drill Dash: ${damage} damage (${ventureRowName} → ${targetRowName})`);
        setTimeout(() => clearToast(), 2000);
        return;
    }
    
    showToast('Venture: Select enemy target for Drill Dash');
    const target = await selectCardTarget({ isDamage: true });
    if (!target) {
        clearToast();
        return;
    }
    clearToast();
    
    // Calculate distance-based damage
    const distance = getRowDistance(rowId, target.rowId);
    const damage = Math.max(1, distance); // Minimum 1 damage, maximum 3
    console.log(`Venture Drill Dash: ${rowId} → ${target.rowId}, distance=${distance}, damage=${damage}`);
    
    // Play ability1 sound on successful targeting
    try { playAudioByKey('venture-ability1'); } catch {}
    
    // Deal damage
    // Venture tunnels across and erupts under the target.
    try { effectsBus.publish(Effects.burrow(playerHeroId, target.cardId)); } catch {}
    dealDamage(target.cardId, target.rowId, damage, false, playerHeroId, false, { skipProjectileFx: true });
    try { effectsBus.publish(Effects.showDamage(target.cardId, damage)); } catch {}
    
    const ventureRowName = getRowName(rowId);
    const targetRowName = getRowName(target.rowId);
    showToast(`Drill Dash: ${damage} damage (${ventureRowName} → ${targetRowName})`);
    setTimeout(() => clearToast(), 2000);
}

export async function onUltimate({ playerHeroId, rowId, cost }) {
    try { playAudioByKey('venture-ultimate'); } catch {}

    const playerNum = parseInt(playerHeroId[0]);
    const enemyPlayer = playerNum === 1 ? 2 : 1;
    const enemyRows = enemyRowIdsFor(enemyPlayer);

    const enemyHeroes = collectShufflable(enemyPlayer, window.__ow_getRow, window.__ow_getCard);
    if (enemyHeroes.length === 0) {
        showToast('Tectonic Shock: No enemies to shuffle');
        setTimeout(() => clearToast(), 2000);
        return;
    }

    // Venture picks the column to break open. It is a slot index, chosen freely
    // — it is no longer tied to whichever row Venture happens to stand in.
    let column;
    if (window.__ow_aiTriggering || window.__ow_isAITurn) {
        column = bestColumn(enemyPlayer, window.__ow_getRow, window.__ow_getCard);
    } else {
        showToast('Tectonic Shock: Select an enemy column to shatter');
        const target = await selectCardTarget({
            isDamage: true,
            fromCardId: playerHeroId,
            previewShape: 'column',
        });
        clearToast();
        if (!target) return;

        const targetRow = window.__ow_getRow?.(target.rowId);
        column = (targetRow?.cardIds || []).indexOf(target.cardId);
    }

    if (column === null || column < 0) {
        showToast('Tectonic Shock: Could not read that column');
        setTimeout(() => clearToast(), 2000);
        return;
    }

    // Everything caught in the quake is shaken and tumbled.
    try { effectsBus.publish(Effects.tectonic(enemyHeroes.map((e) => e.cardId))); } catch {}

    // Shuffle first, then break the chosen column: the column is a place, so
    // whoever the quake drops into it is who takes the hit.
    const newRowStates = shuffledRowStates(enemyPlayer, enemyHeroes);
    enemyRows.forEach((rid) => {
        window.__ow_setRowArray?.(rid, 'cardIds', newRowStates[rid]);
    });

    const targets = columnTargets(enemyPlayer, column, window.__ow_getRow, window.__ow_getCard);
    if (targets.length === 0) {
        showToast(`Tectonic Shock: Column ${column + 1} shattered, but nobody was standing there`);
        setTimeout(() => clearToast(), 2000);
        return;
    }

    for (const target of targets) {
        dealDamage(target.cardId, target.rowId, 2, false, playerHeroId, false, { skipProjectileFx: true });
        try { effectsBus.publish(Effects.showDamage(target.cardId, 2)); } catch {}
    }

    showToast(`Tectonic Shock: 2 damage to ${targets.length} enemy(ies) in column ${column + 1}`);
    setTimeout(() => clearToast(), 2000);
}

export default { onEnter, onUltimate };
