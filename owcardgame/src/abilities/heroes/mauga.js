import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';
import { playAudioByKey } from '../../assets/imageImports';
import {
    cageFightDamage,
    cageFightTargetIds,
    opposingRowId,
} from '../../game/cageFight';
import { maugaContactMs, maugaSmashMs } from '../../presentation/pixi/fxMath';

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
                        // Berserker reads red: this is rage, not healing.
                        try { effectsBus.publish(Effects.berserk(cid)); } catch {}
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

// Cage Fight (4): Lock opposing row while Mauga lives; deal |HP − HP| to every hero there.
export async function onUltimate({ playerHeroId, rowId }) {
    try { playAudioByKey('mauga-ultimate'); } catch {}
    const targetRowId = opposingRowId(rowId);
    if (!targetRowId) return;

    window.__ow_dispatchAction?.({
        type: 'apply-row-lock',
        payload: { rowId: targetRowId, sourceCardId: playerHeroId },
    });

    const mauga = window.__ow_getCard?.(playerHeroId);
    const enemyRow = window.__ow_getRow?.(targetRowId);
    const entries = (enemyRow?.cardIds || []).map((cardId) => ({
        cardId,
        card: window.__ow_getCard?.(cardId),
    }));
    // He goes through the cage one hero at a time, and slams into every one of
    // them — including anyone the damage formula happens to leave untouched.
    // A hit that deals nothing is still a hit.
    const targets = cageFightTargetIds(entries);
    await Promise.all(targets.map((cardId, index) => new Promise((resolve) => {
        // He starts the lunge...
        setTimeout(() => {
            try { effectsBus.publish(Effects.maugaSmash(playerHeroId, cardId)); } catch {}
        }, maugaSmashMs(index));

        // ...and the hit lands part-way through it. Sound and damage both go
        // here, so the thud and the number arrive with the impact rather than
        // when he sets off.
        setTimeout(() => {
            // Debouncing is off: the slams are close enough together that the
            // default window would swallow every hit after the first.
            try { playAudioByKey('mauga-cagefight-hit', { debounceMs: 0 }); } catch {}

            const target = window.__ow_getCard?.(cardId);
            const amount = cageFightDamage(mauga?.health, target?.health);
            if (amount > 0) {
                // The slam is the projectile; the damage bus must not add one.
                dealDamage(cardId, targetRowId, amount, false, playerHeroId, false, { skipProjectileFx: true });
                try { effectsBus.publish(Effects.showDamage(cardId, amount)); } catch {}
            }
            resolve();
        }, maugaContactMs(index));
    })));
}

export function onDeath({ playerHeroId }) {
    window.__ow_dispatchAction?.({
        type: 'clear-row-locks',
        payload: { sourceCardId: playerHeroId },
    });
}

export default { onEnter, onUltimate, onAllyDirectDamageDealt, onDeath };


