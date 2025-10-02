import { dealDamage, subscribe as subscribeToDamage } from '../engine/damageBus';
import { selectRowTarget } from '../engine/targeting';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { playAudioByKey } from '../../assets/imageImports';

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

// onUltimate: RIP-Tire (4) - choose row to move to, deal synergy damage to opposing row
export async function onUltimate({ playerHeroId, rowId, cost }) {
    try {
        const playerNum = parseInt(playerHeroId[0]);
        
        // Play ultimate sound
        try {
            playAudioByKey('junkrat-ultimate');
        } catch {}
        
        showToast('Junkrat: Select row to move to');
        
        // Let player choose which row to move Junkrat to
        const targetRow = await selectRowTarget({ isBuff: true });
        if (!targetRow) {
            clearToast();
            return;
        }
        
        // Validate that the target row is on the player's side
        if (!targetRow.rowId.startsWith(playerNum.toString())) {
            showToast('Junkrat: Must select your own row');
            setTimeout(() => clearToast(), 2000);
            return;
        }
        
        // Move Junkrat to the selected row
        window.__ow_moveCardToRow?.(playerHeroId, targetRow.rowId);
        
        // Determine the opposing row
        const enemyPlayer = playerNum === 1 ? 2 : 1;
        const rowPosition = targetRow.rowId[1]; // f, m, or b
        const opposingRowId = `${enemyPlayer}${rowPosition}`;
        
        // Get the synergy of the opposing row for damage calculation
        const opposingRow = window.__ow_getRow?.(opposingRowId);
        if (!opposingRow) return;
        
        // Get the total synergy of the opposing row
        const totalSynergy = opposingRow.synergy || 0;
        
        console.log(`Junkrat RIP-Tire: Opposing row ${opposingRowId} has ${totalSynergy} synergy`);
        
        // Deal damage equal to synergy to ALL enemies in the opposing row
        opposingRow.cardIds.forEach(cardId => {
            dealDamage(cardId, opposingRowId, totalSynergy, false, playerHeroId);
        });
        
        // Play explosion sound
        try {
            playAudioByKey('junkrat-explosion');
        } catch {}
        
        showToast(`Junkrat: RIP-Tire deals ${totalSynergy} damage!`);
        setTimeout(() => clearToast(), 2000);
        
    } catch (error) {
        console.error('Error in Junkrat onUltimate:', error);
        clearToast();
    }
}

export default { onDraw, onEnter, onDeath, onUltimate };
