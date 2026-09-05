import { selectRowTarget } from '../engine/targeting';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import effectsBus, { Effects } from '../engine/effectsBus';
import { playAudioByKey } from '../../assets/imageImports';
import {
    blizzardToken,
    castsBlizzardWithFreeze,
    findBlizzardRow,
    isRowFrozen,
} from '../../game/blizzard';

export async function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);

    try {
        playAudioByKey('mei-enter');
    } catch {}

    // Returned, not dropped: the caller awaits onEnter, and letting it resolve
    // early ends the AI's turn while the ability is still resolving.
    return handleBlizzard(playerHeroId, rowId, playerNum);
}

/** The enemy row Blizzard hurts most: the one with the most heroes on it. */
function bestBlizzardRow(playerNum) {
    const enemyPlayer = playerNum === 1 ? 2 : 1;
    let bestRow = `${enemyPlayer}f`;
    let mostLiving = -1;
    for (const rowId of [`${enemyPlayer}f`, `${enemyPlayer}m`, `${enemyPlayer}b`]) {
        const living = (window.__ow_getRow?.(rowId)?.cardIds || [])
            .filter((cid) => (window.__ow_getCard?.(cid)?.health || 0) > 0).length;
        if (living > mostLiving) { mostLiving = living; bestRow = rowId; }
    }
    return bestRow;
}

/**
 * The enemy row a borrowed Cryo Freeze lands on.
 *
 * Only reached when the caster is not Mei, so there is no existing Blizzard to
 * infer the row from and one has to be chosen. Returns null if the pick is
 * cancelled, which refuses the ultimate without spending synergy.
 */
async function pickFreezeRow(playerNum, enemyRows) {
    if (window.__ow_aiTriggering || window.__ow_isAITurn) {
        return bestBlizzardRow(playerNum);
    }
    showToast('Cryo Freeze: Select an enemy row to freeze');
    const target = await selectRowTarget();
    if (!target?.rowId) return null;
    if (!enemyRows.includes(target.rowId)) {
        showToast('Cryo Freeze can only target enemy rows');
        setTimeout(() => clearToast(), 1500);
        return null;
    }
    return target.rowId;
}

async function handleBlizzard(playerHeroId, rowId, playerNum) {
    try {
        // The AI picks its own row. Without this it fell through to the human
        // click-capture and asked the player to aim it.
        let targetRow;
        if (window.__ow_aiTriggering || window.__ow_isAITurn) {
            targetRow = { rowId: bestBlizzardRow(playerNum) };
        } else {
            showToast('Mei: Select an enemy row for Blizzard');
            targetRow = await selectRowTarget();
        }

        if (!targetRow) {
            clearToast();
            return;
        }

        const targetPlayerNum = parseInt(targetRow.rowId[0]);
        const isEnemyRow = targetPlayerNum !== playerNum;
        
        if (!isEnemyRow) {
            showToast('Mei: Blizzard can only target enemy rows');
            setTimeout(() => clearToast(), 1500);
            return;
        }
        
        // Play ability sound
        try {
            playAudioByKey('mei-ability1');
        } catch {}
        
        // One token holds both states; Cryo Freeze upgrades this same one.
        window.__ow_appendRowEffect?.(targetRow.rowId, 'enemyEffects', blizzardToken({
            sourceCardId: playerHeroId,
            sourceRowId: rowId,
        }));

        showToast(`Mei: Blizzard! Ultimates from ${targetRow.rowId} cost +1 synergy`);
        setTimeout(() => clearToast(), 2000);
        
    } catch (error) {
        console.error('Mei Blizzard error:', error);
        showToast('Mei: Blizzard failed');
        setTimeout(() => clearToast(), 1500);
    }
}

/**
 * Cryo Freeze (2): the row Blizzard already marked freezes over, and its
 * ultimates cost double instead of +1.
 *
 * There is no target to pick: it lands on Mei's own Blizzard row, so it reads
 * as the second half of one plan rather than a separate shot. That also means
 * the AI needs no targeting branch here.
 */
export async function onUltimate({ playerHeroId, rowId }) {
    try {
        const playerNum = parseInt(playerHeroId[0]);
        const enemyPlayer = playerNum === 1 ? 2 : 1;
        const enemyRows = [`${enemyPlayer}f`, `${enemyPlayer}m`, `${enemyPlayer}b`];

        // Echo copying this has no Blizzard of her own to freeze, so she lays
        // one and freezes it in a single cast, choosing the row herself.
        const blizzardRow = castsBlizzardWithFreeze(playerHeroId)
            ? await pickFreezeRow(playerNum, enemyRows)
            : findBlizzardRow(window.__ow_getRow, enemyRows);

        if (!blizzardRow) {
            showToast(castsBlizzardWithFreeze(playerHeroId)
                ? 'Cryo Freeze cancelled'
                : 'Mei: Cryo Freeze needs a Blizzard row to freeze');
            setTimeout(() => clearToast(), 2000);
            return false;
        }

        if (isRowFrozen(window.__ow_getRow, blizzardRow)) {
            showToast(`Mei: ${blizzardRow} is already frozen solid`);
            setTimeout(() => clearToast(), 2000);
            return false;
        }

        try { playAudioByKey('mei-ultimate'); } catch {}

        // Swap the token for its frozen form: same mark, harder terms.
        window.__ow_removeRowEffect?.(blizzardRow, 'enemyEffects', 'mei-token');
        window.__ow_appendRowEffect?.(blizzardRow, 'enemyEffects', blizzardToken({
            sourceCardId: playerHeroId,
            sourceRowId: rowId,
            frozen: true,
        }));

        // The same spiral as before, closing over the row rather than a card.
        try { effectsBus.publish(Effects.freezeSpiral(blizzardRow)); } catch {}

        showToast(`Mei: Cryo Freeze! Ultimates from ${blizzardRow} now cost double`);
        setTimeout(() => clearToast(), 2000);
        return true;

    } catch (error) {
        console.error('Mei Cryo Freeze error:', error);
        showToast('Mei: Cryo Freeze failed');
        setTimeout(() => clearToast(), 1500);
        return false;
    }
}


export function onDeath({ playerHeroId, rowId }) {
    try {
        console.log(`${playerHeroId} died - cleaning up Mei tokens`);
        
        // Remove Mei tokens from all rows
        const allRows = ['1f', '1m', '1b', '2f', '2m', '2b'];
        allRows.forEach(rowId => {
            window.__ow_removeRowEffect?.(rowId, 'enemyEffects', 'mei-token');
        });
        
        console.log('Mei: All Blizzard tokens removed');
        
    } catch (error) {
        console.error('Mei onDeath cleanup error:', error);
    }
}

export default { onEnter, onUltimate, onDeath };
