import { dealDamage } from '../engine/damageBus';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { selectCardTarget } from '../engine/targeting';
import { showOnEnterChoice } from '../engine/modalController';
import { playAudioByKey } from '../../assets/imageImports';
import effectsBus, { Effects } from '../engine/effectsBus';
import { canTracerRecall, TRACER_RECALL_COST } from '../../game/redeployRules';

// Pulse Pistols - Single Target
export async function onEnter1({ playerHeroId, rowId, playerNum }) {
    if (!playerHeroId) {
        console.error("onEnter1: playerHeroId is undefined!");
        return;
    }
    // Play ability sound on selection
    try {
        playAudioByKey('tracer-ability1');
    } catch {}

    // For AI, automatically select a random enemy hero
    if (window.__ow_aiTriggering || window.__ow_isAITurn) {
        const enemyPlayer = playerNum === 1 ? 2 : 1;
        const enemyRows = [`${enemyPlayer}f`, `${enemyPlayer}m`, `${enemyPlayer}b`];
        
        // Find all living enemy heroes
        const livingEnemies = [];
        for (const enemyRowId of enemyRows) {
            const row = window.__ow_getRow?.(enemyRowId);
            if (row && row.cardIds) {
                for (const cardId of row.cardIds) {
                    const card = window.__ow_getCard?.(cardId);
                    if (card && card.health > 0) {
                        livingEnemies.push({ cardId, rowId: enemyRowId });
                    }
                }
            }
        }
        
        if (livingEnemies.length === 0) {
            showToast('Tracer AI: No enemies to target');
            setTimeout(() => clearToast(), 2000);
            return;
        }
        
        // Select random enemy
        const randomEnemy = livingEnemies[Math.floor(Math.random() * livingEnemies.length)];
        
        // Deal 2 damage
        dealDamage(randomEnemy.cardId, randomEnemy.rowId, 2, false, playerHeroId);
        effectsBus.publish(Effects.showDamage(randomEnemy.cardId, 2));
        
        // Play ability resolve sound on damage
        try {
            playAudioByKey('tracer-ability1-resolve');
        } catch {}
        
        showToast('Tracer AI: Pulse Pistols hit enemy');
        setTimeout(() => clearToast(), 2000);
        return;
    }

    showToast('Tracer: Select target enemy for Pulse Pistols');

    const target = await selectCardTarget();
    if (!target) {
        clearToast();
        return;
    }

    // Safety check: ensure target.cardId is valid
    if (!target.cardId || typeof target.cardId !== 'string') {
        showToast('Tracer: Invalid target selected');
        setTimeout(() => clearToast(), 1500);
        return;
    }

    // Validate enemy
    const targetPlayer = parseInt(target.cardId[0]);
    if (targetPlayer === playerNum) {
        showToast('Tracer: Must target an enemy!');
        setTimeout(() => clearToast(), 2000);
        return;
    }

    const targetCard = window.__ow_getCard?.(target.cardId);
    if (!targetCard || targetCard.health <= 0) {
        showToast('Tracer: Invalid target (must be living enemy)');
        setTimeout(() => clearToast(), 1500);
        return;
    }
    
    // Deal 2 damage
    dealDamage(target.cardId, target.rowId, 2, false, playerHeroId);
    effectsBus.publish(Effects.showDamage(target.cardId, 2));
    
    // Play ability resolve sound on damage
    try {
        playAudioByKey('tracer-ability1-resolve');
    } catch {}
    
    clearToast();
}

// Pulse Pistols - Dual Target
export async function onEnter2({ playerHeroId, rowId, playerNum }) {
    if (!playerHeroId) {
        console.error("onEnter2: playerHeroId is undefined!");
        return;
    }
    // Play ability sound on selection
    try {
        playAudioByKey('tracer-ability2');
    } catch {}

    // For AI, automatically select two different enemy heroes
    if (window.__ow_aiTriggering || window.__ow_isAITurn) {
        const enemyPlayer = playerNum === 1 ? 2 : 1;
        const enemyRows = [`${enemyPlayer}f`, `${enemyPlayer}m`, `${enemyPlayer}b`];
        
        // Find all living enemy heroes
        const livingEnemies = [];
        for (const enemyRowId of enemyRows) {
            const row = window.__ow_getRow?.(enemyRowId);
            if (row && row.cardIds) {
                for (const cardId of row.cardIds) {
                    const card = window.__ow_getCard?.(cardId);
                    if (card && card.health > 0) {
                        livingEnemies.push({ cardId, rowId: enemyRowId });
                    }
                }
            }
        }
        
        if (livingEnemies.length === 0) {
            showToast('Tracer AI: No enemies to target');
            setTimeout(() => clearToast(), 2000);
            return;
        }
        
        // Select two different enemies
        let target1, target2;
        if (livingEnemies.length === 1) {
            // Only one enemy, target it twice (but only deal damage once)
            target1 = livingEnemies[0];
            target2 = livingEnemies[0];
        } else {
            // Select two different enemies
            target1 = livingEnemies[Math.floor(Math.random() * livingEnemies.length)];
            let remainingEnemies = livingEnemies.filter(e => e.cardId !== target1.cardId);
            target2 = remainingEnemies[Math.floor(Math.random() * remainingEnemies.length)];
        }
        
        // Deal 1 damage to each target
        dealDamage(target1.cardId, target1.rowId, 1, false, playerHeroId);
        effectsBus.publish(Effects.showDamage(target1.cardId, 1));
        
        if (target1.cardId !== target2.cardId) {
            dealDamage(target2.cardId, target2.rowId, 1, false, playerHeroId);
            effectsBus.publish(Effects.showDamage(target2.cardId, 1));
        }
        
        // Play ability resolve sound on damage
        try {
            playAudioByKey('tracer-ability2-resolve');
        } catch {}
        
        showToast('Tracer AI: Pulse Pistols hit enemies');
        setTimeout(() => clearToast(), 2000);
        return;
    }

    showToast('Tracer: Select first target enemy');

    const target1 = await selectCardTarget();
    if (!target1) {
        clearToast();
        return;
    }

    // Validate first target is enemy
    const target1Player = parseInt(target1.cardId[0]);
    if (target1Player === playerNum) {
        showToast('Tracer: Must target enemies!');
        setTimeout(() => clearToast(), 2000);
        return;
    }

    const target1Card = window.__ow_getCard?.(target1.cardId);
    if (!target1Card || target1Card.health <= 0) {
        showToast('Tracer: Invalid first target (must be living enemy)');
        setTimeout(() => clearToast(), 1500);
        return;
    }

    showToast('Tracer: Select second target enemy (must be different)');

    const target2 = await selectCardTarget();
    if (!target2) {
        clearToast();
        return;
    }

    // Validate second target is enemy
    const target2Player = parseInt(target2.cardId[0]);
    if (target2Player === playerNum) {
        showToast('Tracer: Must target enemies!');
        setTimeout(() => clearToast(), 2000);
        return;
    }

    const target2Card = window.__ow_getCard?.(target2.cardId);
    if (!target2Card || target2Card.health <= 0) {
        showToast('Tracer: Invalid second target (must be living enemy)');
        setTimeout(() => clearToast(), 1500);
        return;
    }
    
    // Check if targets are different
    if (target1.cardId === target2.cardId) {
        showToast('Tracer: Cannot target the same enemy twice');
        setTimeout(() => clearToast(), 1500);
        return;
    }
    
    // Deal 1 damage to each target
    dealDamage(target1.cardId, target1.rowId, 1, false, playerHeroId);
    effectsBus.publish(Effects.showDamage(target1.cardId, 1));
    
    dealDamage(target2.cardId, target2.rowId, 1, false, playerHeroId);
    effectsBus.publish(Effects.showDamage(target2.cardId, 1));
    
    // Play ability resolve sound on damage
    try {
        playAudioByKey('tracer-ability2-resolve');
    } catch {}
    
    clearToast();
}

// Main onEnter function with modal choice
export function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);

    // Play enter sound
    try {
        playAudioByKey('tracer-enter');
    } catch {}

    const opt1 = {
        name: 'Pulse Pistols (Single)',
        title: 'Pulse Pistols (Single)',
        description: 'Deal 2 damage to target enemy'
    };
    const opt2 = {
        name: 'Pulse Pistols (Dual)',
        title: 'Pulse Pistols (Dual)',
        description: 'Deal 1 damage to two different enemies anywhere on the board'
    };

    showOnEnterChoice('Tracer', opt1, opt2, async (choiceIndex) => {
        if (choiceIndex === 0) {
            await onEnter1({ playerHeroId, rowId, playerNum });
        } else {
            await onEnter2({ playerHeroId, rowId, playerNum });
        }
    });
}

/** Manual ult button — Recall is automatic on death. */
export function onUltimate() {
    showToast('Tracer: Recall is automatic when she dies (costs 2 synergy)');
    setTimeout(() => clearToast(), 2000);
    return false;
}

/**
 * Recall (2): On death, if the row can pay 2 synergy and Recall is unused,
 * spend it, play ult VO, animate to hand. Redeploy fires On-Enter again;
 * ultimate stays spent.
 */
export function onDeath({ playerHeroId, rowId }) {
    const playerNum = parseInt(String(playerHeroId || '')[0], 10);
    const row = window.__ow_getRow?.(rowId);
    const alreadyUsed = !!window.__ow_hasUsedUltimate?.(playerNum, 'tracer');

    if (!canTracerRecall({
        rowSynergy: row?.synergy || 0,
        alreadyUsed,
        cost: TRACER_RECALL_COST,
    })) {
        return false;
    }

    const hand = window.__ow_getRow?.(`player${playerNum}hand`);
    if (hand?.cardIds && hand.cardIds.length >= 6) {
        showToast('Tracer: Hand full — Recall failed');
        setTimeout(() => clearToast(), 2000);
        return false;
    }

    try {
        window.__ow_updateSynergy?.(rowId, -TRACER_RECALL_COST);
    } catch {}

    try {
        playAudioByKey('tracer-ultimate');
    } catch {}

    try {
        effectsBus.publish(Effects.teleport(playerHeroId, playerNum));
    } catch {}

    const card = window.__ow_getCard?.(playerHeroId);
    const maxHp = card?.maxHealth || 2;
    if (Array.isArray(card?.effects)) {
        [...card.effects].forEach((effect) => {
            if (effect?.id) window.__ow_removeCardEffect?.(playerHeroId, effect.id);
        });
    }
    // Revive above 0 so the delayed graveyard bury skips her.
    window.__ow_setCardHealth?.(playerHeroId, maxHp, true);

    window.__ow_dispatchAction?.({
        type: 'mark-ultimate-used',
        payload: { playerNum, heroId: 'tracer' },
    });

    window.__ow_dispatchAction?.({
        type: 'return-hero-to-hand',
        payload: {
            cardId: playerHeroId,
            rowId,
            suppressEnterOnRedeploy: false,
            turnCount: window.__ow_getTurnCount?.(),
        },
    });

    showToast('Tracer: Recall — returned to hand');
    setTimeout(() => clearToast(), 2000);
    return true;
}

export default { onEnter, onUltimate, onDeath };
