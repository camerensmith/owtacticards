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

export function dealDamage(targetCardId, targetRow, amount, ignoreShields = false, sourceCardId = null, fixedDamage = false) {
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
    
    // Check for card effect immunity (Mei Cryo Freeze)
    const targetCard = window.__ow_getCard?.(targetCardId);
    if (targetCard && Array.isArray(targetCard.effects)) {
        const hasImmunity = targetCard.effects.some(effect => 
            effect?.id === 'cryo-freeze' && effect?.type === 'immunity'
        );
        if (hasImmunity) {
            console.log(`DamageBus - Target ${targetCardId} has immunity effect, damage blocked`);
            return; // Block damage if card has immunity effect
        }
    }
    
    // Fixed damage bypasses all modifications but still respects shields
    if (fixedDamage) {
        console.log(`Fixed Damage: ${amount} damage to ${targetCardId} (no modifications)`);
        let finalAmount = amount;
        
        // Still respect shields if not ignoring them
        if (!ignoreShields && finalAmount > 0) {
            const card = window.__ow_getCard?.(targetCardId);
            if (card && card.shield > 0) {
                const shieldAbsorbed = Math.min(finalAmount, card.shield);
                finalAmount = Math.max(0, finalAmount - shieldAbsorbed);
                
                // Update shield count
                window.__ow_dispatchShieldUpdate?.(targetCardId, card.shield - shieldAbsorbed);
                console.log(`Fixed Damage - Shields absorbed ${shieldAbsorbed}, remaining damage: ${finalAmount}`);
            }
        }
        
        // Apply remaining damage to health
        if (finalAmount > 0) {
            const card = window.__ow_getCard?.(targetCardId);
            if (card) {
                const newHealth = Math.max(0, card.health - finalAmount);
                window.__ow_setCardHealth?.(targetCardId, newHealth);
                console.log(`Fixed Damage - Applied ${finalAmount} damage to health (${card.health} → ${newHealth})`);
            }
        }
        
        // Publish damage event for consistency
        const damageEvent = { 
            type: 'damage', 
            targetCardId, 
            targetRow, 
            amount: finalAmount, 
            ignoreShields, 
            sourceCardId,
            fixedDamage: true 
        };
        console.log('DamageBus - Publishing fixed damage event:', damageEvent);
        publish(damageEvent);
        return;
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
    
    // Check for Mercy damage boost on source card
    if (sourceCardId) {
        const sourceCard = window.__ow_getCard?.(sourceCardId);
        if (sourceCard && Array.isArray(sourceCard.effects)) {
            const mercyDamageBoost = sourceCard.effects.find(effect => 
                effect?.id === 'mercy-damage' && effect?.type === 'damageBoost'
            );
            if (mercyDamageBoost) {
                finalAmount += mercyDamageBoost.value || 1;
                console.log(`DamageBus - Mercy damage boost added ${mercyDamageBoost.value || 1} damage (total: ${finalAmount})`);
            }
        }
    }
    
    // Check for Orisa Protective Barrier damage reduction
    if (window.__ow_getRow) {
        const targetRowData = window.__ow_getRow(targetRow);
        if (targetRowData && targetRowData.allyEffects) {
            const barrierEffect = targetRowData.allyEffects.find(effect => 
                effect?.id === 'orisa-barrier' && effect?.type === 'damageReduction'
            );
            if (barrierEffect) {
                // Apply damage reduction with minimum of 1
                const originalAmount = finalAmount;
                finalAmount = Math.max(1, finalAmount - barrierEffect.value);
                console.log(`DamageBus - Orisa Protective Barrier reduced damage from ${originalAmount} to ${finalAmount} (minimum 1)`);
            }
        }
    }
    
    // Check for Reinhardt Barrier Field damage absorption
    let absorbedAmount = 0;
    if (finalAmount > 0 && window.__ow_getRow) {
        // Find all Reinhardt cards that might absorb this damage
        const allRows = ['1f', '1m', '1b', '2f', '2m', '2b'];
        for (const rowId of allRows) {
            const row = window.__ow_getRow(rowId);
            if (row && row.cardIds) {
                for (const cardId of row.cardIds) {
                    const card = window.__ow_getCard?.(cardId);
                    if (card && card.id === 'reinhardt' && Array.isArray(card.effects)) {
                        const barrierEffect = card.effects.find(effect => 
                            effect?.id === 'barrier-field' && effect?.type === 'barrier'
                        );
                        if (barrierEffect && barrierEffect.absorbing) {
                            console.log(`DamageBus - Found Reinhardt with absorbing barrier effect:`, barrierEffect);
                            // Check if this Reinhardt should absorb damage for the target
                            const reinhardtFunctions = window.__ow_getReinhardtFunctions?.();
                            console.log(`DamageBus - Reinhardt functions:`, reinhardtFunctions);
                            const { shouldAbsorbDamage, absorbDamage } = reinhardtFunctions || {};
                            if (shouldAbsorbDamage && shouldAbsorbDamage(cardId, targetCardId, targetRow)) {
                                console.log(`DamageBus - Reinhardt should absorb damage for ${targetCardId}`);
                                const absorbed = absorbDamage ? absorbDamage(cardId, finalAmount) : 0;
                                absorbedAmount += absorbed;
                                finalAmount = Math.max(0, finalAmount - absorbed);
                                console.log(`DamageBus - Reinhardt absorbed ${absorbed} damage, remaining: ${finalAmount}`);
                            } else {
                                console.log(`DamageBus - Reinhardt should NOT absorb damage for ${targetCardId}`);
                            }
                        } else {
                            console.log(`DamageBus - Reinhardt barrier effect not absorbing:`, barrierEffect);
                            console.log(`DamageBus - barrierEffect.absorbing value:`, barrierEffect.absorbing);
                            console.log(`DamageBus - barrierEffect.absorbing type:`, typeof barrierEffect.absorbing);
                        }
                    }
                }
            }
        }
    }
    
    // Check for Sigma Token shield absorption
    if (finalAmount > 0 && window.__ow_getRow) {
        // Check if target is in a row with Sigma Token
        const targetRowData = window.__ow_getRow(targetRow);
        if (targetRowData && targetRowData.allyEffects) {
            const sigmaToken = targetRowData.allyEffects.find(effect => 
                effect?.id === 'sigma-token' && effect?.type === 'barrier'
            );
            
            if (sigmaToken && sigmaToken.shields > 0) {
                const shieldsToUse = Math.min(finalAmount, sigmaToken.shields);
                finalAmount = Math.max(0, finalAmount - shieldsToUse);
                absorbedAmount += shieldsToUse;
                
                // Update Sigma Token shields
                const newShieldCount = sigmaToken.shields - shieldsToUse;
                
                // Remove old effect and add updated one
                window.__ow_removeRowEffect?.(targetRow, 'allyEffects', 'sigma-token');
                
                if (newShieldCount > 0) {
                    // Add updated effect with new shield count
                    setTimeout(() => {
                        window.__ow_appendRowEffect?.(targetRow, 'allyEffects', {
                            ...sigmaToken,
                            shields: newShieldCount
                        });
                    }, 10);
                }
                
                console.log(`DamageBus - Sigma Token absorbed ${shieldsToUse} damage, remaining shields: ${newShieldCount}`);
            }
        }
    }
    
    const damageEvent = { type: 'damage', targetCardId, targetRow, amount: finalAmount, ignoreShields, sourceCardId, absorbedAmount };
    console.log('DamageBus - Publishing damage event:', damageEvent);
    publish(damageEvent);
}

export default { subscribe, publish, dealDamage };


