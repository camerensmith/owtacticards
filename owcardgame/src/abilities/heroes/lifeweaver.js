import { dealDamage } from '../engine/damageBus';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { playAudioByKey } from '../../assets/imageImports';

// Life Grip - Pull most damaged friendly unit into Lifeweaver's row
export function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    // Play enter sound
    try {
        playAudioByKey('lifeweaver-enter');
    } catch {}
    
    // Find the most damaged friendly unit
    const mostDamagedUnit = findMostDamagedFriendlyUnit(playerNum);
    
    if (!mostDamagedUnit) {
        showToast('Lifeweaver: No damaged friendly units found');
        setTimeout(() => clearToast(), 1500);
        return;
    }
    
    // Check if Lifeweaver's row is full
    if (window.__ow_isRowFull?.(rowId)) {
        showToast('Lifeweaver: Row is full, cannot pull unit');
        setTimeout(() => clearToast(), 1500);
        return;
    }
    
    // Move the unit to Lifeweaver's row
    window.__ow_moveCardToRow?.(mostDamagedUnit.cardId, rowId);
    
    // Give the unit 1 shield
    const currentShield = mostDamagedUnit.card.shield || 0;
    const newShield = Math.min(currentShield + 1, 3); // Max 3 shields
    window.__ow_dispatchShieldUpdate?.(mostDamagedUnit.cardId, newShield);
    
    showToast(`Lifeweaver: Pulled ${mostDamagedUnit.card.name} and gave them 1 shield`);
    setTimeout(() => clearToast(), 2000);
}

// Tree of Life - Give temporary HP to Lifeweaver and adjacent friendly heroes
export function onUltimate({ playerHeroId, rowId, cost }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    // Play ultimate sound
    try {
        playAudioByKey('lifeweaver-ultimate');
    } catch {}
    
    // Get Lifeweaver's column index
    const lifeweaverRow = window.__ow_getRow?.(rowId);
    const lifeweaverIndex = lifeweaverRow.cardIds.indexOf(playerHeroId);
    
    // Find all friendly heroes in adjacent positions
    const targets = [];
    
    // Add Lifeweaver himself
    targets.push({ cardId: playerHeroId, rowId: rowId });
    
    // Add heroes in same row (left and right)
    if (lifeweaverIndex > 0) {
        const leftCardId = lifeweaverRow.cardIds[lifeweaverIndex - 1];
        if (leftCardId) {
            targets.push({ cardId: leftCardId, rowId: rowId });
        }
    }
    if (lifeweaverIndex < lifeweaverRow.cardIds.length - 1) {
        const rightCardId = lifeweaverRow.cardIds[lifeweaverIndex + 1];
        if (rightCardId) {
            targets.push({ cardId: rightCardId, rowId: rowId });
        }
    }
    
    // Add heroes in front and back rows (same column)
    const frontRowId = `${playerNum}f`;
    const backRowId = `${playerNum}b`;
    
    // Front row
    const frontRow = window.__ow_getRow?.(frontRowId);
    if (frontRow && frontRow.cardIds[lifeweaverIndex]) {
        targets.push({ cardId: frontRow.cardIds[lifeweaverIndex], rowId: frontRowId });
    }
    
    // Back row
    const backRow = window.__ow_getRow?.(backRowId);
    if (backRow && backRow.cardIds[lifeweaverIndex]) {
        targets.push({ cardId: backRow.cardIds[lifeweaverIndex], rowId: backRowId });
    }
    
    // Apply temporary HP to all targets
    targets.forEach(target => {
        applyTemporaryHP(target.cardId, target.rowId, playerNum);
    });
    
    showToast(`Lifeweaver: Tree of Life activated - ${targets.length} heroes gained temporary HP`);
    setTimeout(() => clearToast(), 2000);
}

// Find the most damaged friendly unit across all friendly rows
function findMostDamagedFriendlyUnit(playerNum) {
    const friendlyRows = [`${playerNum}f`, `${playerNum}m`, `${playerNum}b`];
    let mostDamaged = null;
    let lowestHealthPercentage = 1.0; // Start with 100% health
    
    friendlyRows.forEach(rowId => {
        const row = window.__ow_getRow?.(rowId);
        if (!row || !row.cardIds) return;
        
        row.cardIds.forEach(cardId => {
            const card = window.__ow_getCard?.(cardId);
            if (!card || card.health <= 0) return; // Skip dead cards
            
            // Skip turrets - they cannot be moved or given shields
            if (card.turret === true) {
                console.log(`Lifeweaver: Skipping turret ${cardId} - turrets cannot be pulled`);
                return;
            }
            
            const maxHealth = window.__ow_getMaxHealth?.(cardId) || card.health;
            const healthPercentage = card.health / maxHealth;
            
            // If this unit is more damaged than our current most damaged
            if (healthPercentage < lowestHealthPercentage) {
                lowestHealthPercentage = healthPercentage;
                mostDamaged = { cardId, card, rowId };
            }
        });
    });
    
    return mostDamaged;
}

// Apply temporary HP effect to a card
function applyTemporaryHP(cardId, rowId, playerNum) {
    const card = window.__ow_getCard?.(cardId);
    if (!card || card.health <= 0) return;
    
    // Add temporary HP effect
    window.__ow_appendCardEffect?.(cardId, {
        id: 'tree-of-life-temp-hp',
        hero: 'lifeweaver',
        type: 'temporaryHP',
        value: 1,
        sourceCardId: cardId,
        sourceRowId: rowId,
        sourcePlayerNum: playerNum, // Track which player used the ultimate
        tooltip: 'Tree of Life: +1 temporary HP until start of next turn',
        visual: 'temp-hp'
    });
    
    // Update the card's health display to show temporary HP
    updateTemporaryHPDisplay(cardId, playerNum);
}

// Update the visual display to show temporary HP in green
function updateTemporaryHPDisplay(cardId, playerNum) {
    const card = window.__ow_getCard?.(cardId);
    if (!card) return;
    
    const currentHealth = card.health;
    const tempHP = currentHealth + 1; // Current health + 1 temporary
    
    // Store the temporary HP value for display
    window.__ow_appendCardEffect?.(cardId, {
        id: 'temp-hp-display',
        hero: 'lifeweaver',
        type: 'display',
        tempHP: tempHP,
        originalHealth: currentHealth,
        sourcePlayerNum: playerNum // Track which player used the ultimate
    });
}

// Cleanup temporary HP effects at turn start
export function cleanupTemporaryHP(gameState, currentPlayerTurn) {
    console.log(`Lifeweaver: Starting temporary HP cleanup for player ${currentPlayerTurn}`);
    
    let foundAnyTempHP = false;
    
    // Check all player cards (both players)
    for (let playerNum = 1; playerNum <= 2; playerNum++) {
        const playerCards = gameState.playerCards[`player${playerNum}cards`];
        if (!playerCards || !playerCards.cards) continue;
        
        Object.keys(playerCards.cards).forEach(cardId => {
            const card = playerCards.cards[cardId];
            if (!card || !Array.isArray(card.effects)) return;
            
            // Check if this card has temporary HP effect (check both effect types)
            const mainEffect = card.effects.find(effect => 
                effect?.id === 'tree-of-life-temp-hp' && effect?.type === 'temporaryHP'
            );
            const displayEffect = card.effects.find(effect => 
                effect?.id === 'temp-hp-display' && effect?.type === 'display'
            );
            
            // Only clean up if it's the source player's turn
            const shouldCleanup = (mainEffect && mainEffect.sourcePlayerNum === currentPlayerTurn) ||
                                 (displayEffect && displayEffect.sourcePlayerNum === currentPlayerTurn);
            
            if (shouldCleanup) {
                foundAnyTempHP = true;
                console.log(`Lifeweaver: Found temporary HP on ${cardId} (${card.name}) from player ${currentPlayerTurn}`);
                console.log(`Lifeweaver: Has main effect: ${!!mainEffect}, Has display effect: ${!!displayEffect}`);
                console.log(`Lifeweaver: Card effects before removal:`, card.effects);
                
                // Remove temporary HP effects
                if (mainEffect) {
                    window.__ow_removeCardEffect?.(cardId, 'tree-of-life-temp-hp');
                }
                if (displayEffect) {
                    window.__ow_removeCardEffect?.(cardId, 'temp-hp-display');
                }
                
                // Check if effects were actually removed
                setTimeout(() => {
                    const updatedCard = window.__ow_getCard?.(cardId);
                    console.log(`Lifeweaver: Card effects after removal:`, updatedCard?.effects);
                }, 100);
            }
        });
    }
    
    if (!foundAnyTempHP) {
        console.log('Lifeweaver: No temporary HP effects found to clean up for player', currentPlayerTurn);
    }
    
    console.log('Lifeweaver: Temporary HP cleanup completed');
}

export default { onEnter, onUltimate, cleanupTemporaryHP };
