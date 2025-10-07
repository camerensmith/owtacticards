import $ from 'jquery';
import { showOnEnterChoice } from '../engine/modalController';
import { selectCardTarget, selectRowTarget } from '../engine/targeting';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';
import { getAudioFile, playAudioByKey } from '../../assets/imageImports';
import { withAIContext } from '../engine/aiContextHelper';

// On Enter - Modal choice between two options
export async function onEnter({ playerHeroId, rowId }) {
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

    // For AI, choose token by default unless there is a 1 HP enemy to finish
    if (window.__ow_aiTriggering || window.__ow_isAITurn) {
        const enemyPlayer = playerNum === 1 ? 2 : 1;
        const enemyRows = [`${enemyPlayer}f`, `${enemyPlayer}m`, `${enemyPlayer}b`];
        let hasOneHpEnemy = false;
        for (const rid of enemyRows) {
            const row = window.__ow_getRow?.(rid);
            if (!row || !row.cardIds) continue;
            for (const cid of row.cardIds) {
                const c = window.__ow_getCard?.(cid);
                if (c && c.health === 1) { hasOneHpEnemy = true; break; }
            }
            if (hasOneHpEnemy) break;
        }
        if (hasOneHpEnemy) {
            await handleOption1(playerHeroId, rowId, playerNum);
        } else {
            await handleOption2(playerHeroId, rowId, playerNum);
        }
        return;
    }
    
    // For human players, show choice modal
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
    // For AI, automatically select a random enemy
    if (window.__ow_aiTriggering || window.__ow_isAITurn) {
        const enemyPlayer = playerNum === 1 ? 2 : 1;
        const enemyRows = [`${enemyPlayer}f`, `${enemyPlayer}m`, `${enemyPlayer}b`];
        
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
            showToast('Bastion AI: No enemies to target');
            setTimeout(() => clearToast(), 2000);
            return;
        }
        
        // Select random enemy
        const randomEnemy = livingEnemies[Math.floor(Math.random() * livingEnemies.length)];
        console.log('Bastion AI: Selected random enemy:', randomEnemy.cardId);
        
        // Deal damage
        dealDamage(randomEnemy.cardId, randomEnemy.rowId, 1, false, playerHeroId);
        try { effectsBus.publish(Effects.showDamage(randomEnemy.cardId, 1)); } catch {}
        
        showToast('Bastion AI: Recon Mode - 1 damage to enemy');
        setTimeout(() => clearToast(), 2000);
        return;
    }
    
    // Human player logic
    showToast('Bastion: Select target enemy');
    
    try {
        const target = await selectCardTarget();
        if (target) {
            dealDamage(target.cardId, target.rowId, 1, false, playerHeroId);
            try { effectsBus.publish(Effects.showDamage(target.cardId, 1)); } catch {}
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
    // For AI, automatically select an enemy row
    if (window.__ow_aiTriggering || window.__ow_isAITurn) {
        const enemyPlayer = playerNum === 1 ? 2 : 1;
        const enemyRows = [`${enemyPlayer}f`, `${enemyPlayer}m`, `${enemyPlayer}b`];
        
        // Find the enemy row with the most cards (best target for token)
        let bestRow = enemyRows[0];
        let maxEnemies = 0;
        
        enemyRows.forEach(rowId => {
            const row = window.__ow_getRow?.(rowId);
            const enemyCount = row?.cardIds?.length || 0;
            if (enemyCount > maxEnemies) {
                maxEnemies = enemyCount;
                bestRow = rowId;
            }
        });
        
        // Place Bastion token on the selected enemy row
        window.__ow_appendRowEffect?.(bestRow, 'enemyEffects', {
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
        
        console.log(`AI Bastion: Token placed on enemy row ${bestRow} (${maxEnemies} enemies)`);
        showToast(`Bastion AI: Token placed on ${bestRow} row`);
        setTimeout(() => clearToast(), 2000);
        return;
    }
    
    showToast('Bastion: Select enemy row for token');
    
    try {
        const target = await selectRowTarget();
        if (target) {
            // Validate that the target is actually an enemy row
            const targetPlayerNum = parseInt(target.rowId[0]);
            if (targetPlayerNum === playerNum) {
                showToast('Bastion: Token can only be placed on enemy rows!');
                setTimeout(() => clearToast(), 2000);
                return;
            }
            
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
        try { effectsBus.publish(Effects.showDamage(primaryTarget.cardId, 2)); } catch {}
        
        showToast('Bastion: Select up to 2 additional targets');
        
        // Select up to 2 additional targets (2 damage each)
        const additionalTargets = [];
        for (let i = 0; i < 2; i++) {
            try {
                const target = await selectCardTarget();
                if (target) {
                    additionalTargets.push(target);
                    dealDamage(target.cardId, target.rowId, 2, false, playerHeroId);
                    try { effectsBus.publish(Effects.showDamage(target.cardId, 2)); } catch {}
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
