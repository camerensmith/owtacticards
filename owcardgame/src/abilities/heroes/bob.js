import { dealDamage } from '../engine/damageBus';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import aimLineBus from '../engine/aimLineBus';
import { selectRowTarget, selectCardTarget } from '../engine/targeting';
import { getAudioFile } from '../../assets/imageImports';
import effectsBus, { Effects } from '../engine/effectsBus';
import { oppositeRowId } from '../../game/mantis';
import {
    BOB_TURNS_COUNTER_ID,
    initialTurnsOnField,
    incrementTurnsOnField,
    turnsCounterEffect,
    readTurnsOnField,
    smashDamage,
} from '../../game/bobRules';

function setTurnsCounter(playerHeroId, turns) {
    window.__ow_removeCardEffect?.(playerHeroId, BOB_TURNS_COUNTER_ID);
    window.__ow_appendCardEffect?.(playerHeroId, turnsCounterEffect(turns));
}

function livingInRow(rowId) {
    const row = window.__ow_getRow?.(rowId);
    const out = [];
    for (const cardId of row?.cardIds || []) {
        const card = window.__ow_getCard?.(cardId);
        if (card && card.health > 0) out.push({ cardId, rowId });
    }
    return out;
}

function isAiOwned(cardId) {
    if (window.__ow_practiceMode) return false;
    return parseInt(String(cardId || '')[0], 10) === 2
        || !!window.__ow_aiTriggering
        || !!window.__ow_isAITurn;
}

/** +1 at the start of each of BOB's owner's turns while he is on the board. */
export function processBobTurnsAtTurnStart(currentPlayerNum) {
    const owner = Number(currentPlayerNum);
    for (const pos of ['f', 'm', 'b']) {
        const rowId = `${owner}${pos}`;
        const row = window.__ow_getRow?.(rowId);
        for (const cardId of row?.cardIds || []) {
            if (String(cardId).slice(1) !== 'bob') continue;
            const card = window.__ow_getCard?.(cardId);
            if (!card || card.health <= 0) continue;
            const next = incrementTurnsOnField(readTurnsOnField(card) || initialTurnsOnField());
            setTurnsCounter(cardId, next);
        }
    }
}

// onEnter: Suppressing Fire token on an enemy row + start Smash turn counter at 1
export function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0], 10);
    setTurnsCounter(playerHeroId, initialTurnsOnField());

    try {
        try {
            const src = getAudioFile('bob-enter');
            if (src) new Audio(src).play().catch(() => {});
        } catch {}

        if (isAiOwned(playerHeroId)) {
            const enemyPlayer = playerNum === 1 ? 2 : 1;
            const enemyRows = [`${enemyPlayer}f`, `${enemyPlayer}m`, `${enemyPlayer}b`];
            const randomRow = enemyRows[Math.floor(Math.random() * enemyRows.length)];
            window.__ow_appendRowEffect?.(randomRow, 'enemyEffects', {
                id: 'bob-row-suppression',
                hero: 'bob',
                type: 'ultimateCostModifier',
                value: 2,
                sourceCardId: playerHeroId,
                sourceRowId: rowId,
                tooltip: 'BOB: Ultimates from this row cost +2 this round',
                visual: 'bob-icon',
            });
            try { effectsBus.publish(Effects.suppressingFire(playerHeroId, randomRow)); } catch {}
            showToast(`BOB AI: Suppressing row ${randomRow}`);
            setTimeout(() => clearToast(), 2000);
            return;
        }

        const sourceId = playerHeroId;
        aimLineBus.setArrowSource(sourceId);
        showToast('BOB: Place token next to an enemy row');

        selectRowTarget({ isDamage: true }).then((selection) => {
            aimLineBus.clearArrow();
            clearToast();
            if (!selection?.rowId) return;
            const targetRow = selection.rowId;
            try {
                const modifier = {
                    id: 'bob-token',
                    hero: 'bob',
                    playerHeroId: sourceId,
                    type: 'ultCost',
                    value: 2,
                    tooltip: '+2 to Synergy Costs',
                };
                window.__ow_appendRowEffect?.(targetRow, 'enemyEffects', modifier);
                try { effectsBus.publish(Effects.suppressingFire(sourceId, targetRow)); } catch {}
                try {
                    const src = getAudioFile('bob-ability');
                    if (src) new Audio(src).play().catch(() => {});
                } catch {}
            } catch {}
        });
    } catch {}
}

/**
 * Smash (2): Deal X damage to an enemy in the opposite row,
 * where X is the number of turns B.O.B. has been on the field.
 */
export async function onUltimate({ playerHeroId, rowId }) {
    try {
        const bob = window.__ow_getCard?.(playerHeroId);
        const damage = smashDamage(readTurnsOnField(bob) || initialTurnsOnField());
        const opposite = oppositeRowId(rowId);
        if (!opposite) {
            showToast('Smash: No opposite row');
            setTimeout(() => clearToast(), 1500);
            return;
        }

        let target;
        if (isAiOwned(playerHeroId)) {
            const living = livingInRow(opposite);
            if (!living.length) {
                showToast('BOB AI: No enemies in opposite row');
                setTimeout(() => clearToast(), 2000);
                return;
            }
            target = living[0];
        } else {
            // Refuse wrong-row picks and keep asking until opposite-row or cancel.
            while (true) {
                showToast('Smash: Select an enemy in the opposite row');
                const pick = await selectCardTarget({
                    isDamage: true,
                    sourceCardId: playerHeroId,
                });
                clearToast();
                if (!pick?.cardId) return;
                if (pick.rowId !== opposite) {
                    showToast('Smash: Must target the opposite row');
                    await new Promise((r) => setTimeout(r, 900));
                    clearToast();
                    continue;
                }
                const card = window.__ow_getCard?.(pick.cardId);
                if (!card || card.health <= 0) {
                    showToast('Smash: Invalid target');
                    await new Promise((r) => setTimeout(r, 900));
                    clearToast();
                    continue;
                }
                target = pick;
                break;
            }
        }

        if (damage > 0) {
            dealDamage(
                target.cardId, target.rowId, damage,
                false, playerHeroId, false, { skipProjectileFx: true },
            );
            try { effectsBus.publish(Effects.showDamage(target.cardId, damage)); } catch {}
        }
        try { effectsBus.publish(Effects.smash([target.cardId])); } catch {}
        try {
            const src = getAudioFile('bob-smash');
            if (src) new Audio(src).play().catch(() => {});
        } catch {}
        showToast(`Smash: ${damage} damage`);
        setTimeout(() => clearToast(), 2000);
    } catch (e) {
        clearToast();
    }
}

export function onDeath({ rowId }) {
    try {
        const cur = window?.__ow_getRow?.(rowId)?.enemyEffects || [];
        const next = cur.filter((e) => e?.id !== 'bob-token' && e?.id !== 'bob-row-suppression');
        window.__ow_setRowArray?.(rowId, 'enemyEffects', next);
    } catch {}
}

export default { onEnter, onUltimate, processBobTurnsAtTurnStart, onDeath };
