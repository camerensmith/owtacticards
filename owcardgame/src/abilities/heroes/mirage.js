import effectsBus, { Effects } from '../engine/effectsBus';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import {
    isMirage,
    shouldDisorientSource,
    createDisorientEffect,
} from '../../game/disorient';

export function onEnter() {
    // Mirage is a token; do not spawn another illusion.
}

export function popMirageIfEnemyPicked(cardId, sourceCardId) {
    if (!cardId) return { popped: false, disoriented: false };
    const picked = window.__ow_getCard?.(cardId);
    const pickerNum = window.__ow_getPlayerTurn?.();
    if (!isMirage(picked) || !pickerNum || pickerNum === parseInt(cardId[0], 10)) {
        return { popped: false, disoriented: false };
    }
    return popMirage({
        mirageId: cardId,
        sourceCardId: sourceCardId || window.__ow_abilitySourceCardId || null,
    });
}

export function popMirage({ mirageId, sourceCardId } = {}) {
    const resolvedSourceId = sourceCardId || window.__ow_abilitySourceCardId || null;
    const mirageCard = window.__ow_getCard?.(mirageId);
    if (!isMirage(mirageCard) || (mirageCard.health || 0) <= 0) {
        return { popped: false, disoriented: false };
    }

    window.__ow_setCardHealth?.(mirageId, 0, true);
    try { effectsBus.publish(Effects.smoke([mirageId])); } catch {}
    try { effectsBus.publish(Effects.showDeath(mirageId)); } catch {}

    const sourceCard = resolvedSourceId ? window.__ow_getCard?.(resolvedSourceId) : null;
    const disorient = shouldDisorientSource({
        sourceCard,
        mirageCard,
        sourceCardId: resolvedSourceId,
        mirageId,
    });
    if (!disorient || !resolvedSourceId) {
        return { popped: true, disoriented: false };
    }

    window.__ow_removeCardEffect?.(resolvedSourceId, 'disorient');
    const victimPlayerNum = parseInt(String(resolvedSourceId)[0], 10);
    window.__ow_appendCardEffect?.(resolvedSourceId, createDisorientEffect(victimPlayerNum));
    showToast('Disoriented');
    setTimeout(() => clearToast(), 2000);
    return { popped: true, disoriented: true };
}

export default { onEnter, popMirage, popMirageIfEnemyPicked };
