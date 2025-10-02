import { dealDamage } from '../engine/damageBus';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { playAudioByKey } from '../../assets/imageImports';

// Protective Barrier - onEnter
export async function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    try { playAudioByKey('orisa-enter'); } catch {}
    
    // Apply Protective Barrier effect to Orisa's row
    const barrierEffect = {
        id: 'orisa-barrier',
        type: 'damageReduction',
        value: 1,
        source: 'orisa',
        sourceCardId: playerHeroId, // CRITICAL: Mark as tethered to Orisa
        hero: 'protectivebarrier', // This will look for 'protectivebarrier-icon' in heroIconImages
        tooltip: 'Protective Barrier: All heroes in this row take 1 less damage from attacks (minimum 1)'
    };
    
    if (window.__ow_appendRowEffect) {
        window.__ow_appendRowEffect(rowId, 'allyEffects', barrierEffect);
        showToast('Orisa: Protective Barrier applied to row');
        setTimeout(() => clearToast(), 2000);
    }
}

// Supercharger - Ultimate
export async function onUltimate({ playerHeroId, rowId, cost }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    try { playAudioByKey('orisa-ultimate'); } catch {}
    
    // Place Supercharger token on Orisa's current row
    const superchargerEffect = {
        id: 'orisa-supercharger',
        type: 'synergyBoost',
        value: 1, // +1 per hero
        source: 'orisa',
        sourceCardId: playerHeroId, // CRITICAL: Mark as tethered to Orisa
        hero: 'orisa', // This will look for 'orisa-icon' in heroIconImages
        tooltip: 'Supercharger: +1 Synergy per Hero in this row'
    };
    
    if (window.__ow_appendRowEffect) {
        window.__ow_appendRowEffect(rowId, 'allyEffects', superchargerEffect);
        showToast('Orisa: Supercharger deployed!');
        setTimeout(() => clearToast(), 2000);
    }
}

// Update Supercharger synergy based on living heroes in row
export function updateSuperchargerSynergy(rowId) {
    const row = window.__ow_getRow?.(rowId);
    if (!row) return;
    
    // Count living heroes in the row (including Nemesis, MEKA, BOB, but not turret)
    const livingHeroes = row.cardIds.filter(cardId => {
        const card = window.__ow_getCard?.(cardId);
        if (!card || card.health <= 0) return false;
        // Exclude turret
        if (card.id === 'turret') return false;
        return true;
    }).length;
    
    // Calculate base synergy from cards
    let baseSynergy = 0;
    for (const cardId of row.cardIds) {
        const card = window.__ow_getCard?.(cardId);
        if (card && card.health > 0) {
            // Get synergy based on row position
            const rowPosition = rowId[1]; // 'f', 'm', or 'b'
            const synergyKey = `front_synergy`;
            const middleKey = `middle_synergy`;
            const backKey = `back_synergy`;
            
            // This is a simplified approach - in a real implementation,
            // we'd need to get the hero data and calculate based on position
            // For now, we'll add 1 per living hero as the Supercharger boost
        }
    }
    
    // Apply Supercharger boost: +1 synergy per living hero
    const superchargerBoost = livingHeroes;
    
    // Update the row's synergy (this would need to be implemented in the synergy system)
    if (window.__ow_updateSynergy) {
        // This is a placeholder - the actual synergy calculation would need to be more complex
        console.log(`Orisa Supercharger: Adding ${superchargerBoost} synergy to row ${rowId} (${livingHeroes} living heroes)`);
    }
}

// Move Protective Barrier when Orisa moves rows
export function onMove({ playerHeroId, fromRowId, toRowId }) {
    // Remove Protective Barrier from old row and add to new row
    if (window.__ow_removeRowEffect && window.__ow_appendRowEffect) {
        // Remove from old row
        window.__ow_removeRowEffect(fromRowId, 'allyEffects', 'orisa-barrier');
        
        // Add to new row
        const barrierEffect = {
            id: 'orisa-barrier',
            type: 'damageReduction',
            value: 1,
            source: 'orisa',
            sourceCardId: playerHeroId, // CRITICAL: Mark as tethered to Orisa
            hero: 'protectivebarrier', // This will look for 'protectivebarrier-icon' in heroIconImages
            tooltip: 'Protective Barrier: All heroes in this row take 1 less damage from attacks (minimum 1)'
        };
        window.__ow_appendRowEffect(toRowId, 'allyEffects', barrierEffect);
    }
}

// Cleanup on death
export function onDeath({ playerHeroId, rowId }) {
    // Remove Protective Barrier and Supercharger from all rows
    if (window.__ow_removeRowEffect) {
        // Find all rows and remove Orisa effects
        const allRows = ['1f', '1m', '1b', '2f', '2m', '2b'];
        allRows.forEach(rowId => {
            window.__ow_removeRowEffect(rowId, 'allyEffects', 'orisa-barrier');
            window.__ow_removeRowEffect(rowId, 'allyEffects', 'orisa-supercharger');
        });
    }
}

export default {
    onEnter,
    onUltimate,
    onDeath,
    onMove,
    updateSuperchargerSynergy
};
