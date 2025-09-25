import { playAudioByKey } from '../../assets/imageImports';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { selectCardTarget, selectRowTarget } from '../engine/targeting';
import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';

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

    showToast('Hanzo: Select enemy row for Sonic Arrow token');

    try {
        const target = await selectRowTarget();
        if (target) {
            const targetRowId = target.rowId;
            
            // Add Hanzo token effect to the target row
            const hanzoTokenEffect = {
                id: 'hanzo-token',
                hero: 'hanzo',
                type: 'damage-reduction',
                sourceCardId: playerHeroId,
                sourceRowId: rowId,
                tooltip: 'Sonic Arrow: Enemy damage in this row is reduced by 1',
                visual: 'hanzo-icon',
                value: 1 // Damage reduction amount
            };
            
            window.__ow_appendRowEffect?.(targetRowId, 'enemyEffects', hanzoTokenEffect);

            // Play ability sound after token placement
            try {
                playAudioByKey('hanzo-ability1');
            } catch {}

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

    try {
        playAudioByKey('hanzo-ultimate');
    } catch {}

    showToast('Hanzo: Select target enemy for Dragonstrike');

    try {
        const target = await selectCardTarget();
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

            // Determine enemy player and their rows (front to back order)
            const enemyPlayer = playerNum === 1 ? 2 : 1;
            const enemyRows = [`${enemyPlayer}f`, `${enemyPlayer}m`, `${enemyPlayer}b`];
            
            let targetsHit = 0;
            const maxTargets = 3;

            // Deal 3 damage to enemies in the same column (front to back)
            for (const enemyRowId of enemyRows) {
                if (targetsHit >= maxTargets) break;
                
                const enemyRow = window.__ow_getRow?.(enemyRowId);
                if (!enemyRow || !enemyRow.cardIds[columnIndex]) continue;
                
                const enemyCardId = enemyRow.cardIds[columnIndex];
                const enemyCard = window.__ow_getCard?.(enemyCardId);
                
                if (enemyCard && enemyCard.health > 0) {
                    dealDamage(enemyCardId, enemyRowId, 3, false, playerHeroId);
                    effectsBus.publish(Effects.showDamage(enemyCardId, 3));
                    targetsHit++;
                }
            }

            // Play ability sound after damage
            try {
                playAudioByKey('hanzo-ability1');
            } catch {}

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
