import {
    SHIELD_GEN,
    TELEPORT,
    shieldGenSample,
    shieldGenTotalMs,
    teleportSample,
} from './fxMath';

describe('Shield Generator wash', () => {
    test('rows light in sequence, not together', () => {
        expect(shieldGenSample(0, 0).started).toBe(true);
        expect(shieldGenSample(0, 1).started).toBe(false);
        expect(shieldGenSample(SHIELD_GEN.staggerMs, 1).started).toBe(true);
    });

    test('a row brightens then fades rather than snapping off', () => {
        const start = shieldGenSample(1, 0).alpha;
        const mid = shieldGenSample(SHIELD_GEN.ms / 2, 0).alpha;
        const end = shieldGenSample(SHIELD_GEN.ms, 0).alpha;
        expect(mid).toBeGreaterThan(start);
        expect(mid).toBeGreaterThan(end);
    });

    // The band must start off the row and finish past it, or the gradient pops
    // into existence half-way down.
    test('the band enters from before the row and leaves past it', () => {
        expect(shieldGenSample(0, 0).band).toBeCloseTo(-SHIELD_GEN.bandDepth, 5);
        expect(shieldGenSample(SHIELD_GEN.ms, 0).band).toBeCloseTo(1, 5);
    });

    test('the last row still finishes inside the run', () => {
        const total = shieldGenTotalMs(3);
        expect(shieldGenSample(total - 1, 2).done).toBe(false);
        expect(shieldGenSample(total, 2).done).toBe(true);
    });
});

describe('Teleporter', () => {
    const from = { x: 100, y: 400 };
    const to = { x: 600, y: 120 };

    test('travels from the board to the hand', () => {
        expect(teleportSample(0, from, to).x).toBeCloseTo(from.x);
        const end = teleportSample(TELEPORT.ms, from, to);
        expect(end.x).toBeCloseTo(to.x);
        expect(end.y).toBeCloseTo(to.y);
        expect(end.done).toBe(true);
    });

    test('bows off the straight line on the way', () => {
        const mid = teleportSample(TELEPORT.ms / 2, from, to);
        const straightX = (from.x + to.x) / 2;
        const straightY = (from.y + to.y) / 2;
        expect(Math.hypot(mid.x - straightX, mid.y - straightY)).toBeGreaterThan(1);
    });

    test('shrinks and fades as it is drawn in', () => {
        expect(teleportSample(TELEPORT.ms * 0.9, from, to).scale)
            .toBeLessThan(teleportSample(0, from, to).scale);
        expect(teleportSample(TELEPORT.ms, from, to).alpha).toBeCloseTo(0, 5);
    });

    test('trails after-images behind the head', () => {
        const mid = teleportSample(TELEPORT.ms / 2, from, to);
        expect(mid.ghosts).toHaveLength(TELEPORT.ghosts);
        // Each ghost lags a little further behind than the one before it.
        const lags = mid.ghosts.map((gh) => Math.hypot(gh.x - from.x, gh.y - from.y));
        for (let i = 1; i < lags.length; i += 1) {
            expect(lags[i]).toBeLessThanOrEqual(lags[i - 1]);
        }
    });
});
