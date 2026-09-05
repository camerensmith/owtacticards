import { useEffect, useState } from 'react';

/**
 * Shared Alt-key state.
 * A board can hold dozens of cards, so the window listeners are installed once
 * and fan out to subscribers rather than being attached per card.
 */

let altHeld = false;
let installed = false;
const subscribers = new Set();

function setAltHeld(next) {
    if (altHeld === next) return;
    altHeld = next;
    subscribers.forEach((notify) => notify(next));
}

/** Correct the shared state from any mouse event, which always carries altKey. */
export function syncAltFromEvent(event) {
    setAltHeld(!!event?.altKey);
}

function install() {
    if (installed || typeof window === 'undefined') return;
    installed = true;

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Alt') setAltHeld(true);
    });
    window.addEventListener('keyup', (e) => {
        if (e.key === 'Alt') setAltHeld(false);
    });
    // Alt+Tab and menu-bar focus never deliver a keyup, so drop the key on blur.
    window.addEventListener('blur', () => setAltHeld(false));
}

export default function useAltKey() {
    const [held, setHeld] = useState(altHeld);

    useEffect(() => {
        install();
        subscribers.add(setHeld);
        setHeld(altHeld); // catch a press that landed before this card mounted
        return () => {
            subscribers.delete(setHeld);
        };
    }, []);

    return held;
}
