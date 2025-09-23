// Simple action bus for gameplay intents from UI (context menus, etc.).

const listeners = new Set();

export function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function publish(action) {
    for (const l of listeners) {
        try { l(action); } catch (e) {}
    }
}

// Action helpers
export const Actions = {
    requestUltimate: (playerHeroId, rowId, cost) => ({ 
        type: 'request:ultimate', 
        payload: { playerHeroId, rowId, cost } 
    }),
    requestTransform: (playerHeroId) => ({ type: 'request:transform', payload: { playerHeroId } }),
};

export default { subscribe, publish, Actions };


