// Overlay controller: consolidates existing health/heal/death overlays and future icons.

import effectsBus, { Effects, subscribe as subscribeBus, publish as publishBus } from './effectsBus';

// UI layer should call overlayController.subscribe to receive overlay events
export function subscribe(listener) {
    return subscribeBus(listener);
}

// Convenience wrappers used by game logic
export function showDamage(cardId, amount) { publishBus(Effects.showDamage(cardId, amount)); }
export function showHeal(cardId, amount) { publishBus(Effects.showHeal(cardId, amount)); }
export function showDeath(cardId) { publishBus(Effects.showDeath(cardId)); }
export function hideDeath(cardId) { publishBus(Effects.hideDeath(cardId)); }

// FX shortcuts
export function muzzleFlash(cardId) { publishBus(Effects.muzzleFlash(cardId)); }
export function rowBarrier(rowId, durationMs) { publishBus(Effects.rowBarrier(rowId, durationMs)); }

export default {
    subscribe,
    showDamage,
    showHeal,
    showDeath,
    hideDeath,
    muzzleFlash,
    rowBarrier,
};


