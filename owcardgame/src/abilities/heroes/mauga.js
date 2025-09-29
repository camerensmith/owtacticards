import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { playAudioByKey } from '../../assets/imageImports';

// Berserker — When an ally Hero deals direct ability damage, Mauga gains +1 permanent HP (cap 12).
// Heals only up to base; extra is permanent additional HP (not healable beyond current), styled like Lifeweaver temp HP.
export function onEnter({ playerHeroId, rowId }) {
    try { playAudioByKey('mauga-enter'); } catch {}

    // Mark Mauga with a berserker listener effect for TurnEffectsRunner or damageBus subscription
    // We piggyback on damageBus by tracking ally direct ability damage via sourceCardId present.
    window.__ow_appendCardEffect?.(playerHeroId, {
        id: 'mauga-berserker',
        hero: 'mauga',
        type: 'berserker',
        sourceCardId: playerHeroId,
        sourceRowId: rowId,
        tooltip: 'Berserker: Gains +1 permanent HP when allies deal direct ability damage (max 12)',
        counter: 0,
        visual: 'mauga-icon'
    });
}

// Hook API for damageBus to call when any damage occurs, so we can award counters on ally direct ability damage
export function onAllyDirectDamageDealt(sourceCardId) {
    if (!sourceCardId) return;
    // Find Mauga on that player's side
    const playerNum = parseInt(sourceCardId[0]);
    const rows = playerNum === 1 ? ['1f','1m','1b'] : ['2f','2m','2b'];
    for (const r of rows) {
        const row = window.__ow_getRow?.(r);
        if (!row || !row.cardIds) continue;
        for (const cid of row.cardIds) {
            const card = window.__ow_getCard?.(cid);
            if (card && card.id === 'mauga' && Array.isArray(card.effects)) {
                const eff = card.effects.find(e => e?.id === 'mauga-berserker');
                if (eff) {
                    const currentHealth = card.health || 0;
                    const maxCap = 12;
                    // Increase permanent HP by +1 up to 12
                    const newHealth = Math.min(maxCap, currentHealth + 1);
                    if (newHealth > currentHealth) {
                        window.__ow_setCardHealth?.(cid, newHealth);
                        try { effectsBus.publish(Effects.showHeal(cid, 1)); } catch {}
                        // Update counter overlay by replacing effect with incremented counter
                        window.__ow_removeCardEffect?.(cid, 'mauga-berserker');
                        setTimeout(() => {
                            window.__ow_appendCardEffect?.(cid, {
                                ...eff,
                                counter: (eff.counter || 0) + 1
                            });
                        }, 10);
                    }
                }
            }
        }
    }
}

// Cage Fight (3): Lock opposing row (no movement) until end of round; deal HP difference (only if Mauga > target) to enemy directly opposite Mauga's column.
export async function onUltimate({ playerHeroId, rowId, cost }) {
    const playerNum = parseInt(playerHeroId[0]);
    const enemyPlayer = playerNum === 1 ? 2 : 1;
    try { playAudioByKey('mauga-ultimate'); } catch {}

    // Determine Mauga's column index in his current row
    const myRow = window.__ow_getRow?.(rowId);
    if (!myRow) return;
    const maugaIndex = myRow.cardIds.indexOf(playerHeroId);
    if (maugaIndex === -1) return;
    
    // Auto-select opposing row based on Mauga's current row position (f/m/b)
    const pos = rowId[1];
    const targetRowId = `${enemyPlayer}${pos}`;

    // Apply visual lock and movement prevention until end of round (persists if Mauga dies)
    try {
        window.__ow_dispatchAction?.({
            type: 'apply-row-lock',
            payload: { rowId: targetRowId, sourceCardId: playerHeroId }
        });
    } catch {}

    // One-time damage to the unit directly opposite Mauga's column, if present and Mauga HP > target HP
    const enemyRow = window.__ow_getRow?.(targetRowId);
    if (enemyRow && Array.isArray(enemyRow.cardIds)) {
        const targetCardId = enemyRow.cardIds[maugaIndex];
        if (targetCardId) {
            const myCard = window.__ow_getCard?.(playerHeroId);
            const targetCard = window.__ow_getCard?.(targetCardId);
            if (myCard && targetCard) {
                const diff = myCard.health - targetCard.health;
                if (diff > 0) {
                    dealDamage(targetCardId, targetRowId, diff, false, playerHeroId);
                    try { effectsBus.publish(Effects.showDamage(targetCardId, diff)); } catch {}
                }
            }
        }
    }
}

export function onDeath() { /* no special cleanup; row lock persists until round end */ }

export default { onEnter, onUltimate, onAllyDirectDamageDealt, onDeath };


