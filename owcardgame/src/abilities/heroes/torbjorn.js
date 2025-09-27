import { playAudioByKey } from '../../assets/imageImports';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';

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
}

// Forge Hammer - Turret now does 2 damage to two Heroes, regardless of row
export async function onUltimate({ playerHeroId, rowId, cost }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    // Play ultimate sound
    try {
        playAudioByKey('torbjorn-ultimate');
    } catch {}
    
    // Add Forge Hammer effect to Torbjörn's card
    window.__ow_appendCardEffect?.(playerHeroId, {
        id: 'forge-hammer',
        hero: 'torbjorn',
        type: 'persistent',
        sourceCardId: playerHeroId,
        sourceRowId: rowId,
        tooltip: 'Forge Hammer: Friendly turrets deal 2 damage to 2 enemies at start of turn',
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
                        tooltip: 'Forge Hammer: This turret deals 2 damage to 2 enemies at start of turn',
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

export default { onEnter, onUltimate, onDeath };
