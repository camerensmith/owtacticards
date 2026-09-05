import { playAudioByKey } from '../../assets/imageImports';
import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import {
    CLOAK_TRIP_DAMAGE,
    bladeDanceAssignments,
    cloakMirrorRowId,
    createCloakEffect,
    isCloakedMantis,
    isMantisCard,
    isBladeDanceCountable,
    isBladeDanceRecipient,
    MANTIS_CLOAK_ID,
} from '../../game/mantis';

export function onDraw() {
    try { playAudioByKey('mantis-intro'); } catch {}
}

/** Cloak — mark as infiltrating the enemy row. */
export async function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0], 10);
    try { playAudioByKey('mantis-ability1'); } catch {}

    window.__ow_appendCardEffect?.(playerHeroId, createCloakEffect());
    try { effectsBus.publish(Effects.mantisCloak(playerHeroId)); } catch {}

    // Energy slash resolve after a beat so the cloak shroud reads first.
    setTimeout(() => {
        try { playAudioByKey('mantis-ability1-resolve'); } catch {}
        try { effectsBus.publish(Effects.energySlash(playerHeroId)); } catch {}
    }, 280);

    const mirror = cloakMirrorRowId(playerNum, rowId);
    showToast(mirror
        ? `Mantis: Cloak — power/synergy on ${mirror}`
        : 'Mantis: Cloak');
    setTimeout(() => clearToast(), 2000);
}

/**
 * When another hero enters Mantis's cloaked enemy row: 2 damage to the entrant,
 * then Mantis returns to the owner's opposite row and drops Cloak.
 */
export function onRowIntrusion({ entrantCardId, rowId }) {
    if (!entrantCardId || !rowId) return false;
    if (isMantisCard(entrantCardId)) return false;

    const row = window.__ow_getRow?.(rowId);
    const mantisId = (row?.cardIds || []).find((id) => {
        if (id === entrantCardId) return false;
        return isCloakedMantis(window.__ow_getCard?.(id));
    });
    if (!mantisId) return false;

    const ownerNum = parseInt(mantisId[0], 10);
    const home = cloakMirrorRowId(ownerNum, rowId);
    if (!home) return false;

    dealDamage(entrantCardId, rowId, CLOAK_TRIP_DAMAGE, false, mantisId, false, { skipProjectileFx: true });
    try { effectsBus.publish(Effects.showDamage(entrantCardId, CLOAK_TRIP_DAMAGE)); } catch {}
    try { effectsBus.publish(Effects.energySlash(entrantCardId)); } catch {}

    window.__ow_removeCardEffect?.(mantisId, MANTIS_CLOAK_ID);
    window.__ow_moveCardToRow?.(mantisId, home);

    try { playAudioByKey('mantis-ability1-resolve'); } catch {}
    showToast('Mantis: Cloak ends — returned home');
    setTimeout(() => clearToast(), 2000);
    return true;
}

/** Blade Dance (2) — X = all enemy targets; hits land only on enemy heroes. */
export async function onUltimate({ playerHeroId }) {
    try { playAudioByKey('mantis-ult'); } catch {}

    const ownerNum = parseInt(playerHeroId[0], 10);
    const enemyNum = ownerNum === 1 ? 2 : 1;
    const countable = [];
    const recipients = [];
    for (const r of [`${enemyNum}f`, `${enemyNum}m`, `${enemyNum}b`]) {
        for (const id of window.__ow_getRow?.(r)?.cardIds || []) {
            const card = window.__ow_getCard?.(id);
            if (!isBladeDanceCountable(id, card)) continue;
            countable.push(id);
            if (isBladeDanceRecipient(id, card)) {
                recipients.push({ cardId: id, rowId: r });
            }
        }
    }

    if (!countable.length || !recipients.length) {
        showToast('Mantis: No enemy hero targets');
        setTimeout(() => clearToast(), 2000);
        return false;
    }

    const byId = Object.fromEntries(recipients.map((e) => [e.cardId, e.rowId]));
    const hits = bladeDanceAssignments(
        countable.length,
        recipients.map((e) => e.cardId),
    );

    try {
        effectsBus.publish(Effects.bladeDance(playerHeroId, hits));
    } catch {}

    try { playAudioByKey('mantis-ult-resolve'); } catch {}

    for (const targetId of hits) {
        const targetRow = byId[targetId];
        if (!targetRow) continue;
        dealDamage(targetId, targetRow, 1, false, playerHeroId, false, { skipProjectileFx: true });
        try { effectsBus.publish(Effects.showDamage(targetId, 1)); } catch {}
    }

    showToast(`Mantis: Blade Dance — ${hits.length} strikes`);
    setTimeout(() => clearToast(), 2000);
    return true;
}

export default { onDraw, onEnter, onUltimate, onRowIntrusion };
