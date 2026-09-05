// Central damage bus: computes modifiers, then publishes. App.js is the sole HP/shield writer.
import effectsBus, { Effects } from './effectsBus';
import { isMirage } from '../../game/disorient';
import { popMirage } from '../heroes/mirage';

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

export function dealDamage(targetCardId, targetRow, amount, ignoreShields = false, sourceCardId = null, fixedDamage = false, options = {}) {
    // Safety check: ensure targetCardId is valid
    if (!targetCardId || typeof targetCardId !== 'string') {
        console.warn('DamageBus - Invalid targetCardId:', targetCardId);
        return;
    }

    // Cloaked Mantis: untargetable by enemy damage; immune to friendly ability damage.
    try {
        const { isCloakedMantis } = require('../../game/mantis');
        const target = window.__ow_getCard?.(targetCardId);
        if (isCloakedMantis(target)) {
            console.log(`DamageBus - Cloaked Mantis ${targetCardId} ignores damage`);
            return;
        }
    } catch {}
    
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
    
    /*
     * The illusion has no health to take off it.
     *
     * It shows 3 to look like a real hero, but nothing is holding it up except
     * not having been touched — so anything aimed at it destroys it, whatever
     * the number attached. This has to happen before shields, absorption and
     * reduction: the check used to sit at the bottom behind `finalAmount > 0`,
     * so a hit that was blocked down to nothing left the decoy standing and
     * told the attacker it was real.
     */
    if (isMirage(targetCard)) {
        try { popMirage({ mirageId: targetCardId, sourceCardId: sourceCardId || null }); } catch {}
        return;
    }

    if (!ignoreShields && targetCard && Array.isArray(targetCard.effects)) {
        if (targetCard.effects.some((effect) => effect?.id === 'warden-mark')) {
            ignoreShields = true;
        }
    }

    // Spike Guard (Hazard): reflect 1 fixed damage to direct attackers only
    // Conditions:
    // - Target has spike-guard effect
    // - sourceCardId exists and is an opposing unit
    // - Not from row tokens or environmental effects (we assume those have null or missing sourceCardId or special ids)
    let shouldReflectSpike = false;
    if (sourceCardId && typeof sourceCardId === 'string' && targetCard) {
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

    // Fixed damage bypasses ability modifiers; App.js still applies row/card shields unless ignored
    if (fixedDamage) {
        console.log(`Fixed Damage: ${amount} damage to ${targetCardId} (no modifications)`);
        const damageEvent = {
            type: 'damage',
            targetCardId,
            targetRow,
            amount,
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

        // Notify Mauga module that an ally did direct ability damage (only when sourceCardId is present)
        try {
            const maugaMod = require('../heroes/mauga');
            if (maugaMod && typeof maugaMod.onAllyDirectDamageDealt === 'function') {
                maugaMod.onAllyDirectDamageDealt(sourceCardId);
            }
        } catch {}
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
    if (finalAmount > 0 && !ignoreShields && window.__ow_getRow) {
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
    if (finalAmount > 0 && !ignoreShields && window.__ow_getRow) {
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
                        } else if (barrierEffect) {
                            console.log(`DamageBus - Reinhardt barrier effect not absorbing:`, barrierEffect);
                            console.log(`DamageBus - barrierEffect.absorbing value:`, barrierEffect?.absorbing);
                            console.log(`DamageBus - barrierEffect.absorbing type:`, typeof barrierEffect?.absorbing);
                        }
                    }
                }
            }
        }
    }
    
    // Check for Sigma Token shield absorption (only if not ignoring shields)
    if (finalAmount > 0 && !ignoreShields && window.__ow_getRow) {
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
    
    // Check for Winston Barrier Protector damage absorption (only if not ignoring shields)
    if (finalAmount > 0 && !ignoreShields && window.__ow_getRow) {
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
                            
                            if (rowId === targetRow && targetPlayerNum === winstonPlayerNum) {
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
    if (finalAmount > 0 && !ignoreShields && window.__ow_getCard) {
        const bearerCard = window.__ow_getCard(targetCardId);
        if (bearerCard && Array.isArray(bearerCard.effects)) {
            const zaryaToken = bearerCard.effects.find(effect => 
                effect?.hero === 'zarya' && effect?.type === 'zarya-shield'
            );
            if (zaryaToken && zaryaToken.amount > 0) {
                const useZarya = Math.min(zaryaToken.amount, finalAmount);
                const newAmount = zaryaToken.amount - useZarya;
                finalAmount = Math.max(0, finalAmount - useZarya);
                absorbedAmount += useZarya;
                console.log(`DamageBus - Zarya Token on ${targetCardId} absorbed ${useZarya} damage, remaining tokens: ${newAmount}`);
                if (newAmount <= 0) {
                    window.__ow_removeCardEffect?.(targetCardId, zaryaToken.id);
                } else {
                    const updatedToken = { ...zaryaToken, amount: newAmount, tooltip: `Zarya Token: Absorbs damage like shields, reduces Particle Cannon damage (${newAmount} charges)` };
                    window.__ow_removeCardEffect?.(targetCardId, zaryaToken.id);
                    setTimeout(() => {
                        window.__ow_appendCardEffect?.(targetCardId, updatedToken);
                    }, 10);
                }
            }
        }
    }
    
    const damageEvent = { type: 'damage', targetCardId, targetRow, amount: finalAmount, ignoreShields, sourceCardId, absorbedAmount };
    console.log('DamageBus - Publishing damage event:', damageEvent);
    publish(damageEvent);
    if (finalAmount > 0 && sourceCardId) {
        if (!options?.skipProjectileFx) {
            try {
                effectsBus.publish(Effects.beam(sourceCardId, targetCardId));
                effectsBus.publish(Effects.impact(targetCardId));
            } catch {}
        }
        try { window.__ow_onDirectAttack?.({ sourceCardId, targetCardId, targetRow }); } catch {}
    }
}

export default { subscribe, publish, dealDamage };


