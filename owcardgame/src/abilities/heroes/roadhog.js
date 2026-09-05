import { selectCardTarget } from '../engine/targeting';
import { dealDamage } from '../engine/damageBus';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { playAudioByKey } from '../../assets/imageImports';
import effectsBus, { Effects } from '../engine/effectsBus';

function isAiOwned(cardId) {
    if (window.__ow_practiceMode) return false;
    return parseInt(String(cardId || '')[0], 10) === 2
        || !!window.__ow_aiTriggering
        || !!window.__ow_isAITurn;
}

function livingEnemyTargets(enemyPlayer) {
    const out = [];
    for (const rowId of [`${enemyPlayer}f`, `${enemyPlayer}m`, `${enemyPlayer}b`]) {
        const row = window.__ow_getRow?.(rowId);
        for (const cardId of row?.cardIds || []) {
            const card = window.__ow_getCard?.(cardId);
            if (card && card.health > 0 && card.id !== 'turret') {
                out.push({ cardId, rowId });
            }
        }
    }
    return out;
}

/** Front first; if full, spill to middle then back. Null if nowhere to land. */
function hookDestination(enemyPlayer, fromRowId) {
    for (const rowId of [`${enemyPlayer}f`, `${enemyPlayer}m`, `${enemyPlayer}b`]) {
        if (rowId === fromRowId) return rowId;
        if (!window.__ow_isRowFull?.(rowId)) return rowId;
    }
    return null;
}

/**
 * Printed Chain Hook: pull to first row, 2 damage (ignores shields),
 * Roadhog gains +1 armor if the target is still alive after.
 */
function resolveChainHook({ playerHeroId, targetCardId, fromRowId }) {
    const enemyPlayer = parseInt(String(targetCardId)[0], 10);
    const targetCard = window.__ow_getCard?.(targetCardId);
    if (!targetCard || targetCard.health <= 0) return;
    if (targetCard.id === 'turret') {
        showToast('Roadhog: Cannot hook turret - it is immobile');
        setTimeout(() => clearToast(), 2000);
        return;
    }

    const destinationRow = hookDestination(enemyPlayer, fromRowId);
    if (destinationRow && destinationRow !== fromRowId) {
        window.__ow_moveCardToRow?.(targetCardId, destinationRow);
        try { effectsBus.publish(Effects.chainHook(playerHeroId, targetCardId, 1000)); } catch {}
    }

    const damageRow = destinationRow || fromRowId;
    dealDamage(targetCardId, damageRow, 2, true, playerHeroId, false, { skipProjectileFx: true });
    try { effectsBus.publish(Effects.showDamage(targetCardId, 2)); } catch {}

    const after = window.__ow_getCard?.(targetCardId);
    if (after && (after.health || 0) > 0) {
        const hog = window.__ow_getCard?.(playerHeroId);
        window.__ow_dispatchArmorUpdate?.(playerHeroId, (hog?.armor || 0) + 1);
    }

    try { playAudioByKey('roadhog-ability1'); } catch {}
}

// Chain Hook - Move target enemy to front row, deal 2, +1 armor if they survive
export async function onEnter({ playerHeroId }) {
    const playerNum = parseInt(playerHeroId[0], 10);

    try { playAudioByKey('roadhog-enter'); } catch {}

    if (isAiOwned(playerHeroId)) {
        const enemies = livingEnemyTargets(playerNum === 1 ? 2 : 1);
        if (enemies.length === 0) {
            showToast('Roadhog AI: No enemies to target');
            setTimeout(() => clearToast(), 2000);
            return;
        }
        const pick = enemies[Math.floor(Math.random() * enemies.length)];
        resolveChainHook({
            playerHeroId,
            targetCardId: pick.cardId,
            fromRowId: pick.rowId,
        });
        showToast('Roadhog AI: Chain Hook resolved');
        setTimeout(() => clearToast(), 2000);
        return;
    }

    showToast('Roadhog: Select target enemy');
    try {
        const target = await selectCardTarget();
        if (!target) {
            clearToast();
            return;
        }
        if (parseInt(target.cardId[0], 10) === playerNum) {
            showToast('Roadhog: Cannot hook your own cards!');
            setTimeout(() => clearToast(), 2000);
            return;
        }
        clearToast();
        resolveChainHook({
            playerHeroId,
            targetCardId: target.cardId,
            fromRowId: target.rowId,
        });
    } catch (error) {
        console.log('Roadhog Chain Hook error:', error);
        clearToast();
    }
}

// Whole Hog - Deal random damage to all enemies over 4 seconds
export async function onUltimate({ playerHeroId }) {
    const playerNum = parseInt(playerHeroId[0], 10);

    try { playAudioByKey('roadhog-ultimate'); } catch {}

    if (window.__ow_aiTriggering || window.__ow_isAITurn) {
        const allEnemyRows = playerNum === 1 ? ['2f', '2m', '2b'] : ['1f', '1m', '1b'];
        let enemyCount = 0;
        allEnemyRows.forEach((r) => {
            const row = window.__ow_getRow?.(r);
            enemyCount += (row?.cardIds?.filter((cid) => (window.__ow_getCard?.(cid)?.health || 0) > 0).length || 0);
        });
        if (enemyCount <= 4) {
            showToast('Roadhog AI: Skipping Whole Hog (not enough enemies)');
            setTimeout(() => clearToast(), 1500);
            return;
        }
    }

    const enemyPlayer = playerNum === 1 ? 2 : 1;
    const livingEnemies = [];
    for (const rowId of [`${enemyPlayer}f`, `${enemyPlayer}m`, `${enemyPlayer}b`]) {
        const row = window.__ow_getRow?.(rowId);
        for (const cardId of row?.cardIds || []) {
            const card = window.__ow_getCard?.(cardId);
            if (card && card.health > 0) livingEnemies.push({ cardId, rowId });
        }
    }

    if (livingEnemies.length === 0) {
        showToast('Roadhog: No enemies to damage');
        setTimeout(() => clearToast(), 2000);
        return;
    }

    const totalDamage = livingEnemies.length * 2;
    const damageInstances = [];
    for (let i = 0; i < totalDamage; i++) {
        damageInstances.push(livingEnemies[Math.floor(Math.random() * livingEnemies.length)]);
    }
    for (let i = damageInstances.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [damageInstances[i], damageInstances[j]] = [damageInstances[j], damageInstances[i]];
    }

    const WHOLE_HOG_MS = 4000;
    const hogTargets = [...new Set(damageInstances.map((e) => e.cardId))];
    try { effectsBus.publish(Effects.wholeHog(playerHeroId, WHOLE_HOG_MS, hogTargets)); } catch {}
    const damageInterval = WHOLE_HOG_MS / totalDamage;

    damageInstances.forEach((enemy, index) => {
        setTimeout(() => {
            const currentCard = window.__ow_getCard?.(enemy.cardId);
            if (currentCard && currentCard.health > 0) {
                dealDamage(enemy.cardId, enemy.rowId, 1, false, playerHeroId, false, { skipProjectileFx: true });
                effectsBus.publish(Effects.showDamage(enemy.cardId, 1));
            }
        }, index * damageInterval);
    });
}

export default { onEnter, onUltimate };
