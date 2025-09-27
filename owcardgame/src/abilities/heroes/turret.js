import { playAudioByKey } from '../../assets/imageImports';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';

// Deployment - Immobile and cannot receive Shields or Healing effects
export async function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    // Play enter sound
    try {
        playAudioByKey('turret-enter');
    } catch {}
    
    // Add immobility effect to turret
    window.__ow_appendCardEffect?.(playerHeroId, {
        id: 'turret-immobile',
        hero: 'turret',
        type: 'immobile',
        sourceCardId: playerHeroId,
        sourceRowId: rowId,
        tooltip: 'Turret: Immobile - cannot be moved, healed, or shielded'
    });
    
    // Check if Torbjörn has Forge Hammer active and apply it to this turret
    const friendlyRows = [`${playerNum}f`, `${playerNum}m`, `${playerNum}b`];
    let forgeHammerActive = false;
    
    for (const friendlyRowId of friendlyRows) {
        const row = window.__ow_getRow?.(friendlyRowId);
        if (row && row.cardIds) {
            for (const cardId of row.cardIds) {
                const card = window.__ow_getCard?.(cardId);
                if (card && card.id === 'torbjorn' && Array.isArray(card.effects)) {
                    const hasForgeHammer = card.effects.some(effect => 
                        effect?.id === 'forge-hammer' && effect?.hero === 'torbjorn'
                    );
                    if (hasForgeHammer) {
                        forgeHammerActive = true;
                        // Apply Forge Hammer effect to this turret
                        window.__ow_appendCardEffect?.(playerHeroId, {
                            id: 'forge-hammer',
                            hero: 'torbjorn',
                            type: 'persistent',
                            sourceCardId: cardId,
                            sourceRowId: friendlyRowId,
                            tooltip: 'Forge Hammer: This turret deals 2 damage to 2 enemies at start of turn',
                            visual: 'torbjorn-icon'
                        });
                        console.log(`Turret: Applied Forge Hammer from Torbjörn ${cardId}`);
                        break;
                    }
                }
            }
        }
        if (forgeHammerActive) break;
    }
    
    showToast('Turret: Deployed - Immobile and ready to fire');
    setTimeout(() => clearToast(), 2000);
    
    console.log(`Turret: Deployed at ${rowId} for player ${playerNum}`);
}

// Turret turn-based damage system
export function processTurretDamage(gameState, currentPlayerTurn) {
    const allRows = ['1f', '1m', '1b', '2f', '2m', '2b'];
    
    for (const rowId of allRows) {
        const row = gameState.rows[rowId];
        if (!row || !row.cardIds) continue;
        
        for (const cardId of row.cardIds) {
            const card = gameState.playerCards[`player${currentPlayerTurn}cards`]?.cards?.[cardId];
            if (!card || card.id !== 'turret' || card.health <= 0) continue;
            
            // Determine opposite row
            const rowPlayerNum = parseInt(rowId[0]);
            const oppositePlayerNum = rowPlayerNum === 1 ? 2 : 1;
            const rowPosition = rowId[1]; // f, m, or b
            const oppositeRowId = `${oppositePlayerNum}${rowPosition}`;
            
            // Get enemies in opposite row
            const oppositeRow = gameState.rows[oppositeRowId];
            if (!oppositeRow || !oppositeRow.cardIds || oppositeRow.cardIds.length === 0) {
                console.log(`Turret: No enemies in opposite row ${oppositeRowId}`);
                continue;
            }
            
            // Filter living enemies
            const livingEnemies = oppositeRow.cardIds.filter(enemyCardId => {
                const enemyCard = gameState.playerCards[`player${oppositePlayerNum}cards`]?.cards?.[enemyCardId];
                return enemyCard && enemyCard.health > 0;
            });
            
            if (livingEnemies.length === 0) {
                console.log(`Turret: No living enemies in opposite row ${oppositeRowId}`);
                continue;
            }
            
            // Check if turret has Forge Hammer effect
            const hasForgeHammer = Array.isArray(card.effects) && 
                card.effects.some(effect => effect?.id === 'forge-hammer');
            
            if (hasForgeHammer) {
                // Forge Hammer: 2 damage to 2 different enemies
                const targets = livingEnemies.slice(0, 2); // Take up to 2 enemies
                
                for (const targetCardId of targets) {
                    dealDamage(targetCardId, oppositeRowId, 2, false, cardId, false);
                    effectsBus.publish(Effects.showDamage(targetCardId, 2));
                    console.log(`Turret (Forge Hammer): Dealt 2 damage to ${targetCardId}`);
                }
                
                // Play turret fire sound
                try {
                    playAudioByKey('turret-fire');
                } catch {}
                
            } else {
                // Normal turret: 1 damage to 1 random enemy
                const randomIndex = Math.floor(Math.random() * livingEnemies.length);
                const targetCardId = livingEnemies[randomIndex];
                
                dealDamage(targetCardId, oppositeRowId, 1, false, cardId, false);
                effectsBus.publish(Effects.showDamage(targetCardId, 1));
                console.log(`Turret: Dealt 1 damage to ${targetCardId}`);
                
                // Play turret fire sound
                try {
                    playAudioByKey('turret-fire');
                } catch {}
            }
        }
    }
}

// Cleanup when turret dies
export function onDeath({ playerHeroId, rowId }) {
    // Remove all effects from turret
    window.__ow_removeCardEffect?.(playerHeroId, 'turret-immobile');
    window.__ow_removeCardEffect?.(playerHeroId, 'forge-hammer');
    
    console.log(`Turret: Cleaned up effects on death`);
}

export default { onEnter, onDeath };
