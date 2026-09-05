import { selectRowTarget } from '../engine/targeting';
import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { playAudioByKey } from '../../assets/imageImports';
import { crushZoneMoves } from '../../game/abilityRules';
import { enemyRowIds } from '../../game/rosterRules';
import { PALETTE } from '../../presentation/pixi/fxConfig';

function isAiOwned(cardId) {
    if (window.__ow_practiceMode) return false;
    return parseInt(String(cardId || '')[0], 10) === 2
        || !!window.__ow_aiTriggering
        || !!window.__ow_isAITurn;
}

function clampEffect(playerHeroId, rowId) {
    return {
        id: 'magnetic-clamp',
        hero: 'lockjaw',
        type: 'lock',
        visual: 'lockjaw-icon',
        sourceCardId: playerHeroId,
        sourceRowId: rowId,
        playerHeroId,
        tooltip: 'Magnetic Clamp: enemies in this row cannot be moved',
    };
}

function findClampRow(sourceCardId) {
    for (const rid of ['1f', '1m', '1b', '2f', '2m', '2b']) {
        const row = window.__ow_getRow?.(rid);
        if (!row) continue;
        const effects = [...(row.allyEffects || []), ...(row.enemyEffects || [])];
        if (effects.some((effect) => effect?.id === 'magnetic-clamp' && effect?.sourceCardId === sourceCardId)) {
            return rid;
        }
    }
    return null;
}

function removeClamp(rowId) {
    if (!rowId) return;
    window.__ow_removeRowEffect?.(rowId, 'enemyEffects', 'magnetic-clamp');
    window.__ow_removeRowEffect?.(rowId, 'allyEffects', 'magnetic-clamp');
}

export function onDraw() {
    try { playAudioByKey('lockjaw-intro'); } catch {}
}

export async function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0], 10);

    let dest;
    if (isAiOwned(playerHeroId)) {
        dest = enemyRowIds(playerNum)[Math.floor(Math.random() * 3)];
    } else {
        showToast('Magnetic Clamp: Select an enemy row');
        dest = (await selectRowTarget({ isDebuff: true }))?.rowId;
        clearToast();
        if (!dest) return;
        if (parseInt(dest[0], 10) === playerNum) {
            showToast('Magnetic Clamp: Must target an enemy row');
            setTimeout(() => clearToast(), 2000);
            return;
        }
    }

    window.__ow_appendRowEffect?.(dest, 'enemyEffects', clampEffect(playerHeroId, rowId));
    try { playAudioByKey('lockjaw-ability1-resolve'); } catch {}
    try { effectsBus.publish(Effects.rowWash(dest, PALETTE.teal)); } catch {}
    const row = window.__ow_getRow?.(dest);
    for (const cardId of row?.cardIds || []) {
        const card = window.__ow_getCard?.(cardId);
        if (card && card.health > 0) {
            try { effectsBus.publish(Effects.lockOn(cardId)); } catch {}
        }
    }
    showToast('Magnetic Clamp placed');
    setTimeout(() => clearToast(), 2000);
}

export async function onUltimate({ playerHeroId }) {
    const playerNum = parseInt(playerHeroId[0], 10);
    try { playAudioByKey('lockjaw-ult-start'); } catch {}

    removeClamp(findClampRow(playerHeroId));

    let dest;
    if (isAiOwned(playerHeroId)) {
        const enemyRows = enemyRowIds(playerNum);
        dest = [...enemyRows].sort((a, b) =>
            (window.__ow_getRow?.(a)?.cardIds?.length || 0) - (window.__ow_getRow?.(b)?.cardIds?.length || 0)
        )[0];
    } else {
        showToast('Crush Zone: Select a row to pull into');
        dest = (await selectRowTarget())?.rowId;
        clearToast();
        if (!dest) return;
    }

    try { playAudioByKey('lockjaw-ultimate-resolve'); } catch {}

    const enemyNum = playerNum === 1 ? 2 : 1;
    const cards = [];
    for (const pos of ['f', 'm', 'b']) {
        const rowId = `${enemyNum}${pos}`;
        for (const cardId of window.__ow_getRow?.(rowId)?.cardIds || []) {
            cards.push({ cardId, rowId, card: window.__ow_getCard?.(cardId) });
        }
    }

    const moves = crushZoneMoves({ cards, destRowId: dest });
    try { effectsBus.publish(Effects.rowWash(dest, PALETTE.teal)); } catch {}
    moves.forEach((move) => {
        try { effectsBus.publish(Effects.push(move.cardId, move.fromRowId, move.toRowId)); } catch {}
        window.__ow_moveCardToRow?.(move.cardId, move.toRowId);
        if (move.damage > 0) {
            dealDamage(move.cardId, move.toRowId, move.damage, false, playerHeroId);
            try { effectsBus.publish(Effects.impact(move.cardId)); } catch {}
        }
    });

    showToast(`Crush Zone: Pulled ${moves.length}`);
    setTimeout(() => clearToast(), 2000);
}

export default { onDraw, onEnter, onUltimate };
