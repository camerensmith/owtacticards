import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { selectCardTarget } from '../engine/targeting';
import { playAudioByKey } from '../../assets/imageImports';

// Barrier Field - onEnter
export async function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    // Play enter sound on activation
    try {
        playAudioByKey('reinhardt-enter');
    } catch {}
    
    try {
        // Give Reinhardt 3 shield tokens (like Brigitte's Repair Pack)
        const currentShield = window.__ow_getCard?.(playerHeroId)?.shield || 0;
        const newShield = Math.min(currentShield + 3, 3); // Max 3 shields for absorption
        window.__ow_dispatchShieldUpdate?.(playerHeroId, newShield);
        
        // Add barrier field effect to Reinhardt
        window.__ow_appendCardEffect?.(playerHeroId, {
            id: 'barrier-field',
            hero: 'reinhardt',
            type: 'barrier',
            sourceCardId: playerHeroId,
            sourceRowId: rowId,
            tooltip: 'Barrier Field: Toggle to absorb damage for allies in your column',
            visual: 'barrier',
            maxShields: 3, // Track max shields for absorption
            shieldsUsed: 0 // Track how many shields used for absorption
        });
        
        showToast('Reinhardt: Barrier Field activated! Right-click to toggle damage absorption');
        setTimeout(() => clearToast(), 3000);
        
    } catch (error) {
        console.error('Reinhardt barrier field error:', error);
        showToast('Reinhardt: Barrier Field failed');
        setTimeout(() => clearToast(), 1500);
    }
}

// Earthshatter - Ultimate (Cost 3)
export async function onUltimate({ playerHeroId, rowId, cost }) {
    const playerNum = parseInt(playerHeroId[0]);

    try {
        // For AI, auto-pick a random enemy column
        let columnIndex = -1;
        if (window.__ow_aiTriggering || window.__ow_isAITurn) {
            const enemyPlayer = playerNum === 1 ? 2 : 1;
            const enemyRows = [`${enemyPlayer}f`, `${enemyPlayer}m`, `${enemyPlayer}b`];
            const firstRow = window.__ow_getRow?.(enemyRows[0]);
            const cols = firstRow?.cardIds?.length || 4;
            columnIndex = Math.floor(Math.random() * cols);
        } else {
            showToast('Reinhardt: Select enemy column to Earthshatter');
            const target = await selectCardTarget();
            if (!target) { clearToast(); return; }
            // Validate target is enemy
            const targetPlayerNum = parseInt(target.cardId[0]);
            const isEnemy = targetPlayerNum !== playerNum;
            if (!isEnemy) { showToast('Reinhardt: Must target enemy column'); setTimeout(() => clearToast(), 1500); return; }
            // Get target's column index
            const targetRow = window.__ow_getRow?.(target.rowId);
            columnIndex = targetRow.cardIds.indexOf(target.cardId);
        }
        
        if (columnIndex === -1) {
            showToast('Reinhardt: Invalid target position');
            setTimeout(() => clearToast(), 1500);
            return;
        }
        
        // Find all enemy rows
        const enemyPlayer = playerNum === 1 ? 2 : 1;
        const enemyRows = [`${enemyPlayer}f`, `${enemyPlayer}m`, `${enemyPlayer}b`];
        
        // Deal 2 damage to all enemies in target column
        let enemiesHit = 0;
        for (const enemyRowId of enemyRows) {
            const enemyRow = window.__ow_getRow?.(enemyRowId);
            if (enemyRow && enemyRow.cardIds[columnIndex]) {
                const enemyCardId = enemyRow.cardIds[columnIndex];
                const enemyCard = window.__ow_getCard?.(enemyCardId);
                
                if (enemyCard && enemyCard.health > 0) {
                    dealDamage(enemyCardId, enemyRowId, 2, false, playerHeroId);
                    try { effectsBus.publish(Effects.showDamage(enemyCardId, 2)); } catch {}
                    enemiesHit++;
                }
            }
        }
        
        // Remove 1 synergy from all enemy rows (regardless of heroes)
        for (const enemyRowId of enemyRows) {
            const currentSynergy = window.__ow_getRow?.(enemyRowId)?.synergy || 0;
            if (currentSynergy > 0) {
                window.__ow_updateSynergy?.(enemyRowId, -1);
            }
        }
        
        // Play ultimate resolve sound
        try {
            playAudioByKey('reinhardt-ultimate');
        } catch {}
        
        showToast(`Reinhardt: Earthshatter hit ${enemiesHit} enemies and removed synergy!`);
        setTimeout(() => clearToast(), 2000);
        
    } catch (error) {
        console.error('Reinhardt ultimate error:', error);
        showToast('Reinhardt: Ultimate failed');
        setTimeout(() => clearToast(), 1500);
    }
}

// Toggle barrier absorption (called from context menu)
export function toggleBarrierAbsorption(playerHeroId) {
    console.log(`Reinhardt - Toggling absorption for ${playerHeroId}`);
    console.log(`Reinhardt - Function called with playerHeroId:`, playerHeroId);
    const card = window.__ow_getCard?.(playerHeroId);
    if (!card || !Array.isArray(card.effects)) {
        console.log(`Reinhardt - No card or effects found for ${playerHeroId}`);
        return;
    }
    
    const barrierEffect = card.effects.find(effect => 
        effect?.id === 'barrier-field' && effect?.type === 'barrier'
    );
    
    if (!barrierEffect) {
        console.log(`Reinhardt - No barrier effect found for ${playerHeroId}`);
        return;
    }
    
    // Toggle the absorption state by updating the card effect
    const isActive = barrierEffect.absorbing || false;
    const newAbsorbing = !isActive;
    
    console.log(`Reinhardt - Current absorbing: ${isActive}, New absorbing: ${newAbsorbing}`);
    
    // Remove the old effect first, then add the updated one with a small delay
    window.__ow_removeCardEffect?.(playerHeroId, 'barrier-field');
    setTimeout(() => {
        window.__ow_appendCardEffect?.(playerHeroId, {
            id: 'barrier-field',
            hero: 'reinhardt',
            type: 'barrier',
            sourceCardId: barrierEffect.sourceCardId,
            sourceRowId: barrierEffect.sourceRowId,
            tooltip: 'Barrier Field: Toggle to absorb damage for allies in your column',
            visual: 'barrier',
            maxShields: barrierEffect.maxShields || 3,
            shieldsUsed: barrierEffect.shieldsUsed || 0,
            absorbing: newAbsorbing
        });
    }, 50);
    
    console.log(`Reinhardt - Updated effect with absorbing: ${newAbsorbing}`);
    
    // Verify the effect was updated correctly
    setTimeout(() => {
        const updatedCard = window.__ow_getCard?.(playerHeroId);
        const updatedBarrierEffect = updatedCard?.effects?.find(effect => 
            effect?.id === 'barrier-field' && effect?.type === 'barrier'
        );
        console.log(`Reinhardt - Verification: Updated effect:`, updatedBarrierEffect);
    }, 100);
    
    if (isActive) {
        showToast('Reinhardt: Damage absorption disabled');
    } else {
        showToast('Reinhardt: Damage absorption enabled');
        // Play enable sound when absorption is turned on
        try {
            playAudioByKey('reinhardt-enable');
        } catch (error) {
            console.log('Reinhardt enable sound error:', error);
        }
    }
    setTimeout(() => clearToast(), 2000);
}

// Check if Reinhardt should absorb damage for an ally
export function shouldAbsorbDamage(reinhardtCardId, targetCardId, targetRowId) {
    const card = window.__ow_getCard?.(reinhardtCardId);
    if (!card || !Array.isArray(card.effects)) return false;
    
    const barrierEffect = card.effects.find(effect => 
        effect?.id === 'barrier-field' && effect?.type === 'barrier'
    );
    
    if (!barrierEffect || !barrierEffect.absorbing) return false;
    
    // Check if target is in same column as Reinhardt
    const reinhardtRow = window.__ow_getRow?.(barrierEffect.sourceRowId);
    const targetRow = window.__ow_getRow?.(targetRowId);
    
    if (!reinhardtRow || !targetRow) return false;
    
    const reinhardtIndex = reinhardtRow.cardIds.indexOf(reinhardtCardId);
    const targetIndex = targetRow.cardIds.indexOf(targetCardId);
    
    return reinhardtIndex === targetIndex && reinhardtIndex !== -1;
}

// Absorb damage for ally (called from damage bus)
export function absorbDamage(reinhardtCardId, damageAmount) {
    const card = window.__ow_getCard?.(reinhardtCardId);
    if (!card || !Array.isArray(card.effects)) return 0;
    
    const barrierEffect = card.effects.find(effect => 
        effect?.id === 'barrier-field' && effect?.type === 'barrier'
    );
    
    if (!barrierEffect) return 0;
    
    const currentShield = card.shield || 0;
    const shieldsUsed = barrierEffect.shieldsUsed || 0;
    const maxShields = barrierEffect.maxShields || 3;
    const availableShields = Math.min(currentShield, maxShields - shieldsUsed);
    
    const shieldsToUse = Math.min(damageAmount, availableShields);
    
    if (shieldsToUse > 0) {
        // Update shield count
        const newShield = Math.max(0, currentShield - shieldsToUse);
        window.__ow_dispatchShieldUpdate?.(reinhardtCardId, newShield);
        
        // Update shields used for absorption by updating the effect
        const newShieldsUsed = (barrierEffect.shieldsUsed || 0) + shieldsToUse;
        window.__ow_removeCardEffect?.(reinhardtCardId, 'barrier-field');
        setTimeout(() => {
            window.__ow_appendCardEffect?.(reinhardtCardId, {
                id: 'barrier-field',
                hero: 'reinhardt',
                type: 'barrier',
                sourceCardId: barrierEffect.sourceCardId,
                sourceRowId: barrierEffect.sourceRowId,
                tooltip: 'Barrier Field: Toggle to absorb damage for allies in your column',
                visual: 'barrier',
                maxShields: barrierEffect.maxShields || 3,
                shieldsUsed: newShieldsUsed,
                absorbing: barrierEffect.absorbing || false
            });
        }, 10);
        
        // Show floating text
        if (window.effectsBus) {
            window.effectsBus.publish({
                type: 'fx:absorb',
                cardId: reinhardtCardId,
                amount: shieldsToUse,
                text: `-${shieldsToUse} Shield`
            });
        }
        
        showToast(`Reinhardt: Absorbed ${shieldsToUse} damage for ally`);
        setTimeout(() => clearToast(), 1500);
    }
    
    return shieldsToUse;
}

export default { onEnter, onUltimate, toggleBarrierAbsorption, shouldAbsorbDamage, absorbDamage };
