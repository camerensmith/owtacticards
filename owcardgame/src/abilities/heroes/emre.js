import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';
import { playAudioByKey } from '../../assets/imageImports';
import { RIFLE } from '../../presentation/pixi/fxConfig';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import {
    pickRandomIds,
    randomIntInclusive,
    collectLivingOnRows,
    enemyRowIds,
} from '../../game/rosterRules';

/** Override Protocol strobes Emre red as it fires. */
const OVERRIDE_RED = 0xff3b30;

function livingEnemies(playerNum) {
    return collectLivingOnRows(enemyRowIds(playerNum), window.__ow_getRow, window.__ow_getCard);
}

function hit(cardId, rowId, amount, sourceId, delayMs = 0) {
    if (amount <= 0) return;
    // The rifle shot is the projectile, so the damage bus's generic beam is
    // suppressed — that orange bolt is what made Synth Rifle look wrong.
    try { effectsBus.publish(Effects.rifle(sourceId, cardId, delayMs)); } catch {}
    dealDamage(cardId, rowId, amount, false, sourceId, false, { skipProjectileFx: true });
    try { effectsBus.publish(Effects.showDamage(cardId, amount)); } catch {}
}

export async function onEnter({ playerHeroId }) {
    try { playAudioByKey('emre-ability1'); } catch {}
    const playerNum = parseInt(playerHeroId[0], 10);
    const enemies = livingEnemies(playerNum);
    if (!enemies.length) {
        showToast('Synth Rifle: No enemies');
        setTimeout(() => clearToast(), 2000);
        return;
    }
    const picks = pickRandomIds(enemies.map((e) => e.cardId), 4);
    picks.forEach((id) => {
        const row = enemies.find((e) => e.cardId === id);
        if (!row) return;
        hit(id, row.rowId, randomIntInclusive(0, 1), playerHeroId);
    });
    showToast(`Synth Rifle: ${picks.length} targets`);
    setTimeout(() => clearToast(), 2000);
}

export async function onUltimate({ playerHeroId }) {
    try { playAudioByKey('emre-ultimate'); } catch {}
    const playerNum = parseInt(playerHeroId[0], 10);
    const enemies = livingEnemies(playerNum);
    // Emre flashes red while the volley goes out, one shot after another.
    for (let i = 0; i < 3; i += 1) {
        setTimeout(() => {
            try { effectsBus.publish(Effects.pulse(playerHeroId, OVERRIDE_RED)); } catch {}
        }, i * 180);
    }
    enemies.forEach((e, index) => {
        hit(e.cardId, e.rowId, randomIntInclusive(0, 3), playerHeroId, index * RIFLE.staggerMs);
    });
    try { effectsBus.publish(Effects.sideWash(playerNum === 1 ? 2 : 1)); } catch {}
    showToast(`Override Protocol: ${enemies.length} enemies`);
    setTimeout(() => clearToast(), 2000);
}

export default { onEnter, onUltimate };
