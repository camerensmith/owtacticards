// Lightweight targeting helpers used by abilities. These wrap the jQuery
// click-capture pattern currently used inside HeroAbilities.js into
// Promise-based utilities we can call from hero modules.

import $ from 'jquery';
import { playWithOverlay } from './soundController';

// Resolves with an object: { cardId, rowId, liIndex }
export function selectCardTarget() {
    return new Promise((resolve) => {
        const handler = (e) => {
            const $target = $(e.target);
            const cardId = $target.closest('.card').attr('id');
            const rowId = $target.closest('.row').attr('id');
            const liIndex = $target.closest('li').index();
            $('.card').off('click', handler);
            resolve({ cardId, rowId, liIndex });
        };
        $('.card').on('click', handler);
    });
}

// Resolves with an object: { rowId, rowPosition }
export function selectRowTarget() {
    return new Promise((resolve) => {
        const handler = (e) => {
            const $target = $(e.target);
            const rowId = $target.closest('.row').attr('id');
            const rowPosition = rowId ? rowId[1] : undefined;
            $('.row').off('click', handler);
            resolve({ rowId, rowPosition });
        };
        $('.row').on('click', handler);
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


