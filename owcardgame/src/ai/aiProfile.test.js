import {
    AI_RANGES,
    defaultAiProfile,
    isPatient,
    noisyScore,
    pickFromRanked,
    rollAiProfile,
} from './aiProfile';

/** A generator cycling through fixed draws, so a roll is reproducible. */
const feed = (...values) => {
    let i = 0;
    return () => values[i++ % values.length];
};

/*
 * There is one opponent, not three tiers. Every knob is rolled fresh each turn
 * from the span the tiers used to cover, so the same opponent plays sharply one
 * turn and loosely the next.
 */
describe('rolling a turn profile', () => {
    test('a lowest roll lands on the bottom of every range', () => {
        const p = rollAiProfile(() => 0);

        expect(p.decisionDelayMs).toBe(AI_RANGES.decisionDelayMs[0]);
        expect(p.ultimatesPerTurn).toBe(AI_RANGES.ultimatesPerTurn[0]);
        expect(p.threatSkipChance).toBeCloseTo(AI_RANGES.threatSkipChance[0]);
        expect(p.abilityThreshold).toBe(AI_RANGES.abilityThreshold[0]);
        expect(p.scoreNoise).toBeCloseTo(0);
    });

    test('a highest roll lands on the top of every range', () => {
        const p = rollAiProfile(() => 0.999999);

        expect(p.decisionDelayMs).toBeLessThanOrEqual(AI_RANGES.decisionDelayMs[1]);
        expect(p.decisionDelayMs).toBeGreaterThan(AI_RANGES.decisionDelayMs[1] - 5);
        expect(p.ultimatesPerTurn).toBe(AI_RANGES.ultimatesPerTurn[1]);
        expect(p.abilityThreshold).toBe(AI_RANGES.abilityThreshold[1]);
    });

    // The old tiers were 1, 2 and 3 ultimates; the whole span stays reachable.
    test('reaches every ultimate count across many rolls', () => {
        const seen = new Set();
        for (let i = 0; i < 400; i += 1) {
            seen.add(rollAiProfile(Math.random).ultimatesPerTurn);
        }
        expect([...seen].sort()).toEqual([1, 2, 3]);
    });

    test('stays inside its ranges however it rolls', () => {
        for (let i = 0; i < 300; i += 1) {
            const p = rollAiProfile(Math.random);
            expect(p.ultimatesPerTurn).toBeGreaterThanOrEqual(1);
            expect(p.ultimatesPerTurn).toBeLessThanOrEqual(3);
            expect(p.threatSkipChance).toBeGreaterThanOrEqual(0);
            expect(p.threatSkipChance).toBeLessThanOrEqual(0.5);
            expect(p.bestPickChance).toBeGreaterThanOrEqual(0.3);
            expect(p.bestPickChance).toBeLessThanOrEqual(0.9);
        }
    });

    test('two turns do not have to look alike', () => {
        const a = rollAiProfile(Math.random);
        const b = rollAiProfile(Math.random);
        const differs = Object.keys(a).some((k) => a[k] !== b[k]);
        expect(differs).toBe(true);
    });

    test('the default sits in the middle of every range', () => {
        const p = defaultAiProfile();
        expect(p.decisionDelayMs).toBe(5000);
        expect(p.abilityThreshold).toBe(40);
    });
});

describe('taking a card off a ranked list', () => {
    const sharp = { bestPickChance: 0.9 };
    const loose = { bestPickChance: 0.3 };

    test('takes the best when the roll is under its pick chance', () => {
        expect(pickFromRanked(4, sharp, feed(0.1))).toBe(0);
    });

    test('slips down the list when it is not', () => {
        // Misses the best, then takes the two-thirds branch to second.
        expect(pickFromRanked(4, loose, feed(0.95, 0.1))).toBe(1);
    });

    test('sometimes goes further than second', () => {
        expect(pickFromRanked(4, loose, feed(0.95, 0.9, 0.99))).toBe(3);
    });

    test('a single candidate is always the pick', () => {
        expect(pickFromRanked(1, loose, feed(0.99, 0.99))).toBe(0);
    });

    test('an empty list picks nothing', () => {
        expect(pickFromRanked(0, sharp, Math.random)).toBe(-1);
    });
});

describe('scoring noise', () => {
    test('leaves a score alone on a no-noise turn', () => {
        expect(noisyScore(100, { scoreNoise: 0 }, () => 0.7)).toBe(100);
    });

    test('swings a score both ways at full noise', () => {
        expect(noisyScore(100, { scoreNoise: 0.3 }, () => 1)).toBeCloseTo(130);
        expect(noisyScore(100, { scoreNoise: 0.3 }, () => 0)).toBeCloseTo(70);
    });

    test('survives missing input', () => {
        expect(noisyScore(undefined, undefined, () => 0.5)).toBe(0);
    });
});

describe('patience', () => {
    test('splits the range in half', () => {
        expect(isPatient({ patience: 0.9 })).toBe(true);
        expect(isPatient({ patience: 0.1 })).toBe(false);
        expect(isPatient({})).toBe(true);
    });
});
