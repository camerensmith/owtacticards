import { selectRowTarget } from '../engine/targeting';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';
import { playAudioByKey } from '../../assets/imageImports';

// Spike Guard — passive on enter: reflect 1 fixed damage to direct attackers
export function onEnter({ playerHeroId, rowId }) {
    try { playAudioByKey('hazard-enter'); } catch {}

    // Mark Hazard with a spike-guard effect for detection in damageBus
    window.__ow_appendCardEffect?.(playerHeroId, {
        id: 'spike-guard',
        hero: 'hazard',
        type: 'retaliate',
        sourceCardId: playerHeroId,
        sourceRowId: rowId,
        tooltip: 'Spike Guard: When directly targeted, attacker takes 1 fixed damage',
        visual: 'hazard-icon'
    });
}

// Downpour (3): Deal 1 damage to all enemies ignoring shields
export async function onUltimate({ playerHeroId, rowId, cost }) {
    const playerNum = parseInt(playerHeroId[0]);
    try { playAudioByKey('hazard-ultimate'); } catch {}

    // Allow user to pick an enemy row for UX consistency, but damage is global enemy-wide per spec wording
    // The spec says: Deal 1 to all enemies, ignoring shields.
    // If future variants need row-targeting, adjust here.

    const enemyPlayer = playerNum === 1 ? 2 : 1;
    const enemyRows = [`${enemyPlayer}f`, `${enemyPlayer}m`, `${enemyPlayer}b`];
    let enemiesHit = 0;

    for (const erow of enemyRows) {
        const row = window.__ow_getRow?.(erow);
        if (!row || !row.cardIds) continue;
        for (const cid of row.cardIds) {
            const card = window.__ow_getCard?.(cid);
            if (card && card.health > 0) {
                dealDamage(cid, erow, 1, true, playerHeroId); // ignoreShields = true
                try { effectsBus.publish(Effects.showDamage(cid, 1)); } catch {}
                enemiesHit++;
            }
        }
    }

    // No resolve sound; ultimate resolves immediately
    showToast(`Hazard: Downpour hit ${enemiesHit} enemies`);
    setTimeout(() => clearToast(), 2000);
}

export function onDeath({ playerHeroId }) {
    // Cleanup spike-guard effect if present
    window.__ow_removeCardEffect?.(playerHeroId, 'spike-guard');
}

export default { onEnter, onUltimate, onDeath };

