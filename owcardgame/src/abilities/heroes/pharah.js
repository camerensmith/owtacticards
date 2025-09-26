import { dealDamage } from '../engine/damageBus';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { selectCardTarget } from '../engine/targeting';
import { playAudioByKey } from '../../assets/imageImports';

// Concussive Blast - onEnter
export async function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    try { playAudioByKey('pharah-enter'); } catch {}
    
    showToast('Pharah: Select target enemy for Concussive Blast');
    
    try {
        const target = await selectCardTarget();
        if (!target) { clearToast(); return; }
        
        const targetCard = window.__ow_getCard?.(target.cardId);
        const targetPlayer = parseInt(target.cardId[0]);
        const isEnemy = targetPlayer !== playerNum;
        const isTurret = targetCard?.id === 'turret';
        
        // Validate target (enemy, not turret, alive)
        if (!isEnemy || isTurret || !targetCard || targetCard.health <= 0) {
            showToast('Pharah: Invalid target (must be living enemy, not turret)');
            setTimeout(() => clearToast(), 1500);
            return;
        }
        
        // Store original row for synergy removal
        const originalRowId = target.rowId;
        const originalRow = window.__ow_getRow?.(originalRowId);
        
        // Remove 2 synergy from target's starting row (before movement)
        if (originalRow && originalRow.synergy > 0) {
            const synergyToRemove = Math.min(2, originalRow.synergy);
            window.__ow_updateSynergy?.(originalRowId, -synergyToRemove);
        }
        
        // Attempt to move target back one row
        const currentRowPosition = target.rowId[1]; // 'f', 'm', or 'b'
        let destinationRowId = null;
        
        if (currentRowPosition === 'f') {
            destinationRowId = target.rowId[0] + 'm'; // Front → Middle
        } else if (currentRowPosition === 'm') {
            destinationRowId = target.rowId[0] + 'b'; // Middle → Back
        }
        // Back stays back (no movement)
        
        // Check if destination row is full and attempt movement
        if (destinationRowId && !window.__ow_isRowFull?.(destinationRowId)) {
            window.__ow_moveCardToRow?.(target.cardId, destinationRowId);
        }
        
        // Play ability sound on resolve
        try { playAudioByKey('pharah-ability1'); } catch {}
        
        clearToast();
        showToast('Pharah: Concussive Blast resolved!');
        setTimeout(() => clearToast(), 2000);
        
    } catch (error) {
        console.error('Pharah Concussive Blast error:', error);
        showToast('Pharah ability cancelled');
        setTimeout(() => clearToast(), 1500);
    }
}

// Barrage - Ultimate
export async function onUltimate({ playerHeroId, rowId, cost }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    // Play ultimate activation sound
    try { playAudioByKey('pharah-ultimate'); } catch {}
    
    // Get current synergy in the row (before cost deduction)
    const currentRow = window.__ow_getRow?.(rowId);
    const totalSynergy = currentRow?.synergy || 0;
    
    console.log(`Pharah Barrage - Total synergy before cost: ${totalSynergy}`);
    
    // Calculate damage: total synergy minus the 3 cost
    const damagePerTarget = Math.max(0, totalSynergy - cost);
    
    console.log(`Pharah Barrage - Damage per target: ${damagePerTarget} (${totalSynergy} - ${cost})`);
    
    // Consume all synergy for the ultimate (cost + remaining)
    if (totalSynergy > 0) {
        window.__ow_updateSynergy?.(rowId, -totalSynergy);
        console.log(`Pharah Barrage - Consumed all ${totalSynergy} synergy`);
    }
    
    showToast(`Pharah: Barrage - Select up to 3 enemies (${damagePerTarget} damage each)`);
    
    try {
        const targets = [];
        
        // Select up to 3 targets (can cancel early)
        for (let i = 0; i < 3; i++) {
            const targetNumber = i === 0 ? 'First' : i === 1 ? 'Second' : 'Final';
            showToast(`Pharah: Choose ${targetNumber} target (or right-click to finish with ${targets.length} targets)`);
            
            const target = await selectCardTarget();
            if (!target) {
                // Right-click or cancel - finish with current targets
                if (targets.length === 0) {
                    clearToast();
                    showToast('Pharah: Barrage cancelled - no targets selected');
                    setTimeout(() => clearToast(), 2000);
                    return;
                }
                break; // Exit loop with current targets
            }
            
            const targetCard = window.__ow_getCard?.(target.cardId);
            const targetPlayer = parseInt(target.cardId[0]);
            const isEnemy = targetPlayer !== playerNum;
            const isTurret = targetCard?.id === 'turret';
            
            // Validate target (enemy, not turret, alive)
            if (!isEnemy || isTurret || !targetCard || targetCard.health <= 0) {
                showToast('Pharah: Invalid target (must be living enemy, not turret)');
                setTimeout(() => clearToast(), 1500);
                i--; // Retry this target
                continue;
            }
            
            // Check for duplicate targets
            if (targets.some(t => t.cardId === target.cardId)) {
                showToast('Pharah: Cannot target the same enemy twice');
                setTimeout(() => clearToast(), 1500);
                i--; // Retry this target
                continue;
            }
            
            targets.push(target);
        }
        
        // Play ultimate resolve sound
        try { playAudioByKey('pharah-ultimate-resolve'); } catch {}
        
        // Deal damage to all selected targets
        for (const target of targets) {
            dealDamage(target.cardId, target.rowId, damagePerTarget, false, playerHeroId);
        }
        
        clearToast();
        showToast(`Pharah: Barrage dealt ${damagePerTarget} damage to ${targets.length} enemies!`);
        setTimeout(() => clearToast(), 2000);
        
    } catch (error) {
        console.error('Pharah Barrage error:', error);
        showToast('Pharah ultimate cancelled');
        setTimeout(() => clearToast(), 1500);
    }
}

export default {
    onEnter,
    onUltimate
};
