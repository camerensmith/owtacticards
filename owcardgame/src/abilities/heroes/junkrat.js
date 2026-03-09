import { dealDamage, subscribe as subscribeToDamage } from '../engine/damageBus';
import { selectRowTarget } from '../engine/targeting';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { playAudioByKey } from '../../assets/imageImports';
import effectsBus, { Effects } from '../engine/effectsBus';

// Junkrat intro sound on draw
export function onDraw({ playerHeroId }) {
    try { playAudioByKey('junkrat-intro'); } catch {}
}

// onEnter: Nothing happens (empty function)
export function onEnter({ playerHeroId, rowId }) {
    // Junkrat's onEnter does nothing - Total Mayhem is a death ability
    console.log('Junkrat deployed - no onEnter ability');
}

// Track the last damage source for Total Mayhem
let lastDamageSource = null;

// Function to track damage sources for Total Mayhem
function trackDamageSource(event) {
    if (event.type === 'damage' && event.targetCardId && event.sourceCardId) {
        // Check if this is damage to a Junkrat
        const targetCard = window.__ow_getCard?.(event.targetCardId);
        if (targetCard && targetCard.id === 'junkrat') {
            // Find which row the source card is in
            const allRows = ['1f', '1m', '1b', '2f', '2m', '2b'];
            for (const rowId of allRows) {
                const row = window.__ow_getRow?.(rowId);
                if (row && row.cardIds.includes(event.sourceCardId)) {
                    lastDamageSource = {
                        cardId: event.sourceCardId,
                        rowId: rowId
                    };
                    console.log(`Junkrat: Tracked damage source ${event.sourceCardId} in row ${rowId}`);
                    break;
                }
            }
        }
    }
}

// Subscribe to damage events to track sources
subscribeToDamage(trackDamageSource);

// onDeath: Total Mayhem - deal 2 damage to killer, then 1 damage to adjacent enemies
export function onDeath({ playerHeroId, rowId }) {
    try {
        console.log(`${playerHeroId} died - Total Mayhem triggered`);
        
        // Play death sound
        try {
            playAudioByKey('junkrat-ability1');
        } catch {}
        
        // Get the last damage source (killer) from our tracking
        if (!lastDamageSource) {
            console.log('Junkrat: No damage source tracked, cannot execute Total Mayhem');
            return;
        }
        
        const killerCardId = lastDamageSource.cardId;
        const killerRowId = lastDamageSource.rowId;
        
        console.log(`Junkrat: Targeting killer ${killerCardId} in row ${killerRowId}`);
        
        // Deal 2 damage to the killer
        dealDamage(killerCardId, killerRowId, 2, false, playerHeroId);
        
        // Get the killer's row to find adjacent enemies
        const killerRow = window.__ow_getRow?.(killerRowId);
        if (!killerRow) return;
        
        // Deal 1 damage to adjacent enemies
        const killerIndex = killerRow.cardIds.indexOf(killerCardId);
        
        // Target left neighbor
        if (killerIndex > 0) {
            const leftCardId = killerRow.cardIds[killerIndex - 1];
            dealDamage(leftCardId, killerRowId, 1, false, playerHeroId);
        }
        
        // Target right neighbor
        if (killerIndex < killerRow.cardIds.length - 1) {
            const rightCardId = killerRow.cardIds[killerIndex + 1];
            dealDamage(rightCardId, killerRowId, 1, false, playerHeroId);
        }
        
        showToast('Junkrat: Total Mayhem!');
        setTimeout(() => clearToast(), 2000);
        
        // Clear the tracked damage source
        lastDamageSource = null;
        
    } catch (error) {
        console.error('Error in Junkrat onDeath:', error);
    }
}

// onUltimate: RIP-Tire (4) - select an enemy row, move to corresponding friendly row, deal [S] damage
export async function onUltimate({ playerHeroId, rowId, cost }) {
    try {
        const playerNum = parseInt(playerHeroId[0]);
        
        // Play ultimate sound
        try {
            playAudioByKey('junkrat-ultimate');
        } catch {}
        
        // For AI, select the enemy row corresponding to the friendly row with the highest
        // synergy. Only trigger if that friendly row synergy is >= 4.
        if (window.__ow_aiTriggering || window.__ow_isAITurn) {
            const friendlyRows = [`${playerNum}f`, `${playerNum}m`, `${playerNum}b`];
            const enemyPlayer = playerNum === 1 ? 2 : 1;

            // Score friendly rows by synergy; only consider rows Junkrat can move to
            // (not full, or already Junkrat's current row) with synergy >= 4.
            let candidate = null;
            for (const friendlyRowId of friendlyRows) {
                // Skip full rows that Junkrat isn't already in
                if (friendlyRowId !== rowId && window.__ow_isRowFull?.(friendlyRowId)) continue;

                const row = window.__ow_getRow?.(friendlyRowId);
                const friendlySynergy = row?.synergy || 0;
                const pos = friendlyRowId[1];
                const opposingRowId = `${enemyPlayer}${pos}`;
                const opposingSynergy = window.__ow_getRow?.(opposingRowId)?.synergy || 0;

                if (friendlySynergy >= 4) {
                    if (!candidate || friendlySynergy > candidate.friendlySynergy ||
                        (friendlySynergy === candidate.friendlySynergy && opposingSynergy > candidate.opposingSynergy)) {
                        candidate = { friendlyRowId, friendlySynergy, opposingRowId, opposingSynergy };
                    }
                }
            }

            if (!candidate) {
                showToast('Junkrat AI: Holding RIP-Tire (synergy < 4)');
                setTimeout(() => clearToast(), 1500);
                return;
            }

            // Move Junkrat to the chosen friendly row if it differs from current row
            if (candidate.friendlyRowId !== rowId) {
                window.__ow_moveCardToRow?.(playerHeroId, candidate.friendlyRowId);
            }

            // Use post-move synergy for damage (consistent with human path)
            const postMoveSynergy = window.__ow_getRow?.(candidate.friendlyRowId)?.synergy || 0;

            // Deal [S] synergy damage to all enemies in the opposing row
            const opposingRow = window.__ow_getRow?.(candidate.opposingRowId);
            let targetsHit = 0;
            if (opposingRow && opposingRow.cardIds) {
                for (const cardId of opposingRow.cardIds) {
                    const card = window.__ow_getCard?.(cardId);
                    if (card && card.health > 0) {
                        if (postMoveSynergy > 0) {
                            dealDamage(cardId, candidate.opposingRowId, postMoveSynergy, false, playerHeroId);
                            try { effectsBus.publish(Effects.showDamage(cardId, postMoveSynergy)); } catch {}
                        }
                        targetsHit++;
                    }
                }
            }

            showToast(`Junkrat AI: RIP-Tire → dealt ${postMoveSynergy} to ${targetsHit} enemies in ${candidate.opposingRowId}`);
            setTimeout(() => clearToast(), 2000);
            return;
        }
        
        // Human: Select an ENEMY row to damage. Junkrat will attempt to move to the
        // friendly row with the same position (f/m/b). If that row is full, he stays put.
        showToast('Junkrat: Select ENEMY row to blow up');
        const enemyPick = await selectRowTarget({ isDamage: true });
        if (!enemyPick) { clearToast(); return; }

        const enemyRowId = enemyPick.rowId; // must be enemy due to isDamage
        const rowPosition = enemyRowId[1]; // 'f','m','b'
        const friendlyTargetRow = `${playerNum}${rowPosition}`;

        // Attempt to move Junkrat to the corresponding friendly row unless it is full
        const friendlyRowFull = !!window.__ow_isRowFull?.(friendlyTargetRow);
        let finalFriendlyRowForSynergy = rowId;
        if (!friendlyRowFull && friendlyTargetRow !== rowId) {
            window.__ow_moveCardToRow?.(playerHeroId, friendlyTargetRow);
            finalFriendlyRowForSynergy = friendlyTargetRow;
        }

        // Compute S as the synergy of Junkrat's row after movement (or original if blocked)
        const friendlyRowObj = window.__ow_getRow?.(finalFriendlyRowForSynergy);
        const synergyS = friendlyRowObj?.synergy || 0;

        // Deal [S] damage to all enemies in the selected enemy row
        const enemyRowObj = window.__ow_getRow?.(enemyRowId);
        if (!enemyRowObj) { clearToast(); return; }

        enemyRowObj.cardIds.forEach(cardId => {
            if (synergyS > 0) {
                dealDamage(cardId, enemyRowId, synergyS, false, playerHeroId);
                try { effectsBus.publish(Effects.showDamage(cardId, synergyS)); } catch {}
            }
        });
        
        console.log(`Junkrat: Moved to ${finalFriendlyRowForSynergy} (if possible) and dealt ${synergyS} to ${enemyRowId}`);
        
        // Play explosion sound
        try {
            playAudioByKey('junkrat-explosion');
        } catch {}
        
        showToast(`Junkrat: RIP-Tire deals ${synergyS} damage!`);
        setTimeout(() => clearToast(), 2000);
        
    } catch (error) {
        console.error('Error in Junkrat onUltimate:', error);
        clearToast();
    }
}

export default { onDraw, onEnter, onDeath, onUltimate };
