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
        // If AI is acting, auto-pick targets to avoid prompting human
        let enemyTarget;
        if (window.__ow_isAITurn || window.__ow_aiTriggering) {
            // Pick highest-health enemy on board
            const enemyRows = [ `${playerNum === 1 ? 2 : 1}f`, `${playerNum === 1 ? 2 : 1}m`, `${playerNum === 1 ? 2 : 1}b` ];
            const candidates = [];
            enemyRows.forEach(r => {
                const row = window.__ow_getRow?.(r);
                row?.cardIds?.forEach(id => {
                    const c = window.__ow_getCard?.(id);
                    if (c && c.health > 0 && c.id !== 'turret') candidates.push({ id, r, hp: c.health });
                });
            });
            candidates.sort((a,b)=>b.hp-a.hp);
            if (candidates.length > 0) {
                enemyTarget = { cardId: candidates[0].id, rowId: candidates[0].r };
            }
        } else {
            // Step 1: pick enemy first (human)
            showToast('Moira: Pick one ENEMY to siphon (ignores shields)');
            enemyTarget = await selectCardTarget();
            if (!enemyTarget) { clearToast(); return; }
        }

        if (!enemyTarget || !enemyTarget.cardId) {
            showToast('Moira: No valid enemy selected');
            setTimeout(() => clearToast(), 1500);
            clearToast();
            return;
        }

        // Validate enemy
        const enemyPlayer = parseInt(enemyTarget.cardId[0]);
        if (enemyPlayer === playerNum) {
            showToast('Moira: Must target an enemy!');
            setTimeout(() => clearToast(), 2000);
            return;
        }

        const enemyCard = window.__ow_getCard?.(enemyTarget.cardId);
        if (!enemyCard || enemyCard.health <= 0) {
            showToast('Moira: No valid enemy — ability failed');
            setTimeout(() => clearToast(), 1500);
            return;
        }

        // Deal 1 damage ignoring shields (Hanzo reduction may still apply via damageBus)
        dealDamage(enemyTarget.cardId, enemyTarget.rowId, 1, true, playerHeroId);
        effectsBus.publish(Effects.showDamage(enemyTarget.cardId, 1));

        // Step 2: pick ally to heal (turret cannot be healed)
        let allyTarget;
        if (window.__ow_isAITurn || window.__ow_aiTriggering) {
            // Pick most wounded ally
            const allyRows = [ `${playerNum}f`, `${playerNum}m`, `${playerNum}b` ];
            const candidates = [];
            allyRows.forEach(r => {
                const row = window.__ow_getRow?.(r);
                row?.cardIds?.forEach(id => {
                    const c = window.__ow_getCard?.(id);
                    if (c && c.health > 0 && c.id !== 'turret') {
                        const maxHp = c.maxHealth || window.__ow_getMaxHealth?.(id) || c.health;
                        const missing = Math.max(0, maxHp - c.health);
                        if (missing > 0) candidates.push({ id, r, missing });
                    }
                });
            });
            candidates.sort((a,b)=>b.missing-a.missing);
            if (candidates.length > 0) {
                allyTarget = { cardId: candidates[0].id, rowId: candidates[0].r };
            }
        } else {
            showToast('Moira: Pick one ALLY to heal 2');
            allyTarget = await selectCardTarget();
            if (!allyTarget) { clearToast(); return; }
        }

        if (!allyTarget || !allyTarget.cardId) {
            showToast('Moira: No valid ally selected');
            setTimeout(() => clearToast(), 1500);
            clearToast();
            return;
        }

        // Validate ally
        const allyPlayer = parseInt(allyTarget.cardId[0]);
        if (allyPlayer !== playerNum) {
            showToast('Moira: Must target an ally!');
            setTimeout(() => clearToast(), 2000);
            return;
        }

        const allyCard = window.__ow_getCard?.(allyTarget.cardId);
        const isTurret = allyCard?.id === 'turret' || allyCard?.turret === true;
        if (!allyCard || allyCard.health <= 0 || isTurret) {
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


