/**
 * How sharp the opponent plays this turn.
 *
 * There used to be three fixed tiers. Every number below was one of their
 * settings; instead of picking a tier and holding it for the match, the
 * opponent rolls a fresh profile each turn and lands somewhere across the whole
 * range the tiers used to span. It plays brilliantly one turn and loosely the
 * next, which is closer to a person than any of the three fixed settings was.
 *
 * The ranges are exactly the old easy→hard spans, so nothing here is new
 * behaviour — it is the same behaviour, no longer partitioned. That includes
 * the tuning that was written for easy and medium but sat inside the hard-only
 * decision path and never ran.
 *
 * Pure: takes a `random` so a seeded run is reproducible.
 */

/** The span each knob is rolled from. Inclusive at both ends. */
export const AI_RANGES = {
    /** Thinking time before a move lands, in ms. */
    decisionDelayMs: [3000, 7000],
    /** Ultimates it will try to fire in one turn. */
    ultimatesPerTurn: [1, 3],
    /** Chance it skips threat assessment and takes a lazier target. */
    threatSkipChance: [0, 0.5],
    /** Score an ability must beat to be worth using. */
    abilityThreshold: [30, 50],
    /** Synergy it wants banked before spending a big AOE ultimate. */
    aoeSynergyFloor: [1, 3],
    /** Noise multiplied into card scores, ± this fraction. */
    scoreNoise: [0, 0.3],
    /** Chance it simply takes the best-scoring card. */
    bestPickChance: [0.3, 0.9],
    /** Chance it holds a card back to set up a combo instead of playing it. */
    comboHoldChance: [0, 1],
    /**
     * How long it waits for the right moment. High means it holds an ultimate
     * for two wounded allies; low means it fires at the first one it sees.
     */
    patience: [0, 1],
    /** Chance it fires an ultimate with no particular reason to. */
    impulseFireChance: [0.3, 0.7],
};

function rollBetween(random, [low, high]) {
    return low + random() * (high - low);
}

function rollInt(random, range) {
    const [low, high] = range;
    return Math.min(high, low + Math.floor(random() * (high - low + 1)));
}

/**
 * A profile for one turn.
 *
 * `random` defaults to Math.random; the controller passes its seeded rng so a
 * replay plays out the same way.
 */
export function rollAiProfile(random = Math.random) {
    const rng = typeof random === 'function' ? random : Math.random;
    return {
        decisionDelayMs: Math.floor(rollBetween(rng, AI_RANGES.decisionDelayMs)),
        ultimatesPerTurn: rollInt(rng, AI_RANGES.ultimatesPerTurn),
        threatSkipChance: rollBetween(rng, AI_RANGES.threatSkipChance),
        abilityThreshold: Math.round(rollBetween(rng, AI_RANGES.abilityThreshold)),
        aoeSynergyFloor: rollInt(rng, AI_RANGES.aoeSynergyFloor),
        scoreNoise: rollBetween(rng, AI_RANGES.scoreNoise),
        bestPickChance: rollBetween(rng, AI_RANGES.bestPickChance),
        holdsForCombos: rng() < rollBetween(rng, AI_RANGES.comboHoldChance),
        patience: rollBetween(rng, AI_RANGES.patience),
        impulseFireChance: rollBetween(rng, AI_RANGES.impulseFireChance),
    };
}

/** Whether this turn's opponent waits for the good version of an opportunity. */
export function isPatient(profile) {
    return (profile?.patience ?? 0.5) >= 0.5;
}

/** The midpoint of every range: what a profile looks like before one is rolled. */
export function defaultAiProfile() {
    return rollAiProfile(() => 0.5);
}

/**
 * Which card to take from a list already sorted best-first.
 *
 * Above `bestPickChance` it takes the top card; otherwise it slides down the
 * list, most often to the second. This replaces three hardcoded ladders that
 * all did the same thing with different constants.
 */
export function pickFromRanked(count, profile, random = Math.random) {
    if (!count || count < 1) return -1;
    const rng = typeof random === 'function' ? random : Math.random;
    if (rng() < profile.bestPickChance) return 0;
    if (count === 1) return 0;
    // Two thirds of its mistakes are the next-best card, not a wild one.
    if (rng() < 0.66) return 1 % count;
    return Math.floor(rng() * count);
}

/** Score with this turn's noise applied. */
export function noisyScore(score, profile, random = Math.random) {
    const rng = typeof random === 'function' ? random : Math.random;
    const noise = (rng() * 2 - 1) * (profile?.scoreNoise || 0);
    return (Number(score) || 0) * (1 + noise);
}
