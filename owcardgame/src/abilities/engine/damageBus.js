// Central damage bus: decouples hero modules from UI/components.
import effectsBus, { Effects } from './effectsBus';
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
    
    // Check for card effect immunity (Mei Cryo Freeze, Zenyatta Transcendence)
    const targetCard = window.__ow_getCard?.(targetCardId);
    if (targetCard && Array.isArray(targetCard.effects)) {
        const hasImmunity = targetCard.effects.some(effect => 
            (effect?.id === 'cryo-freeze' && effect?.type === 'immunity') ||
            (effect?.hero === 'zenyatta' && effect?.type === 'immunity')
        );
        if (hasImmunity) {
            console.log(`DamageBus - Target ${targetCardId} has immunity effect, damage blocked`);
            return; // Block damage if card has immunity effect
        }
    }
    
    // Spike Guard (Hazard): reflect 1 fixed damage to direct attackers only
    // Conditions:
    // - Target has spike-guard effect
    // - sourceCardId exists and is an opposing unit
    // - Not from row tokens or environmental effects (we assume those have null or missing sourceCardId or special ids)
    let shouldReflectSpike = false;
    if (sourceCardId && targetCard) {
        const isOpposing = parseInt(sourceCardId[0]) !== parseInt(targetCardId[0]);
        if (isOpposing && Array.isArray(targetCard.effects)) {
            const spike = targetCard.effects.find(e => e?.hero === 'hazard' && e?.id === 'spike-guard');
            if (spike) {
                shouldReflectSpike = true;
                console.log(`DamageBus - Spike Guard detected on ${targetCardId}; will reflect 1 to attacker ${sourceCardId}`);
            } else {
                console.log(`DamageBus - No Spike Guard effect found on ${targetCardId}`);
            }
        } else {
            if (!isOpposing) console.log(`DamageBus - Spike Guard: attacker ${sourceCardId} not opposing ${targetCardId}`);
            if (!Array.isArray(targetCard.effects)) console.log(`DamageBus - Spike Guard: target ${targetCardId} has no effects array`);
        }
    } else {
        if (!sourceCardId) console.log('DamageBus - Spike Guard: Missing sourceCardId; assuming non-direct damage');
        if (!targetCard) console.log(`DamageBus - Spike Guard: Could not resolve target card ${targetCardId}`);
    }

    // Check for Tracer Ultimate (avoid fatal damage)
    if (targetCard && targetCard.id === 'tracer') {
        const currentHealth = targetCard.health || 0;
        const newHealth = currentHealth - amount;
        const wouldBeFatal = newHealth <= 0;
        
        if (wouldBeFatal) {
            // Check if Tracer's ultimate is available and has enough synergy
            const row = window.__ow_getRow?.(targetRow);
            const currentSynergy = row?.synergy || 0;
            const ultimateCost = 2;
            
            if (currentSynergy >= ultimateCost && window.__ow_triggerTracerUltimate) {
                console.log(`DamageBus - Tracer Ultimate: ${amount} damage would be fatal - triggering ultimate instead`);
                
                // Store HP before damage for restoration
                const hpBeforeDamage = currentHealth;
                
                // Trigger Tracer Ultimate
                window.__ow_triggerTracerUltimate(targetCardId, targetRow, hpBeforeDamage);
                return; // Block the damage
            } else {
                console.log(`DamageBus - Tracer Ultimate: Not available (synergy: ${currentSynergy}/${ultimateCost})`);
            }
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
    
    // Check for Widowmaker Infra-Sight damage amplification
    if (window.__ow_getRow) {
        const targetRowData = window.__ow_getRow(targetRow);
        if (targetRowData && targetRowData.enemyEffects) {
            const widowmakerToken = targetRowData.enemyEffects.find(effect => 
                effect?.id === 'widowmaker-token' && effect?.type === 'damageAmplification'
            );
            if (widowmakerToken) {
                finalAmount += widowmakerToken.value || 1;
                console.log(`DamageBus - Widowmaker Infra-Sight amplified damage by ${widowmakerToken.value || 1} (total: ${finalAmount})`);
            }
        }
    }
    
    // Check for Zenyatta Discord damage amplification
    if (window.__ow_getCard) {
        const targetCard = window.__ow_getCard(targetCardId);
        if (targetCard && Array.isArray(targetCard.effects)) {
            const discordToken = targetCard.effects.find(effect => 
                effect?.hero === 'zenyatta' && effect?.type === 'discord'
            );
            if (discordToken) {
                finalAmount += 1;
                console.log(`DamageBus - Zenyatta Discord amplified damage by 1 (total: ${finalAmount})`);
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
    
    // Publish damage and apply to health
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

    // Apply spike guard reflection AFTER computing finalAmount (independent fixed damage)
    if (shouldReflectSpike && sourceCardId) {
        try {
            // Find the attacker's current row to use correct row context
            let sourceRowId = null;
            if (window.__ow_getRow) {
                const allRows = ['1f', '1m', '1b', '2f', '2m', '2b'];
                for (const r of allRows) {
                    const row = window.__ow_getRow(r);
                    if (row && row.cardIds && row.cardIds.includes(sourceCardId)) { sourceRowId = r; break; }
                }
            }
            const reflectRow = sourceRowId || targetRow;
            console.log(`DamageBus - Spike Guard reflecting 1 fixed damage to ${sourceCardId} on row ${reflectRow}`);
            // Fixed damage that respects shields: fixedDamage=true, ignoreShields=false
            dealDamage(sourceCardId, reflectRow, 1, false, targetCardId, true);
            try { effectsBus.publish(Effects.showDamage(sourceCardId, 1)); } catch {}
        } catch (e) {
            console.log('DamageBus - Spike Guard reflection error', e);
        }
    }
    
    // Check for Winston Barrier Protector damage absorption
    if (finalAmount > 0 && window.__ow_getRow) {
        // Find Winston cards that might absorb this damage
        const allRows = ['1f', '1m', '1b', '2f', '2m', '2b'];
        for (const rowId of allRows) {
            const row = window.__ow_getRow(rowId);
            if (row && row.cardIds) {
                for (const cardId of row.cardIds) {
                    const card = window.__ow_getCard?.(cardId);
                    if (card && card.id === 'winston' && Array.isArray(card.effects)) {
                        const barrierEffect = card.effects.find(effect => 
                            effect?.id === 'barrier-protector' && effect?.type === 'barrier' && effect?.active === true
                        );
                        if (barrierEffect) {
                            // Check if target is in Winston's row AND on the same team
                            const targetRowData = window.__ow_getRow(targetRow);
                            const targetPlayerNum = parseInt(targetCardId[0]);
                            const winstonPlayerNum = parseInt(cardId[0]);
                            
                            if (targetRowData && targetRowData.cardIds.includes(targetCardId) && targetPlayerNum === winstonPlayerNum) {
                                // Check if Winston has shields to absorb with
                                const winstonShields = card.shield || 0;
                                if (winstonShields > 0) {
                                    const shieldsToUse = Math.min(finalAmount, winstonShields);
                                    finalAmount = Math.max(0, finalAmount - shieldsToUse);
                                    absorbedAmount += shieldsToUse;
                                    
                                    // Update Winston's shields
                                    const newShieldCount = winstonShields - shieldsToUse;
                                    window.__ow_dispatchShieldUpdate?.(cardId, newShieldCount);
                                    
                                    console.log(`DamageBus - Winston Barrier Protector absorbed ${shieldsToUse} damage for ${targetCardId}, remaining Winston shields: ${newShieldCount}`);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Check for Zarya token damage absorption (only if not ignoring shields)
    if (finalAmount > 0 && !ignoreShields && window.__ow_getRow) {
        const targetPlayerNum = parseInt(targetCardId[0]);
        const friendlyRows = targetPlayerNum === 1 ? ['1f', '1m', '1b'] : ['2f', '2m', '2b'];
        
        // Check all friendly cards for Zarya tokens
        for (const rowId of friendlyRows) {
            const row = window.__ow_getRow(rowId);
            if (row && row.cardIds) {
                for (const cardId of row.cardIds) {
                    const card = window.__ow_getCard?.(cardId);
                    if (card && Array.isArray(card.effects)) {
                        const zaryaToken = card.effects.find(effect => 
                            effect?.hero === 'zarya' && effect?.type === 'zarya-shield'
                        );
                        
                        if (zaryaToken && zaryaToken.amount > 0) {
                            const useZarya = Math.min(zaryaToken.amount, finalAmount);
                            const newAmount = zaryaToken.amount - useZarya;
                            finalAmount = Math.max(0, finalAmount - useZarya);
                            absorbedAmount += useZarya;
                            
                            console.log(`DamageBus - Zarya Token on ${cardId} absorbed ${useZarya} damage for ${targetCardId}, remaining tokens: ${newAmount}`);
                            
                            // Update or remove token using proper game state functions
                            if (newAmount <= 0) {
                                // Remove the token completely
                                console.log(`DamageBus - Removing token with ID: ${zaryaToken.id}`);
                                window.__ow_removeCardEffect?.(cardId, zaryaToken.id);
                                console.log(`DamageBus - Removed depleted Zarya token from ${cardId}`);
                            } else {
                                // Update the token with new amount
                                const updatedToken = {
                                    ...zaryaToken,
                                    amount: newAmount,
                                    tooltip: `Zarya Token: Absorbs damage like shields, reduces Particle Cannon damage (${newAmount} charges)`
                                };
                                console.log(`DamageBus - Removing old token with ID: ${zaryaToken.id}`);
                                window.__ow_removeCardEffect?.(cardId, zaryaToken.id);
                                
                                // Add a small delay to ensure the removal completes before adding the new token
                                setTimeout(() => {
                                    console.log(`DamageBus - Adding updated token:`, updatedToken);
                                    window.__ow_appendCardEffect?.(cardId, updatedToken);
                                    console.log(`DamageBus - Updated Zarya token on ${cardId} to ${newAmount} charges`);
                                }, 10);
                            }
                            
                            // Break out of loops if all damage absorbed
                            if (finalAmount <= 0) break;
                        }
                    }
                }
            }
            if (finalAmount <= 0) break;
        }
    }
    
    const damageEvent = { type: 'damage', targetCardId, targetRow, amount: finalAmount, ignoreShields, sourceCardId, absorbedAmount };
    console.log('DamageBus - Publishing damage event:', damageEvent);
    publish(damageEvent);
}

export default { subscribe, publish, dealDamage };


