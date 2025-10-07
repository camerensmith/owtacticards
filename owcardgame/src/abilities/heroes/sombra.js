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
    
    // For AI, select shielded enemy with most shields; deprioritize Zarya
    if (window.__ow_aiTriggering || window.__ow_isAITurn) {
        const enemyPlayer = playerNum === 1 ? 2 : 1;
        const enemyRows = [`${enemyPlayer}f`, `${enemyPlayer}m`, `${enemyPlayer}b`];
        
        const candidates = [];
        for (const enemyRowId of enemyRows) {
            const row = window.__ow_getRow?.(enemyRowId);
            if (!row || !row.cardIds) continue;
            for (const cardId of row.cardIds) {
                const card = window.__ow_getCard?.(cardId);
                if (!card || card.health <= 0) continue;
                let score = 0;
                const shields = card.shield || 0;
                if (shields > 0) score += 100 + shields * 10;
                if (card.id === 'zarya') score -= 40; // avoid boosting Zarya ult later
                const rowKey = enemyRowId[1];
                score += (card[`${rowKey}_power`] || 0) * 2;
                candidates.push({ cardId, rowId: enemyRowId, score });
            }
        }
        if (candidates.length === 0) {
            showToast('Sombra AI: No enemies to hack');
            setTimeout(() => clearToast(), 2000);
            return;
        }
        candidates.sort((a,b)=>b.score-a.score);
        const randomEnemy = candidates[0];
        const targetCard = window.__ow_getCard?.(randomEnemy.cardId);
        
        // Play hack sound
        try {
            playAudioByKey('sombra-ability1');
        } catch {}
        
        let removedShields = 0;
        let removedTokens = 0;
        
        // Remove all shield tokens from target hero
        if (targetCard.shield > 0) {
            removedShields = targetCard.shield;
            window.__ow_dispatchShieldUpdate?.(randomEnemy.cardId, 0);
            console.log(`Sombra AI: Removed ${removedShields} shields from ${randomEnemy.cardId}`);
        }
        
        // Remove all effects belonging to target hero from all rows
        const allRows = ['1f', '1m', '1b', '2f', '2m', '2b'];
        for (const rowId of allRows) {
            const row = window.__ow_getRow?.(rowId);
            if (row && row.allyEffects) {
                const effectsToRemove = row.allyEffects.filter(effect => 
                    effect?.sourceCardId === randomEnemy.cardId
                );
                for (const effect of effectsToRemove) {
                    window.__ow_removeRowEffect?.(rowId, 'allyEffects', effect.id);
                    removedTokens++;
                }
            }
            if (row && row.enemyEffects) {
                const effectsToRemove = row.enemyEffects.filter(effect => 
                    effect?.sourceCardId === randomEnemy.cardId
                );
                for (const effect of effectsToRemove) {
                    window.__ow_removeRowEffect?.(rowId, 'enemyEffects', effect.id);
                    removedTokens++;
                }
            }
        }
        
        // Show floating text for removed shields
        if (removedShields > 0) {
            effectsBus.publish(Effects.showHeal(randomEnemy.cardId, -removedShields)); // Negative heal = shield removal
        }
        
        showToast(`Sombra AI: Hacked ${targetCard.name} - Removed ${removedShields} shields, ${removedTokens} tokens`);
        setTimeout(() => clearToast(), 3000);
        
        console.log(`Sombra AI: HACK complete - ${removedShields} shields, ${removedTokens} tokens removed`);
        return;
    }
    
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
