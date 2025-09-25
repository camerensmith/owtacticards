import { selectCardTarget } from '../engine/targeting';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { dealDamage } from '../engine/damageBus';
import { getAudioFile } from '../../assets/imageImports';
import effectsBus, { Effects } from '../engine/effectsBus';

// Helper function to play audio by key
function playAudioByKey(audioKey) {
    try {
        const audioFile = getAudioFile(audioKey);
        if (audioFile) {
            const audio = new Audio(audioFile);
            audio.play().catch(err => console.log('Audio play failed:', err));
        }
    } catch (error) {
        console.error(`Failed to play audio ${audioKey}:`, error);
    }
}

// On Enter - Rocket Punch: Move target enemy back one row (if possible) and deal 2 damage.
export async function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);

    try { playAudioByKey('doomfist-enter'); } catch {}

    showToast('Doomfist: Select target enemy for Rocket Punch');
    try {
        const target = await selectCardTarget();
        if (!target) {
            showToast('Doomfist ability cancelled');
            setTimeout(() => clearToast(), 1500);
            return;
        }

        // Prevent targeting dead heroes
        const targetHealth = window.__ow_getCard?.(target.cardId)?.health || 0;
        if (targetHealth <= 0) {
            showToast('Doomfist: Cannot target dead heroes');
            setTimeout(() => clearToast(), 1500);
            return;
        }

        // First: attempt to push the target back one row (if possible)
        const enemyPlayer = playerNum === 1 ? 2 : 1;
        const currentRowId = target.rowId;
        const currentRowPos = currentRowId[1]; // f/m/b
        let pushToRow = null;
        if (currentRowPos === 'f') pushToRow = `${enemyPlayer}m`;
        else if (currentRowPos === 'm') pushToRow = `${enemyPlayer}b`;

        if (pushToRow && !window.__ow_isRowFull?.(pushToRow)) {
            window.__ow_moveCardToRow?.(target.cardId, pushToRow);
        }

        // Then: deal 2 damage to the target (respects shields)
        const damageRow = pushToRow || currentRowId; // if pushed, damage from new row context
        dealDamage(target.cardId, damageRow, 2);

        try { playAudioByKey('doomfist-punch'); } catch {}
        showToast('Doomfist: Rocket Punch resolved');
        setTimeout(() => clearToast(), 1500);
    } catch (error) {
        console.error('Doomfist onEnter error:', error);
        showToast('Doomfist ability cancelled');
        setTimeout(() => clearToast(), 1500);
    }
}

// Option 1: Rocket Punch - Deal 2 damage to target enemy, then attempt to push back.
// If the target dies from the hit, still attempt to push; after push, deal 1 damage to all enemies in the original row.
async function handleRocketPunch(playerHeroId, rowId, playerNum) {
    showToast('Doomfist: Select target enemy for Rocket Punch');
    
    try {
        const target = await selectCardTarget();
        if (target) {
            // Check if target is already dead
            const targetHealth = window.__ow_getCard?.(target.cardId)?.health || 0;
            if (targetHealth <= 0) {
                showToast('Doomfist: Cannot target dead heroes');
                setTimeout(() => clearToast(), 1500);
                return;
            }
            
            // Deal 2 damage to target (respects shields)
            const originalRowId = target.rowId;
            dealDamage(target.cardId, originalRowId, 2);
            
            // Play punch sound after damage
            try {
                playAudioByKey('doomfist-punch');
            } catch {}
            
            // Attempt to push the target to the row behind (whether dead or alive), respecting capacity
            const enemyPlayer = playerNum === 1 ? 2 : 1;
            const currentRowPos = originalRowId[1]; // f, m, or b
            let pushToRow = null;
            if (currentRowPos === 'f') pushToRow = `${enemyPlayer}m`;
            else if (currentRowPos === 'm') pushToRow = `${enemyPlayer}b`;

            if (pushToRow) {
                const targetRowCards = window.__ow_getRow?.(pushToRow)?.cardIds || [];
                if (targetRowCards.length < 4) {
                    window.__ow_moveCardToRow?.(target.cardId, pushToRow);
                }
            }

            // Check if target died (health <= 0 after damage)
            const targetHealthAfter = window.__ow_getCard?.(target.cardId)?.health || 0;
            if (targetHealthAfter <= 0) {
                // Deal 1 damage to all enemies in the original row (excluding the dead target)
                const rowCards = window.__ow_getRow?.(originalRowId)?.cardIds || [];
                for (const cardId of rowCards) {
                    if (cardId !== target.cardId) {
                        dealDamage(cardId, originalRowId, 1);
                        effectsBus.publish(Effects.showDamage(cardId, 1));
                    }
                }
            }
            
            setTimeout(() => clearToast(), 2000);
        } else {
            showToast('Doomfist ability cancelled');
            setTimeout(() => clearToast(), 1500);
        }
    } catch (error) {
        console.error('Doomfist Rocket Punch error:', error);
        showToast('Doomfist ability cancelled');
        setTimeout(() => clearToast(), 1500);
    }
}


// Ultimate: Meteor Strike (3) - Deal 3 damage to target enemy + 1 damage to adjacent enemies
export async function onUltimate({ playerHeroId, rowId, cost }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    // Play ultimate start sound
    try {
        playAudioByKey('doomfist-ultimate');
    } catch {}
    
    showToast('Doomfist: Meteor Strike - Select target enemy');
    
    try {
        const target = await selectCardTarget();
        if (!target) {
            showToast('Doomfist ultimate cancelled');
            setTimeout(() => clearToast(), 1500);
            return;
        }
        
        // Deal 3 damage to primary target
        dealDamage(target.cardId, target.rowId, 3);
        effectsBus.publish(Effects.showDamage(target.cardId, 3));
        
        // Deal 1 damage to adjacent enemies
        const targetRow = target.rowId;
        const enemyPlayer = playerNum === 1 ? 2 : 1;
        const currentRowPos = targetRow[1]; // f, m, or b
        
        // Get adjacent positions
        const adjacentPositions = [];
        if (currentRowPos === 'f') {
            // Front row: check middle row
            adjacentPositions.push(`${enemyPlayer}m`);
        } else if (currentRowPos === 'm') {
            // Middle row: check front and back rows
            adjacentPositions.push(`${enemyPlayer}f`);
            adjacentPositions.push(`${enemyPlayer}b`);
        } else if (currentRowPos === 'b') {
            // Back row: check middle row
            adjacentPositions.push(`${enemyPlayer}m`);
        }
        
        // Also check left and right in the same row
        const sameRowCards = window.__ow_getRow?.(targetRow)?.cardIds || [];
        const targetIndex = sameRowCards.indexOf(target.cardId);
        
        // Get left and right adjacent cards in same row
        const leftCard = targetIndex > 0 ? sameRowCards[targetIndex - 1] : null;
        const rightCard = targetIndex < sameRowCards.length - 1 ? sameRowCards[targetIndex + 1] : null;
        
        let totalTargets = 1; // Primary target
        
        // Damage adjacent rows
        for (const adjacentRow of adjacentPositions) {
            const rowCards = window.__ow_getRow?.(adjacentRow)?.cardIds || [];
            for (const cardId of rowCards) {
                dealDamage(cardId, adjacentRow, 1);
                effectsBus.publish(Effects.showDamage(cardId, 1));
                totalTargets++;
            }
        }
        
        // Damage left and right adjacent cards in same row
        if (leftCard) {
            dealDamage(leftCard, targetRow, 1);
            effectsBus.publish(Effects.showDamage(leftCard, 1));
            totalTargets++;
        }
        if (rightCard) {
            dealDamage(rightCard, targetRow, 1);
            effectsBus.publish(Effects.showDamage(rightCard, 1));
            totalTargets++;
        }
        
        // Play meteor landing sound after damage
        try {
            playAudioByKey('doomfist-meteor-landing');
        } catch {}
        
        showToast(`Doomfist: Meteor Strike complete - ${totalTargets} targets hit`);
        setTimeout(() => clearToast(), 2000);
        
    } catch (error) {
        console.error('Doomfist Ultimate error:', error);
        showToast('Doomfist ultimate cancelled');
        setTimeout(() => clearToast(), 1500);
    }
}

// On Draw - play intro sound
export function onDraw({ playerHeroId }) {
    try {
        playAudioByKey('doomfist-intro');
    } catch {}
}

export default { onDraw, onEnter, onUltimate };
