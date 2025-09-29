import { showOnEnterChoice } from '../engine/modalController';
import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { playAudioByKey } from '../../assets/imageImports';

// Hellfire Shotguns - onEnter
export async function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    // Play enter sound on activation
    try {
        playAudioByKey('reaper-enter');
    } catch {}
    
    const opt1 = { 
        name: 'Hellfire Shotguns', 
        description: 'Deal 3 damage to enemy directly opposite Reaper' 
    };
    const opt2 = { 
        name: 'Hellfire Shotguns (Split)', 
        description: 'Deal 2 damage to enemy directly opposite Reaper, then 1 damage to enemy directly behind them' 
    };

    showOnEnterChoice('Reaper', opt1, opt2, async (choiceIndex) => {
        if (choiceIndex === 0) {
            // Play ability sound immediately on selection
            try {
                playAudioByKey('reaper-ability1');
            } catch {}
            
            await handleSingleTarget(playerHeroId, rowId, playerNum);
        } else if (choiceIndex === 1) {
            // Play ability sound immediately on selection
            try {
                playAudioByKey('reaper-ability2');
            } catch {}
            
            await handleSplitTarget(playerHeroId, rowId, playerNum);
        }
    });
}

// Hellfire Shotguns - Single Target (3 damage)
async function handleSingleTarget(playerHeroId, rowId, playerNum) {
    try {
        // Get Reaper's current position
        const reaperRow = window.__ow_getRow?.(rowId);
        if (!reaperRow) {
            showToast('Reaper: Unable to determine position');
            setTimeout(() => clearToast(), 1500);
            return;
        }
        
        const reaperIndex = reaperRow.cardIds.indexOf(playerHeroId);
        if (reaperIndex === -1) {
            showToast('Reaper: Position not found');
            setTimeout(() => clearToast(), 1500);
            return;
        }
        
        // Find opposing row
        const enemyPlayer = playerNum === 1 ? 2 : 1;
        const rowType = rowId[1]; // f, m, or b
        const opposingRowId = `${enemyPlayer}${rowType}`;
        const opposingRow = window.__ow_getRow?.(opposingRowId);
        
        if (!opposingRow || !opposingRow.cardIds[reaperIndex]) {
            showToast('Reaper: No enemy directly opposite');
            setTimeout(() => clearToast(), 1500);
            return;
        }
        
        // Target enemy in same column index
        const targetCardId = opposingRow.cardIds[reaperIndex];
        const targetCard = window.__ow_getCard?.(targetCardId);
        
        if (!targetCard || targetCard.health <= 0) {
            showToast('Reaper: No living enemy directly opposite');
            setTimeout(() => clearToast(), 1500);
            return;
        }
        
        // Deal 3 damage (respects shields)
        dealDamage(targetCardId, opposingRowId, 3, false, playerHeroId);
        try { effectsBus.publish(Effects.showDamage(targetCardId, 3)); } catch {}
        
        showToast('Reaper: Hellfire Shotguns fired!');
        setTimeout(() => clearToast(), 2000);
        
    } catch (error) {
        console.error('Reaper single target error:', error);
        showToast('Reaper: Ability failed');
        setTimeout(() => clearToast(), 1500);
    }
}

// Hellfire Shotguns - Split Target (2 + 1 damage)
async function handleSplitTarget(playerHeroId, rowId, playerNum) {
    try {
        // Get Reaper's current position
        const reaperRow = window.__ow_getRow?.(rowId);
        if (!reaperRow) {
            showToast('Reaper: Unable to determine position');
            setTimeout(() => clearToast(), 1500);
            return;
        }
        
        const reaperIndex = reaperRow.cardIds.indexOf(playerHeroId);
        if (reaperIndex === -1) {
            showToast('Reaper: Position not found');
            setTimeout(() => clearToast(), 1500);
            return;
        }
        
        // Find opposing row
        const enemyPlayer = playerNum === 1 ? 2 : 1;
        const rowType = rowId[1]; // f, m, or b
        const opposingRowId = `${enemyPlayer}${rowType}`;
        const opposingRow = window.__ow_getRow?.(opposingRowId);
        
        if (!opposingRow || !opposingRow.cardIds[reaperIndex]) {
            showToast('Reaper: No enemy directly opposite');
            setTimeout(() => clearToast(), 1500);
            return;
        }
        
        // Target enemy in same column index (primary target)
        const primaryTargetId = opposingRow.cardIds[reaperIndex];
        const primaryTarget = window.__ow_getCard?.(primaryTargetId);
        
        if (!primaryTarget || primaryTarget.health <= 0) {
            showToast('Reaper: No living enemy directly opposite');
            setTimeout(() => clearToast(), 1500);
            return;
        }
        
        // Deal 2 damage to primary target (respects shields)
        dealDamage(primaryTargetId, opposingRowId, 2, false, playerHeroId);
        try { effectsBus.publish(Effects.showDamage(primaryTargetId, 2)); } catch {}
        
        // Find enemy directly behind primary target
        let behindRowId = null;
        if (rowType === 'f') {
            behindRowId = `${enemyPlayer}m`; // Front -> Middle
        } else if (rowType === 'm') {
            behindRowId = `${enemyPlayer}b`; // Middle -> Back
        }
        // If target is in back row, there's no "behind" position
        
        if (behindRowId) {
            const behindRow = window.__ow_getRow?.(behindRowId);
            if (behindRow && behindRow.cardIds[reaperIndex]) {
                const behindTargetId = behindRow.cardIds[reaperIndex];
                const behindTarget = window.__ow_getCard?.(behindTargetId);
                
                if (behindTarget && behindTarget.health > 0) {
                    // Deal 1 damage to enemy behind (respects shields)
                    dealDamage(behindTargetId, behindRowId, 1, false, playerHeroId);
                    try { effectsBus.publish(Effects.showDamage(behindTargetId, 1)); } catch {}
                }
            }
        }
        
        showToast('Reaper: Hellfire Shotguns (Split) fired!');
        setTimeout(() => clearToast(), 2000);
        
    } catch (error) {
        console.error('Reaper split target error:', error);
        showToast('Reaper: Ability failed');
        setTimeout(() => clearToast(), 1500);
    }
}

// Death Blossom - Ultimate (Cost 4)
export async function onUltimate({ playerHeroId, rowId, cost }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    // Play ultimate activation sound
    try {
        playAudioByKey('reaper-ultimate');
    } catch {}
    
    try {
        // Get Reaper's current position
        const reaperRow = window.__ow_getRow?.(rowId);
        if (!reaperRow) {
            showToast('Reaper: Unable to determine position');
            setTimeout(() => clearToast(), 1500);
            return;
        }
        
        // Find opposing row
        const enemyPlayer = playerNum === 1 ? 2 : 1;
        const rowType = rowId[1]; // f, m, or b
        const opposingRowId = `${enemyPlayer}${rowType}`;
        const opposingRow = window.__ow_getRow?.(opposingRowId);
        
        if (!opposingRow) {
            showToast('Reaper: No opposing row found');
            setTimeout(() => clearToast(), 1500);
            return;
        }
        
        // Deal 3 damage to all living enemies in opposing row (ignores shields)
        const livingEnemies = opposingRow.cardIds.filter(cardId => {
            const card = window.__ow_getCard?.(cardId);
            return card && card.health > 0;
        });
        
        if (livingEnemies.length === 0) {
            showToast('Reaper: No living enemies in opposing row');
            setTimeout(() => clearToast(), 1500);
            return;
        }
        
        // Deal damage to all enemies
        livingEnemies.forEach(enemyCardId => {
            dealDamage(enemyCardId, opposingRowId, 3, true, playerHeroId); // ignoreShields = true
            try { effectsBus.publish(Effects.showDamage(enemyCardId, 3)); } catch {}
        });
        
        // Play ultimate resolve sound
        try {
            playAudioByKey('reaper-ultimate-resolve');
        } catch {}
        
        showToast(`Reaper: Death Blossom hit ${livingEnemies.length} enemies!`);
        setTimeout(() => clearToast(), 2000);
        
        // Discard Reaper after damage is dealt
        window.__ow_dispatchAction?.({
            type: 'remove-alive-card',
            payload: { cardId: playerHeroId }
        });
        
    } catch (error) {
        console.error('Reaper ultimate error:', error);
        showToast('Reaper: Ultimate failed');
        setTimeout(() => clearToast(), 1500);
    }
}

export default { onEnter, onUltimate };
