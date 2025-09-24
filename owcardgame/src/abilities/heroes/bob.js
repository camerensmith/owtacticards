import $ from 'jquery';
import { dealDamage } from '../engine/damageBus';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import aimLineBus from '../engine/aimLineBus';
import { selectRowTarget } from '../engine/targeting';
import { getAudioFile } from '../../assets/imageImports';

// BOB: special unit spawned by Ashe. Non-drawable (special: true), may have onEnter and ultimate.

// onEnter example: immediately deal 1 damage to all enemies in opposing row (placeholder, adjust later)
export function onEnter({ playerNum, rowId }) {
    try {
        // Play BOB enter sound (handled globally on placement as well)
        try {
            const src = getAudioFile('bob-enter');
            if (src) new Audio(src).play().catch(() => {});
        } catch {}

        // Visual: draw aim line from BOB card to cursor and prompt for row selection
        const sourceId = `${playerNum}bob`; // playerHeroId format
        aimLineBus.setArrowSource(sourceId);
        showToast('BOB: Place token next to an enemy row');

        // Persist until a row is selected
        selectRowTarget().then(({ rowId: targetRow }) => {
            // Clear visuals
            aimLineBus.clearArrow();
            clearToast();
            // Apply effect: enemy ultimates in this row cost +2 this round
            try {
                // Mark the enemy row with a modifier we can check on ultimates
                // Store as an enemyEffects entry on the row to render BOB icon
                const enemyPlayer = playerNum === 1 ? 2 : 1; // BOB affects enemy row
                const modifier = {
                    id: 'bob-token',
                    hero: 'bob',
                    playerHeroId: `${playerNum}bob`,
                    type: 'ultCost',
                    value: 2,
                    tooltip: '+2 to Synergy Costs',
                };
                if (window.__ow_appendRowEffect) {
                    window.__ow_appendRowEffect(targetRow, 'enemyEffects', modifier);
                }
                console.log('BOB token placed on', targetRow, '=> ultimates cost +2');
                // Ability confirmation sound
                try {
                    const src = getAudioFile('bob-ability');
                    if (src) new Audio(src).play().catch(() => {});
                } catch {}
            } catch {}
        });
    } catch {}
}

// onUltimate placeholder: define cost and effect later if BOB has one
export function onUltimate({ playerHeroId, rowId, cost = 1 }) {
    // Smash (1): Deal 1 damage and 1 Synergy damage to up to 3 adjacent enemies in target row.
    (async () => {
        try {
            showToast('Select target row for Smash');
            const { rowId: targetRow } = await selectRowTarget();
            clearToast();

            const picks = [];
            const pickedIds = new Set();
            const ask = async (label) => {
                showToast(label);
                return new Promise((resolve) => {
                    const handler = (e) => {
                        e.preventDefault(); e.stopPropagation();
                        const $t = $(e.target);
                        const clickedRow = $t.closest('.row').attr('id');
                        const cardId = $t.closest('.card').attr('id');
                        if (!clickedRow || clickedRow !== targetRow || !cardId) return; // must be same row
                        if (pickedIds.has(cardId)) return; // no duplicates
                        picks.push({ cardId, rowId: targetRow });
                        pickedIds.add(cardId);
                        $('.card').off('click', handler);
                        clearToast();
                        resolve();
                    };
                    $('.card').on('click', handler);
                    const cancel = (e) => { e.preventDefault(); $('.card').off('click', handler); window.removeEventListener('contextmenu', cancel); showToast('Ability stopped early'); setTimeout(() => clearToast(), 1200); resolve(); };
                    window.addEventListener('contextmenu', cancel, { once: true });
                });
            };

            await ask('Pick first Adjacent Row Hero');
            if (picks.length < 1) return;
            await ask('Pick second Adjacent Row Hero');
            await ask('Pick Final Adjacent Row Hero');

            for (const p of picks) {
                dealDamage(p.cardId, p.rowId, 1, false);
                if (window.__ow_updateSynergy) window.__ow_updateSynergy(p.rowId, -1);
            }
            // Play smash sound after all damage applied
            try {
                const src = getAudioFile('bob-smash');
                if (src) new Audio(src).play().catch(() => {});
            } catch {}
        } catch (e) {
            clearToast();
        }
    })();
}

export default { onEnter, onUltimate };

// Optional: expose a cleanup helper to remove the token when BOB dies
export function onDeath({ rowId }) {
    try {
        if (window.__ow_appendRowEffect) {
            // Remove bob-token from row enemyEffects by re-writing without it
            const cur = window?.__ow_getRow?.(rowId)?.enemyEffects || [];
            const next = cur.filter(e => e?.id !== 'bob-token');
            window.__ow_setRowArray && window.__ow_setRowArray(rowId, 'enemyEffects', next);
        }
    } catch {}
}


