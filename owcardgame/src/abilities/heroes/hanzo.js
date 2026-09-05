import { playAudioByKey } from '../../assets/imageImports';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { selectCardTarget, selectRowTarget } from '../engine/targeting';
import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';
import { dragonstrikeHitMs } from '../../presentation/pixi/fxMath';

/** The clip has a run-up; the dragon should arrive with the roar, not before it. */
const DRAGONSTRIKE_AUDIO_START_MS = 1700;

const HANZO_TOKEN = {
    id: 'hanzo-token',
    hero: 'hanzo',
    type: 'damage-reduction',
    tooltip: 'Sonic Arrow: Enemy damage in this row is reduced by 1',
    visual: 'hanzo-icon',
    value: 1, // Damage reduction amount
};

/** Places the token and fires the arrow that carries it. */
function placeSonicArrow(playerHeroId, rowId, targetRowId) {
    window.__ow_appendRowEffect?.(targetRowId, 'enemyEffects', {
        ...HANZO_TOKEN,
        sourceCardId: playerHeroId,
        sourceRowId: rowId,
    });
    // The sonar that breathes on the row afterwards is read from this token,
    // so it lasts exactly as long as the token does.
    try { effectsBus.publish(Effects.sonicArrow(playerHeroId, targetRowId)); } catch {}
    try { playAudioByKey('hanzo-ability1'); } catch {}
}

/**
 * Dragonstrike's damage.
 *
 * The dragon takes its time crossing, so each row is struck as the helix
 * reaches it rather than everything resolving the instant it is loosed.
 */
async function strikeColumn(playerHeroId, enemyRows, columnIndex) {
    const maxTargets = 3;
    const strikes = [];
    for (const enemyRowId of enemyRows) {
        if (strikes.length >= maxTargets) break;
        const enemyRow = window.__ow_getRow?.(enemyRowId);
        const enemyCardId = enemyRow?.cardIds?.[columnIndex];
        if (!enemyCardId) continue;
        const enemyCard = window.__ow_getCard?.(enemyCardId);
        if (enemyCard && enemyCard.health > 0) {
            strikes.push({ cardId: enemyCardId, rowId: enemyRowId });
        }
    }

    const enemyPlayerNum = parseInt(String(enemyRows[0] || '')[0], 10);
    try {
        effectsBus.publish(Effects.dragonstrike(playerHeroId, enemyPlayerNum, columnIndex));
    } catch {}

    await Promise.all(strikes.map((strike, index) => new Promise((resolve) => {
        setTimeout(() => {
            const card = window.__ow_getCard?.(strike.cardId);
            if (card && card.health > 0) {
                // The helix is the projectile; the damage bus must not add one.
                dealDamage(
                    strike.cardId, strike.rowId, 3,
                    false, playerHeroId, false, { skipProjectileFx: true },
                );
                try { effectsBus.publish(Effects.showDamage(strike.cardId, 3)); } catch {}
            }
            resolve();
        }, dragonstrikeHitMs(index));
    })));

    return strikes.length;
}

// Hanzo has no onDraw ability
export function onDraw({ playerHeroId }) {
    return;
}

// Sonic Arrow — Place the Hanzo Token next to target enemy row. When enemy Heroes in this row deal damage, damage −1.
export async function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);

    try {
        playAudioByKey('hanzo-enter');
    } catch {}

    // For AI, automatically select a random enemy row
    if (window.__ow_aiTriggering || window.__ow_isAITurn) {
        const enemyPlayer = playerNum === 1 ? 2 : 1;
        const enemyRows = [`${enemyPlayer}f`, `${enemyPlayer}m`, `${enemyPlayer}b`];

        // Select random enemy row
        const randomRow = enemyRows[Math.floor(Math.random() * enemyRows.length)];
        placeSonicArrow(playerHeroId, rowId, randomRow);

        showToast(`Hanzo AI: Sonic Arrow token placed on ${randomRow} - enemy damage reduced by 1`);
        setTimeout(() => clearToast(), 2000);
        return;
    }

    showToast('Hanzo: Select enemy row for Sonic Arrow token');

    try {
        const target = await selectRowTarget();
        if (target) {
            placeSonicArrow(playerHeroId, rowId, target.rowId);

            showToast('Hanzo: Sonic Arrow token placed - enemy damage reduced by 1');
            setTimeout(() => clearToast(), 2000);
        } else {
            showToast('Hanzo ability cancelled');
            setTimeout(() => clearToast(), 1500);
        }
    } catch (error) {
        console.error('Hanzo Sonic Arrow error:', error);
        showToast('Hanzo ability cancelled');
        setTimeout(() => clearToast(), 1500);
    }
}

// Dragonstrike (3): Deal 3 damage to all enemies in target column
export async function onUltimate({ playerHeroId, rowId, cost }) {
    const playerNum = parseInt(playerHeroId[0]);
    const enemyPlayer = playerNum === 1 ? 2 : 1;
    const enemyRows = [`${enemyPlayer}f`, `${enemyPlayer}m`, `${enemyPlayer}b`];

    // For AI, automatically select a random enemy hero
    if (window.__ow_aiTriggering || window.__ow_isAITurn) {
        // Find all living enemy heroes
        const livingEnemies = [];
        for (const enemyRowId of enemyRows) {
            const row = window.__ow_getRow?.(enemyRowId);
            if (row && row.cardIds) {
                for (const cardId of row.cardIds) {
                    const card = window.__ow_getCard?.(cardId);
                    if (card && card.health > 0) {
                        livingEnemies.push({ cardId, rowId: enemyRowId });
                    }
                }
            }
        }

        if (livingEnemies.length === 0) {
            showToast('Hanzo AI: No enemies to target');
            setTimeout(() => clearToast(), 2000);
            return;
        }

        // Select random enemy
        const randomEnemy = livingEnemies[Math.floor(Math.random() * livingEnemies.length)];
        console.log('Hanzo AI Ultimate: Selected random enemy:', randomEnemy.cardId);

        // Get the column index from the target's position
        const targetRow = window.__ow_getRow?.(randomEnemy.rowId);
        if (!targetRow) {
            showToast('Hanzo AI: Invalid target row');
            setTimeout(() => clearToast(), 1500);
            return;
        }

        const columnIndex = targetRow.cardIds.indexOf(randomEnemy.cardId);
        if (columnIndex === -1) {
            showToast('Hanzo AI: Could not determine column position');
            setTimeout(() => clearToast(), 1500);
            return;
        }

        try {
            playAudioByKey('hanzo-ultimate', { startAtMs: DRAGONSTRIKE_AUDIO_START_MS });
        } catch {}

        const targetsHit = await strikeColumn(playerHeroId, enemyRows, columnIndex);

        showToast(`Hanzo AI: Dragonstrike hit ${targetsHit} enemies in column`);
        setTimeout(() => clearToast(), 2000);
        return;
    }

    showToast('Hanzo: Select target enemy for Dragonstrike');

    try {
        const target = await selectCardTarget({
            isDamage: true,
            fromCardId: playerHeroId,
            previewShape: 'column',
        });
        if (target) {
            const targetCard = window.__ow_getCard?.(target.cardId);
            if (!targetCard) {
                showToast('Hanzo: Invalid target');
                setTimeout(() => clearToast(), 1500);
                return;
            }

            // Get the column index from the target's position
            const targetRow = window.__ow_getRow?.(target.rowId);
            if (!targetRow) {
                showToast('Hanzo: Invalid target row');
                setTimeout(() => clearToast(), 1500);
                return;
            }

            const columnIndex = targetRow.cardIds.indexOf(target.cardId);
            if (columnIndex === -1) {
                showToast('Hanzo: Could not determine column position');
                setTimeout(() => clearToast(), 1500);
                return;
            }

            try {
                playAudioByKey('hanzo-ultimate', { startAtMs: DRAGONSTRIKE_AUDIO_START_MS });
            } catch {}

            const targetsHit = await strikeColumn(playerHeroId, enemyRows, columnIndex);

            showToast(`Hanzo: Dragonstrike hit ${targetsHit} enemies in column`);
            setTimeout(() => clearToast(), 2000);
        } else {
            showToast('Hanzo ultimate cancelled');
            setTimeout(() => clearToast(), 1500);
        }
    } catch (error) {
        console.error('Hanzo Dragonstrike error:', error);
        showToast('Hanzo ultimate cancelled');
        setTimeout(() => clearToast(), 1500);
    }
}

// Clean up Hanzo token when Hanzo dies
export function onDeath({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);

    try {
        // Remove Hanzo token from all enemy rows
        const enemyPlayer = playerNum === 1 ? 2 : 1;
        const enemyRows = [`${enemyPlayer}f`, `${enemyPlayer}m`, `${enemyPlayer}b`];

        for (const enemyRowId of enemyRows) {
            window.__ow_removeRowEffect?.(enemyRowId, 'enemyEffects', 'hanzo-token');
        }

        console.log(`${playerHeroId} died - Hanzo token effects cleaned up`);
    } catch (error) {
        console.error('Hanzo token cleanup error:', error);
    }
}

export default { onEnter, onUltimate, onDraw, onDeath };
