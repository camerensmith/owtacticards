import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';
import { playAudioByKey } from '../../assets/imageImports';
import { selectCardTarget } from '../engine/targeting';
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
    
    showToast('Venture: Select target for Drill Dash');
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
    dealDamage(target.cardId, target.rowId, damage, false, playerHeroId);
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
    
    // Get all enemy heroes (excluding turrets)
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
        showToast('Tectonic Shock: No enemies to shuffle');
        setTimeout(() => clearToast(), 2000);
        return;
    }
    
    // Shuffle enemy positions (like Ramattra)
    const shuffledHeroes = [...enemyHeroes];
    for (let i = shuffledHeroes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledHeroes[i], shuffledHeroes[j]] = [shuffledHeroes[j], shuffledHeroes[i]];
    }
    
    // Create new row states for all enemy rows
    const newRowStates = {};
    enemyRows.forEach(rid => {
        newRowStates[rid] = [];
    });
    
    // Distribute shuffled heroes across rows
    shuffledHeroes.forEach((hero, index) => {
        const newRowId = enemyRows[index % enemyRows.length];
        newRowStates[newRowId].push(hero.cardId);
    });
    
    // Update all enemy rows with new card arrangements
    enemyRows.forEach(rid => {
        window.__ow_setRowArray?.(rid, 'cardIds', newRowStates[rid]);
    });
    
    // Find enemy in Venture's column after shuffle
    const ventureColumn = rowId[1]; // f, m, or b
    const targetRowId = `${enemyPlayer}${ventureColumn}`;
    const targetRow = window.__ow_getRow?.(targetRowId);
    
    if (targetRow && targetRow.cardIds && targetRow.cardIds.length > 0) {
        // Find the enemy hero in that column (not turret)
        const targetCardId = targetRow.cardIds.find(cid => {
            const card = window.__ow_getCard?.(cid);
            return card && card.health > 0 && card.id !== 'turret' && card.id !== 'bob' && card.id !== 'nemesis';
        });
        
        if (targetCardId) {
            // Deal 2 damage to the enemy in Venture's column
            dealDamage(targetCardId, targetRowId, 2, false, playerHeroId);
            try { effectsBus.publish(Effects.showDamage(targetCardId, 2)); } catch {}
            
            const targetRowName = getRowName(targetRowId);
            showToast(`Tectonic Shock: 2 damage to enemy in ${targetRowName} row`);
            setTimeout(() => clearToast(), 2000);
        } else {
            showToast('Tectonic Shock: No enemy in target column');
            setTimeout(() => clearToast(), 2000);
        }
    } else {
        showToast('Tectonic Shock: No enemy in target column');
        setTimeout(() => clearToast(), 2000);
    }
}

export default { onEnter, onUltimate };
