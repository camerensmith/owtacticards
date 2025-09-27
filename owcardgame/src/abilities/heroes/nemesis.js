import { dealDamage } from '../engine/damageBus';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { selectCardTarget } from '../engine/targeting';
import { playAudioByKey } from '../../assets/imageImports';

// Pummel - onEnter
export async function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    try { playAudioByKey('nemesis-enter'); } catch {}
    
    showToast('Nemesis: Select enemy in opposing row to pummel');
    
    try {
        const target = await selectCardTarget();
        if (!target) { 
            clearToast(); 
            return; 
        }
        
        const targetCard = window.__ow_getCard?.(target.cardId);
        const targetPlayer = parseInt(target.cardId[0]);
        const isEnemy = targetPlayer !== playerNum;
        
        // Validate target (enemy, alive, in opposing row)
        if (!isEnemy || !targetCard || targetCard.health <= 0) {
            showToast('Nemesis: Must target a living enemy');
            setTimeout(() => clearToast(), 2000);
            return;
        }
        
        // Check if target is in opposing row
        const currentRow = window.__ow_getRow?.(rowId);
        const targetRow = window.__ow_getRow?.(target.rowId);
        const isOpposingRow = currentRow && targetRow && 
            currentRow.rowType === targetRow.rowType && 
            parseInt(rowId[0]) !== parseInt(target.rowId[0]);
        
        if (!isOpposingRow) {
            showToast('Nemesis: Must target enemy in opposing row');
            setTimeout(() => clearToast(), 2000);
            return;
        }
        
        // Calculate damage based on target's shield value
        const shieldValue = targetCard.shield || 0;
        const damage = shieldValue;
        
        if (damage === 0) {
            showToast('Nemesis: Target has no shields - Pummel deals 0 damage');
            setTimeout(() => clearToast(), 2000);
            return;
        }
        
        // Deal damage (pierces shields completely)
        dealDamage(target.cardId, target.rowId, damage, true, playerHeroId);
        
        // Play ability sound on resolve
        try { playAudioByKey('nemesis-ability1'); } catch {}
        
        clearToast();
        showToast(`Nemesis: Pummel dealt ${damage} damage (pierced shields)!`);
        setTimeout(() => clearToast(), 2000);
        
    } catch (error) {
        console.error('Nemesis Pummel error:', error);
        showToast('Nemesis ability cancelled');
        setTimeout(() => clearToast(), 1500);
    }
}

// Annihilation - Ultimate
export async function onUltimate({ playerHeroId, rowId, cost }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    // Play ultimate activation sound
    try { playAudioByKey('nemesis-ultimate'); } catch {}
    
    // Apply Annihilation effect to Nemesis
    window.__ow_appendCardEffect?.(playerHeroId, {
        id: 'annihilation',
        hero: 'nemesis',
        type: 'persistent',
        sourceCardId: playerHeroId,
        sourceRowId: rowId,
        tooltip: 'Annihilation: All enemies in opposite row and column take 1 damage at start of turn',
        visual: 'annihilation'
    });
    
    showToast('Nemesis: Annihilation activated!');
    setTimeout(() => clearToast(), 2000);
}

// Function to process Annihilation damage (called by TurnEffectsRunner)
export function processAnnihilation(playerHeroId, rowId) {
    const playerNum = parseInt(playerHeroId[0]);
    const enemyPlayer = playerNum === 1 ? 2 : 1;
    
    // Get Nemesis's current position
    const nemesisRow = window.__ow_getRow?.(rowId);
    const nemesisIndex = nemesisRow?.cardIds?.indexOf(playerHeroId) || 0;
    
    // Target opposite row
    const oppositeRowId = `${enemyPlayer}${rowId[1]}`;
    const oppositeRow = window.__ow_getRow?.(oppositeRowId);
    
    if (oppositeRow && oppositeRow.cardIds) {
        // Deal 1 damage to all enemies in opposite row
        oppositeRow.cardIds.forEach(cardId => {
            const card = window.__ow_getCard?.(cardId);
            if (card && card.health > 0) {
                dealDamage(cardId, oppositeRowId, 1, false, playerHeroId);
            }
        });
    }
    
    // Target opposite column
    const enemyRows = [`${enemyPlayer}f`, `${enemyPlayer}m`, `${enemyPlayer}b`];
    enemyRows.forEach(enemyRowId => {
        const enemyRow = window.__ow_getRow?.(enemyRowId);
        if (enemyRow && enemyRow.cardIds[nemesisIndex]) {
            const targetCardId = enemyRow.cardIds[nemesisIndex];
            const card = window.__ow_getCard?.(targetCardId);
            if (card && card.health > 0) {
                dealDamage(targetCardId, enemyRowId, 1, false, playerHeroId);
            }
        }
    });
}

// Cleanup on death
export function onDeath({ playerHeroId, rowId }) {
    // Remove Annihilation effect
    window.__ow_removeCardEffect?.(playerHeroId, 'annihilation');
    console.log('Nemesis died - Annihilation effect ended');
}

export default {
    onEnter,
    onUltimate,
    onDeath,
    processAnnihilation
};
