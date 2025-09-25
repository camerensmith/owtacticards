import { playAudioByKey } from '../../assets/imageImports';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { selectCardTarget } from '../engine/targeting';
import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';

// Genji has no onDraw ability
export function onDraw({ playerHeroId }) {
    return;
}

// Shuriken — Deal 1 damage to up to three enemy heroes in target column
export async function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);

    try {
        playAudioByKey('genji-enter');
    } catch {}

    showToast('Genji: Select target enemy for Shuriken column attack');

    try {
        const target = await selectCardTarget();
        if (target) {
            const targetCard = window.__ow_getCard?.(target.cardId);
            if (!targetCard) {
                showToast('Genji: Invalid target');
                setTimeout(() => clearToast(), 1500);
                return;
            }

            // Get the column index from the target's position
            const targetRow = window.__ow_getRow?.(target.rowId);
            if (!targetRow) {
                showToast('Genji: Invalid target row');
                setTimeout(() => clearToast(), 1500);
                return;
            }

            const columnIndex = targetRow.cardIds.indexOf(target.cardId);
            if (columnIndex === -1) {
                showToast('Genji: Could not determine column position');
                setTimeout(() => clearToast(), 1500);
                return;
            }

            // Determine enemy player and their rows
            const enemyPlayer = playerNum === 1 ? 2 : 1;
            const enemyRows = [`${enemyPlayer}f`, `${enemyPlayer}m`, `${enemyPlayer}b`];
            
            let targetsHit = 0;
            const maxTargets = 3;

            // Deal 1 damage to enemies in the same column across all enemy rows
            for (const enemyRowId of enemyRows) {
                if (targetsHit >= maxTargets) break;
                
                const enemyRow = window.__ow_getRow?.(enemyRowId);
                if (!enemyRow || !enemyRow.cardIds[columnIndex]) continue;
                
                const enemyCardId = enemyRow.cardIds[columnIndex];
                const enemyCard = window.__ow_getCard?.(enemyCardId);
                
                if (enemyCard && enemyCard.health > 0) {
                    dealDamage(enemyCardId, enemyRowId, 1);
                    effectsBus.publish(Effects.showDamage(enemyCardId, 1));
                    targetsHit++;
                }
            }

            // Play ability sound after damage
            try {
                playAudioByKey('genji-ability1');
            } catch {}

            showToast(`Genji: Shuriken hit ${targetsHit} enemies in column`);
            setTimeout(() => clearToast(), 2000);
        } else {
            showToast('Genji ability cancelled');
            setTimeout(() => clearToast(), 1500);
        }
    } catch (error) {
        console.error('Genji Shuriken error:', error);
        showToast('Genji ability cancelled');
        setTimeout(() => clearToast(), 1500);
    }
}

// Dragon Blade (3): Defeat one damaged enemy Hero
export async function onUltimate({ playerHeroId, rowId, cost }) {
    const playerNum = parseInt(playerHeroId[0]);

    try {
        playAudioByKey('genji-ultimate');
    } catch {}

    showToast('Genji: Select damaged enemy for Dragon Blade');

    try {
        const target = await selectCardTarget();
        if (target) {
            const targetCard = window.__ow_getCard?.(target.cardId);
            if (!targetCard) {
                showToast('Genji: Invalid target');
                setTimeout(() => clearToast(), 1500);
                return;
            }

            // Check if target is damaged (current health < max health)
            const maxHealth = window.__ow_getMaxHealth?.(target.cardId) || targetCard.maxHealth || targetCard.health;
            const currentHealth = targetCard.health || 0;
            
            if (currentHealth >= maxHealth) {
                showToast('Genji: Target is not damaged - Dragon Blade does nothing');
                setTimeout(() => clearToast(), 2000);
                return;
            }

            // Defeat the target (set health to 0, ignores shields)
            dealDamage(target.cardId, target.rowId, currentHealth, true); // ignoreShields = true
            effectsBus.publish(Effects.showDamage(target.cardId, currentHealth));

            // Play ultimate strike resolve sound after execution
            try {
                playAudioByKey('genji-ultimate-strike-resolve');
            } catch {}

            showToast(`Genji: Dragon Blade defeated ${targetCard.name || 'enemy'}`);
            setTimeout(() => clearToast(), 2000);
        } else {
            showToast('Genji ultimate cancelled');
            setTimeout(() => clearToast(), 1500);
        }
    } catch (error) {
        console.error('Genji Dragon Blade error:', error);
        showToast('Genji ultimate cancelled');
        setTimeout(() => clearToast(), 1500);
    }
}

export default { onEnter, onUltimate, onDraw };
