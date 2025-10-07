import $ from 'jquery';
import { dealDamage } from '../engine/damageBus';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import aimLineBus from '../engine/aimLineBus';
import { selectRowTarget } from '../engine/targeting';
import { getAudioFile } from '../../assets/imageImports';
import effectsBus, { Effects } from '../engine/effectsBus';

// BOB: special unit spawned by Ashe. Non-drawable (special: true), may have onEnter and ultimate.

// onEnter example: immediately deal 1 damage to all enemies in opposing row (placeholder, adjust later)
export function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    try {
        // Play BOB enter sound (handled globally on placement as well)
        try {
            const src = getAudioFile('bob-enter');
            if (src) new Audio(src).play().catch(() => {});
        } catch {}

        // AI: automatically select a random enemy row to place suppression effect
        if (window.__ow_aiTriggering || window.__ow_isAITurn) {
            const enemyPlayer = playerNum === 1 ? 2 : 1;
            const enemyRows = [`${enemyPlayer}f`, `${enemyPlayer}m`, `${enemyPlayer}b`];
            const randomRow = enemyRows[Math.floor(Math.random() * enemyRows.length)];
            // Apply effect: enemy ultimates in this row cost +2 this round
            window.__ow_appendRowEffect?.(randomRow, 'enemyEffects', {
                id: 'bob-row-suppression',
                hero: 'bob',
                type: 'ultimateCostModifier',
                value: 2,
                sourceCardId: playerHeroId,
                sourceRowId: rowId,
                tooltip: 'BOB: Ultimates from this row cost +2 this round',
                visual: 'bob-icon'
            });
            showToast(`BOB AI: Suppressing row ${randomRow}`);
            setTimeout(() => clearToast(), 2000);
            return;
        }

        // Visual: draw aim line from BOB card to cursor and prompt for row selection
        const sourceId = `${playerNum}bob`; // playerHeroId format
        aimLineBus.setArrowSource(sourceId);
        showToast('BOB: Place token next to an enemy row');

        // Persist until a row is selected
        selectRowTarget({ isDamage: true }).then(({ rowId: targetRow }) => {
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
            const playerNum = parseInt(playerHeroId[0]);
            
            // For AI, automatically select the enemy row with most enemies
            if (window.__ow_aiTriggering || window.__ow_isAITurn) {
                const enemyPlayer = playerNum === 1 ? 2 : 1;
                const enemyRows = [`${enemyPlayer}f`, `${enemyPlayer}m`, `${enemyPlayer}b`];
                
                // Find the enemy row with the most living enemies
                let bestRow = enemyRows[0];
                let maxLivingEnemies = 0;
                
                for (const enemyRowId of enemyRows) {
                    const row = window.__ow_getRow?.(enemyRowId);
                    let livingEnemies = 0;
                    if (row && row.cardIds) {
                        for (const cardId of row.cardIds) {
                            const card = window.__ow_getCard?.(cardId);
                            if (card && card.health > 0) {
                                livingEnemies++;
                            }
                        }
                    }
                    if (livingEnemies > maxLivingEnemies) {
                        maxLivingEnemies = livingEnemies;
                        bestRow = enemyRowId;
                    }
                }
                
                console.log(`Bob AI: Selected row ${bestRow} with ${maxLivingEnemies} living enemies`);
                
                // Deal 1 damage + 1 synergy damage to up to 3 enemies
                const targetRow = window.__ow_getRow?.(bestRow);
                let targetsHit = 0;
                const maxTargets = 3;
                
                if (targetRow && targetRow.cardIds) {
                    for (const cardId of targetRow.cardIds) {
                        if (targetsHit >= maxTargets) break;
                        const card = window.__ow_getCard?.(cardId);
                        if (card && card.health > 0) {
                            // Deal 1 damage + 1 synergy damage
                            dealDamage(cardId, bestRow, 1, false, playerHeroId);
                            dealDamage(cardId, bestRow, 1, false, playerHeroId); // synergy damage
                            effectsBus.publish(Effects.showDamage(cardId, 2));
                            targetsHit++;
                        }
                    }
                }
                
                showToast(`Bob AI: Smash hit ${targetsHit} enemies in ${bestRow}`);
                setTimeout(() => clearToast(), 2000);
                return;
            }
            
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
                dealDamage(p.cardId, p.rowId, 1, false, playerHeroId);
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


