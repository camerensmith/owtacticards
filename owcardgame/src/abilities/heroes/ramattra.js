import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { selectCardTarget, selectRowTarget } from '../engine/targeting';
import { playAudioByKey } from '../../assets/imageImports';

// Void Barrier - onEnter
export async function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    try { playAudioByKey('ramattra-enter'); } catch {}
    
    // Give Ramattra 1 shield
    const currentShield = window.__ow_getCard?.(playerHeroId)?.shield || 0;
    const newShield = Math.min(currentShield + 1, 3); // Max 3 shields
    window.__ow_dispatchShieldUpdate?.(playerHeroId, newShield);
    
    // AI AUTO-TARGETING: If AI is playing, automatically select a random ally
    const isAI = (window.__ow_isAITurn || window.__ow_aiTriggering) && playerNum === 2;
    let target = null;

    if (isAI) {
        // Find all living allies (excluding Ramattra himself)
        const allyRows = [`${playerNum}f`, `${playerNum}m`, `${playerNum}b`];
        const allies = [];

        for (const allyRowId of allyRows) {
            const row = window.__ow_getRow?.(allyRowId);
            if (row && row.cardIds) {
                for (const cardId of row.cardIds) {
                    if (cardId === playerHeroId) continue; // Skip Ramattra himself
                    const card = window.__ow_getCard?.(cardId);
                    if (card && card.health > 0) {
                        allies.push({ cardId, rowId: allyRowId });
                    }
                }
            }
        }

        if (allies.length > 0) {
            // Pick a random ally
            const randomIndex = Math.floor(Math.random() * allies.length);
            target = allies[randomIndex];
            console.log('Ramattra AI: Auto-selected random ally:', target.cardId);
        } else {
            console.log('Ramattra AI: No valid allies to buff, skipping');
            return;
        }
    } else {
        // Manual targeting for human player
        showToast('Ramattra: Select any ally to give 1 shield');
        console.log('Ramattra onEnter: Starting targeting for ally shield');
        target = await selectCardTarget({ isBuff: true });
        if (!target) {
            console.log('Ramattra onEnter: No target selected');
            clearToast();
            return;
        }
    }

    try {
        
        console.log('Ramattra onEnter: Target selected:', target);
        
        const targetCard = window.__ow_getCard?.(target.cardId);
        const targetPlayer = parseInt(target.cardId[0]);
        const isAlly = targetPlayer === playerNum;
        
        // Validate target (ally, alive, not Ramattra himself)
        console.log('Ramattra onEnter: Target validation:', { isAlly, targetCard, targetHealth: targetCard?.health, isSelf: target.cardId === playerHeroId });
        
        if (!isAlly || !targetCard || targetCard.health <= 0 || target.cardId === playerHeroId) {
            console.log('Ramattra onEnter: Invalid target - must be different living ally');
            showToast('Ramattra: Must target a different living ally');
            setTimeout(() => clearToast(), 2000);
            return;
        }
        
        // Give target 1 shield
        const targetCurrentShield = targetCard.shield || 0;
        const targetNewShield = Math.min(targetCurrentShield + 1, 3); // Max 3 shields
        
        console.log('Ramattra onEnter: Applying shield:', { targetId: target.cardId, currentShield: targetCurrentShield, newShield: targetNewShield });
        
        window.__ow_dispatchShieldUpdate?.(target.cardId, targetNewShield);
        
        // Play ability sound on resolve
        try { playAudioByKey('ramattra-ability1'); } catch {}
        
        clearToast();
        showToast('Ramattra: Void Barrier applied!');
        setTimeout(() => clearToast(), 2000);
        
    } catch (error) {
        console.error('Ramattra Void Barrier error:', error);
        showToast('Ramattra ability cancelled');
        setTimeout(() => clearToast(), 1500);
    }
}

// Ravenous Vortex - Ultimate (Cost 3)
export async function onUltimate({ playerHeroId, rowId, cost }) {
    const playerNum = parseInt(playerHeroId[0]);

    // Play ultimate activation sound
    try { playAudioByKey('ramattra-ultimate'); } catch {}

    showToast('Ramattra: Select enemy row to shuffle');

    try {
        const target = await selectRowTarget({ isDamage: true });
        if (!target) {
            clearToast();
            return;
        }
        
        const targetPlayer = parseInt(target.rowId[0]);
        const isEnemyRow = targetPlayer !== playerNum;
        
        // Validate target (enemy row)
        if (!isEnemyRow) {
            showToast('Ramattra: Must target an enemy row');
            setTimeout(() => clearToast(), 2000);
            return;
        }
        
        const targetRow = window.__ow_getRow?.(target.rowId);
        const cardIds = targetRow?.cardIds ? [...targetRow.cardIds] : [];

        if (cardIds.length === 0) {
            showToast('Ramattra: No enemies in target row - transforming anyway');
            setTimeout(() => clearToast(), 2000);
        } else {
            // Determine indices of shufflable units: include living and dead, exclude turrets
            const shufflableIndices = [];
            const shufflableIds = [];
            for (let i = 0; i < cardIds.length; i++) {
                const cid = cardIds[i];
                if (!cid) continue;
                const card = window.__ow_getCard?.(cid);
                // Exclude turrets (immobile)
                if (card && card.turret === true) continue;
                // Include both living and dead units
                shufflableIndices.push(i);
                shufflableIds.push(cid);
            }

            if (shufflableIds.length < 2) {
                // Nothing to shuffle or damage
                showToast('Ramattra: Not enough units to shuffle in that row');
                setTimeout(() => clearToast(), 1500);
            } else {
                // Shuffle the list of shufflable IDs
                const shuffledIds = [...shufflableIds].sort(() => Math.random() - 0.5);

                // Apply shuffled IDs back only to the shufflable indices, leave turrets in place
                const newCardIds = [...cardIds];
                shufflableIndices.forEach((idx, k) => {
                    newCardIds[idx] = shuffledIds[k];
                });

                // Commit new row order
                window.__ow_setRowArray?.(target.rowId, newCardIds);

                // Deal 2 damage to all units that were part of the shuffle (respects shields)
                for (const cid of shuffledIds) {
                    const current = window.__ow_getCard?.(cid);
                    // Skip if somehow became turret or nonexistent
                    if (!current || current.turret === true) continue;
                    dealDamage(cid, target.rowId, 2, false, playerHeroId);
                    try { effectsBus.publish(Effects.showDamage(cid, 2)); } catch {}
                }
            }
        }
        
        // Transform to Nemesis immediately
        transformToNemesis(playerNum, playerHeroId, rowId);
        
        // Play ultimate resolve sound
        try { playAudioByKey('ramattra-ultimate-resolve'); } catch {}
        
        clearToast();
        showToast('Ramattra: Transformed to Nemesis!');
        setTimeout(() => clearToast(), 2000);
        
    } catch (error) {
        console.error('Ramattra Ravenous Vortex error:', error);
        showToast('Ramattra ultimate cancelled');
        setTimeout(() => clearToast(), 1500);
    }
}

// Transform Ramattra to Nemesis
function transformToNemesis(playerNum, playerHeroId, rowId) {
    console.log('Ramattra: Starting transformation to Nemesis');
    console.log('Ramattra: PlayerHeroId:', playerHeroId);
    console.log('Ramattra: PlayerNum:', playerNum);
    
    // Remove Ramattra from the board using the proper dispatch
    console.log('Ramattra: Dispatching REMOVE_ALIVE_CARD action');
    window.__ow_dispatchAction?.({
        type: 'remove-alive-card',
        payload: { cardId: playerHeroId }
    });
    
    // Add Nemesis to hand
    console.log('Ramattra: Adding Nemesis to hand');
    window.__ow_addSpecialCardToHand?.(playerNum, 'nemesis');
    
    // Show toast about ephemeral card
    showToast('Nemesis Ramattra added to hand (ephemeral - play this turn or discard)');
    setTimeout(() => clearToast(), 3000);
}

export default {
    onEnter,
    onUltimate
};
