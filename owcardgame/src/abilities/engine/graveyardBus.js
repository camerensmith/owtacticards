/**
 * Promise-based graveyard picker.
 * Mirrors targeting.js so a hero module can `await` a player's choice and read
 * top-to-bottom, rather than threading callbacks through the UI.
 */

const listeners = new Set();
let request = null; // { playerNum, resolve }

function emit() {
    for (const listener of listeners) {
        try {
            listener(request);
        } catch (e) {
            console.error('graveyardBus listener failed', e);
        }
    }
}

export function subscribe(listener) {
    listeners.add(listener);
    try {
        listener(request);
    } catch (e) {}
    return () => listeners.delete(listener);
}

/** Opens that player's graveyard in select mode. Resolves a heroId, or null if cancelled. */
export function selectFromGraveyard(playerNum) {
    return new Promise((resolve) => {
        // A second request would strand the first promise; cancel it first.
        if (request) resolveSelection(null);
        request = { playerNum, resolve };
        emit();
    });
}

export function resolveSelection(heroId) {
    const pending = request;
    request = null;
    emit();
    try {
        pending?.resolve?.(heroId ?? null);
    } catch (e) {
        console.error('graveyard selection resolve failed', e);
    }
}

export function cancelSelection() {
    resolveSelection(null);
}

export function getRequest() {
    return request;
}

export default { subscribe, selectFromGraveyard, resolveSelection, cancelSelection, getRequest };
