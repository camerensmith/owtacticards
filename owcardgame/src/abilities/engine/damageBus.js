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

export function dealDamage(targetCardId, targetRow, amount, ignoreShields = false, sourceCardId = null) {
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
    
    // Check for Hanzo token damage reduction
    let finalAmount = amount;
    if (sourceCardId && window.__ow_getRow) {
        // Find which row the source card is in
        const allRows = ['1f', '1m', '1b', '2f', '2m', '2b'];
        for (const rowId of allRows) {
            const row = window.__ow_getRow(rowId);
            if (row && row.cardIds.includes(sourceCardId)) {
                // Check if this row has a Hanzo token
                if (row.enemyEffects) {
                    const hanzoToken = row.enemyEffects.find(effect => effect.id === 'hanzo-token');
                    if (hanzoToken) {
                        // Check if the source is NOT Turret
                        const sourceCard = window.__ow_getCard?.(sourceCardId);
                        if (sourceCard && !sourceCard.id.includes('turret')) {
                            finalAmount = Math.max(0, amount - hanzoToken.value);
                            console.log(`DamageBus - Hanzo token reduced damage from ${amount} to ${finalAmount} (source in row ${rowId})`);
                        }
                    }
                }
                break;
            }
        }
    }
    
    const damageEvent = { type: 'damage', targetCardId, targetRow, amount: finalAmount, ignoreShields, sourceCardId };
    console.log('DamageBus - Publishing damage event:', damageEvent);
    publish(damageEvent);
}

export default { subscribe, publish, dealDamage };


