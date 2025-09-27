import { selectCardTarget } from '../engine/targeting';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { playAudioByKey } from '../../assets/imageImports';
import effectsBus, { Effects } from '../engine/effectsBus';

// HACK - Remove all Shield Tokens and Hero Tokens from target hero
export async function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    // Play enter sound
    try {
        playAudioByKey('sombra-enter');
    } catch {}
    
    showToast('Sombra: Select target hero to hack');
    
    try {
        const target = await selectCardTarget();
        if (!target) {
            clearToast();
            return;
        }
        
        // Check if target is enemy (Sombra cannot hack herself)
        const targetPlayerNum = parseInt(target.cardId[0]);
        const isEnemy = targetPlayerNum !== playerNum;
        
        if (!isEnemy) {
            showToast('Sombra: Cannot hack allies');
            setTimeout(() => clearToast(), 2000);
            return;
        }
        
        // Check if target is alive
        const targetCard = window.__ow_getCard?.(target.cardId);
        if (!targetCard || targetCard.health <= 0) {
            showToast('Sombra: Can only hack living heroes');
            setTimeout(() => clearToast(), 2000);
            return;
        }
        
        clearToast();
        
        // Play hack sound
        try {
            playAudioByKey('sombra-ability1');
        } catch {}
        
        let removedShields = 0;
        let removedTokens = 0;
        
        // Remove all shield tokens from target hero
        if (targetCard.shield > 0) {
            removedShields = targetCard.shield;
            window.__ow_dispatchShieldUpdate?.(target.cardId, 0);
            console.log(`Sombra: Removed ${removedShields} shields from ${target.cardId}`);
        }
        
        // Remove all effects belonging to target hero from all rows
        const allRows = ['1f', '1m', '1b', '2f', '2m', '2b'];
        for (const rowId of allRows) {
            const row = window.__ow_getRow?.(rowId);
            if (row && row.allyEffects) {
                const effectsToRemove = row.allyEffects.filter(effect => 
                    effect?.sourceCardId === target.cardId
                );
                for (const effect of effectsToRemove) {
                    window.__ow_removeRowEffect?.(rowId, 'allyEffects', effect.id);
                    removedTokens++;
                }
            }
            if (row && row.enemyEffects) {
                const effectsToRemove = row.enemyEffects.filter(effect => 
                    effect?.sourceCardId === target.cardId
                );
                for (const effect of effectsToRemove) {
                    window.__ow_removeRowEffect?.(rowId, 'enemyEffects', effect.id);
                    removedTokens++;
                }
            }
        }
        
        // Show floating text for removed shields
        if (removedShields > 0) {
            effectsBus.publish(Effects.showHeal(target.cardId, -removedShields)); // Negative heal = shield removal
        }
        
        showToast(`Sombra: Hacked ${targetCard.name} - Removed ${removedShields} shields, ${removedTokens} tokens`);
        setTimeout(() => clearToast(), 3000);
        
        console.log(`Sombra: HACK complete - ${removedShields} shields, ${removedTokens} tokens removed`);
        
    } catch (error) {
        console.log('Sombra HACK error:', error);
        clearToast();
    }
}

// E.M.P. - Remove all Hero and Shield Tokens from both sides, destroy turrets
export async function onUltimate({ playerHeroId, rowId, cost }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    // Play ultimate sound
    try {
        playAudioByKey('sombra-ultimate');
    } catch {}
    
    showToast('Sombra: E.M.P. activated - Clearing all tokens and shields');
    
    let totalShieldsRemoved = 0;
    let totalTokensRemoved = 0;
    let turretsDestroyed = 0;
    
    // Process all rows on both sides
    const allRows = ['1f', '1m', '1b', '2f', '2m', '2b'];
    
    for (const rowId of allRows) {
        const row = window.__ow_getRow?.(rowId);
        if (!row) continue;
        
        // Remove all ally effects (all types except invulnerability and immortality)
        if (row.allyEffects) {
            const effectsToRemove = row.allyEffects.filter(effect => 
                effect?.type !== 'invulnerability' && effect?.type !== 'immortality'
            );
            for (const effect of effectsToRemove) {
                window.__ow_removeRowEffect?.(rowId, 'allyEffects', effect.id);
                totalTokensRemoved++;
            }
        }
        
        // Remove all enemy effects (all types except invulnerability and immortality)
        if (row.enemyEffects) {
            const effectsToRemove = row.enemyEffects.filter(effect => 
                effect?.type !== 'invulnerability' && effect?.type !== 'immortality'
            );
            for (const effect of effectsToRemove) {
                window.__ow_removeRowEffect?.(rowId, 'enemyEffects', effect.id);
                totalTokensRemoved++;
            }
        }
        
        // Remove shields from all heroes in this row and destroy turrets
        if (row.cardIds) {
            for (const cardId of row.cardIds) {
                const card = window.__ow_getCard?.(cardId);
                if (!card) continue;
                
                // Remove shields
                if (card.shield > 0) {
                    totalShieldsRemoved += card.shield;
                    window.__ow_dispatchShieldUpdate?.(cardId, 0);
                    console.log(`Sombra E.M.P.: Removed ${card.shield} shields from ${cardId}`);
                }
                
                // Destroy turrets
                if (card.id === 'turret' && card.health > 0) {
                    window.__ow_setCardHealth?.(cardId, 0);
                    turretsDestroyed++;
                    console.log(`Sombra E.M.P.: Destroyed turret ${cardId}`);
                }
            }
        }
    }
    
    // Show floating text for turret destruction
    if (turretsDestroyed > 0) {
        // Find and show destruction effect for each destroyed turret
        for (const rowId of allRows) {
            const row = window.__ow_getRow?.(rowId);
            if (row && row.cardIds) {
                for (const cardId of row.cardIds) {
                    const card = window.__ow_getCard?.(cardId);
                    if (card && card.id === 'turret' && card.health <= 0) {
                        effectsBus.publish(Effects.showDamage(cardId, 999)); // Show destruction effect
                    }
                }
            }
        }
    }
    
    setTimeout(() => clearToast(), 2000);
    
    showToast(`Sombra: E.M.P. complete - ${totalShieldsRemoved} shields, ${totalTokensRemoved} tokens, ${turretsDestroyed} turrets destroyed`);
    setTimeout(() => clearToast(), 3000);
    
    console.log(`Sombra: E.M.P. complete - ${totalShieldsRemoved} shields, ${totalTokensRemoved} tokens, ${turretsDestroyed} turrets destroyed`);
}

export default { onEnter, onUltimate };
