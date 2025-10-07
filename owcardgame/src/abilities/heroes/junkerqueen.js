import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';
import { playAudioByKey } from '../../assets/imageImports';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';

// Track total wound damage dealt this round per Junker Queen card
const roundWoundDamageByCard = new Map(); // key: playerHeroId -> number

// Helper: cleanse conditions
function isCleansedByEffects(card) {
    if (!card || !Array.isArray(card.effects)) return false;
    return card.effects.some(e =>
        (e?.id === 'cryo-freeze' && e?.type === 'immunity') ||
        (e?.id === 'immortality-field' && (e?.type === 'invulnerability' || e?.type === 'immunity'))
    );
}

export function onEnter({ playerHeroId, rowId }) {
    try { playAudioByKey('junkerqueen-enter'); console.log('JunkerQueen: enter sound requested'); } catch {}

    // Initialize visible rampage counter on JQ
    try {
        window.__ow_removeCardEffect?.(playerHeroId, 'jq-rampage-counter');
        window.__ow_appendCardEffect?.(playerHeroId, {
            id: 'jq-rampage-counter',
            hero: 'junkerqueen',
            type: 'counter',
            amount: 0,
            tooltip: 'Rampage: Total wound damage this round'
        });
        roundWoundDamageByCard.set(playerHeroId, 0);
    } catch {}

    // Apply Wounds to all enemy unshielded heroes (no card shields; row/column shields don't save them from being wounded)
    const playerNum = parseInt(playerHeroId[0]);
    const enemyPlayer = playerNum === 1 ? 2 : 1;
    const enemyRows = [`${enemyPlayer}f`, `${enemyPlayer}m`, `${enemyPlayer}b`];

    enemyRows.forEach(rid => {
        const row = window.__ow_getRow?.(rid);
        if (!row || !row.cardIds) return;
        // Skip if Sigma Experimental Barrier protects this row
        const hasSigmaBarrier = Array.isArray(row.allyEffects) && row.allyEffects.some(e => e?.id === 'sigma-token' && e?.type === 'barrier' && (e?.shields || 0) > 0);
        if (hasSigmaBarrier) return;

        row.cardIds.forEach(cid => {
            const card = window.__ow_getCard?.(cid);
            if (!card || card.turret === true) return; // skip turrets
            if (card.id === 'junkerqueen') return; // never wound JQ herself
            if (card.health <= 0) return;
            const hasPersonalShield = (card.shield || 0) > 0;
            if (hasPersonalShield) return; // only unshielded heroes

            // Add Wound effect if not present
            const alreadyWounded = Array.isArray(card.effects) && card.effects.some(e => e?.id === 'jq-wound');
            if (!alreadyWounded) {
                console.log('JunkerQueen: applying Wound to', cid, 'in', rid);
                window.__ow_appendCardEffect?.(cid, {
                    id: 'jq-wound',
                    hero: 'junkerqueen',
                    type: 'wound',
                    sourceCardId: playerHeroId,
                    sourceRowId: rowId,
                    tooltip: 'Wound: Cannot gain shields. Takes 1 damage at start of own turn.',
                    visual: 'junkerqueen-icon'
                });
            }
        });
    });
}

// Called at start of each hero's turn by TurnEffectsRunner
export function processWoundsAtTurnStart(currentPlayerNum) {
    const rows = currentPlayerNum === 1 ? ['1f','1m','1b'] : ['2f','2m','2b'];
    rows.forEach(rid => {
        const row = window.__ow_getRow?.(rid);
        if (!row || !row.cardIds) return;
        row.cardIds.forEach(cid => {
            const card = window.__ow_getCard?.(cid);
            if (!card || card.health <= 0) return;
            const wound = Array.isArray(card.effects) && card.effects.find(e => e?.id === 'jq-wound');
            if (!wound) return;

            // Cleanse checks
            if (isCleansedByEffects(card)) {
                window.__ow_removeCardEffect?.(cid, 'jq-wound');
                return;
            }

            // Wounds tick: deal 1 damage piercing all shields/barriers (ignoreShields=true)
            const sourceCardId = wound.sourceCardId;
            dealDamage(cid, rid, 1, true, sourceCardId);
            try { effectsBus.publish(Effects.showDamage(cid, 1)); } catch {}

            // Track total wound damage this round for the Junker Queen who applied it
            if (sourceCardId) {
                // Check if this Junker Queen has already used her ultimate this round
                const sourceCard = window.__ow_getCard?.(sourceCardId);
                if (sourceCard && Array.isArray(sourceCard.effects)) {
                    const ultimateUsed = sourceCard.effects.find(e => e?.id === 'jq-ultimate-used');
                    if (ultimateUsed) {
                        // Ultimate already used, don't count this wound damage
                        return;
                    }
                }
                
                const prev = roundWoundDamageByCard.get(sourceCardId) || 0;
                const next = prev + 1;
                roundWoundDamageByCard.set(sourceCardId, next);
                // Update JQ's visible counter effect (defer to avoid read-only mutations)
                try {
                    window.__ow_removeCardEffect?.(sourceCardId, 'jq-rampage-counter');
                    setTimeout(() => {
                        window.__ow_appendCardEffect?.(sourceCardId, {
                            id: 'jq-rampage-counter',
                            hero: 'junkerqueen',
                            type: 'counter',
                            value: next,
                            amount: next,
                            tooltip: 'Rampage: Total wound damage this round'
                        });
                    }, 10);
                } catch {}
            }
        });
    });
}

// Cleanse integration points
export function cleanseWoundsFromCard(cardId) {
    window.__ow_removeCardEffect?.(cardId, 'jq-wound');
}

export async function onUltimate({ playerHeroId, rowId, cost }) {
    try { playAudioByKey('junkerqueen-ultimate'); } catch {}

    // Determine total damage to distribute this round (use same logic as getRampageTotal)
    let total = 0;
    try {
        const card = window.__ow_getCard?.(playerHeroId);
        if (card && Array.isArray(card.effects)) {
            const counter = card.effects.find(e => e?.id === 'jq-rampage-counter');
            if (counter) {
                total = (typeof counter.value === 'number') ? counter.value : (typeof counter.amount === 'number' ? counter.amount : 0);
            }
        }
    } catch {}
    // Fallback to internal Map
    if (total === 0) {
        total = roundWoundDamageByCard.get(playerHeroId) || 0;
    }
    
    console.log('JunkerQueen Ultimate: total damage to distribute =', total);
    // AI gating: require at least 6 wounds collected before using ultimate
    if ((window.__ow_aiTriggering || window.__ow_isAITurn) && total < 6) {
        showToast('Junker Queen AI: Skipping Rampage (need at least 6 wounds)');
        setTimeout(() => clearToast(), 1500);
        return;
    }
    if (total <= 0) return;

    // Gather all living enemies
    const playerNum = parseInt(playerHeroId[0]);
    const enemyPlayer = playerNum === 1 ? 2 : 1;
    const enemyRows = [`${enemyPlayer}f`, `${enemyPlayer}m`, `${enemyPlayer}b`];
    const livingEnemies = [];
    enemyRows.forEach(rid => {
        const row = window.__ow_getRow?.(rid);
        if (!row || !row.cardIds) return;
        row.cardIds.forEach(cid => {
            const card = window.__ow_getCard?.(cid);
            if (card && card.health > 0) livingEnemies.push({ cardId: cid, rowId: rid });
        });
    });
    if (livingEnemies.length === 0) return;

    // Split as evenly as possible
    const base = Math.floor(total / livingEnemies.length);
    let remainder = total % livingEnemies.length;

    // Damage over ~3 seconds like Roadhog: interval based on total instances
    const instances = livingEnemies.length; // one hit per enemy (base + maybe +1)
    const duration = 3000;
    const interval = Math.max(80, Math.floor(duration / instances));

    livingEnemies.forEach((enemy, index) => {
        const dmg = base + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder -= 1;
        if (dmg <= 0) return;
        setTimeout(() => {
            // Rampage respects shields/modifiers (ignoreShields=false)
            dealDamage(enemy.cardId, enemy.rowId, dmg, false, playerHeroId);
            try { effectsBus.publish(Effects.showDamage(enemy.cardId, dmg)); } catch {}
        }, index * interval);
    });

    // Cleanup: remove all Wounds applied by this JQ and reset counter
    enemyRows.forEach(rid => {
        const row = window.__ow_getRow?.(rid);
        if (!row || !row.cardIds) return;
        row.cardIds.forEach(cid => {
            const card = window.__ow_getCard?.(cid);
            if (!card || !Array.isArray(card.effects)) return;
            const wound = card.effects.find(e => e?.id === 'jq-wound' && e?.sourceCardId === playerHeroId);
            if (wound) window.__ow_removeCardEffect?.(cid, 'jq-wound');
        });
    });

    roundWoundDamageByCard.set(playerHeroId, 0);
    try {
        window.__ow_removeCardEffect?.(playerHeroId, 'jq-rampage-counter');
        window.__ow_appendCardEffect?.(playerHeroId, {
            id: 'jq-rampage-counter',
            hero: 'junkerqueen',
            type: 'counter',
            value: 0,
            amount: 0,
            tooltip: 'Rampage: Ultimate used this round'
        });
        // Mark that ultimate has been used this round
        window.__ow_appendCardEffect?.(playerHeroId, {
            id: 'jq-ultimate-used',
            hero: 'junkerqueen',
            type: 'flag',
            tooltip: 'Ultimate used this round'
        });
    } catch {}
}

// Round cleanup
export function onRoundStart() {
    // reset counters at new round
    roundWoundDamageByCard.clear();
    // Also clean up ultimate-used flags for all Junker Queens
    const allRows = ['1f', '1m', '1b', '2f', '2m', '2b'];
    allRows.forEach(rId => {
        const row = window.__ow_getRow?.(rId);
        if (row && row.cardIds) {
            row.cardIds.forEach(cid => {
                const card = window.__ow_getCard?.(cid);
                if (card && card.id === 'junkerqueen') {
                    try {
                        window.__ow_removeCardEffect?.(cid, 'jq-ultimate-used');
                    } catch {}
                }
            });
        }
    });
}

export default { onEnter, onUltimate, processWoundsAtTurnStart, cleanseWoundsFromCard, onRoundStart };

// Helper for UI overlays
export function getRampageTotal(playerHeroId) {
    // Try to read from card effect first (for UI consistency)
    try {
        const card = window.__ow_getCard?.(playerHeroId);
        if (card && Array.isArray(card.effects)) {
            const counter = card.effects.find(e => e?.id === 'jq-rampage-counter');
            if (counter) {
                return (typeof counter.value === 'number') ? counter.value : (typeof counter.amount === 'number' ? counter.amount : 0);
            }
        }
    } catch {}
    // Fallback to internal Map
    return roundWoundDamageByCard.get(playerHeroId) || 0;
}


