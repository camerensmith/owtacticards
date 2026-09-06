import { dealDamage } from '../engine/damageBus';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { playAudioByKey } from '../../assets/imageImports';
import {
    SUPERCHARGER_ROW_ID,
    SUPERCHARGER_BUFF_ID,
    createSuperchargerBuff,
    isSupercharged,
    rowHasSupercharger,
    livingHeroIdsForSupercharger,
    shouldApplySuperchargerOnEnter,
} from '../../game/orisaRules';

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

function grantSuperchargerBuff(cardId) {
    const card = window.__ow_getCard?.(cardId);
    if (!card || !(card.health > 0) || card.id === 'turret') return;
    if (isSupercharged(card)) return;
    window.__ow_appendCardEffect?.(cardId, createSuperchargerBuff());
}

function stripSuperchargerBuff(cardId) {
    if (!isSupercharged(window.__ow_getCard?.(cardId))) return;
    window.__ow_removeCardEffect?.(cardId, SUPERCHARGER_BUFF_ID);
}

/** Charge every living hero currently on the row. */
export function syncSuperchargerBuffs(rowId) {
    const row = window.__ow_getRow?.(rowId);
    if (!rowHasSupercharger(row)) {
        clearSuperchargerBuffsOnRow(rowId);
        return;
    }
    const living = new Set(livingHeroIdsForSupercharger(row, (id) => window.__ow_getCard?.(id)));
    for (const cardId of row.cardIds || []) {
        if (living.has(cardId)) grantSuperchargerBuff(cardId);
        else stripSuperchargerBuff(cardId);
    }
}

export function clearSuperchargerBuffsOnRow(rowId) {
    const row = window.__ow_getRow?.(rowId);
    for (const cardId of row?.cardIds || []) {
        stripSuperchargerBuff(cardId);
    }
}

/** Hero entered a Supercharged row — grant the +1 power mark. */
export function applySuperchargerEnter(cardId, rowId) {
    if (!shouldApplySuperchargerOnEnter({
        cardId,
        rowId,
        getRow: (id) => window.__ow_getRow?.(id),
    })) return;
    grantSuperchargerBuff(cardId);
}

/** Hero left a board row — drop the mark if they had it. */
export function applySuperchargerLeave(cardId, rowId) {
    if (!cardId || !rowId || rowId[0] === 'p') return;
    stripSuperchargerBuff(cardId);
}

// Supercharger - Ultimate
export async function onUltimate({ playerHeroId, rowId, cost }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    try { playAudioByKey('orisa-ultimate'); } catch {}

    // AI gating: only use if 3+ living heroes in Orisa's current row
    if (window.__ow_aiTriggering || window.__ow_isAITurn) {
        const currentRow = window.__ow_getRow?.(rowId);
        const livingHeroes = livingHeroIdsForSupercharger(
            currentRow,
            (id) => window.__ow_getCard?.(id),
        ).length;
        if (livingHeroes < 3) {
            showToast('Orisa AI: Skipping Supercharger (need 3+ heroes in row)');
            setTimeout(() => clearToast(), 1500);
            return;
        }
    }
    
    // Place Supercharger token on Orisa's current row
    const superchargerEffect = {
        id: SUPERCHARGER_ROW_ID,
        type: 'powerBoost',
        value: 1, // +1 power per hero
        source: 'orisa',
        sourceCardId: playerHeroId,
        hero: 'orisa',
        on: 'turnstart',
        tooltip: 'Supercharger: +1 Power to each Hero in this row'
    };
    
    if (window.__ow_appendRowEffect) {
        window.__ow_appendRowEffect(rowId, 'allyEffects', superchargerEffect);
        syncSuperchargerBuffs(rowId);
        showToast('Orisa: Supercharger deployed — +1 Power per hero!');
        setTimeout(() => clearToast(), 2000);
    }
}

/** @deprecated name kept for TurnEffectsRunner — syncs power buffs */
export function updateSuperchargerSynergy(rowId) {
    syncSuperchargerBuffs(rowId);
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
        allRows.forEach(rid => {
            clearSuperchargerBuffsOnRow(rid);
            window.__ow_removeRowEffect(rid, 'allyEffects', 'orisa-barrier');
            window.__ow_removeRowEffect(rid, 'allyEffects', SUPERCHARGER_ROW_ID);
        });
    }
}

export default {
    onEnter,
    onUltimate,
    onDeath,
    onMove,
    updateSuperchargerSynergy,
    syncSuperchargerBuffs,
    applySuperchargerEnter,
    applySuperchargerLeave,
    clearSuperchargerBuffsOnRow,
};
