import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { selectCardTarget } from '../engine/targeting';
import { dealDamage } from '../engine/damageBus';
import { playAudioByKey } from '../../assets/imageImports';
import effectsBus, { Effects } from '../engine/effectsBus';

// Moira intro sound on draw
export function onDraw({ playerHeroId }) {
    try { playAudioByKey('moira-intro'); } catch {}
}

// On Enter: Biotic Grasp — Deal 1 to any enemy ignoring shields, then heal 2 to any ally.
export async function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);

    try {
        // Play placement/enter line if available
        playAudioByKey('moira-enter');
    } catch {}

    try {
        // Step 1: pick enemy first
        showToast('Moira: Pick one ENEMY to siphon (ignores shields)');
        const enemyTarget = await selectCardTarget();
        if (!enemyTarget) { clearToast(); return; }
        const enemyCard = window.__ow_getCard?.(enemyTarget.cardId);
        const enemyPlayer = parseInt(enemyTarget.cardId[0]);
        const isEnemy = enemyPlayer !== playerNum;
        if (!isEnemy || !enemyCard || enemyCard.health <= 0) {
            showToast('Moira: No valid enemy — ability failed');
            setTimeout(() => clearToast(), 1500);
            return;
        }
        // Deal 1 damage ignoring shields (Hanzo reduction may still apply via damageBus)
        dealDamage(enemyTarget.cardId, enemyTarget.rowId, 1, true, playerHeroId);
        effectsBus.publish(Effects.showDamage(enemyTarget.cardId, 1));

        // Step 2: pick ally to heal (turret cannot be healed)
        showToast('Moira: Pick one ALLY to heal 2');
        const allyTarget = await selectCardTarget();
        if (!allyTarget) { clearToast(); return; }
        const allyCard = window.__ow_getCard?.(allyTarget.cardId);
        const allyPlayer = parseInt(allyTarget.cardId[0]);
        const isAlly = allyPlayer === playerNum;
        const isTurret = allyCard?.id === 'turret';
        if (!isAlly || !allyCard || allyCard.health <= 0 || isTurret) {
            showToast('Moira: Invalid ally (turret cannot be healed)');
            setTimeout(() => clearToast(), 1500);
            return;
        }
        const maxHp = allyCard.maxHealth || window.__ow_getMaxHealth?.(allyTarget.cardId) || allyCard.health;
        const newHp = Math.min(maxHp, (allyCard.health || 0) + 2);
        const healed = newHp - (allyCard.health || 0);
        if (healed > 0) {
            window.__ow_setCardHealth?.(allyTarget.cardId, newHp);
            effectsBus.publish(Effects.showHeal(allyTarget.cardId, healed));
        }
        // Play on resolve (after both steps)
        try { playAudioByKey('moira-ability1'); } catch {}
        clearToast();
    } catch (e) {
        console.error('Moira onEnter error:', e);
        showToast('Moira ability cancelled');
        setTimeout(() => clearToast(), 1500);
    }
}

// Ultimate: Coalescence (3) — Heal allies in target column by 2; deal 2 to enemies in opposing column ignoring shields.
export async function onUltimate({ playerHeroId, rowId, cost }) {
    const playerNum = parseInt(playerHeroId[0]);
    try { playAudioByKey('moira-ultimate'); } catch {}
    showToast('Moira: Select any card to target its column');

    try {
        const target = await selectCardTarget();
        if (!target) { clearToast(); return; }

        const targetRow = window.__ow_getRow?.(target.rowId);
        if (!targetRow) { clearToast(); return; }
        const colIndex = targetRow.cardIds.indexOf(target.cardId);
        if (colIndex === -1) { clearToast(); return; }

        // Ally side rows for the acting player
        const allyRows = [`${playerNum}f`, `${playerNum}m`, `${playerNum}b`];
        const enemyPlayer = playerNum === 1 ? 2 : 1;
        const enemyRows = [`${enemyPlayer}f`, `${enemyPlayer}m`, `${enemyPlayer}b`];

        // Heal allies in column
        for (const r of allyRows) {
            const rowObj = window.__ow_getRow?.(r);
            const cardId = rowObj?.cardIds?.[colIndex];
            if (!cardId) continue;
            const card = window.__ow_getCard?.(cardId);
            if (!card || card.health <= 0) continue;
            if (card.id === 'turret') continue; // do not heal turret
            const maxHp = card.maxHealth || window.__ow_getMaxHealth?.(cardId) || card.health;
            const newHp = Math.min(maxHp, (card.health || 0) + 2);
            const healed = newHp - (card.health || 0);
            if (healed > 0) {
                window.__ow_setCardHealth?.(cardId, newHp);
                effectsBus.publish(Effects.showHeal(cardId, healed));
            }
        }

        // Damage enemies in opposing column (ignore shields)
        for (const r of enemyRows) {
            const rowObj = window.__ow_getRow?.(r);
            const cardId = rowObj?.cardIds?.[colIndex];
            if (!cardId) continue;
            const card = window.__ow_getCard?.(cardId);
            if (!card || card.health <= 0) continue;
            dealDamage(cardId, r, 2, true, playerHeroId);
            effectsBus.publish(Effects.showDamage(cardId, 2));
        }

        try { playAudioByKey('moira-ultimate-resolve'); } catch {}
        clearToast();
    } catch (e) {
        console.error('Moira ultimate error:', e);
        showToast('Moira ultimate failed');
        setTimeout(() => clearToast(), 1500);
    }
}

export default { onDraw, onEnter, onUltimate };


