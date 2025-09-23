// Sound controller: centralized, optional sound playback per hero and event.
// Events: onDraw, onPlacement, onUltimate, onDamaged, onHealed, onDeath,
// onRez, onFlavor, onAcquaintance, onEnemy.

import { getAudioFile } from '../../assets/imageImports';

// Canonical event names
export const SoundEvents = {
    onDraw: 'onDraw',
    onPlacement: 'onPlacement',
    onUltimate: 'onUltimate',
    onDamaged: 'onDamaged',
    onHealed: 'onHealed',
    onDeath: 'onDeath',
    onRez: 'onRez',
    onFlavor: 'onFlavor',
    onAcquaintance: 'onAcquaintance',
    onEnemy: 'onEnemy',
    onRowTarget: 'onRowTarget',
};

// Simple in-memory registry; hero modules can register their sound keys here.
// Example structure:
// registry[heroId] = {
//   onDraw: ['tracer-intro'],
//   onUltimate: ['tracer-imback'],
//   onDamaged: ['winston-protect','winston-takecover']
// }
const registry = {};

export function registerHeroSounds(heroId, mapping) {
    registry[heroId] = { ...(registry[heroId] || {}), ...mapping };
}

// Helper: pick next sound from an array (random for now; could be round-robin)
function pickSoundKey(keys) {
    if (!Array.isArray(keys) || keys.length === 0) return undefined;
    const idx = Math.floor(Math.random() * keys.length);
    return keys[idx];
}

export function playHeroEventSound(heroId, eventName) {
    const heroMap = registry[heroId];
    if (!heroMap) return;
    const keys = heroMap[eventName];
    const key = Array.isArray(keys) ? pickSoundKey(keys) : keys;
    if (!key) return;
    const src = getAudioFile(key);
    if (!src) return;
    const audio = new Audio(src);
    audio.play().catch(() => {});
}

// Overlay hook: callers can subscribe to be notified when to show a speech icon
// above a specific card. This stays UI-agnostic; UI registers a callback.
let overlayListener = null;
export function setOverlayListener(listener) {
    overlayListener = listener;
}

export function notifyOverlay(cardId, eventName) {
    if (overlayListener) overlayListener({ cardId, eventName });
}

// Combined helper used by callers: plays audio, then notifies overlay
export function playWithOverlay(heroId, cardId, eventName) {
    playHeroEventSound(heroId, eventName);
    notifyOverlay(cardId, eventName);
}

// Convenience wrappers for common events
export function playRowTarget(heroId, cardId) {
    playWithOverlay(heroId, cardId, SoundEvents.onRowTarget);
}

export default {
    registerHeroSounds,
    playHeroEventSound,
    playWithOverlay,
    playRowTarget,
    setOverlayListener,
    notifyOverlay,
    SoundEvents,
};


