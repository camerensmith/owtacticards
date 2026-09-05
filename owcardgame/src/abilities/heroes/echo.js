import { playAudioByKey } from '../../assets/imageImports';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { selectCardTarget } from '../engine/targeting';
import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';
import { canDuplicateUltimate, normalizeHeroId } from '../../game/abilityRules';

// Echo has no onDraw ability
export function onDraw({ playerHeroId }) {
    return;
}

// Focusing Beam — Deal damage to target enemy equal to the number of Damage Counters on that enemy
export async function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);

    try {
        playAudioByKey('echo-enter');
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
            showToast('Echo AI: No enemies to target');
            setTimeout(() => clearToast(), 2000);
            return;
        }
        
        // Select random enemy
        const randomEnemy = livingEnemies[Math.floor(Math.random() * livingEnemies.length)];
        const targetCard = window.__ow_getCard?.(randomEnemy.cardId);
        
        // Calculate damage based on damage taken (maxHealth - currentHealth)
        const maxHealth = window.__ow_getMaxHealth?.(randomEnemy.cardId) || targetCard.maxHealth || targetCard.health;
        const currentHealth = targetCard.health || 0;
        const damageAmount = maxHealth - currentHealth;

        if (damageAmount <= 0) {
            showToast('Echo AI: Target has taken no damage - Focusing Beam does 0 damage');
            setTimeout(() => clearToast(), 2000);
            return;
        }

        // Deal damage (respects shields, does not pierce)
        dealDamage(randomEnemy.cardId, randomEnemy.rowId, damageAmount, false, playerHeroId, false, { skipProjectileFx: true });
        try { effectsBus.publish(Effects.focusingBeam(playerHeroId, randomEnemy.cardId)); } catch {}
        effectsBus.publish(Effects.showDamage(randomEnemy.cardId, damageAmount));

        // Play ability sound after damage
        try {
            playAudioByKey('echo-ability1');
        } catch {}

        showToast(`Echo AI: Focusing Beam dealt ${damageAmount} damage`);
        setTimeout(() => clearToast(), 2000);
        return;
    }

    showToast('Echo: Select target enemy for Focusing Beam');

    try {
        const target = await selectCardTarget();
        if (target) {
            // Validate enemy
            const targetPlayerNum = parseInt(target.cardId[0]);
            if (targetPlayerNum === playerNum) {
                showToast('Echo: Must target an enemy!');
                setTimeout(() => clearToast(), 2000);
                return;
            }

            const targetCard = window.__ow_getCard?.(target.cardId);
            if (!targetCard) {
                showToast('Echo: Invalid target');
                setTimeout(() => clearToast(), 1500);
                return;
            }

            // Calculate damage based on damage taken (maxHealth - currentHealth)
            const maxHealth = window.__ow_getMaxHealth?.(target.cardId) || targetCard.maxHealth || targetCard.health;
            const currentHealth = targetCard.health || 0;
            const damageAmount = maxHealth - currentHealth;

            if (damageAmount <= 0) {
                showToast('Echo: Target has taken no damage - Focusing Beam does 0 damage');
                setTimeout(() => clearToast(), 2000);
                return;
            }

            // Deal damage (respects shields, does not pierce)
            dealDamage(target.cardId, target.rowId, damageAmount, false, playerHeroId, false, { skipProjectileFx: true });
            try { effectsBus.publish(Effects.focusingBeam(playerHeroId, target.cardId)); } catch {}
            effectsBus.publish(Effects.showDamage(target.cardId, damageAmount));

            // Play ability sound after damage
            try {
                playAudioByKey('echo-ability1');
            } catch {}

            showToast(`Echo: Focusing Beam dealt ${damageAmount} damage`);
            setTimeout(() => clearToast(), 2000);
        } else {
            showToast('Echo ability cancelled');
            setTimeout(() => clearToast(), 1500);
        }
    } catch (error) {
        console.error('Echo Focusing Beam error:', error);
        showToast('Echo ability cancelled');
        setTimeout(() => clearToast(), 1500);
    }
}

// Duplicate (4): Copy the last ultimate ability that was used
export async function onUltimate({ playerHeroId, rowId, cost }) {
    try {
        playAudioByKey('echo-ultimate');
    } catch {}

    const lastUltimate = window.__ow_getLastUltimateUsed?.();
    const duplicateCheck = canDuplicateUltimate(lastUltimate);

    // Returning false is what makes this a free refusal: the ultimate handler
    // charges synergy and marks the ultimate spent only once the ability
    // reports success, so a denial costs Echo nothing and can be tried again.
    if (!duplicateCheck.ok) {
        const heroName = lastUltimate?.heroName || 'that hero';
        const message = {
            none: 'Echo: No ultimate has been used this round — nothing to duplicate',
            summon: `Echo: Cannot duplicate ${heroName} — Echo cannot summon or transform`,
        }[duplicateCheck.reason]
            || `Echo: Cannot duplicate ${heroName}'s ultimate`;
        showToast(message);
        setTimeout(() => clearToast(), 2500);
        return false;
    }

    const copiedHeroId = normalizeHeroId(lastUltimate.heroId);
    try { effectsBus.publish(Effects.duplicate(playerHeroId)); } catch {}
    showToast(`Echo: Duplicating ${lastUltimate.heroName}'s ${lastUltimate.abilityName}`);

    try {
        const success = await window.__ow_executeDuplicatedUltimate?.(
            { ...lastUltimate, heroId: copiedHeroId },
            playerHeroId,
            rowId
        );

        if (success) {
            showToast(`Echo: Successfully duplicated ${lastUltimate.abilityName}`);
            setTimeout(() => clearToast(), 2000);
            return true;
        }
        showToast('Echo: Duplication failed to execute');
        setTimeout(() => clearToast(), 2000);
        return false;
    } catch (error) {
        console.error('Echo Duplicate error:', error);
        showToast('Echo: Duplication failed');
        setTimeout(() => clearToast(), 1500);
        return false;
    }
}

export default { onEnter, onUltimate, onDraw };
