import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';
import { playAudioByKey } from '../../assets/imageImports';
import { selectCardTarget } from '../engine/targeting';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import {
    lockOnDamage,
    unusedSynergy,
    overkillAmount,
    spreadOverkillRandom,
    collectLivingOnRows,
    enemyRowIds,
} from '../../game/rosterRules';
import { hyperionHoverPreview } from '../../game/targetPreview';

const HYPERION_BLUE = 0x4db8ff;

function livingEnemies(playerNum) {
    return collectLivingOnRows(enemyRowIds(playerNum), window.__ow_getRow, window.__ow_getCard)
        .filter((e) => !['turret', 'bob', 'nemesis'].includes(e.card?.id));
}

export async function onEnter({ playerHeroId, rowId }) {
    try { playAudioByKey('bravox2-enter'); } catch {}
    const playerNum = parseInt(playerHeroId[0], 10);
    const enemies = livingEnemies(playerNum);
    if (!enemies.length) {
        showToast('Lock On: No enemy targets');
        setTimeout(() => clearToast(), 2000);
        return;
    }

    let target;
    if (window.__ow_aiTriggering || window.__ow_isAITurn) {
        target = enemies[Math.floor(Math.random() * enemies.length)];
    } else {
        showToast('Lock On: Select an enemy');
        target = await selectCardTarget({ isDamage: true, fromCardId: playerHeroId });
        clearToast();
        if (!target) return;
    }

    try { playAudioByKey('bravox2-ability1-resolve'); } catch {}
    try { effectsBus.publish(Effects.lockOn(target.cardId)); } catch {}
    const card = window.__ow_getCard?.(target.cardId);
    const pos = target.rowId?.[1];
    const amount = lockOnDamage(card?.power?.[pos]);
    dealDamage(target.cardId, target.rowId, amount, false, playerHeroId);
    try { effectsBus.publish(Effects.showDamage(target.cardId, amount)); } catch {}
    showToast(`Lock On: ${amount} damage`);
    setTimeout(() => clearToast(), 2000);
}

export async function onUltimate({ playerHeroId }) {
    try { playAudioByKey('bravox2-ultimate'); } catch {}
    const playerNum = parseInt(playerHeroId[0], 10);
    const enemies = livingEnemies(playerNum);
    if (!enemies.length) {
        showToast('Hyperion Cannon: No enemy heroes');
        setTimeout(() => clearToast(), 2000);
        return;
    }

    let target;
    if (window.__ow_aiTriggering || window.__ow_isAITurn) {
        target = enemies[Math.floor(Math.random() * enemies.length)];
    } else {
        showToast('Hyperion Cannon: Select an enemy hero');
        // Bravo spools the cannon for as long as the player is aiming.
        try { effectsBus.publish(Effects.chargeStart(playerHeroId)); } catch {}
        try {
            target = await selectCardTarget({
                isDamage: true,
                fromCardId: playerHeroId,
                preview: (hover, ctx) => hyperionHoverPreview(hover, {
                    playerNum,
                    fromCardId: playerHeroId,
                    getRow: ctx.getRow,
                    getCard: ctx.getCard,
                }),
            });
        } finally {
            // Must stop on cancel and on a throw, or the card charges forever.
            try { effectsBus.publish(Effects.chargeStop(playerHeroId)); } catch {}
        }
        clearToast();
        if (!target) return;
    }

    const enemyNum = parseInt(target.cardId[0], 10);
    const dmg = unusedSynergy(
        window.__ow_getRow?.(`${enemyNum}f`)?.synergy,
        window.__ow_getRow?.(`${enemyNum}m`)?.synergy,
        window.__ow_getRow?.(`${enemyNum}b`)?.synergy,
    );
    const hp = window.__ow_getCard?.(target.cardId)?.health || 0;
    // The main event: a huge blue column from Bravo to whatever it is pointed at.
    try {
        effectsBus.publish(Effects.beam(playerHeroId, target.cardId, 800, {
            color: HYPERION_BLUE,
            width: 56,
        }));
    } catch {}
    // The Hyperion column above is the shot; the bus would draw a second,
    // ordinary beam straight over it.
    dealDamage(target.cardId, target.rowId, dmg, false, playerHeroId, false, { skipProjectileFx: true });
    try { effectsBus.publish(Effects.showDamage(target.cardId, dmg)); } catch {}

    const leftover = overkillAmount(dmg, hp);
    const others = enemies.filter((e) => e.cardId !== target.cardId);
    const spread = spreadOverkillRandom(leftover, others.map((o) => o.cardId));
    Object.entries(spread).forEach(([id, amt]) => {
        const other = others.find((o) => o.cardId === id);
        if (!other) return;
        // Overkill splashing off the one shot, not a beam each.
        dealDamage(id, other.rowId, amt, false, playerHeroId, false, { skipProjectileFx: true });
        try { effectsBus.publish(Effects.showDamage(id, amt)); } catch {}
    });

    try { playAudioByKey('bravox2-ultimate-resolve'); } catch {}
    showToast(`Hyperion Cannon: ${dmg} damage`);
    setTimeout(() => clearToast(), 2000);
}

export default { onEnter, onUltimate };
