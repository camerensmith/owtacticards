import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';
import { playAudioByKey } from '../../assets/imageImports';
import { selectCardTarget } from '../engine/targeting';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { collectLivingOnRows, enemyRowIds } from '../../game/rosterRules';

export async function onEnter({ playerHeroId }) {
    const playerNum = parseInt(playerHeroId[0], 10);
    const enemies = collectLivingOnRows(enemyRowIds(playerNum), window.__ow_getRow, window.__ow_getCard);
    if (!enemies.length) {
        showToast('Tracking Shot: No enemies');
        setTimeout(() => clearToast(), 2000);
        return;
    }

    let target;
    if (window.__ow_aiTriggering || window.__ow_isAITurn) {
        target = enemies[Math.floor(Math.random() * enemies.length)];
    } else {
        showToast('Tracking Shot: Select an enemy');
        target = await selectCardTarget({ isDamage: true });
        clearToast();
        if (!target) return;
    }

    dealDamage(target.cardId, target.rowId, 1, true, playerHeroId);
    try { playAudioByKey('warden-ability1'); } catch {}
    try { effectsBus.publish(Effects.showDamage(target.cardId, 1)); } catch {}
    window.__ow_appendCardEffect?.(target.cardId, {
        id: 'warden-mark',
        hero: 'warden',
        type: 'mark',
        tooltip: 'Marked: can be damaged regardless of shields',
    });
    try { effectsBus.publish(Effects.mark(target.cardId)); } catch {}
    showToast('Tracking Shot');
    setTimeout(() => clearToast(), 2000);
}

export async function onUltimate({ playerHeroId }) {
    try { playAudioByKey('warden-ultimate'); } catch {}
    const playerNum = parseInt(playerHeroId[0], 10);
    const enemyNum = playerNum === 1 ? 2 : 1;
    window.__ow_setSeeker?.({
        ownerPlayerNum: playerNum,
        damage: 3,
        sourceCardId: playerHeroId,
    });
    try { effectsBus.publish(Effects.orbitStart(enemyNum, 'seeker', playerHeroId)); } catch {}
    showToast('Seeker Drone launched');
    setTimeout(() => clearToast(), 2000);
}

export default { onEnter, onUltimate };
