import { selectCardTarget, selectRowTarget } from '../engine/targeting';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { dealDamage } from '../engine/damageBus';
import { playAudioByKey } from '../../assets/imageImports';

export function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    try {
        playAudioByKey('mei-enter');
    } catch {}
    
    handleBlizzard(playerHeroId, rowId, playerNum);
}

async function handleBlizzard(playerHeroId, rowId, playerNum) {
    try {
        showToast('Mei: Select an enemy row for Blizzard');
        
        const targetRow = await selectRowTarget({ isDamage: true });
        if (!targetRow) {
            clearToast();
            return;
        }
        
        const targetPlayerNum = parseInt(targetRow.rowId[0]);
        const isEnemyRow = targetPlayerNum !== playerNum;
        
        if (!isEnemyRow) {
            showToast('Mei: Blizzard can only target enemy rows');
            setTimeout(() => clearToast(), 1500);
            return;
        }
        
        // Play ability sound
        try {
            playAudioByKey('mei-ability1');
        } catch {}
        
        // Place Mei token on enemy row
        window.__ow_appendRowEffect?.(targetRow.rowId, 'enemyEffects', {
            id: 'mei-token',
            hero: 'mei',
            type: 'ultimateCostModifier',
            value: 2, // Double the cost
            sourceCardId: playerHeroId,
            sourceRowId: rowId,
            tooltip: 'Blizzard: Ultimate abilities cost double synergy from this row',
            visual: 'mei-icon'
        });
        
        showToast(`Mei: Blizzard! Ultimate costs doubled in ${targetRow.rowId}`);
        setTimeout(() => clearToast(), 2000);
        
    } catch (error) {
        console.error('Mei Blizzard error:', error);
        showToast('Mei: Blizzard failed');
        setTimeout(() => clearToast(), 1500);
    }
}

export async function onUltimate({ playerHeroId, rowId, cost }) {
    try {
        const playerNum = parseInt(playerHeroId[0]);
        
        showToast('Mei: Cryo Freeze - Select any hero to freeze');
        
        const target = await selectCardTarget({ isDebuff: true });
        if (!target) {
            clearToast();
            return;
        }
        
        // Check if target is alive
        const targetCard = window.__ow_getCard?.(target.cardId);
        if (!targetCard || targetCard.health <= 0) {
            showToast('Mei: Cannot freeze dead heroes');
            setTimeout(() => clearToast(), 1500);
            return;
        }
        
        // Play ultimate resolve sound
        try {
            playAudioByKey('mei-ultimate');
        } catch {}
        
        // Apply Cryo Freeze effect to the target card
        window.__ow_appendCardEffect?.(target.cardId, {
            id: 'cryo-freeze',
            hero: 'mei',
            type: 'immunity',
            sourceCardId: playerHeroId,
            sourceRowId: rowId,
            tooltip: 'Cryo Freeze: Immune to damage and abilities for remainder of round',
            visual: 'frozen'
        });
        
        // Clean up death-triggered tokens associated with this hero
        cleanupDeathTriggeredTokens(target.cardId);
        
        showToast(`Mei: ${targetCard.name} is frozen solid!`);
        setTimeout(() => clearToast(), 2000);
        
    } catch (error) {
        console.error('Mei Cryo Freeze error:', error);
        showToast('Mei: Cryo Freeze failed');
        setTimeout(() => clearToast(), 1500);
    }
}

function cleanupDeathTriggeredTokens(targetCardId) {
    try {
        // Get all rows to check for tokens
        const allRows = ['1f', '1m', '1b', '2f', '2m', '2b'];
        
        allRows.forEach(rowId => {
            const row = window.__ow_getRow?.(rowId);
            if (!row) return;
            
            // Check ally effects
            if (row.allyEffects) {
                const filteredAllyEffects = row.allyEffects.filter(effect => {
                    // Keep effects that don't clean up on death of this specific hero
                    return !(effect.sourceCardId === targetCardId && effect.cleanupOnDeath);
                });
                
                if (filteredAllyEffects.length !== row.allyEffects.length) {
                    window.__ow_setRowArray?.(rowId, 'allyEffects', filteredAllyEffects);
                }
            }
            
            // Check enemy effects
            if (row.enemyEffects) {
                const filteredEnemyEffects = row.enemyEffects.filter(effect => {
                    // Keep effects that don't clean up on death of this specific hero
                    return !(effect.sourceCardId === targetCardId && effect.cleanupOnDeath);
                });
                
                if (filteredEnemyEffects.length !== row.enemyEffects.length) {
                    window.__ow_setRowArray?.(rowId, 'enemyEffects', filteredEnemyEffects);
                }
            }
        });
        
        console.log(`Mei: Cleaned up death-triggered tokens for ${targetCardId}`);
        
    } catch (error) {
        console.error('Mei token cleanup error:', error);
    }
}

export function onDeath({ playerHeroId, rowId }) {
    try {
        console.log(`${playerHeroId} died - cleaning up Mei tokens`);
        
        // Remove Mei tokens from all rows
        const allRows = ['1f', '1m', '1b', '2f', '2m', '2b'];
        allRows.forEach(rowId => {
            window.__ow_removeRowEffect?.(rowId, 'enemyEffects', 'mei-token');
        });
        
        console.log('Mei: All Blizzard tokens removed');
        
    } catch (error) {
        console.error('Mei onDeath cleanup error:', error);
    }
}

export default { onEnter, onUltimate, onDeath };
