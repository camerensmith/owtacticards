import { dealDamage } from '../engine/damageBus';
import { selectCardTarget, selectRowTarget } from '../engine/targeting';
import { showOnEnterChoice } from '../engine/modalController';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import effectsBus, { Effects } from '../engine/effectsBus';
import { playAudioByKey } from '../../assets/imageImports';
import { withAIContext } from '../engine/aiContextHelper';
import { selectFromGraveyard } from '../engine/graveyardBus';
import data from '../../data';
import { isStructureCard } from '../../game/abilityRules';
import { occupiedCount } from '../../game/rules';
import { BESTOW } from '../../presentation/pixi/fxConfig';

// Track healing effects for turn-based healing
let healingEffects = new Map();

/** Which of the given rows currently holds this card. */
function findCardRow(playerHeroId, rowIds) {
    return rowIds.find((rowId) =>
        (window.__ow_getRow?.(rowId)?.cardIds || []).includes(playerHeroId)
    ) || null;
}

export async function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    try {
        playAudioByKey('mercy-enter');
    } catch {}
    
    // Only show human tooltip; AI flow will auto-select and should not leave UI hints
    if (!(window.__ow_aiTriggering || window.__ow_isAITurn)) {
        showToast('Mercy: Caduceus Staff - Select an ally to heal or boost');
    }
    
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

    // For AI, automatically choose based on game state
    if (window.__ow_aiTriggering || window.__ow_isAITurn) {
        // AI logic: prefer healing if any ally is wounded, otherwise damage boost
        const allyRows = [`${playerNum}f`, `${playerNum}m`, `${playerNum}b`];
        const hasWoundedAllies = allyRows.some(rowId => {
            const row = window.__ow_getRow?.(rowId);
            if (!row || !row.cardIds) return false;
            return row.cardIds.some(cardId => {
                const card = window.__ow_getCard?.(cardId);
                return card && card.health < (card.maxHealth || card.health);
            });
        });
        
        if (hasWoundedAllies) {
            await handleHealingAbility(playerHeroId, rowId, playerNum);
        } else {
            await handleDamageBoostAbility(playerHeroId, rowId, playerNum);
        }
        // Ensure any lingering human tooltip is cleared
        try { clearToast(); } catch {}
        return;
    }
    
    // For human players, show choice modal
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
    // For AI, automatically select a wounded ally
    if (window.__ow_aiTriggering || window.__ow_isAITurn) {
        const allyRows = playerNum === 1 ? ['1f', '1m', '1b'] : ['2f', '2m', '2b'];
        const woundedAllies = [];
        
        allyRows.forEach(rowId => {
            const row = window.__ow_getRow?.(rowId);
            if (row?.cardIds) {
                row.cardIds.forEach(cardId => {
                    const card = window.__ow_getCard?.(cardId);
                    if (card && card.health > 0 && card.health < card.maxHealth && !card.turret) {
                        woundedAllies.push({ cardId, rowId, card });
                    }
                });
            }
        });
        
        if (woundedAllies.length > 0) {
            const randomAlly = woundedAllies[Math.floor(Math.random() * woundedAllies.length)];
            const target = { cardId: randomAlly.cardId, rowId: randomAlly.rowId };
            console.log(`AI Mercy: Auto-selected wounded ally ${randomAlly.cardId} for healing`);
            await applyHealingEffect(playerHeroId, rowId, target, playerNum);
            return;
        } else {
            // No wounded allies, select any living ally
            const livingAllies = [];
            allyRows.forEach(rowId => {
                const row = window.__ow_getRow?.(rowId);
                if (row?.cardIds) {
                    row.cardIds.forEach(cardId => {
                        const card = window.__ow_getCard?.(cardId);
                        if (card && card.health > 0 && !card.turret) {
                            livingAllies.push({ cardId, rowId, card });
                        }
                    });
                }
            });
            
            if (livingAllies.length > 0) {
                const randomAlly = livingAllies[Math.floor(Math.random() * livingAllies.length)];
                const target = { cardId: randomAlly.cardId, rowId: randomAlly.rowId };
                console.log(`AI Mercy: Auto-selected ally ${randomAlly.cardId} for healing (no wounded allies)`);
                await applyHealingEffect(playerHeroId, rowId, target, playerNum);
                return;
            }
        }
        
        console.log('AI Mercy: No valid healing targets found');
        return;
    }
    
    showToast('Mercy: Select an ally to heal');
    
    // Target selection
    const target = await selectCardTarget();
    if (!target) {
        clearToast();
        return;
    }
    
    // Safety check: ensure target.cardId is valid
    if (!target.cardId || typeof target.cardId !== 'string') {
        showToast('Mercy: Invalid target selected');
        setTimeout(() => clearToast(), 1500);
        return;
    }
    
    const targetCard = window.__ow_getCard?.(target.cardId);
    if (!targetCard || targetCard.health <= 0) {
        showToast('Mercy: Cannot target dead heroes');
        setTimeout(() => clearToast(), 1500);
        return;
    }
    // Prevent structures from being healed (exception: Brigitte's Repair Pack)
    if (isStructureCard(targetCard)) {
        showToast('Mercy: Cannot target structures');
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
    
    await applyHealingEffect(playerHeroId, rowId, target, playerNum);
    showToast(`Mercy: Caduceus Staff healing applied to ${targetCard.name}`);
    setTimeout(() => clearToast(), 2000);
}

// Handle damage boost ability
async function handleDamageBoostAbility(playerHeroId, rowId, playerNum) {
    // For AI, automatically select a high-damage ally
    if (window.__ow_aiTriggering || window.__ow_isAITurn) {
        const allyRows = playerNum === 1 ? ['1f', '1m', '1b'] : ['2f', '2m', '2b'];
        const livingAllies = [];
        
        allyRows.forEach(rowId => {
            const row = window.__ow_getRow?.(rowId);
            if (row?.cardIds) {
                row.cardIds.forEach(cardId => {
                    const card = window.__ow_getCard?.(cardId);
                    if (card && card.health > 0 && !card.turret) {
                        livingAllies.push({ cardId, rowId, card });
                    }
                });
            }
        });
        
        if (livingAllies.length > 0) {
            // Prefer allies with high damage output (front/middle/back power)
            const sortedAllies = livingAllies.sort((a, b) => {
                const aPower = (a.card.front_power || 0) + (a.card.middle_power || 0) + (a.card.back_power || 0);
                const bPower = (b.card.front_power || 0) + (b.card.middle_power || 0) + (b.card.back_power || 0);
                return bPower - aPower;
            });
            
            const target = { cardId: sortedAllies[0].cardId, rowId: sortedAllies[0].rowId };
            console.log(`AI Mercy: Auto-selected ally ${sortedAllies[0].cardId} for damage boost`);
            await applyDamageBoostEffect(playerHeroId, rowId, target, playerNum);
            return;
        }
        
        console.log('AI Mercy: No valid damage boost targets found');
        return;
    }
    
    showToast('Mercy: Select an ally to boost damage');
    
    // Target selection
    const target = await selectCardTarget();
    if (!target) {
        clearToast();
        return;
    }
    
    // Safety check: ensure target.cardId is valid
    if (!target.cardId || typeof target.cardId !== 'string') {
        showToast('Mercy: Invalid target selected');
        setTimeout(() => clearToast(), 1500);
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
    
    await applyDamageBoostEffect(playerHeroId, rowId, target, playerNum);
    showToast(`Mercy: Caduceus Staff damage boost applied to ${targetCard.name}`);
    setTimeout(() => clearToast(), 2000);
}

export async function onUltimate({ playerHeroId, rowId, cost }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    try {
        playAudioByKey('mercy-ult');
    } catch {}

    // AI-specific path: read the pre-selected target upfront before any targeting
    // calls can consume it, then auto-execute the resurrection without UI prompts.
    if (window.__ow_aiTriggering || window.__ow_isAITurn) {
        // Consume the pre-selected target stored by __ow_useUltimate
        const aiTarget = window.__ow_aiUltimateTarget || null;
        try { window.__ow_aiUltimateTarget = null; } catch {}

        const graveyard = window.__ow_getGraveyard?.(playerNum) || [];
        if (graveyard.length === 0) {
            console.log('AI Mercy: Graveyard is empty, nothing to resurrect');
            try { clearToast(); } catch {}
            return;
        }

        // tryMercyResurrection may have picked a hero; otherwise rank the graveyard.
        let rezHeroId = aiTarget?.heroId || null;
        if (!rezHeroId || !graveyard.some((entry) => entry.heroId === rezHeroId)) {
            rezHeroId = window.__ow_pickBestGraveyardTarget?.(playerNum)?.heroId || null;
        }
        if (!rezHeroId) {
            console.log('AI Mercy: Could not rank a resurrection target');
            try { clearToast(); } catch {}
            return;
        }

        // Land in Mercy's own row, falling back to any friendly row with a free slot.
        const allyRows = [`${playerNum}f`, `${playerNum}m`, `${playerNum}b`];
        // occupiedCount, not length: a hole in the row is a free slot, not a body.
        const hasSpace = (r) => occupiedCount(window.__ow_getRow?.(r)?.cardIds) < 4;
        const mercyRow = findCardRow(playerHeroId, allyRows);
        const rezRowId = (mercyRow && hasSpace(mercyRow))
            ? mercyRow
            : allyRows.find(hasSpace);

        if (!rezRowId) {
            console.log('AI Mercy: No room to resurrect');
            try { clearToast(); } catch {}
            return;
        }

        if (rezRowId !== mercyRow && window.__ow_moveCardToRow) {
            window.__ow_moveCardToRow(playerHeroId, rezRowId);
        }

        // Same path the human uses: no on-enter fires, passives and ultimates work.
        const revivedId = window.__ow_resurrectFromGraveyard?.(playerNum, rezHeroId, rezRowId);
        if (!revivedId) {
            console.log('AI Mercy: Resurrection was rejected');
            try { clearToast(); } catch {}
            return;
        }

        try { playAudioByKey('mercy-ultimate-resolve'); } catch {}
        try { effectsBus.publish({ type: 'fx:resurrect', cardId: revivedId }); } catch {}
        try { effectsBus.publish(Effects.rezReturn(revivedId, playerHeroId)); } catch {}

        console.log(`AI Mercy: Resurrected ${data.heroes[rezHeroId]?.name || rezHeroId} into ${rezRowId}`);
        try { clearToast(); } catch {}
        return;
    }
    
    // The light holds around Mercy for as long as the choice takes. It is
    // toggled, not timed, so it must come down on every exit — including the
    // half-dozen early returns below.
    try { effectsBus.publish(Effects.rezAura(playerHeroId, true)); } catch {}
    try {
        return await guardianAngel({ playerHeroId, rowId, playerNum });
    } finally {
        try { effectsBus.publish(Effects.rezAura(playerHeroId, false)); } catch {}
    }
}

async function guardianAngel({ playerHeroId, rowId, playerNum }) {
    // The graveyard comes first. Whether there is anyone to bring back decides
    // whether the ultimate does anything at all, so it is asked before the
    // player is walked through picking a row for nothing.
    const graveyard = window.__ow_getGraveyard?.(playerNum) || [];
    if (graveyard.length === 0) {
        showToast('Mercy: Your graveyard is empty');
        setTimeout(() => clearToast(), 1500);
        return;
    }

    showToast('Mercy: Guardian Angel - Choose a hero from your graveyard');
    const heroId = await selectFromGraveyard(playerNum);
    clearToast();
    if (!heroId) return;

    showToast('Mercy: Guardian Angel - Select a friendly row to move to');

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
    
    // Mercy has moved in, so the row needs a slot for her passenger too.
    if (occupiedCount(window.__ow_getRow?.(targetRow.rowId)?.cardIds) >= 4) {
        showToast('Mercy: That row is full');
        setTimeout(() => clearToast(), 1500);
        return;
    }

    // Resurrection pulls from the graveyard rather than from corpses on the
    // board, since dead heroes leave the board the moment they die.
    // Placed straight into the row: this deliberately bypasses the deploy path,
    // so no on-enter ability fires. Passives and ultimates work as normal.
    const revivedId = window.__ow_resurrectFromGraveyard?.(playerNum, heroId, targetRow.rowId);
    if (!revivedId) {
        showToast('Mercy: Could not resurrect that hero');
        setTimeout(() => clearToast(), 1500);
        return;
    }

    try {
        playAudioByKey('mercy-ultimate-resolve');
    } catch {}

    try {
        effectsBus.publish({ type: 'fx:resurrect', cardId: revivedId });
    } catch {}

    // They wash back in under a slow light, and both of them get wings.
    try { effectsBus.publish(Effects.rezReturn(revivedId, playerHeroId)); } catch {}

    const heroName = data.heroes[heroId]?.name || heroId;
    showToast(`Mercy: ${heroName} has been resurrected!`);
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
    
    // Prevent structures from being healed
    if (isStructureCard(card)) {
        console.log(`Mercy: Cannot heal structure ${cardId}`);
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
            // This went through `window.effectsBus`, which is never assigned,
            // so the per-turn heal showed nothing at all.
            try { effectsBus.publish(Effects.showHeal(cardId, healingAmount)); } catch {}
            try { effectsBus.publish(Effects.bestow(cardId, BESTOW.heal)); } catch {}
        }
    }
}

// Helper function to apply healing effect (used by both human and AI)
async function applyHealingEffect(playerHeroId, rowId, target, playerNum) {
    const targetCard = window.__ow_getCard?.(target.cardId);
    if (!targetCard || targetCard.health <= 0) {
        console.log('Mercy: Cannot target dead heroes');
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

    // Warm gold light settling onto whoever she attaches to.
    try { effectsBus.publish(Effects.bestow(target.cardId, BESTOW.heal)); } catch {}

    // Immediate 2 healing
    const currentHealth = targetCard.health;
    const newHealth = Math.min(currentHealth + 2, targetCard.maxHealth || 4);
    const healingAmount = newHealth - currentHealth;
    
    if (healingAmount > 0) {
        window.__ow_setCardHealth?.(target.cardId, newHealth);
        // Same dead-bus publish as the per-turn heal: never rendered anything.
        try { effectsBus.publish(Effects.showHeal(target.cardId, healingAmount)); } catch {}
    }
    
    console.log(`Mercy: Caduceus Staff healing applied to ${targetCard.name}`);
}

// Helper function to apply damage boost effect (used by both human and AI)
async function applyDamageBoostEffect(playerHeroId, rowId, target, playerNum) {
    const targetCard = window.__ow_getCard?.(target.cardId);
    if (!targetCard || targetCard.health <= 0) {
        console.log('Mercy: Cannot target dead heroes');
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

    // The same light, in deep blue: one mechanic, two moods.
    try { effectsBus.publish(Effects.bestow(target.cardId, BESTOW.boost)); } catch {}

    console.log(`Mercy: Damage boost applied to ${targetCard.name}`);
}

// Default export
export default {
    onEnter,
    onUltimate,
    onDeath,
    mercyTokenHealing
};
