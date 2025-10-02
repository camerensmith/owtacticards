import { selectRowTarget } from '../engine/targeting';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { playAudioByKey } from '../../assets/imageImports';
import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';

export function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    try {
        playAudioByKey('wreckingball-enter');
    } catch {}
    
    // Count living enemies in opposing row
    const currentRowPosition = rowId[1]; // 'f', 'm', 'b'
    const enemyPlayer = playerNum === 1 ? 2 : 1;
    const opposingRowId = `${enemyPlayer}${currentRowPosition}`;
    
    const opposingRow = window.__ow_getRow?.(opposingRowId);
    let livingEnemies = 0;
    
    if (opposingRow && opposingRow.cardIds) {
        opposingRow.cardIds.forEach(cardId => {
            const card = window.__ow_getCard?.(cardId);
            if (card && card.health > 0) {
                livingEnemies++;
            }
        });
    }
    
    // Calculate shields: living enemies + 1, max 5
    const shieldAmount = Math.min(livingEnemies + 1, 5);
    
    // Apply shields to Wrecking Ball
    window.__ow_dispatchShieldUpdate?.(playerHeroId, shieldAmount);
    
    showToast(`Wrecking Ball: Adaptive Shield - ${shieldAmount} shields gained (${livingEnemies} enemies + 1)`);
    setTimeout(() => clearToast(), 2000);
}

export async function onUltimate({ playerHeroId, rowId, cost }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    // Get current row synergy (cost is passed in, but we'll use current row synergy)
    const currentRow = window.__ow_getRow?.(rowId);
    const currentSynergy = currentRow?.synergy || 0;
    
    if (currentSynergy <= 0) {
        showToast('Wrecking Ball: No synergy in current row to deploy Minefield');
        setTimeout(() => clearToast(), 2000);
        return;
    }
    
    showToast('Wrecking Ball: Select enemy row to deploy Minefield');
    const targetRow = await selectRowTarget({ isDamage: true });
    
    if (targetRow) {
        // Validate it's an enemy row
        const targetPlayerNum = parseInt(targetRow.rowId[0]);
        if (targetPlayerNum === playerNum) {
            showToast('Wrecking Ball: Can only deploy Minefield on enemy rows');
            setTimeout(() => clearToast(), 1500);
            return;
        }
        
        // Play ultimate sound after placement
        try {
            playAudioByKey('wreckingball-ultimate');
        } catch {}
        
        // Create a single minefield token with multiple charges
        const minefieldToken = {
            id: `wreckingball-minefield-${Date.now()}`,
            hero: 'wreckingball',
            type: 'minefield',
            charges: currentSynergy, // Total number of charges
            sourceCardId: playerHeroId,
            sourceRowId: rowId,
            tooltip: `Minefield: Deals 2 damage when enemies move into or out of this row (${currentSynergy} charges)`,
            visual: 'wreckingball-icon'
        };
        
        // Get current enemy effects and add the single token
        const currentRow = window.__ow_getRow?.(targetRow.rowId);
        const currentEnemyEffects = currentRow?.enemyEffects || [];
        const updatedEnemyEffects = [...currentEnemyEffects, minefieldToken];
        
        // Use setRowArray to replace the entire array
        window.__ow_setRowArray?.(targetRow.rowId, 'enemyEffects', updatedEnemyEffects);
        
        // Reduce Wrecking Ball's row synergy to 0
        window.__ow_updateSynergy?.(rowId, -currentSynergy);
        showToast(`Wrecking Ball: Minefield deployed with ${currentSynergy} charges`);
        setTimeout(() => clearToast(), 2000);
    } else {
        showToast('Wrecking Ball: Minefield cancelled');
        setTimeout(() => clearToast(), 1500);
    }
}

// Function to check for minefield triggers on movement
export function checkMinefieldTrigger(cardId, rowId) {
    const row = window.__ow_getRow?.(rowId);
    if (!row || !row.enemyEffects) {
        return;
    }

    // Find Wrecking Ball minefield token in this row
    const minefieldToken = row.enemyEffects.find(effect =>
        effect?.hero === 'wreckingball' && effect?.type === 'minefield'
    );

    if (minefieldToken && minefieldToken.charges > 0) {
        // Check for immortality field before dealing damage
        const targetCard = window.__ow_getCard?.(cardId);
        if (targetCard && Array.isArray(targetCard.effects)) {
            const hasImmortality = targetCard.effects.some(effect =>
                effect?.id === 'immortality-field' && effect?.type === 'invulnerability'
            );
            if (hasImmortality) {
                return; // Don't consume charge or deal damage
            }
        }

        // Deal 2 damage (respects damage mitigation)
        dealDamage(cardId, rowId, 2, false, minefieldToken.sourceCardId);
        effectsBus.publish(Effects.showDamage(cardId, 2));

        // Reduce charges by 1
        const newCharges = minefieldToken.charges - 1;
        
        if (newCharges <= 0) {
            // Remove the token if no charges left
            window.__ow_removeRowEffect?.(rowId, 'enemyEffects', minefieldToken.id);
        } else {
            // Update the token with reduced charges
            const updatedToken = {
                ...minefieldToken,
                charges: newCharges,
                tooltip: `Minefield: Deals 2 damage when enemies move into or out of this row (${newCharges} charges)`
            };
            
            // Get current enemy effects, remove old token, and add updated one
            const currentRow = window.__ow_getRow?.(rowId);
            const currentEnemyEffects = currentRow?.enemyEffects || [];
            const updatedEnemyEffects = currentEnemyEffects.map(effect => 
                effect.id === minefieldToken.id ? updatedToken : effect
            );
            
            // Use setRowArray to replace the entire array
            window.__ow_setRowArray?.(rowId, 'enemyEffects', updatedEnemyEffects);
        }
    }
}

export default { onEnter, onUltimate, checkMinefieldTrigger };
