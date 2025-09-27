import { selectRowTarget } from '../engine/targeting';
import { dealDamage } from '../engine/damageBus';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { playAudioByKey } from '../../assets/imageImports';
import effectsBus, { Effects } from '../engine/effectsBus';

// Experimental Barrier - Place Sigma Token on friendly row with 3 shield tokens
export async function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    showToast('Sigma: Select friendly row for Experimental Barrier');
    
    try {
        const target = await selectRowTarget();
        if (!target) {
            clearToast();
            return;
        }
        
        // Check if target is friendly row
        const targetPlayerNum = parseInt(target.rowId[0]);
        const isFriendlyRow = targetPlayerNum === playerNum;
        
        if (!isFriendlyRow) {
            showToast('Sigma: Can only target friendly rows');
            setTimeout(() => clearToast(), 2000);
            return;
        }
        
        clearToast();
        
        // Play ability sound when ability resolves
        try {
            playAudioByKey('sigma-ability1');
        } catch {}
        
        // Place Sigma Token on the row
        const sigmaToken = {
            id: 'sigma-token',
            hero: 'sigma',
            type: 'barrier',
            shields: 3,
            maxShields: 3,
            sourceCardId: playerHeroId,
            sourceRowId: rowId,
            tooltip: 'Experimental Barrier: Absorbs up to 3 damage for any hero in this row',
            visual: 'sigma-icon'
        };
        
        window.__ow_appendRowEffect?.(target.rowId, 'allyEffects', sigmaToken);
        console.log(`Sigma: Placed Sigma Token on row ${target.rowId} with 3 shields`);
        
        showToast('Sigma: Experimental Barrier placed with 3 shield tokens');
        setTimeout(() => clearToast(), 2000);
        
    } catch (error) {
        console.log('Sigma Experimental Barrier error:', error);
        clearToast();
    }
}

// Gravitic Flux - Deal 1 damage to all enemies in target row and remove all synergy
export async function onUltimate({ playerHeroId, rowId, cost }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    // Play ultimate sound
    try {
        playAudioByKey('sigma-ultimate');
    } catch {}
    
    showToast('Sigma: Select enemy row for Gravitic Flux');
    
    try {
        const target = await selectRowTarget();
        if (!target) {
            clearToast();
            return;
        }
        
        // Check if target is enemy row
        const targetPlayerNum = parseInt(target.rowId[0]);
        const isEnemyRow = targetPlayerNum !== playerNum;
        
        if (!isEnemyRow) {
            showToast('Sigma: Can only target enemy rows');
            setTimeout(() => clearToast(), 2000);
            return;
        }
        
        clearToast();
        
        // Play ultimate resolve sound
        try {
            playAudioByKey('sigma-ultimate-resolve');
        } catch {}
        
        // Get all enemies in the target row
        const targetRow = window.__ow_getRow?.(target.rowId);
        if (targetRow && targetRow.cardIds) {
            const livingEnemies = targetRow.cardIds.filter(cardId => {
                const card = window.__ow_getCard?.(cardId);
                return card && card.health > 0;
            });
            
            // Deal 1 damage to all living enemies (respects shields)
            for (const cardId of livingEnemies) {
                dealDamage(cardId, target.rowId, 1, false, playerHeroId);
                effectsBus.publish(Effects.showDamage(cardId, 1));
            }
        }
        
        // Remove all synergy from the target row (set to 0)
        window.__ow_updateSynergy?.(target.rowId, -999); // Large negative number to ensure it goes to 0
        
        showToast('Sigma: Gravitic Flux - All enemies damaged and synergy removed');
        setTimeout(() => clearToast(), 2000);
        
    } catch (error) {
        console.log('Sigma Gravitic Flux error:', error);
        clearToast();
    }
}

export default { onEnter, onUltimate };
