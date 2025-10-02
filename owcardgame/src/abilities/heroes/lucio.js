import { showOnEnterChoice } from '../engine/modalController';
import { selectRowTarget } from '../engine/targeting';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { playAudioByKey } from '../../assets/imageImports';
import { dealDamage } from '../engine/damageBus';
import { withAIContext } from '../engine/aiContextHelper';

// onEnter: Crossfade - Choose between movement or token placement
export function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    // Play enter sound
    try {
        playAudioByKey('lucio-enter');
    } catch {}
    
    const opt1 = { 
        name: 'Crossfade (Shuffle)', 
        description: 'Place Lúcio token near a row to shuffle positions at start of each turn' 
    };
    const opt2 = { 
        name: 'Crossfade (Healing)', 
        description: 'Place Lúcio token near friendly row to heal all heroes by 1 each turn' 
    };

    showOnEnterChoice('Lúcio', opt1, opt2, withAIContext(playerHeroId, async (choiceIndex) => {
        // AI preference: if AI is acting, prefer healing if any ally is wounded
        if (window.__ow_isAITurn || window.__ow_aiTriggering) {
            try {
                const allyRows = [`${playerNum}f`, `${playerNum}m`, `${playerNum}b`];
                const wounded = allyRows.some(r => (window.__ow_getRow?.(r)?.cardIds || []).some(id => {
                    const c = window.__ow_getCard?.(id);
                    return c && c.health < (c.maxHealth || c.health);
                }));
                if (wounded) choiceIndex = 1; // Healing
                else choiceIndex = 0; // Shuffle (but will restrict to enemy rows)
            } catch {}
        }
        if (choiceIndex === 0) {
            // Play ability sound immediately on selection
            try {
                playAudioByKey('lucio-ability1');
            } catch {}

            await handleShuffleAbility(playerHeroId, rowId, playerNum);
        } else if (choiceIndex === 1) {
            // Play ability sound immediately on selection
            try {
                playAudioByKey('lucio-ability2');
            } catch {}

            await handleTokenAbility(playerHeroId, rowId, playerNum);
        }
    }));
}

// Crossfade Shuffle: Place token near any row to shuffle positions at turn start
async function handleShuffleAbility(playerHeroId, rowId, playerNum) {
    try {
        showToast('Lúcio: Select any row for shuffle token');

        const targetRow = await selectRowTarget({ allowAnyRow: false, isDebuff: true });
        if (!targetRow) {
            clearToast();
            return;
        }
        
        // Determine if this is an ally or enemy row
        const targetPlayerNum = parseInt(targetRow.rowId[0]);
        const isAllyRow = targetPlayerNum === playerNum;
        if (isAllyRow) {
            showToast('Lúcio: Shuffle targets enemy rows only');
            setTimeout(() => clearToast(), 1500);
            return;
        }
        
        // Place Lúcio shuffle token on the target row
        window.__ow_appendRowEffect?.(targetRow.rowId, 'enemyEffects', {
            id: 'lucio-shuffle-token',
            hero: 'lucio',
            type: 'shuffle',
            sourceCardId: playerHeroId,
            sourceRowId: rowId,
            on: 'turnstart',
            tooltip: 'Lúcio Shuffle: Randomly shuffle positions of all heroes in this row at start of turn',
            visual: 'token'
        });
        
        const rowType = isAllyRow ? 'friendly' : 'enemy';
        showToast(`Lúcio: Shuffle token placed on ${rowType} row - positions will shuffle each turn`);
        setTimeout(() => clearToast(), 2000);
        
    } catch (error) {
        console.error('Lúcio shuffle ability error:', error);
        showToast('Lúcio: Shuffle token placement failed');
        setTimeout(() => clearToast(), 1500);
    }
}

// Crossfade Token: Place token near friendly row for healing
async function handleTokenAbility(playerHeroId, rowId, playerNum) {
    try {
        showToast('Lúcio: Select friendly row for token');

        const targetRow = await selectRowTarget({ isBuff: true });
        if (!targetRow) {
            clearToast();
            return;
        }
        
        // Validate that the target row is on the player's side
        if (!targetRow.rowId.startsWith(playerNum.toString())) {
            showToast('Lúcio: Must select friendly row');
            setTimeout(() => clearToast(), 2000);
            return;
        }
        
        // Place Lúcio token on the target row
        window.__ow_appendRowEffect?.(targetRow.rowId, 'allyEffects', {
            id: 'lucio-token',
            hero: 'lucio',
            type: 'healing',
            sourceCardId: playerHeroId,
            sourceRowId: rowId,
            on: 'turnstart',
            tooltip: 'Lúcio Token: Heal all heroes in this row by 1 HP at start of turn',
            visual: 'token'
        });
        
        showToast('Lúcio: Token placed - row will heal each turn');
        setTimeout(() => clearToast(), 2000);
        
    } catch (error) {
        console.error('Lúcio token ability error:', error);
        showToast('Lúcio: Token placement failed');
        setTimeout(() => clearToast(), 1500);
    }
}

// onUltimate: Sound Barrier (3) - All heroes in row gain 2 shields
export async function onUltimate({ playerHeroId, rowId, cost }) {
    try {
        const playerNum = parseInt(playerHeroId[0]);
        
        // Play ultimate sound immediately
        try {
            playAudioByKey('lucio-ultimate');
        } catch {}
        
        // Get all heroes in Lúcio's current row
        const currentRow = window.__ow_getRow?.(rowId);
        if (!currentRow) return;
        
        // Give 2 shields to all heroes in the row (excluding turrets)
        for (const cardId of currentRow.cardIds) {
            const card = window.__ow_getCard?.(cardId);
            if (card && card.turret === true) {
                console.log(`Lúcio: Skipping turret ${cardId} - turrets cannot receive shields`);
                continue;
            }
            if (card) {
                const currentShield = card.shield || 0;
                const newShield = Math.min(currentShield + 2, 3); // Max 3 shields (except Wrecking Ball)
                
                // Update shield via dispatch
                window.__ow_dispatchShieldUpdate?.(cardId, newShield);
            }
        }
        
        showToast('Lúcio: Sound Barrier - All heroes in row gained 2 shields!');
        setTimeout(() => clearToast(), 2000);
        
    } catch (error) {
        console.error('Lúcio ultimate error:', error);
        showToast('Lúcio: Ultimate failed');
        setTimeout(() => clearToast(), 1500);
    }
}

// onDeath: Clean up Lúcio tokens when he dies
export function onDeath({ playerHeroId, rowId }) {
    try {
        // Remove all Lúcio tokens from all rows
        const rowIds = ['1b', '1m', '1f', '2b', '2m', '2f'];
        rowIds.forEach(rowId => {
            window.__ow_removeRowEffect?.(rowId, 'allyEffects', 'lucio-token');
            window.__ow_removeRowEffect?.(rowId, 'enemyEffects', 'lucio-token');
            window.__ow_removeRowEffect?.(rowId, 'allyEffects', 'lucio-shuffle-token');
            window.__ow_removeRowEffect?.(rowId, 'enemyEffects', 'lucio-shuffle-token');
        });
        console.log(`${playerHeroId} died - Lúcio tokens cleaned up`);
    } catch (error) {
        console.error('Lúcio onDeath error:', error);
    }
}

// Healing function for Lúcio token (called by TurnEffectsRunner)
export function lucioTokenHealing(rowId) {
    try {
        console.log(`Lúcio token healing triggered for row ${rowId}`);
        
        // Get all cards in the row
        const row = window.__ow_getRow?.(rowId);
        if (!row) return;
        
        // Heal all heroes in the row by 1 HP (excluding turrets)
        for (const cardId of row.cardIds) {
            const card = window.__ow_getCard?.(cardId);
            if (card && card.turret === true) {
                console.log(`Lúcio: Skipping turret ${cardId} - turrets cannot be healed`);
                continue;
            }
            if (card && card.health < card.maxHealth) {
                const currentHealth = card.health || 0;
                const maxHealth = card.maxHealth || 3;
                const newHealth = Math.min(currentHealth + 1, maxHealth);
                
                // Update health
                window.__ow_setCardHealth?.(cardId, newHealth);
                
                // Show healing effect
                if (window.effectsBus) {
                    window.effectsBus.publish({
                        type: 'overlay:heal',
                        cardId: cardId,
                        amount: 1
                    });
                }
            }
        }
        
        console.log(`Lúcio token: Healed all heroes in row ${rowId}`);
        
    } catch (error) {
        console.error('Lúcio token healing error:', error);
    }
}

// Shuffle function for Lúcio token (called by TurnEffectsRunner)
export function lucioTokenShuffle(rowId) {
    try {
        console.log(`Lúcio shuffle token triggered for row ${rowId}`);
        
        // Get all cards in the row
        const row = window.__ow_getRow?.(rowId);
        if (!row) {
            console.log(`Lúcio shuffle: No row found for ${rowId}`);
            return;
        }
        
        console.log(`Lúcio shuffle: Row ${rowId} has ${row.cardIds.length} cards:`, row.cardIds);
        
        if (row.cardIds.length <= 1) {
            console.log(`Lúcio shuffle: Not enough cards to shuffle in row ${rowId}`);
            return;
        }
        
        // Create a shuffled copy of the card IDs
        const shuffledCardIds = [...row.cardIds];
        for (let i = shuffledCardIds.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledCardIds[i], shuffledCardIds[j]] = [shuffledCardIds[j], shuffledCardIds[i]];
        }
        
        console.log(`Lúcio shuffle: Original order:`, row.cardIds);
        console.log(`Lúcio shuffle: Shuffled order:`, shuffledCardIds);
        
        // Update the row with shuffled positions
        if (window.__ow_setRowArray) {
            window.__ow_setRowArray(rowId, 'cardIds', shuffledCardIds);
            console.log(`Lúcio shuffle: Called setRowArray for row ${rowId}`);
        } else {
            console.log(`Lúcio shuffle: setRowArray function not available`);
        }
        
        console.log(`Lúcio shuffle: Shuffled ${shuffledCardIds.length} cards in row ${rowId}`);
        
        // Show shuffle effect
        if (window.effectsBus) {
            window.effectsBus.publish({
                type: 'fx:shuffle',
                rowId: rowId,
                cardIds: shuffledCardIds
            });
        }
        
    } catch (error) {
        console.error('Lúcio token shuffle error:', error);
    }
}

export default { onEnter, onUltimate, onDeath, lucioTokenHealing, lucioTokenShuffle };
