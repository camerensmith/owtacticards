import {
    BESTOW,
    REZ,
    bestowMotes,
    bestowSample,
    rezAuraRays,
    rezAuraSample,
    rezFlashSample,
    wingsSample,
} from './fxMath';

describe('Caduceus bestow', () => {
    test('the light comes down, then the ring blooms after it lands', () => {
        const early = bestowSample(BESTOW.ms * 0.1);
        const late = bestowSample(BESTOW.ms * 0.7);
        expect(early.columnHeight).toBeGreaterThan(late.columnHeight);
        expect(early.ringAlpha).toBe(0);
        expect(late.ringAlpha).toBeGreaterThan(0);
    });

    test('the ring expands outward once it starts', () => {
        expect(bestowSample(BESTOW.ms * 0.9).ringReach)
            .toBeGreaterThan(bestowSample(BESTOW.ms * 0.5).ringReach);
    });

    test('it fades out and finishes', () => {
        expect(bestowSample(BESTOW.ms * 0.95).columnAlpha)
            .toBeLessThan(bestowSample(BESTOW.ms * 0.45).columnAlpha);
        expect(bestowSample(BESTOW.ms).done).toBe(true);
    });

    test('never brightens past its ceiling', () => {
        for (let ms = 0; ms <= BESTOW.ms; ms += 50) {
            const s = bestowSample(ms);
            expect(s.columnAlpha).toBeLessThanOrEqual(BESTOW.alpha);
            expect(s.glow).toBeLessThanOrEqual(BESTOW.alpha);
            expect(s.columnAlpha).toBeGreaterThanOrEqual(0);
        }
    });

    // Heal and boost share the shape and differ only in colour, so one mechanic
    // reads as one mechanic.
    test('heal and boost are distinct colours', () => {
        expect(BESTOW.heal).not.toBe(BESTOW.boost);
    });

    test('motes rise up the column and hold their lanes', () => {
        const motes = bestowMotes(400, 100);
        expect(motes).toHaveLength(BESTOW.motes);
        for (const mote of motes) expect(mote.y).toBeLessThanOrEqual(0);
        expect(bestowMotes(400, 100)).toEqual(motes);
    });

    test('motes fade in and out rather than popping at the ends of their run', () => {
        for (let ms = 0; ms <= BESTOW.ms; ms += 60) {
            for (const mote of bestowMotes(ms, 100)) {
                expect(mote.alpha).toBeGreaterThanOrEqual(0);
                expect(mote.alpha).toBeLessThanOrEqual(BESTOW.alpha);
            }
        }
    });
});

describe('Resurrection aura', () => {
    // Held open until the hero lands, so it must loop rather than end.
    test('breathes without ever dying out', () => {
        for (let ms = 0; ms < REZ.auraMs * 3; ms += 100) {
            const s = rezAuraSample(ms);
            expect(s.alpha).toBeGreaterThan(0);
            expect(s.alpha).toBeLessThanOrEqual(REZ.auraAlpha);
            expect(s.reach).toBeGreaterThan(0);
        }
    });

    test('the breath loops seamlessly', () => {
        expect(rezAuraSample(REZ.auraMs).alpha).toBeCloseTo(rezAuraSample(0).alpha, 10);
    });

    test('the rays turn over time', () => {
        expect(rezAuraSample(2000).spin).toBeGreaterThan(rezAuraSample(0).spin);
    });

    test('rays are spread around the circle at uneven lengths', () => {
        const rays = rezAuraRays(0);
        expect(rays).toHaveLength(REZ.rays);
        expect(new Set(rays.map((r) => r.angle)).size).toBe(REZ.rays);
        expect(new Set(rays.map((r) => r.scale)).size).toBeGreaterThan(1);
    });
});

describe('The hero coming back', () => {
    test('the light swells and clears rather than snapping', () => {
        expect(rezFlashSample(0).alpha).toBeCloseTo(0, 5);
        expect(rezFlashSample(REZ.flashMs / 2).alpha).toBeGreaterThan(0.9);
        expect(rezFlashSample(REZ.flashMs).done).toBe(true);
    });

    test('the band sweeps down the card', () => {
        expect(rezFlashSample(REZ.flashMs * 0.8).sweep)
            .toBeGreaterThan(rezFlashSample(REZ.flashMs * 0.2).sweep);
    });

    // Slow on purpose: they are easing back in, not blinking into place.
    test('is slower than an ordinary hit flash', () => {
        expect(REZ.flashMs).toBeGreaterThan(1000);
    });
});

describe('Wings', () => {
    test('fade in, hold, and fade out', () => {
        expect(wingsSample(0).alpha).toBeCloseTo(0, 5);
        expect(wingsSample(REZ.wingsMs / 2).alpha).toBeCloseTo(1, 5);
        expect(wingsSample(REZ.wingsMs).alpha).toBeCloseTo(0, 5);
        expect(wingsSample(REZ.wingsMs).done).toBe(true);
    });

    test('beat slowly instead of sitting still', () => {
        const lifts = [0, 350, 700, 1050].map((ms) => wingsSample(ms).lift);
        expect(new Set(lifts).size).toBeGreaterThan(1);
        expect(Math.max(...lifts.map(Math.abs))).toBeLessThan(6);
    });

    test('outlast the flash, so they are still there once the light clears', () => {
        expect(REZ.wingsMs).toBeGreaterThan(REZ.flashMs);
    });
});
