// Central damage bus: decouples hero modules from UI/components.
// Publish a damage intent; HeroAbilities subscribes and applies real damage.

const listeners = new Set();

export function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function publish(event) {
    // Expected shape: { type: 'damage', targetCardId, targetRow, amount, ignoreShields }
    for (const l of listeners) {
        try { l(event); } catch (e) {}
    }
}

export function dealDamage(targetCardId, targetRow, amount, ignoreShields = false) {
    // Check if the target slot is invulnerable
    if (window.__ow_isSlotInvulnerable) {
        const row = window.__ow_getRow?.(targetRow);
        if (row) {
            const cardIndex = row.cardIds.indexOf(targetCardId);
            console.log(`DamageBus - Checking invulnerability for ${targetCardId} at index ${cardIndex} in row ${targetRow}`, {
                cardIds: row.cardIds,
                targetCardId,
                cardIndex
            });
            if (cardIndex !== -1 && window.__ow_isSlotInvulnerable(targetRow, cardIndex)) {
                console.log(`DamageBus - Target ${targetCardId} is invulnerable, damage blocked`);
                return; // Block damage if slot is invulnerable
            } else {
                console.log(`DamageBus - Target ${targetCardId} is NOT invulnerable, proceeding with damage`);
            }
        }
    }
    
    const damageEvent = { type: 'damage', targetCardId, targetRow, amount, ignoreShields };
    console.log('DamageBus - Publishing damage event:', damageEvent);
    publish(damageEvent);
}

export default { subscribe, publish, dealDamage };


