// Central effects event bus. UI layers subscribe to render overlays/FX.

const listeners = new Set();

export function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function publish(event) {
    // event: { type, payload }
    for (const l of listeners) {
        try { l(event); } catch (e) {}
    }
}

// Common event creators
export const Effects = {
    // Overlays
    showDeath: (cardId) => ({ type: 'overlay:death', payload: { cardId } }),
    hideDeath: (cardId) => ({ type: 'overlay:death:hide', payload: { cardId } }),
    showHeal: (cardId, amount) => ({ type: 'overlay:heal', payload: { cardId, amount } }),
    showDamage: (cardId, amount) => ({ type: 'overlay:damage', payload: { cardId, amount } }),

    // FX
    muzzleFlash: (cardId) => ({ type: 'fx:muzzleFlash', payload: { cardId } }),
    rowBarrier: (rowId, durationMs = 800) => ({ type: 'fx:rowBarrier', payload: { rowId, durationMs } }),
    resurrect: (cardId, text = 'RESURRECTED', icon = null) => ({ type: 'fx:resurrect', payload: { cardId, text, icon } }),
    chainHook: (sourceCardId, targetCardId, duration = 1000) => ({ type: 'fx:chainHook', payload: { sourceCardId, targetCardId, duration } }),
};

export default { subscribe, publish, Effects };


