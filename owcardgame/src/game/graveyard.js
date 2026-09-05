/**
 * Pure graveyard and deck helpers.
 * Side-effect free so the reducer, the UI and the AI all read the same rules.
 *
 * Deck model: there is no deck array. A hero is "in the deck" when it exists in
 * data.heroes and has not been drawn yet this round. Sending a graveyard back to
 * the deck therefore means un-drawing those heroes, and because draws already
 * pick at random from the remaining pool, that is equivalent to a shuffle.
 */

/** Special cards (BOB, MEKA, Nemesis, turrets) are summoned, never drawn. */
export function isDeckHero(hero) {
    return !!hero && !hero.special;
}

export function countDeckHeroes(heroes = {}) {
    return Object.values(heroes).filter(isDeckHero).length;
}

/** The x/y behind the Deck counter: how many are left, out of the full deck. */
export function deckCounts({ heroes = {}, drawnHeroes = [] } = {}) {
    const total = countDeckHeroes(heroes);
    const drawn = drawnHeroes.filter((heroId) => isDeckHero(heroes[heroId])).length;
    return { total, remaining: Math.max(0, total - drawn) };
}

export function addToGraveyard(graveyard = [], entry = {}) {
    const { heroId, playerHeroId } = entry;
    if (!heroId) return graveyard.slice();
    return [...graveyard, { heroId, playerHeroId }];
}

/** Removes one copy, so a hero buried twice after a reshuffle still leaves one behind. */
export function removeFromGraveyard(graveyard = [], heroId) {
    const index = graveyard.findIndex((entry) => entry?.heroId === heroId);
    if (index < 0) return graveyard.slice();
    return [...graveyard.slice(0, index), ...graveyard.slice(index + 1)];
}

export function graveyardHeroIds(graveyard = []) {
    return graveyard.map((entry) => entry?.heroId).filter(Boolean);
}

/** The deck is spent and there are corpses worth recycling. */
export function shouldReshuffle({ remaining, graveyardSize } = {}) {
    return (Number(remaining) || 0) <= 0 && (Number(graveyardSize) || 0) > 0;
}

/**
 * Ranks graveyard entries for Mercy's resurrection so the AI and any future
 * auto-pick agree. Mirrors the AI's existing dead-ally scoring.
 */
export function scoreResurrectionTarget(hero) {
    if (!hero) return -1;
    let score = 0;

    const role = String(hero.role || '').toLowerCase();
    if (role === 'offense') score += 50;
    else if (role === 'support') score += 35;
    else if (role === 'defense') score += 25;
    else if (role === 'tank') score += 15;

    const power = hero.power || {};
    score += ((power.f || 0) + (power.m || 0) + (power.b || 0)) * 5;
    score += (hero.health || 0) * 3;

    return score;
}

export function pickBestResurrection(graveyard = [], heroes = {}) {
    let best = null;
    let bestScore = -Infinity;
    for (const entry of graveyard) {
        const score = scoreResurrectionTarget(heroes[entry?.heroId]);
        if (score > bestScore) {
            bestScore = score;
            best = entry;
        }
    }
    return best;
}
