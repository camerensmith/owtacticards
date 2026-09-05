import { playAudioByKey } from '../../assets/imageImports';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { turretRowKey } from '../../game/rosterRules';

// Build Turret - Place the Torbjorn Turret into your hand
export async function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    // Play enter sound
    try {
        playAudioByKey('torbjorn-enter');
    } catch {}
    
    // Add turret to hand using special card system
    window.__ow_addSpecialCardToHand?.(playerNum, 'turret');
    
    showToast('Torbjörn: Turret added to hand');
    setTimeout(() => clearToast(), 2000);
    
    console.log(`Torbjörn: Added turret to player ${playerNum} hand`);
    
    // FOR AI: the turret is not optional, so play it before handing the turn on.
    // onEnter is awaited by the caller, so this can be awaited too rather than
    // fired off and hoped for.
    if (playerNum === 2 && (window.__ow_aiTriggering || window.__ow_isAITurn)) {
        await forcePlayTurret(playerNum);
    }
}

/** Polls rather than guessing a delay: the card lands when the state flushes. */
async function waitForCardInHand(cardId, handRowId, attempts = 12, everyMs = 60) {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
        if ((window.__ow_getRow?.(handRowId)?.cardIds || []).includes(cardId)) return true;
        await new Promise((resolve) => setTimeout(resolve, everyMs));
    }
    return false;
}

/**
 * Put the turret on the board.
 *
 * The old version waited a flat 300ms and gave up if the card had not appeared
 * yet, so a slow flush left the turret stuck in hand for the rest of the game.
 */
export async function forcePlayTurret(playerNum = 2) {
    const turretCardId = `${playerNum}turret`;
    if (!await waitForCardInHand(turretCardId, `player${playerNum}hand`)) {
        console.warn('Torbjörn AI: turret never arrived in hand');
        return false;
    }

    const rowKey = turretRowKey(window.__ow_getRow, playerNum);
    if (!rowKey) {
        console.warn('Torbjörn AI: every row is full, turret stays in hand');
        return false;
    }

    try {
        const played = await window.__ow_aiIntegration?.playCard(turretCardId, rowKey);
        if (played === false) {
            console.warn(`Torbjörn AI: turret play to ${rowKey} was refused`);
            return false;
        }
        console.log(`Torbjörn AI: turret deployed to ${rowKey} row`);
        return true;
    } catch (error) {
        console.error('Torbjörn AI: failed to play turret:', error);
        return false;
    }
}

// Forge Hammer - Turret now does 2 damage to two Heroes, regardless of row
export async function onUltimate({ playerHeroId, rowId, cost }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    // Play ultimate sound
    try {
        playAudioByKey('torbjorn-ultimate');
    } catch {}
    
    // AI guard: only use ultimate if at least one friendly turret is in play
    if (window.__ow_aiTriggering || window.__ow_isAITurn) {
        const allyRows = [`${playerNum}f`, `${playerNum}m`, `${playerNum}b`];
        const hasTurret = allyRows.some(r => {
            const row = window.__ow_getRow?.(r);
            return row?.cardIds?.some(cid => (window.__ow_getCard?.(cid)?.id) === 'turret');
        });
        if (!hasTurret) {
            showToast('Torbjörn AI: Skipping ultimate (no turret in play)');
            setTimeout(() => clearToast(), 1500);
            return;
        }
    }

    // Add Forge Hammer effect to Torbjörn's card
    window.__ow_appendCardEffect?.(playerHeroId, {
        id: 'forge-hammer',
        hero: 'torbjorn',
        type: 'persistent',
        sourceCardId: playerHeroId,
        sourceRowId: rowId,
        tooltip: 'Forge Hammer: Friendly turrets deal 2 damage instead of 1 at start of turn',
        visual: 'torbjorn-icon'
    });
    
    // Apply Forge Hammer effect to all existing friendly turrets
    const friendlyRows = [`${playerNum}f`, `${playerNum}m`, `${playerNum}b`];
    
    for (const friendlyRowId of friendlyRows) {
        const row = window.__ow_getRow?.(friendlyRowId);
        if (row && row.cardIds) {
            for (const cardId of row.cardIds) {
                const card = window.__ow_getCard?.(cardId);
                if (card && card.id === 'turret') {
                    window.__ow_appendCardEffect?.(cardId, {
                        id: 'forge-hammer',
                        hero: 'torbjorn',
                        type: 'persistent',
                        sourceCardId: playerHeroId,
                        sourceRowId: rowId,
                        tooltip: 'Forge Hammer: This turret deals 2 damage instead of 1 at start of turn',
                        visual: 'torbjorn-icon'
                    });
                    console.log(`Torbjörn: Applied Forge Hammer to turret ${cardId}`);
                }
            }
        }
    }
    
    showToast('Torbjörn: Forge Hammer active - Turrets enhanced');
    setTimeout(() => clearToast(), 3000);
    
    console.log(`Torbjörn: Forge Hammer activated for player ${playerNum}`);
}

// Cleanup Forge Hammer effect when Torbjörn dies
export function onDeath({ playerHeroId, rowId }) {
    // Remove Forge Hammer effect from Torbjörn's card
    window.__ow_removeCardEffect?.(playerHeroId, 'forge-hammer');
    
    // Remove Forge Hammer effect from all friendly turrets
    const friendlyRows = [`${playerHeroId[0]}f`, `${playerHeroId[0]}m`, `${playerHeroId[0]}b`];
    
    for (const rowId of friendlyRows) {
        const row = window.__ow_getRow?.(rowId);
        if (row && row.cardIds) {
            for (const cardId of row.cardIds) {
                const card = window.__ow_getCard?.(cardId);
                if (card && card.id === 'turret') {
                    window.__ow_removeCardEffect?.(cardId, 'forge-hammer');
                }
            }
        }
    }
    
    console.log(`Torbjörn: Forge Hammer effect removed from all friendly turrets`);
}

export default { onEnter, onUltimate, onDeath, forcePlayTurret };
