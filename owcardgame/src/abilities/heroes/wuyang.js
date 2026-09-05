import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';
import { playAudioByKey } from '../../assets/imageImports';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import {
    pickRandomIds,
    alliesInFrontPositions,
    pushBackPosition,
    collectLivingOnRows,
    allyRowIds,
    enemyRowIds,
} from '../../game/rosterRules';
import { healedHealth } from '../../game/rules';
import { staffHitMs } from '../../presentation/pixi/fxMath';

function healAlly(cardId, amount = 1) {
    const card = window.__ow_getCard?.(cardId);
    if (!card || card.health <= 0) return 0;
    const max = card.maxHealth ?? window.__ow_getMaxHealth?.(cardId);
    const next = healedHealth(card.health, amount, max);
    const gained = next - card.health;
    if (gained > 0) {
        window.__ow_setCardHealth?.(cardId, next);
        try { effectsBus.publish(Effects.showHeal(cardId, gained)); } catch {}
    }
    return gained;
}

export async function onEnter({ playerHeroId }) {
    try { playAudioByKey('wuyang-enter'); } catch {}
    const playerNum = parseInt(playerHeroId[0], 10);
    const all = [
        ...collectLivingOnRows(allyRowIds(playerNum), window.__ow_getRow, window.__ow_getCard),
        ...collectLivingOnRows(enemyRowIds(playerNum), window.__ow_getRow, window.__ow_getCard),
    ];
    const picks = pickRandomIds(all.map((e) => e.cardId), 3);
    picks.forEach((id) => {
        const entry = all.find((e) => e.cardId === id);
        if (!entry) return;
        if (parseInt(id[0], 10) === playerNum) {
            healAlly(id, 1);
        } else {
            dealDamage(id, entry.rowId, 1, false, playerHeroId, false, { skipProjectileFx: true });
            try { effectsBus.publish(Effects.showDamage(id, 1)); } catch {}
        }
    });
    try { effectsBus.publish(Effects.staffOrb(playerHeroId, picks)); } catch {}
    try { playAudioByKey('wuyang-ability1'); } catch {}

    // One hit sound per target, as the orb reaches it. Debouncing is off: the
    // hops are shorter than the default window, so the second and third strikes
    // would otherwise be swallowed as repeats of the first.
    picks.forEach((_, index) => {
        setTimeout(() => {
            try { playAudioByKey('wuyang-ability1-sfx', { debounceMs: 0 }); } catch {}
        }, staffHitMs(index));
    });

    showToast('Xuanwu Staff');
    setTimeout(() => clearToast(), 2000);
}

export async function onUltimate({ playerHeroId, rowId }) {
    try { playAudioByKey('wuyang-ultimate'); } catch {}
    const playerNum = parseInt(playerHeroId[0], 10);
    const frontPos = alliesInFrontPositions(rowId[1]);
    frontPos.forEach((pos) => {
        const rid = `${playerNum}${pos}`;
        const row = window.__ow_getRow?.(rid);
        (row?.cardIds || []).forEach((cid) => {
            healAlly(cid, 1);
        });
        try { effectsBus.publish(Effects.rowWash(rid, 0x3ddc84)); } catch {}
    });

    const enemies = collectLivingOnRows(enemyRowIds(playerNum), window.__ow_getRow, window.__ow_getCard);
    enemies.forEach((e) => {
        const destPos = pushBackPosition(e.rowId[1]);
        if (destPos === e.rowId[1]) return;
        const destId = `${e.rowId[0]}${destPos}`;
        if (window.__ow_isRowFull?.(destId)) return;
        window.__ow_moveCardToRow?.(e.cardId, destId);
        try { effectsBus.publish(Effects.push(e.cardId, e.rowId, destId)); } catch {}
    });

    try { effectsBus.publish(Effects.tideWave(playerHeroId)); } catch {}
    showToast('Guardian Tide');
    setTimeout(() => clearToast(), 2000);
}

export default { onEnter, onUltimate };
