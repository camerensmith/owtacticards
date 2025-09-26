import { selectRowTarget } from '../engine/targeting';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { dealDamage } from '../engine/damageBus';
import { playAudioByKey } from '../../assets/imageImports';

export function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    try {
        playAudioByKey('mccree-enter');
    } catch {}
    
    handleFlashbang(playerHeroId, rowId, playerNum);
}

async function handleFlashbang(playerHeroId, rowId, playerNum) {
    try {
        showToast('McCree: Select an enemy row for Flashbang');
        
        const targetRow = await selectRowTarget();
        if (!targetRow) {
            clearToast();
            return;
        }
        
        const targetPlayerNum = parseInt(targetRow.rowId[0]);
        const isEnemyRow = targetPlayerNum !== playerNum;
        
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
        
        // Play ability sound
        try {
            playAudioByKey('mccree-ability1');
        } catch {}
        
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

export async function onUltimate({ playerHeroId, rowId, cost }) {
    try {
        const playerNum = parseInt(playerHeroId[0]);
        
        // Play ultimate activation sound
        try {
            playAudioByKey('mccree-ultimate');
        } catch {}
        
        showToast('McCree: Dead Eye - Select an enemy row');
        
        const targetRow = await selectRowTarget();
        if (!targetRow) {
            clearToast();
            return;
        }
        
        const targetPlayerNum = parseInt(targetRow.rowId[0]);
        const isEnemyRow = targetPlayerNum !== playerNum;
        
        if (!isEnemyRow) {
            showToast('McCree: Dead Eye can only target enemy rows');
            setTimeout(() => clearToast(), 1500);
            return;
        }
        
        // Get living enemies in the target row
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
        
        if (livingEnemies.length === 0) {
            showToast('McCree: No living enemies in target row');
            setTimeout(() => clearToast(), 1500);
            return;
        }
        
        // Calculate damage distribution
        const totalDamage = 7;
        const enemyCount = livingEnemies.length;
        const baseDamage = Math.floor(totalDamage / enemyCount);
        const remainder = totalDamage % enemyCount;
        
        // Distribute damage evenly
        const damageDistribution = livingEnemies.map((cardId, index) => {
            const damage = baseDamage + (index < remainder ? 1 : 0);
            return { cardId, damage };
        });
        
        // Play firing sound
        try {
            playAudioByKey('mccree-ultimate-firing');
        } catch {}
        
        // Apply damage to each enemy
        damageDistribution.forEach(({ cardId, damage }) => {
            if (damage > 0) {
                dealDamage(cardId, targetRow.rowId, damage, false, playerHeroId);
            }
        });
        
        const damageBreakdown = damageDistribution.map(({ damage }) => damage).join('-');
        showToast(`McCree: Dead Eye! Dealt ${damageBreakdown} damage to ${enemyCount} enemies`);
        setTimeout(() => clearToast(), 2000);
        
    } catch (error) {
        console.error('McCree Dead Eye error:', error);
        showToast('McCree: Dead Eye failed');
        setTimeout(() => clearToast(), 1500);
    }
}

export default { onEnter, onUltimate };
