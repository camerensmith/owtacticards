// Lightweight targeting helpers used by abilities. These wrap the jQuery
// click-capture pattern currently used inside HeroAbilities.js into
// Promise-based utilities we can call from hero modules.

import $ from 'jquery';
import { playWithOverlay } from './soundController';

// Simple cancellation flag and API so other parts of the app (e.g. End Turn)
// can abort in-progress targeting flows gracefully
let isCancelled = false;
export function cancelTargeting() {
    try { isCancelled = true; } catch {}
    // Also emit a DOM event so any attached handlers can listen if needed
    try { document.dispatchEvent(new CustomEvent('ow:targeting:cancel')); } catch {}
}
// Expose on window for legacy callers
try { window.__ow_cancelTargeting = cancelTargeting; } catch {}

// Resolves with an object: { cardId, rowId, liIndex }
export function selectCardTarget() {
    return new Promise((resolve) => {
        isCancelled = false;
        const handler = (e) => {
            const $target = $(e.target);
            const cardId = $target.closest('.card').attr('id');
            const rowId = $target.closest('.row').attr('id');
            const liIndex = $target.closest('li').index();
            
            // Check if target card is frozen (has immunity effect)
            const targetCard = window.__ow_getCard?.(cardId);
            if (targetCard && Array.isArray(targetCard.effects)) {
                const isFrozen = targetCard.effects.some(effect => 
                    effect?.id === 'cryo-freeze' && effect?.type === 'immunity'
                );
                if (isFrozen) {
                    console.log(`Targeting: Cannot target frozen card ${cardId}`);
                    return; // Don't resolve, keep listening for valid targets
                }
            }
            
            $('.card').off('click', handler);
            resolve({ cardId, rowId, liIndex });
        };
        const cancelHandler = () => {
            $('.card').off('click', handler);
            document.removeEventListener('ow:targeting:cancel', cancelHandler);
            resolve(null);
        };
        $('.card').on('click', handler);
        document.addEventListener('ow:targeting:cancel', cancelHandler);
    });
}

// Resolves with an object: { rowId, rowPosition }
export function selectRowTarget() {
    return new Promise((resolve) => {
        isCancelled = false;
        const handler = (e) => {
            try { e.preventDefault(); e.stopPropagation(); } catch {}
            const $target = $(e.target);
            // Support clicks on elements with class 'row' or the known row ids
            const rowIds = ['1f','1m','1b','2f','2m','2b','player1hand','player2hand'];
            let rowId = $target.closest('.row').attr('id');
            if (!rowId) {
                for (const rid of rowIds) {
                    if ($target.closest(`#${rid}`).length) { rowId = rid; break; }
                }
            }
            if (!rowId) {
                // Ignore clicks not in a row; keep handler active
                return;
            }
            const rowPosition = rowId[1];
            $('.row').off('click', handler);
            for (const rid of rowIds) { $(document).off('click', handler, `#${rid}`); }
            resolve({ rowId, rowPosition });
        };
        const cancelHandler = () => {
            $('.row').off('click', handler);
            const rowIds = ['1f','1m','1b','2f','2m','2b','player1hand','player2hand'];
            for (const rid of rowIds) { $(document).off('click', handler, `#${rid}`); }
            document.removeEventListener('ow:targeting:cancel', cancelHandler);
            resolve(null);
        };
        // Attach to generic row containers and specific ids as fallback
        $('.row').on('click', handler);
        const rowIds = ['1f','1m','1b','2f','2m','2b','player1hand','player2hand'];
        for (const rid of rowIds) { $(`#${rid}`).on('click', handler); }
        document.addEventListener('ow:targeting:cancel', cancelHandler);
    });
}

// Convenience: select a row and immediately trigger a sound/overlay event.
// Use eventName = 'onRowTarget' by default.
export async function selectRowTargetWithSound(heroId, cardId, eventName = 'onRowTarget') {
    const result = await selectRowTarget();
    if (heroId && cardId) {
        playWithOverlay(heroId, cardId, eventName);
    }
    return result;
}


