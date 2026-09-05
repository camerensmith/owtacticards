import { selectRowTarget } from '../engine/targeting';
import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { playAudioByKey } from '../../assets/imageImports';
import {
    killswitchRowCleanup,
    electrifiedTargets,
    rowsAreAdjacent,
} from '../../game/abilityRules';
import { enemyRowIds } from '../../game/rosterRules';
import { PALETTE } from '../../presentation/pixi/fxConfig';

const NEON = PALETTE.ice;

function isAiOwned(cardId) {
    if (window.__ow_practiceMode) return false;
    return parseInt(String(cardId || '')[0], 10) === 2
        || !!window.__ow_aiTriggering
        || !!window.__ow_isAITurn;
}

export function electrifyEffect(sourceCardId) {
    return {
        id: 'electrified',
        hero: 'sylvain',
        type: 'debuff',
        sourceCardId,
        tooltip: 'Electrified',
    };
}

export function applyTripwireEnter(cardId, rowId) {
    const row = window.__ow_getRow?.(rowId);
    const card = window.__ow_getCard?.(cardId);
    if (!row || !card || card.health <= 0) return;
    if (Array.isArray(card.effects) && card.effects.some((e) => e?.id === 'electrified')) return;
    const wires = [...(row.allyEffects || []), ...(row.enemyEffects || [])]
        .filter((effect) => effect?.id === 'tripwire');
    for (const wire of wires) {
        const owner = parseInt(String(wire.sourceCardId || '')[0], 10);
        const entering = parseInt(String(cardId || '')[0], 10);
        if (owner && entering !== owner) {
            window.__ow_appendCardEffect?.(cardId, electrifyEffect(wire.sourceCardId));
            return;
        }
    }
}

function tripwireEffect(playerHeroId, rowId, partnerRowId) {
    return {
        id: 'tripwire',
        hero: 'sylvain',
        type: 'trap',
        visual: 'sylvain-icon',
        sourceCardId: playerHeroId,
        sourceRowId: rowId,
        partnerRowId,
        playerHeroId,
        tooltip: 'Tripwire: enemies that enter gain Electrified',
    };
}

function placeTripwire(playerHeroId, sourceRowId, targetRowId, partnerRowId) {
    const owner = parseInt(playerHeroId[0], 10);
    const rowOwner = parseInt(targetRowId[0], 10);
    const bucket = rowOwner === owner ? 'allyEffects' : 'enemyEffects';
    window.__ow_appendRowEffect?.(targetRowId, bucket, tripwireEffect(playerHeroId, sourceRowId, partnerRowId));
    const row = window.__ow_getRow?.(targetRowId);
    for (const cardId of row?.cardIds || []) {
        applyTripwireEnter(cardId, targetRowId);
        const card = window.__ow_getCard?.(cardId);
        if (card && card.health > 0 && parseInt(String(cardId)[0], 10) !== owner) {
            try { effectsBus.publish(Effects.lockOn(cardId)); } catch {}
        }
    }
}

function allBoardEntries() {
    const out = [];
    for (const playerNum of [1, 2]) {
        for (const pos of ['f', 'm', 'b']) {
            const rowId = `${playerNum}${pos}`;
            const row = window.__ow_getRow?.(rowId);
            for (const cardId of row?.cardIds || []) {
                out.push({ cardId, rowId, card: window.__ow_getCard?.(cardId) });
            }
        }
    }
    return out;
}

export function onDraw() {
    try { playAudioByKey('sylvain-intro'); } catch {}
}

export async function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0], 10);
    try { playAudioByKey('sylvain-enter'); } catch {}

    let firstId;
    let secondId;
    if (isAiOwned(playerHeroId)) {
        const enemyRows = enemyRowIds(playerNum);
        firstId = enemyRows[0];
        secondId = enemyRows[1];
    } else {
        showToast('Tripwire: Select first row');
        const first = await selectRowTarget();
        clearToast();
        if (!first?.rowId) return;
        firstId = first.rowId;
        showToast('Tripwire: Select an adjacent row (front-middle or middle-back)');
        const second = await selectRowTarget();
        clearToast();
        if (!second?.rowId) return;
        secondId = second.rowId;
    }

    if (!rowsAreAdjacent(firstId, secondId)) {
        showToast('Tripwire: Rows must be adjacent (front-middle or middle-back)');
        setTimeout(() => clearToast(), 2000);
        return;
    }

    placeTripwire(playerHeroId, rowId, firstId, secondId);
    placeTripwire(playerHeroId, rowId, secondId, firstId);
    try { playAudioByKey('sylvain-ability1-resolve'); } catch {}
    try { effectsBus.publish(Effects.rowWash(firstId, NEON)); } catch {}
    try { effectsBus.publish(Effects.rowWash(secondId, NEON)); } catch {}
    showToast('Tripwire: Wired');
    setTimeout(() => clearToast(), 2000);
}

export async function onUltimate({ playerHeroId }) {
    try { playAudioByKey('sylvain-ult'); } catch {}
    try { playAudioByKey('sylvain-ult-resolve'); } catch {}
    const entries = allBoardEntries();
    const wired = [];
    const wiredRowIds = [];
    for (const playerNum of [1, 2]) {
        for (const pos of ['f', 'm', 'b']) {
            const rowId = `${playerNum}${pos}`;
            const row = window.__ow_getRow?.(rowId);
            const wires = [...(row?.allyEffects || []), ...(row?.enemyEffects || [])]
                .filter((effect) => effect?.id === 'tripwire' && effect?.sourceCardId === playerHeroId);
            if (wires.length) {
                wiredRowIds.push(rowId);
                for (const cardId of row?.cardIds || []) {
                    wired.push({ cardId, rowId, card: window.__ow_getCard?.(cardId) });
                }
            }
        }
    }

    const skipFx = { skipProjectileFx: true };
    const zapped = new Set();
    const zap = (cardId) => {
        if (!cardId || zapped.has(cardId)) return;
        zapped.add(cardId);
        try { effectsBus.publish(Effects.zap(cardId)); } catch {}
    };

    const cleanup = killswitchRowCleanup(wired);
    cleanup.stripArmorIds.forEach((id) => {
        window.__ow_dispatchArmorUpdate?.(id, 0);
        zap(id);
    });
    cleanup.destroyIds.forEach((id) => {
        const entry = wired.find((e) => e.cardId === id);
        if (entry) dealDamage(id, entry.rowId, 99, true, playerHeroId, false, skipFx);
        zap(id);
    });

    electrifiedTargets(entries).forEach((entry) => {
        dealDamage(entry.cardId, entry.rowId, 2, false, playerHeroId, false, skipFx);
        zap(entry.cardId);
    });

    wiredRowIds.forEach((rowId) => {
        window.__ow_removeRowEffect?.(rowId, 'enemyEffects', 'tripwire');
        window.__ow_removeRowEffect?.(rowId, 'allyEffects', 'tripwire');
    });

    showToast('Killswitch');
    setTimeout(() => clearToast(), 2000);
}

export default { onDraw, onEnter, onUltimate, applyTripwireEnter };
