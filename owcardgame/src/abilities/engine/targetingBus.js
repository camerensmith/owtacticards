// Simple bus to show a non-intrusive targeting banner at the top of the app

const listeners = new Set();
let currentMessage = null;

export function subscribe(listener) {
    listeners.add(listener);
    // emit current on subscribe
    try { listener(currentMessage); } catch (e) {}
    return () => listeners.delete(listener);
}

export function showMessage(message) {
    currentMessage = message;
    for (const l of listeners) {
        try { l(currentMessage); } catch (e) {}
    }
}

export function clearMessage() {
    showMessage(null);
}

export function isTargeting() {
    return currentMessage !== null;
}

export default { subscribe, showMessage, clearMessage, isTargeting };


