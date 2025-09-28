import { selectCardTarget } from '../engine/targeting';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { playAudioByKey } from '../../assets/imageImports';

export async function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    try {
        playAudioByKey('symmetra-ability1');
    } catch {}
    
    showToast('Symmetra: Select hero to return to hand');
    const target = await selectCardTarget();
    if (target) {
        // Get the target hero's owner
        const targetPlayerNum = parseInt(target.cardId[0]);
        
        // Check if target owner's hand is full (6 cards is the limit)
        const targetHandId = `player${targetPlayerNum}hand`;
        const targetHand = window.__ow_getRow?.(targetHandId);
        if (targetHand && targetHand.cardIds && targetHand.cardIds.length >= 6) {
            showToast('Symmetra: Target player\'s hand is full, cannot return hero');
            setTimeout(() => clearToast(), 2000);
            return;
        }
        
        // Check if hero is undefeated (health > 0)
        const targetCard = window.__ow_getCard?.(target.cardId);
        if (!targetCard || targetCard.health <= 0) {
            showToast('Symmetra: Can only target undefeated heroes');
            setTimeout(() => clearToast(), 1500);
            return;
        }
        
        // Return hero to hand
        window.__ow_dispatchAction?.({
            type: 'return-hero-to-hand',
            payload: { cardId: target.cardId, rowId: target.rowId }
        });
        
        // Remove all tokens and counters
        removeAllTokensAndCounters(target.cardId, target.rowId);
        
        showToast('Symmetra: Hero returned to hand, all effects removed');
        setTimeout(() => clearToast(), 2000);
    } else {
        // Targeting was cancelled (right-click or other cancellation)
        showToast('Symmetra: Teleporter cancelled');
        setTimeout(() => clearToast(), 1500);
    }
}

export function onUltimate({ playerHeroId, rowId, cost }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    try {
        playAudioByKey('symmetra-ultimate');
    } catch {}
    
    // Apply Shield Generator to all friendly deployed heroes
    const friendlyRows = [`${playerNum}f`, `${playerNum}m`, `${playerNum}b`];
    let heroesAffected = 0;
    
    friendlyRows.forEach(rowId => {
        const row = window.__ow_getRow?.(rowId);
        if (row && row.cardIds) {
            row.cardIds.forEach(cardId => {
                const card = window.__ow_getCard?.(cardId);
                if (card && card.health > 0) {
                    // Add 1 shield (respecting 3-shield maximum)
                    const currentShield = card.shield || 0;
                    const newShield = Math.min(currentShield + 1, 3);
                    window.__ow_dispatchShieldUpdate?.(cardId, newShield);
                    heroesAffected++;
                }
            });
        }
    });
    
    showToast(`Symmetra: Shield Generator activated - ${heroesAffected} heroes gained shields`);
    setTimeout(() => clearToast(), 2000);
}

function removeAllTokensAndCounters(cardId, rowId) {
    // Remove all card effects
    const card = window.__ow_getCard?.(cardId);
    if (card && Array.isArray(card.effects)) {
        card.effects.forEach(effect => {
            window.__ow_removeCardEffect?.(cardId, effect.id);
        });
    }
    
    // Remove all row effects created by this hero AND effects dependent on this hero
    const allRows = ['1f', '1m', '1b', '2f', '2m', '2b'];
    allRows.forEach(rowId => {
        const row = window.__ow_getRow?.(rowId);
        if (row) {
            // Remove from ally effects - both created by this hero and dependent on this hero
            if (row.allyEffects) {
                const effectsToRemove = row.allyEffects.filter(effect => 
                    effect?.sourceCardId === cardId || 
                    effect?.dependentOnCardId === cardId ||
                    effect?.targetCardId === cardId
                );
                effectsToRemove.forEach(effect => {
                    window.__ow_removeRowEffect?.(rowId, 'allyEffects', effect.id);
                });
            }
            
            // Remove from enemy effects - both created by this hero and dependent on this hero
            if (row.enemyEffects) {
                const effectsToRemove = row.enemyEffects.filter(effect => 
                    effect?.sourceCardId === cardId || 
                    effect?.dependentOnCardId === cardId ||
                    effect?.targetCardId === cardId
                );
                effectsToRemove.forEach(effect => {
                    window.__ow_removeRowEffect?.(rowId, 'enemyEffects', effect.id);
                });
            }
        }
    });
    
    // Remove shield tokens from this hero
    window.__ow_dispatchShieldUpdate?.(cardId, 0);
}

export default { onEnter, onUltimate };
