import { showOnEnterChoice } from '../engine/modalController';
import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { playAudioByKey } from '../../assets/imageImports';
import { withAIContext } from '../engine/aiContextHelper';
import {
    BLOSSOM_DAMAGE_PER_TARGET,
    buildBlossomTicks,
    deathBlossomTargets,
} from '../../game/reaperRules';
import { BLOSSOM } from '../../presentation/pixi/fxConfig';

function waitMs(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

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
        try { effectsBus.publish(Effects.pellets(playerHeroId, targetCardId)); } catch {}
        dealDamage(targetCardId, opposingRowId, 3, false, playerHeroId, false, { skipProjectileFx: true });
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
        try { effectsBus.publish(Effects.pellets(playerHeroId, primaryTargetId)); } catch {}
        dealDamage(primaryTargetId, opposingRowId, 2, false, playerHeroId, false, { skipProjectileFx: true });
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
                    try { effectsBus.publish(Effects.pellets(playerHeroId, behindTargetId)); } catch {}
                    dealDamage(behindTargetId, behindRowId, 1, false, playerHeroId, false, { skipProjectileFx: true });
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
    
    // Hoisted so the cleanup below can close the blossom on any exit path.
    let blossomRowId = null;

    try {
        // Get Reaper's current position
        const reaperRow = window.__ow_getRow?.(rowId);
        if (!reaperRow) {
            showToast('Reaper: Unable to determine position');
            setTimeout(() => clearToast(), 1500);
            return;
        }

        // Death Blossom lands at the centre of the enemy's middle row and
        // catches the two centre columns across all three rows.
        const enemyPlayer = playerNum === 1 ? 2 : 1;
        blossomRowId = `${enemyPlayer}m`;
        const targets = deathBlossomTargets(
            enemyPlayer,
            window.__ow_getRow,
            window.__ow_getCard,
        );

        // AI gating: only use if 2+ living enemies in opposing row
        if (window.__ow_aiTriggering || window.__ow_isAITurn) {
            if (targets.length < 2) {
                showToast('Reaper AI: Skipping Death Blossom (need 2+ enemies in the blast)');
                setTimeout(() => clearToast(), 1500);
                return;
            }
        }

        if (targets.length === 0) {
            showToast('Reaper: No enemies caught in the blast');
            setTimeout(() => clearToast(), 1500);
            return;
        }

        try { effectsBus.publish(Effects.deathBlossom(blossomRowId, true)); } catch {}
        try { playAudioByKey('reaper-ultimate-resolve'); } catch {}

        // The blast lands one point at a time in a random order. The shuffle only
        // changes the order, so every target still takes the full amount.
        const ticks = buildBlossomTicks(targets, BLOSSOM_DAMAGE_PER_TARGET);
        for (const target of ticks) {
            const card = window.__ow_getCard?.(target.cardId);
            if (!card || (card.health || 0) <= 0) continue;
            // fixedDamage: the blast is exactly 3 per target. Without it every
            // tick would re-apply per-hit modifiers (Discord, Mercy boost,
            // Widowmaker) so a boosted target took them three times over.
            // The blossom spinning in the row is the effect; without this each
            // of the three ticks per target fires a beam from Reaper as well.
            dealDamage(target.cardId, target.rowId, 1, true, playerHeroId, true, { skipProjectileFx: true });
            try { effectsBus.publish(Effects.showDamage(target.cardId, 1)); } catch {}
            await waitMs(BLOSSOM.tickMs);
        }

        showToast(`Reaper: Death Blossom hit ${targets.length} enemies!`);
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
    } finally {
        // Must close on every path, or the blossom spins over the board forever.
        if (blossomRowId) {
            try { effectsBus.publish(Effects.deathBlossom(blossomRowId, false)); } catch {}
        }
    }
}

export default { onEnter, onUltimate };
