import { selectCardTarget } from '../engine/targeting';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { playAudioByKey } from '../../assets/imageImports';

export async function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);

    try {
        playAudioByKey('symmetra-ability1');
    } catch {}

    // Check if this is AI turn - if so, use smart targeting
    const isAITurn = !!window.__ow_isAITurn;
    const aiTriggering = !!window.__ow_aiTriggering;

    let target = null;

    if ((isAITurn || aiTriggering) && playerNum === 2) {
        // AI smart teleporter logic
        console.log('Symmetra AI: Evaluating teleport targets');
        target = await selectSymmetraTeleportTarget(playerNum);
    } else {
        // Human player manual selection - allow targeting any hero (ally or enemy)
        showToast('Symmetra: Select any hero to return to hand');
        target = await selectCardTarget();
    }

    if (!target) {
        clearToast();
        return;
    }
    
    if (target && target.cardId) {
        // Get the target hero's owner
        const targetPlayerNum = parseInt(target.cardId[0]);

        // Check if target owner's hand is full (6 cards is the limit)
        const targetHandId = `player${targetPlayerNum}hand`;
        const targetHand = window.__ow_getRow?.(targetHandId);
        if (targetHand && targetHand.cardIds && targetHand.cardIds.length >= 6) {
            showToast('Symmetra: Target player\'s hand is full, cannot return hero');
            setTimeout(() => clearToast(), 2000);
            return;
        }

        // Check if hero is undefeated (health > 0)
        const targetCard = window.__ow_getCard?.(target.cardId);
        if (!targetCard || targetCard.health <= 0) {
            showToast('Symmetra: Can only target undefeated heroes');
            setTimeout(() => clearToast(), 1500);
            return;
        }

        // Return hero to hand
        window.__ow_dispatchAction?.({
            type: 'return-hero-to-hand',
            payload: { cardId: target.cardId, rowId: target.rowId }
        });

        // Remove all tokens and counters
        removeAllTokensAndCounters(target.cardId, target.rowId);

        showToast('Symmetra: Hero returned to hand, all effects removed');
        setTimeout(() => clearToast(), 2000);
    } else {
        // Targeting was cancelled (right-click or other cancellation)
        showToast('Symmetra: Teleporter cancelled');
        setTimeout(() => clearToast(), 1500);
    }
}

export function onUltimate({ playerHeroId, rowId, cost }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    try {
        playAudioByKey('symmetra-ultimate');
    } catch {}
    
    // Apply Shield Generator to all friendly deployed heroes
    const friendlyRows = [`${playerNum}f`, `${playerNum}m`, `${playerNum}b`];
    let heroesAffected = 0;
    
    friendlyRows.forEach(rowId => {
        const row = window.__ow_getRow?.(rowId);
        if (row && row.cardIds) {
            row.cardIds.forEach(cardId => {
                const card = window.__ow_getCard?.(cardId);
                if (card && card.health > 0) {
                    // Add 1 shield (respecting 3-shield maximum)
                    const currentShield = card.shield || 0;
                    const newShield = Math.min(currentShield + 1, 3);
                    window.__ow_dispatchShieldUpdate?.(cardId, newShield);
                    heroesAffected++;
                }
            });
        }
    });
    
    showToast(`Symmetra: Shield Generator activated - ${heroesAffected} heroes gained shields`);
    setTimeout(() => clearToast(), 2000);
}

function removeAllTokensAndCounters(cardId, rowId) {
    // Remove all card effects
    const card = window.__ow_getCard?.(cardId);
    if (card && Array.isArray(card.effects)) {
        card.effects.forEach(effect => {
            window.__ow_removeCardEffect?.(cardId, effect.id);
        });
    }
    
    // Remove all row effects created by this hero AND effects dependent on this hero
    const allRows = ['1f', '1m', '1b', '2f', '2m', '2b'];
    allRows.forEach(rowId => {
        const row = window.__ow_getRow?.(rowId);
        if (row) {
            // Remove from ally effects - both created by this hero and dependent on this hero
            if (row.allyEffects) {
                const effectsToRemove = row.allyEffects.filter(effect => 
                    effect?.sourceCardId === cardId || 
                    effect?.dependentOnCardId === cardId ||
                    effect?.targetCardId === cardId
                );
                effectsToRemove.forEach(effect => {
                    window.__ow_removeRowEffect?.(rowId, 'allyEffects', effect.id);
                });
            }
            
            // Remove from enemy effects - both created by this hero and dependent on this hero
            if (row.enemyEffects) {
                const effectsToRemove = row.enemyEffects.filter(effect => 
                    effect?.sourceCardId === cardId || 
                    effect?.dependentOnCardId === cardId ||
                    effect?.targetCardId === cardId
                );
                effectsToRemove.forEach(effect => {
                    window.__ow_removeRowEffect?.(rowId, 'enemyEffects', effect.id);
                });
            }
        }
    });
    
    // Remove shield tokens from this hero
    window.__ow_dispatchShieldUpdate?.(cardId, 0);
}

// AI Smart Teleporter Target Selection
async function selectSymmetraTeleportTarget(playerNum) {
    try {
        const allRows = ['1f', '1m', '1b', '2f', '2m', '2b'];
        const candidates = [];

        // Gather all living heroes on board
        for (const rowId of allRows) {
            const row = window.__ow_getRow?.(rowId);
            if (!row?.cardIds) continue;

            for (const cardId of row.cardIds) {
                const card = window.__ow_getCard?.(cardId);
                if (!card || card.health <= 0) continue;

                const cardPlayerNum = parseInt(cardId[0]);
                const isAlly = cardPlayerNum === playerNum;
                const isEnemy = !isAlly;

                // Check hand capacity
                const targetHandId = `player${cardPlayerNum}hand`;
                const targetHand = window.__ow_getRow?.(targetHandId);
                if (targetHand?.cardIds?.length >= 6) continue; // Hand full, skip

                candidates.push({
                    cardId,
                    rowId,
                    card,
                    isAlly,
                    isEnemy
                });
            }
        }

        if (candidates.length === 0) {
            console.log('Symmetra AI: No valid teleport targets');
            return null;
        }

        // Score each candidate
        const scored = candidates.map(candidate => {
            const { card, isAlly, isEnemy } = candidate;
            let score = 0;

            // === ENEMY TARGETING (BOUNCE STRONG THREATS) ===
            if (isEnemy) {
                // Target high-power enemies (bounce them to disrupt)
                const power = (card.front_power || 0) + (card.middle_power || 0) + (card.back_power || 0);
                score += power * 15; // High weight for removing threats

                // Target high-health tanks (bounce them out)
                score += (card.health || 0) * 8;

                // Bonus for tanks (annoying blockers)
                if (card.role === 'Tank') score += 30;

                // Bonus for support (remove their healer)
                if (card.role === 'Support') score += 25;

                console.log(`Symmetra AI: Enemy ${card.id} score = ${score} (power removal)`);
            }

            // === ALLY TARGETING (SAVE WOUNDED/DEBUFFED) ===
            if (isAlly) {
                // Target wounded allies (save them before death)
                const maxHealth = window.__ow_getMaxHealth?.(candidate.cardId) || card.health;
                const healthDeficit = maxHealth - card.health;

                // Critical health (1 HP left) - VERY HIGH PRIORITY
                if (card.health === 1) {
                    score += 100;
                    console.log(`Symmetra AI: Ally ${card.id} CRITICAL (1 HP) - save immediately`);
                }
                // Low health (< 50%)
                else if (card.health < maxHealth / 2) {
                    score += 50 + (healthDeficit * 10);
                    console.log(`Symmetra AI: Ally ${card.id} wounded (${card.health}/${maxHealth}) - consider saving`);
                }

                // Check for debuffs
                if (Array.isArray(card.effects)) {
                    const hasDebuff = card.effects.some(e =>
                        e?.type === 'debuff' ||
                        e?.type === 'damage' ||
                        e?.type === 'damageBoost' ||
                        e?.id === 'discord-token' ||
                        e?.id === 'anti-heal'
                    );

                    if (hasDebuff) {
                        score += 40;
                        console.log(`Symmetra AI: Ally ${card.id} has debuff - consider cleansing`);
                    }
                }

                // Penalty for healthy allies (don't waste teleporter)
                if (card.health === maxHealth && (!card.effects || card.effects.length === 0)) {
                    score -= 50;
                }

                console.log(`Symmetra AI: Ally ${card.id} score = ${score}`);
            }

            return { ...candidate, score };
        });

        // Sort by score (highest first)
        scored.sort((a, b) => b.score - a.score);

        // Only teleport if best target has positive score
        const best = scored[0];
        if (best.score <= 0) {
            console.log('Symmetra AI: No worthwhile teleport target (best score: ' + best.score + ')');
            return null;
        }

        console.log(`Symmetra AI: Selected ${best.isEnemy ? 'ENEMY' : 'ALLY'} ${best.card.id} (score: ${best.score})`);
        return { cardId: best.cardId, rowId: best.rowId };

    } catch (error) {
        console.error('Symmetra AI teleport selection error:', error);
        return null;
    }
}

export default { onEnter, onUltimate };
