import { dealDamage } from '../engine/damageBus';
import { selectCardTarget, selectRowTarget } from '../engine/targeting';
import { showOnEnterChoice } from '../engine/modalController';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import effectsBus from '../engine/effectsBus';
import { playAudioByKey } from '../../assets/imageImports';

// Track healing effects for turn-based healing
let healingEffects = new Map();

export async function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    try {
        playAudioByKey('mercy-enter');
    } catch {}
    
    showToast('Mercy: Caduceus Staff - Select an ally to heal or boost');
    
    // Get all friendly heroes (including special cards like Nemesis, MEKA, BOB)
    const allRows = ['1f', '1m', '1b', '2f', '2m', '2b'];
    const friendlyHeroes = [];
    
    allRows.forEach(rowId => {
        const row = window.__ow_getRow?.(rowId);
        if (row) {
            const rowPlayerNum = parseInt(rowId[0]);
            if (rowPlayerNum === playerNum) {
                row.cardIds.forEach(cardId => {
                    const card = window.__ow_getCard?.(cardId);
                    if (card && card.health > 0) {
                        // Include all heroes, special cards, but exclude turrets
                        if (card.id !== 'turret') {
                            friendlyHeroes.push({
                                cardId,
                                rowId,
                                name: card.name || card.id,
                                health: card.health
                            });
                        }
                    }
                });
            }
        }
    });
    
    if (friendlyHeroes.length === 0) {
        showToast('Mercy: No friendly heroes to target');
        setTimeout(() => clearToast(), 1500);
        return;
    }
    
    // Define choice options
    const opt1 = { 
        name: 'Caduceus Staff - Healing', 
        description: 'Heal target ally by 2 now and 1 at the start of each turn' 
    };
    const opt2 = { 
        name: 'Caduceus Staff - Damage Boost', 
        description: 'Target ally deals +1 damage with all abilities' 
    };

    showOnEnterChoice('Mercy', opt1, opt2, async (choiceIndex) => {
        if (choiceIndex === 0) {
            // Play ability sound immediately on selection
            try {
                playAudioByKey('mercy-ability1');
            } catch {}
            
            await handleHealingAbility(playerHeroId, rowId, playerNum);
        } else if (choiceIndex === 1) {
            // Play ability sound immediately on selection
            try {
                playAudioByKey('mercy-ability2');
            } catch {}
            
            await handleDamageBoostAbility(playerHeroId, rowId, playerNum);
        }
    });
}

// Handle healing ability
async function handleHealingAbility(playerHeroId, rowId, playerNum) {
    showToast('Mercy: Select an ally to heal');
    
    // Target selection
    const target = await selectCardTarget();
    if (!target) {
        clearToast();
        return;
    }
    
    const targetCard = window.__ow_getCard?.(target.cardId);
    if (!targetCard || targetCard.health <= 0) {
        showToast('Mercy: Cannot target dead heroes');
        setTimeout(() => clearToast(), 1500);
        return;
    }
    // Prevent turrets from being healed (exception: Brigitte's armor pack only)
    if (targetCard.turret === true) {
        showToast('Mercy: Cannot target turrets');
        setTimeout(() => clearToast(), 1500);
        return;
    }
    
    // Check if target is friendly
    const targetPlayerNum = parseInt(target.cardId[0]);
    if (targetPlayerNum !== playerNum) {
        showToast('Mercy: Can only target friendly heroes');
        setTimeout(() => clearToast(), 1500);
        return;
    }
    
    // Apply healing effect
    window.__ow_appendCardEffect?.(target.cardId, {
        id: 'mercy-heal',
        hero: 'mercy',
        type: 'healing',
        sourceCardId: playerHeroId,
        sourceRowId: rowId,
        tooltip: 'Mercy Healing: Heals 1 HP at start of each turn',
        visual: 'mercyheal.png'
    });
    
    // Immediate 2 healing
    const currentHealth = targetCard.health;
    const newHealth = Math.min(currentHealth + 2, targetCard.maxHealth || 4);
    const healingAmount = newHealth - currentHealth;
    
    if (healingAmount > 0) {
        window.__ow_setCardHealth?.(target.cardId, newHealth);
        
        // Show floating text
        if (window.effectsBus) {
            window.effectsBus.publish({
                type: 'fx:heal',
                cardId: target.cardId,
                amount: healingAmount,
                text: `+${healingAmount}`
            });
        }
    }
    
    showToast(`Mercy: Caduceus Staff healing applied to ${targetCard.name}`);
    setTimeout(() => clearToast(), 2000);
}

// Handle damage boost ability
async function handleDamageBoostAbility(playerHeroId, rowId, playerNum) {
    showToast('Mercy: Select an ally to boost damage');
    
    // Target selection
    const target = await selectCardTarget();
    if (!target) {
        clearToast();
        return;
    }
    
    const targetCard = window.__ow_getCard?.(target.cardId);
    if (!targetCard || targetCard.health <= 0) {
        showToast('Mercy: Cannot target dead heroes');
        setTimeout(() => clearToast(), 1500);
        return;
    }
    
    // Check if target is friendly
    const targetPlayerNum = parseInt(target.cardId[0]);
    if (targetPlayerNum !== playerNum) {
        showToast('Mercy: Can only target friendly heroes');
        setTimeout(() => clearToast(), 1500);
        return;
    }
    
    // Apply damage boost effect
    window.__ow_appendCardEffect?.(target.cardId, {
        id: 'mercy-damage',
        hero: 'mercy',
        type: 'damageBoost',
        value: 1,
        sourceCardId: playerHeroId,
        sourceRowId: rowId,
        tooltip: 'Mercy Damage Boost: +1 damage to all abilities',
        visual: 'mercydamage.png'
    });
    
    showToast(`Mercy: Caduceus Staff damage boost applied to ${targetCard.name}`);
    setTimeout(() => clearToast(), 2000);
}

export async function onUltimate({ playerHeroId, rowId, cost }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    try {
        playAudioByKey('mercy-ult');
    } catch {}
    
    showToast('Mercy: Guardian Angel - Select a friendly row to move to');
    
    // Get friendly rows
    const friendlyRows = ['1f', '1m', '1b', '2f', '2m', '2b'].filter(rowId => {
        const rowPlayerNum = parseInt(rowId[0]);
        return rowPlayerNum === playerNum;
    });
    
    // Select row to move to
    const targetRow = await selectRowTarget();
    if (!targetRow) {
        clearToast();
        return;
    }
    
    const targetPlayerNum = parseInt(targetRow.rowId[0]);
    if (targetPlayerNum !== playerNum) {
        showToast('Mercy: Guardian Angel can only target friendly rows');
        setTimeout(() => clearToast(), 1500);
        return;
    }
    
    // Move Mercy to target row using proper state bridge
    if (window.__ow_moveCardToRow) {
        window.__ow_moveCardToRow(playerHeroId, targetRow.rowId);
    } else {
        // Fallback: try to move manually
        const currentRow = window.__ow_getRow?.(rowId);
        const newRow = window.__ow_getRow?.(targetRow.rowId);
        
        if (currentRow && newRow) {
            // Remove from current row
            const currentCardIds = [...currentRow.cardIds];
            const mercyIndex = currentCardIds.indexOf(playerHeroId);
            if (mercyIndex !== -1) {
                currentCardIds.splice(mercyIndex, 1);
                window.__ow_setRowArray?.(rowId, 'cardIds', currentCardIds);
            }
            
            // Add to new row
            const newCardIds = [...newRow.cardIds];
            newCardIds.push(playerHeroId);
            window.__ow_setRowArray?.(targetRow.rowId, 'cardIds', newCardIds);
        }
    }
    
    showToast('Mercy: Guardian Angel - Select a defeated hero to resurrect');
    
    // Get defeated heroes in the target row (after moving)
    const defeatedHeroes = [];
    const targetRowData = window.__ow_getRow?.(targetRow.rowId);
    if (targetRowData) {
        targetRowData.cardIds.forEach(cardId => {
            const card = window.__ow_getCard?.(cardId);
            if (card && card.health <= 0) {
                defeatedHeroes.push({
                    cardId,
                    name: card.name || card.id,
                    maxHealth: card.maxHealth || 4
                });
            }
        });
    }
    
    if (defeatedHeroes.length === 0) {
        showToast('Mercy: No defeated heroes in this row to resurrect');
        setTimeout(() => clearToast(), 1500);
        return;
    }
    
    // Select defeated hero to resurrect
    const target = await selectCardTarget();
    if (!target) {
        clearToast();
        return;
    }
    
    const targetCard = window.__ow_getCard?.(target.cardId);
    if (!targetCard || targetCard.health > 0) {
        showToast('Mercy: Can only resurrect defeated heroes');
        setTimeout(() => clearToast(), 1500);
        return;
    }
    
    // Resurrect the hero
    const baseHealth = targetCard.maxHealth || 4;
    window.__ow_setCardHealth?.(target.cardId, baseHealth);
    
    // Remove any negative effects
    if (Array.isArray(targetCard.effects)) {
        const negativeEffects = targetCard.effects.filter(effect => 
            effect.type === 'debuff' || effect.type === 'damage' || effect.type === 'damageBoost'
        );
        negativeEffects.forEach(effect => {
            window.__ow_removeCardEffect?.(target.cardId, effect.id);
        });
    }
    
    // Play resurrection sound and effect
    try {
        playAudioByKey('mercy-ultimate-resolve');
    } catch {}
    
    // Show floating resurrection effect
    try {
        effectsBus.publish({ type: 'fx:resurrect', cardId: target.cardId });
    } catch {}
    
    showToast(`Mercy: ${targetCard.name} has been resurrected!`);
    setTimeout(() => clearToast(), 2000);
}

export function onDeath({ playerHeroId, rowId }) {
    // Clean up all Mercy effects when she dies
    const allRows = ['1f', '1m', '1b', '2f', '2m', '2b'];
    allRows.forEach(rowId => {
        const row = window.__ow_getRow?.(rowId);
        if (row) {
            row.cardIds.forEach(cardId => {
                const card = window.__ow_getCard?.(cardId);
                if (card && Array.isArray(card.effects)) {
                    // Remove Mercy healing effects
                    const mercyHealEffects = card.effects.filter(effect => 
                        effect.id === 'mercy-heal' && effect.hero === 'mercy'
                    );
                    mercyHealEffects.forEach(effect => {
                        window.__ow_removeCardEffect?.(cardId, effect.id);
                    });
                    
                    // Remove Mercy damage boost effects
                    const mercyDamageEffects = card.effects.filter(effect => 
                        effect.id === 'mercy-damage' && effect.hero === 'mercy'
                    );
                    mercyDamageEffects.forEach(effect => {
                        window.__ow_removeCardEffect?.(cardId, effect.id);
                    });
                }
            });
        }
    });
}

// Function to handle turn-based healing
export function mercyTokenHealing(cardId) {
    const card = window.__ow_getCard?.(cardId);
    if (!card || card.health <= 0) return;
    
    // Prevent turrets from being healed
    if (card.turret === true) {
        console.log(`Mercy: Cannot heal turret ${cardId} - turrets cannot be healed`);
        return;
    }
    
    const hasMercyHeal = Array.isArray(card.effects) && 
        card.effects.some(effect => effect.id === 'mercy-heal' && effect.hero === 'mercy');
    
    if (hasMercyHeal) {
        const currentHealth = card.health;
        const newHealth = Math.min(currentHealth + 1, card.maxHealth || 4);
        const healingAmount = newHealth - currentHealth;
        
        if (healingAmount > 0) {
            window.__ow_setCardHealth?.(cardId, newHealth);
            
            // Show floating text
            if (window.effectsBus) {
                window.effectsBus.publish({
                    type: 'fx:heal',
                    cardId: cardId,
                    amount: healingAmount,
                    text: `+${healingAmount}`
                });
            }
        }
    }
}

// Default export
export default {
    onEnter,
    onUltimate,
    onDeath,
    mercyTokenHealing
};
