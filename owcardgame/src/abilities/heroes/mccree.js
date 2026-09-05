import { selectRowTarget } from '../engine/targeting';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { dealDamage } from '../engine/damageBus';
import { playAudioByKey } from '../../assets/imageImports';
import effectsBus, { Effects } from '../engine/effectsBus';
import { spreadDamageEvenly } from '../../game/abilityRules';
import { deadeyeHoverPreview } from '../../game/targetPreview';
import { FLASHBANG, PALETTE } from '../../presentation/pixi/fxConfig';

const FLASH_YELLOW = PALETTE.amber;

export async function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);

    try {
        playAudioByKey('mccree-enter');
    } catch {}

    // Returned, not dropped: the caller awaits onEnter, and letting it resolve
    // early ends the AI's turn while the ability is still resolving.
    return handleFlashbang(playerHeroId, rowId, playerNum);
}

async function handleFlashbang(playerHeroId, rowId, playerNum) {
    try {
        // AI: pick enemy row with most living enemies
        if (window.__ow_aiTriggering || window.__ow_isAITurn) {
            const enemyPlayer = playerNum === 1 ? 2 : 1;
            const enemyRows = [`${enemyPlayer}f`, `${enemyPlayer}m`, `${enemyPlayer}b`];
            let bestRow = enemyRows[0];
            let maxCount = -1;
            for (const r of enemyRows) {
                const rowData = window.__ow_getRow?.(r);
                const living = rowData?.cardIds?.filter(cid => (window.__ow_getCard?.(cid)?.health || 0) > 0) || [];
                if (living.length > maxCount) { maxCount = living.length; bestRow = r; }
            }
            const targetRowData = window.__ow_getRow?.(bestRow);
            if (targetRowData) {
                const livingEnemies = targetRowData.cardIds.filter(cid => (window.__ow_getCard?.(cid)?.health || 0) > 0);
                const currentSynergy = targetRowData.synergy || 0;
                const synergyToRemove = Math.min(livingEnemies.length, currentSynergy);
                if (synergyToRemove > 0) {
                    window.__ow_updateSynergy?.(bestRow, -synergyToRemove);
                }
                try { playAudioByKey('mccree-ability1'); } catch {}
                showToast(`McCree AI: Flashbang! Removed ${synergyToRemove} synergy from ${bestRow}`);
                setTimeout(() => clearToast(), 2000);
            }
            return;
        }

        showToast('McCree: Select an enemy row for Flashbang');
        
        const targetRow = await selectRowTarget({ isDamage: true });
        if (!targetRow) {
            clearToast();
            return;
        }
        
        const targetPlayerNum = parseInt(targetRow.rowId[0]);
        const isEnemyRow = targetPlayerNum !== playerNum;

        if (isEnemyRow) {
            // Flashbang snaps into the row and pops yellow.
            try { effectsBus.publish(Effects.grenade(playerHeroId, targetRow.rowId, FLASH_YELLOW, FLASHBANG)); } catch {}
            try { playAudioByKey('mccree-ability1'); } catch {}
        }

        if (!isEnemyRow) {
            showToast('McCree: Flashbang can only target enemy rows');
            setTimeout(() => clearToast(), 1500);
            return;
        }
        
        // Count living enemies in the target row
        const targetRowData = window.__ow_getRow?.(targetRow.rowId);
        if (!targetRowData) {
            showToast('McCree: Target row not found');
            setTimeout(() => clearToast(), 1500);
            return;
        }
        
        const livingEnemies = targetRowData.cardIds.filter(cardId => {
            const card = window.__ow_getCard?.(cardId);
            return card && card.health > 0;
        });
        
        const enemyCount = livingEnemies.length;
        
        if (enemyCount === 0) {
            showToast('McCree: No living enemies in target row');
            setTimeout(() => clearToast(), 1500);
            return;
        }
        
        // Remove synergy points (minimum 0)
        const currentSynergy = targetRowData.synergy || 0;
        const synergyToRemove = Math.min(enemyCount, currentSynergy);
        
        console.log(`McCree Flashbang Debug:`);
        console.log(`- Target row: ${targetRow.rowId}`);
        console.log(`- Enemy count: ${enemyCount}`);
        console.log(`- Current synergy: ${currentSynergy}`);
        console.log(`- Synergy to remove: ${synergyToRemove}`);
        
        if (synergyToRemove > 0) {
            console.log(`McCree: Calling updateSynergy with rowId=${targetRow.rowId}, delta=${-synergyToRemove}`);
            window.__ow_updateSynergy?.(targetRow.rowId, -synergyToRemove);
        } else {
            console.log(`McCree: No synergy to remove (current: ${currentSynergy}, enemies: ${enemyCount})`);
        }
        
        showToast(`McCree: Flashbang! Removed ${synergyToRemove} synergy from ${targetRow.rowId}`);
        setTimeout(() => clearToast(), 2000);
        
    } catch (error) {
        console.error('McCree Flashbang error:', error);
        showToast('McCree: Flashbang failed');
        setTimeout(() => clearToast(), 1500);
    }
}

function applyDeadEye(livingEnemies, rowId, playerHeroId) {
    const amounts = spreadDamageEvenly(9, livingEnemies.length);
    try {
        playAudioByKey('mccree-ultimate-firing');
    } catch {}
    livingEnemies.forEach((cardId, index) => {
        const damage = amounts[index];
        if (damage > 0) {
            // Deadeye is a pistol, not a laser: one shot per name on the list.
            try { effectsBus.publish(Effects.bullet(playerHeroId, cardId, 1)); } catch {}
            dealDamage(cardId, rowId, damage, false, playerHeroId, false, { skipProjectileFx: true });
            effectsBus.publish(Effects.showDamage(cardId, damage));
        }
    });
    return amounts;
}

export async function onUltimate({ playerHeroId, rowId, cost }) {
    try {
        const playerNum = parseInt(playerHeroId[0]);

        // Play ultimate activation sound
        try {
            playAudioByKey('mccree-ultimate');
        } catch {}

        // For AI, automatically select the enemy row with the most enemies
        if ((window.__ow_aiTriggering || window.__ow_isAITurn) && (typeof window.__ow_getPlayerTurn !== 'function' || window.__ow_getPlayerTurn() === 2)) {
            const enemyPlayer = playerNum === 1 ? 2 : 1;
            const enemyRows = [`${enemyPlayer}f`, `${enemyPlayer}m`, `${enemyPlayer}b`];
            
            // Find the enemy row with the most living enemies
            let bestRow = enemyRows[0];
            let maxLivingEnemies = 0;
            
            for (const enemyRowId of enemyRows) {
                const row = window.__ow_getRow?.(enemyRowId);
                let livingEnemies = 0;
                if (row && row.cardIds) {
                    for (const cardId of row.cardIds) {
                        const card = window.__ow_getCard?.(cardId);
                        if (card && card.health > 0) {
                            livingEnemies++;
                        }
                    }
                }
                if (livingEnemies > maxLivingEnemies) {
                    maxLivingEnemies = livingEnemies;
                    bestRow = enemyRowId;
                }
            }
            
            console.log(`McCree AI: Selected row ${bestRow} with ${maxLivingEnemies} living enemies`);

            const targetRow = window.__ow_getRow?.(bestRow);
            const livingEnemies = (targetRow?.cardIds || []).filter((cardId) => {
                const card = window.__ow_getCard?.(cardId);
                return card && card.health > 0;
            });
            if (livingEnemies.length === 0) {
                showToast('McCree AI: No living enemies');
                setTimeout(() => clearToast(), 1500);
                return false;
            }
            applyDeadEye(livingEnemies, bestRow, playerHeroId);

            showToast(`McCree AI: Dead Eye hit ${livingEnemies.length} enemies in ${bestRow}`);
            setTimeout(() => clearToast(), 2000);
            return true;
        }

        showToast('McCree: Dead Eye - Select an enemy row');

        const targetRow = await selectRowTarget({
            isDamage: true,
            fromCardId: playerHeroId,
            preview: (hover, ctx) => deadeyeHoverPreview(hover, {
                playerNum,
                fromCardId: playerHeroId,
                getRow: ctx.getRow,
                getCard: ctx.getCard,
            }),
        });
        if (!targetRow) {
            clearToast();
            return false;
        }
        
        const targetPlayerNum = parseInt(targetRow.rowId[0]);
        const isEnemyRow = targetPlayerNum !== playerNum;
        
        if (!isEnemyRow) {
            showToast('McCree: Dead Eye can only target enemy rows');
            setTimeout(() => clearToast(), 1500);
            return false;
        }
        
        // Get living enemies in the target row
        const targetRowData = window.__ow_getRow?.(targetRow.rowId);
        if (!targetRowData) {
            showToast('McCree: Target row not found');
            setTimeout(() => clearToast(), 1500);
            return false;
        }
        
        const livingEnemies = targetRowData.cardIds.filter(cardId => {
            const card = window.__ow_getCard?.(cardId);
            return card && card.health > 0;
        });
        
        if (livingEnemies.length === 0) {
            showToast('McCree: No living enemies in target row');
            setTimeout(() => clearToast(), 1500);
            return false;
        }
        
        const amounts = applyDeadEye(livingEnemies, targetRow.rowId, playerHeroId);
        const damageBreakdown = amounts.join('-');
        showToast(`McCree: Dead Eye! Dealt ${damageBreakdown} damage to ${livingEnemies.length} enemies`);
        setTimeout(() => clearToast(), 2000);
        
    } catch (error) {
        console.error('McCree Dead Eye error:', error);
        showToast('McCree: Dead Eye failed');
        setTimeout(() => clearToast(), 1500);
        return false;
    }
}

export default { onEnter, onUltimate };
