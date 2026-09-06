/** Dragon Blade: defeat one damaged enemy (current HP < max HP). */

export function isDamagedForDragonBlade(card, maxHealthHint) {
    if (!card || card.health == null) return false;
    const max = Number(maxHealthHint) > 0
        ? Number(maxHealthHint)
        : (Number(card.maxHealth) > 0 ? Number(card.maxHealth) : null);
    if (max == null) return false;
    return Number(card.health) < max;
}

/** AI only spends Dragon Blade when a legal damaged target exists. */
export function shouldAiUseGenjiDragonBlade(enemyCards = []) {
    return (enemyCards || []).some((card) => isDamagedForDragonBlade(card));
}

/**
 * Prefer the highest-power damaged enemy; never pick full-HP targets.
 * getCard(cardId) -> { health, maxHealth? }
 * getMaxHealth?.(cardId) optional override matching __ow_getMaxHealth
 */
export function pickGenjiDragonBladeTarget(targets = [], getCard, getMaxHealth) {
    const scored = [];
    for (const target of targets || []) {
        const card = getCard?.(target.cardId);
        if (!card) continue;
        const maxHp = getMaxHealth?.(target.cardId) ?? card.maxHealth;
        if (!isDamagedForDragonBlade(card, maxHp)) continue;

        const heroId = String(target.cardId || '').slice(1);
        const lane = target.rowId?.[1];
        // Prefer more missing HP, then higher remaining threat (health as proxy).
        const missing = (Number(maxHp) || 0) - Number(card.health);
        let score = missing * 20 + Number(card.health || 0);
        if (!card.ultimateUsed) score += 15;
        scored.push({ target, score, heroId, lane });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.target || null;
}
