import $ from 'jquery';
import { showOnEnterChoice } from '../engine/modalController';
import { selectCardTarget, selectRowTarget } from '../engine/targeting';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { dealDamage } from '../engine/damageBus';
import { getAudioFile, playAudioByKey } from '../../assets/imageImports';

// On Enter - Modal choice between two options
export function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    // Play enter sound
    try {
        playAudioByKey('bastion-enter');
    } catch {}
    
    const opt1 = { 
        name: 'Sentinel (Damage)', 
        description: 'Deal 1 damage to target enemy' 
    };
    const opt2 = { 
        name: 'Sentinel (Token)', 
        description: 'Place Bastion Token next to an enemy row. Any enemy Heroes that move or deploy into this row take 1 damage.' 
    };

    showOnEnterChoice('Bastion', opt1, opt2, async (choiceIndex) => {
        try {
            if (choiceIndex === 0) {
                // Option 1: Deal 1 damage to target enemy
                await handleOption1(playerHeroId, rowId, playerNum);
            } else if (choiceIndex === 1) {
                // Option 2: Place Bastion token on enemy row
                await handleOption2(playerHeroId, rowId, playerNum);
            }
        } catch (error) {
            console.error('Bastion ability error:', error);
            showToast('Bastion ability cancelled');
            setTimeout(() => clearToast(), 1500);
        }
    });
}

// Option 1: Deal 1 damage to target enemy
async function handleOption1(playerHeroId, rowId, playerNum) {
    showToast('Bastion: Select target enemy');
    
    try {
        const target = await selectCardTarget();
        if (target) {
            dealDamage(target.cardId, target.rowId, 1, false, playerHeroId);
            // Play audio after damage is dealt
            try {
                playAudioByKey('bastion-ability1');
            } catch {}
            showToast('Bastion: 1 damage dealt to target');
            setTimeout(() => clearToast(), 1500);
        } else {
            showToast('Bastion ability cancelled');
            setTimeout(() => clearToast(), 1500);
        }
    } catch (error) {
        console.error('Bastion Option 1 error:', error);
        showToast('Bastion ability cancelled');
        setTimeout(() => clearToast(), 1500);
    }
}

// Option 2: Place Bastion token on enemy row
async function handleOption2(playerHeroId, rowId, playerNum) {
    showToast('Bastion: Select enemy row for token');
    
    try {
        const target = await selectRowTarget();
        if (target) {
            // Place Bastion token on the selected enemy row
            window.__ow_appendRowEffect?.(target.rowId, 'enemyEffects', {
                id: 'bastion-token',
                hero: 'bastion',
                type: 'token',
                sourceCardId: playerHeroId,
                sourceRowId: rowId,
                tooltip: 'Bastion Token: Enemies take 1 damage when moving/deploying here'
            });
            
            // Play audio after token is placed
            try {
                playAudioByKey('bastion-ability2');
            } catch {}
            
            showToast('Bastion token placed on enemy row');
            setTimeout(() => clearToast(), 1500);
        } else {
            showToast('Bastion ability cancelled');
            setTimeout(() => clearToast(), 1500);
        }
    } catch (error) {
        console.error('Bastion Option 2 error:', error);
        showToast('Bastion ability cancelled');
        setTimeout(() => clearToast(), 1500);
    }
}

// Ultimate: Tank Mode (3) - Deal 2 damage to one enemy + 2 damage to up to 2 enemies in any row
export async function onUltimate({ playerHeroId, rowId, cost }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    // Play ultimate start sound
    try {
        playAudioByKey('bastion-ultimate');
    } catch {}
    
    showToast('Bastion: Tank Mode - Select primary target');
    
    try {
        // Select primary target (2 damage)
        const primaryTarget = await selectCardTarget();
        if (!primaryTarget) {
            showToast('Bastion ultimate cancelled');
            setTimeout(() => clearToast(), 1500);
            return;
        }
        
        // Deal 2 damage to primary target
        dealDamage(primaryTarget.cardId, primaryTarget.rowId, 2, false, playerHeroId);
        
        showToast('Bastion: Select up to 2 additional targets');
        
        // Select up to 2 additional targets (2 damage each)
        const additionalTargets = [];
        for (let i = 0; i < 2; i++) {
            try {
                const target = await selectCardTarget();
                if (target) {
                    additionalTargets.push(target);
                    dealDamage(target.cardId, target.rowId, 2, false, playerHeroId);
                } else {
                    break; // User cancelled, stop selecting
                }
            } catch (error) {
                break; // Error or cancellation
            }
        }
        
        // Play ultimate end sound
        try {
            playAudioByKey('bastion-ultend');
        } catch {}
        
        const totalTargets = 1 + additionalTargets.length;
        showToast(`Bastion: Tank Mode complete - ${totalTargets} targets hit`);
        setTimeout(() => clearToast(), 2000);
        
    } catch (error) {
        console.error('Bastion Ultimate error:', error);
        showToast('Bastion ultimate cancelled');
        setTimeout(() => clearToast(), 1500);
    }
}

// On Draw - play intro sound
export function onDraw({ playerHeroId }) {
    try {
        playAudioByKey('bastion-intro');
    } catch {}
}

// On Death - remove all Bastion tokens when Bastion dies
export function onDeath({ playerHeroId, rowId }) {
    // Remove all Bastion tokens from all rows
    const rowIds = ['1b', '1m', '1f', '2b', '2m', '2f'];
    
    rowIds.forEach(rowId => {
        window.__ow_removeRowEffect?.(rowId, 'enemyEffects', 'bastion-token');
    });
    
    console.log(`Bastion tokens removed - Bastion ${playerHeroId} died`);
}

// Legacy cleanup function - kept for compatibility
export function cleanupBastionTokens(playerHeroId) {
    onDeath({ playerHeroId, rowId: null });
}

export default { onDraw, onEnter, onUltimate, onDeath, cleanupBastionTokens };
