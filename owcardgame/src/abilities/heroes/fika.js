import effectsBus, { Effects } from '../engine/effectsBus';
import { playAudioByKey } from '../../assets/imageImports';
import { selectCardTarget, selectRowTarget } from '../engine/targeting';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { nearestOtherIds, collectLivingOnRows, allyRowIds, enemyRowIds, rowsWithSpace } from '../../game/rosterRules';

function isAi() {
    return !!(window.__ow_aiTriggering || window.__ow_isAITurn);
}

export async function onEnter({ playerHeroId }) {
    try { playAudioByKey('fika-abilitystart'); } catch {}
    const playerNum = parseInt(playerHeroId[0], 10);
    const allies = collectLivingOnRows(allyRowIds(playerNum), window.__ow_getRow, window.__ow_getCard)
        .filter((a) => a.cardId !== playerHeroId);
    if (!allies.length) {
        showToast('Lifeline: No allies to move');
        setTimeout(() => clearToast(), 2000);
        return;
    }

    let ally;
    let dest;
    if (isAi()) {
        ally = allies[Math.floor(Math.random() * allies.length)];
        const open = rowsWithSpace(allyRowIds(playerNum).map((id) => ({
            id,
            cardIds: window.__ow_getRow?.(id)?.cardIds || [],
        }))).filter((id) => id !== ally.rowId);
        dest = open[0] || null;
    } else {
        showToast('Lifeline: Select an ally');
        ally = await selectCardTarget({ isHeal: true });
        clearToast();
        if (!ally) return;
        if (parseInt(ally.cardId[0], 10) !== playerNum || ally.cardId === playerHeroId) {
            showToast('Lifeline: Must select another ally');
            setTimeout(() => clearToast(), 2000);
            return;
        }
        showToast('Lifeline: Select a row on your side');
        dest = (await selectRowTarget({ isBuff: true }))?.rowId;
        clearToast();
    }

    if (!ally?.cardId || !dest) return;
    if (window.__ow_isRowFull?.(dest) && dest !== ally.rowId) {
        showToast('Lifeline: That row is full');
        setTimeout(() => clearToast(), 2000);
        return;
    }
    window.__ow_moveCardToRow?.(ally.cardId, dest);
    try { playAudioByKey('fika-abilityend'); } catch {}
    try { effectsBus.publish(Effects.push(ally.cardId, ally.rowId, dest)); } catch {}
    showToast('Lifeline');
    setTimeout(() => clearToast(), 2000);
}

export async function onUltimate({ playerHeroId, rowId }) {
    try { playAudioByKey('fika-ultimatestart'); } catch {}
    const playerNum = parseInt(playerHeroId[0], 10);
    const enemyNum = playerNum === 1 ? 2 : 1;
    const openEnemy = rowsWithSpace(enemyRowIds(playerNum).map((id) => ({
        id,
        cardIds: window.__ow_getRow?.(id)?.cardIds || [],
    })));
    if (!openEnemy.length) {
        showToast('Catnap: No space on the enemy side');
        setTimeout(() => clearToast(), 2000);
        return;
    }

    let dest;
    if (isAi()) {
        dest = openEnemy.reduce((best, id) => {
            const n = (window.__ow_getRow?.(id)?.cardIds || []).length;
            const b = (window.__ow_getRow?.(best)?.cardIds || []).length;
            return n >= b ? id : best;
        }, openEnemy[0]);
    } else {
        showToast('Catnap: Select an enemy row');
        dest = (await selectRowTarget({ isDamage: true }))?.rowId;
        clearToast();
    }

    if (!dest || parseInt(dest[0], 10) !== enemyNum) return;
    if (window.__ow_isRowFull?.(dest)) {
        showToast('Catnap: That row is full');
        setTimeout(() => clearToast(), 2000);
        return;
    }

    window.__ow_moveCardToRow?.(playerHeroId, dest);
    try { playAudioByKey('fika-ultimate'); } catch {}
    try { effectsBus.publish(Effects.push(playerHeroId, rowId, dest)); } catch {}

    const ids = window.__ow_getRow?.(dest)?.cardIds || [];
    const fikaIndex = ids.indexOf(playerHeroId);
    const nearest = nearestOtherIds(ids, fikaIndex, 3);
    nearest.forEach((cid) => {
        window.__ow_appendCardEffect?.(cid, {
            id: 'catnap-lock',
            hero: 'fika',
            type: 'lock',
            tooltip: 'Catnap: Ultimate disabled',
        });
        try { effectsBus.publish(Effects.catnap(cid)); } catch {}
    });
    try { effectsBus.publish(Effects.sideWash(enemyNum, 0x6ec6ff)); } catch {}
    try { playAudioByKey('fika-ultimateend'); } catch {}
    showToast(`Catnap: locked ${nearest.length}`);
    setTimeout(() => clearToast(), 2000);
}

export default { onEnter, onUltimate };
