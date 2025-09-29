import { selectCardTarget } from '../engine/targeting';
import { dealDamage } from '../engine/damageBus';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { playAudioByKey } from '../../assets/imageImports';
import effectsBus, { Effects } from '../engine/effectsBus';

// Biotic Field - Heal all allies in the same row by 1 health
export async function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    // Play enter sound (no ability1 sound needed)
    try {
        playAudioByKey('soldier-enter');
    } catch {}
    
    // Get all allies in the same row
    const row = window.__ow_getRow?.(rowId);
    if (!row || !row.cardIds) {
        console.log('Soldier: No row or cardIds found');
        return;
    }
    
    const alliesInRow = row.cardIds.filter(cardId => {
        const card = window.__ow_getCard?.(cardId);
        if (card && card.turret === true) {
            console.log(`Soldier: Skipping turret ${cardId} - turrets cannot be healed`);
            return false;
        }
        return card && card.health > 0 && card.health < card.maxHealth; // Only heal damaged allies
    });
    
    if (alliesInRow.length === 0) {
        showToast('Soldier: No damaged allies to heal');
        setTimeout(() => clearToast(), 2000);
        return;
    }
    
    // Heal each damaged ally by 1 health
    for (const cardId of alliesInRow) {
        const card = window.__ow_getCard?.(cardId);
        if (card) {
            const newHealth = Math.min(card.health + 1, card.maxHealth);
            const healingAmount = newHealth - card.health;
            
            if (healingAmount > 0) {
                window.__ow_setCardHealth?.(cardId, newHealth);
                effectsBus.publish(Effects.showHeal(cardId, healingAmount));
                console.log(`Soldier: Healed ${cardId} by ${healingAmount} (${card.health} → ${newHealth})`);
            }
        }
    }
    
    showToast(`Soldier: Biotic Field healed ${alliesInRow.length} allies`);
    setTimeout(() => clearToast(), 2000);
}

// Tactical Visor - Deal fixed damage to 3 enemies (3, 2, 1 damage)
export async function onUltimate({ playerHeroId, rowId, cost }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    // Play ultimate sound
    try {
        playAudioByKey('soldier-ultimate');
    } catch {}
    
    showToast('Soldier: Select first target for Tactical Visor (3 damage)');
    
    const targets = [];
    const damageAmounts = [3, 2, 1];
    
    try {
        // Select up to 3 targets
        for (let i = 0; i < 3; i++) {
            const target = await selectCardTarget();
            if (!target) {
                // Right-click cancel - end early
                break;
            }
            
            // Check if target is already selected
            if (targets.some(t => t.cardId === target.cardId)) {
                showToast('Soldier: Target already selected, choose a different enemy');
                setTimeout(() => clearToast(), 2000);
                i--; // Retry this selection
                continue;
            }
            
            // Check if target is enemy
            const targetPlayerNum = parseInt(target.cardId[0]);
            const isEnemy = targetPlayerNum !== playerNum;
            
            if (!isEnemy) {
                showToast('Soldier: Can only target enemies');
                setTimeout(() => clearToast(), 2000);
                i--; // Retry this selection
                continue;
            }
            
            targets.push(target);
            
            if (i < 2) { // Not the last target
                showToast(`Soldier: Select target ${i + 2} for Tactical Visor (${damageAmounts[i + 1]} damage)`);
            }
        }
        
        clearToast();
        
        if (targets.length === 0) {
            showToast('Soldier: Tactical Visor cancelled');
            setTimeout(() => clearToast(), 2000);
            return;
        }
        
        // Play ultimate resolve sound
        try {
            playAudioByKey('soldier-ultimate-resolve');
        } catch {}
        
        // Deal fixed damage to each target
        for (let i = 0; i < targets.length; i++) {
            const target = targets[i];
            const damage = damageAmounts[i];
            
            // Normal damage (respects shields and modifiers)
            dealDamage(target.cardId, target.rowId, damage, false, playerHeroId, false);
            effectsBus.publish(Effects.showDamage(target.cardId, damage));
            
            console.log(`Soldier: Tactical Visor dealt ${damage} fixed damage to ${target.cardId}`);
        }
        
        showToast(`Soldier: Tactical Visor hit ${targets.length} enemies`);
        setTimeout(() => clearToast(), 2000);
        
    } catch (error) {
        console.log('Soldier Tactical Visor error:', error);
        clearToast();
    }
}

export default { onEnter, onUltimate };
