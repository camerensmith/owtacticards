import {
    BIOTIC,
    CROSSHAIR,
    MEKA,
    bioticBubbles,
    bioticFlash,
    crosshairSample,
    mekaSample,
} from './fxMath';

const row = { left: 100, top: 200, width: 400, height: 80 };

describe('biotic field', () => {
    test('blooms fast then settles out', () => {
        expect(bioticFlash(0)).toBeCloseTo(0);
        expect(bioticFlash(BIOTIC.flashMs)).toBeCloseTo(1);
        expect(bioticFlash(BIOTIC.durationMs)).toBeCloseTo(0);
    });

    test('the bloom is quicker than the settle', () => {
        expect(BIOTIC.flashMs).toBeLessThan(BIOTIC.durationMs - BIOTIC.flashMs);
    });

    test('alpha never leaves 0..1', () => {
        for (let ms = 0; ms <= BIOTIC.durationMs * 1.5; ms += 17) {
            const a = bioticFlash(ms);
            expect(a).toBeGreaterThanOrEqual(0);
            expect(a).toBeLessThanOrEqual(1);
        }
    });

    // Bubbles rise; anything falling would read as a leak, not a heal.
    test('bubbles rise from the bottom of the row', () => {
        const early = bioticBubbles(120, row)[0];
        const late = bioticBubbles(600, row)[0];
        expect(early).toBeDefined();
        expect(late.y).toBeLessThan(early.y);
        expect(early.y).toBeLessThanOrEqual(row.top + row.height);
    });

    test('bubbles stay within the row horizontally', () => {
        for (let ms = 0; ms < BIOTIC.durationMs; ms += 40) {
            for (const bubble of bioticBubbles(ms, row)) {
                expect(bubble.x).toBeGreaterThanOrEqual(row.left);
                expect(bubble.x).toBeLessThanOrEqual(row.left + row.width);
            }
        }
    });

    test('bubbles keep their lane rather than re-scattering', () => {
        const a = bioticBubbles(300, row);
        const b = bioticBubbles(300, row);
        expect(a.map((x) => x.x)).toEqual(b.map((x) => x.x));
    });

    test('released on a stagger, and all gone by the end', () => {
        expect(bioticBubbles(0, row).length).toBeLessThan(BIOTIC.bubbleCount);
        expect(bioticBubbles(BIOTIC.durationMs * 2, row)).toEqual([]);
    });
});

describe('tactical visor crosshair', () => {
    test('fades in when placed and out when cleared', () => {
        expect(crosshairSample(0).alpha).toBeCloseTo(0);
        expect(crosshairSample(CROSSHAIR.fadeMs).alpha).toBeCloseTo(1);
        expect(crosshairSample(0, true).alpha).toBeCloseTo(1);
        expect(crosshairSample(CROSSHAIR.fadeMs, true).alpha).toBeCloseTo(0);
    });

    // A held lock must eventually report gone, or crosshairs pile up.
    test('only reports gone while closing', () => {
        expect(crosshairSample(CROSSHAIR.fadeMs, true).gone).toBe(true);
        expect(crosshairSample(999999, false).gone).toBe(false);
    });

    test('spins continuously while held', () => {
        expect(crosshairSample(0).rotation).toBeCloseTo(0);
        expect(crosshairSample(2000).rotation).toBeGreaterThan(0);
    });

    test('breathes around full size without ballooning', () => {
        for (let ms = 0; ms < CROSSHAIR.pulseMs * 2; ms += 25) {
            const { scale } = crosshairSample(ms);
            expect(scale).toBeGreaterThanOrEqual(0.9);
            expect(scale).toBeLessThanOrEqual(1.01);
        }
    });
});

describe('MEKA self destruct', () => {
    // The whole point of the wind-up: nothing detonates before 1.8s.
    test('charges for the full delay before the blast', () => {
        expect(MEKA.chargeMs).toBe(1800);
        expect(mekaSample(0).charging).toBe(true);
        expect(mekaSample(MEKA.chargeMs - 1).charging).toBe(true);
        expect(mekaSample(MEKA.chargeMs - 1).blastT).toBe(0);
        expect(mekaSample(MEKA.chargeMs).charging).toBe(false);
    });

    test('intensity builds towards detonation', () => {
        let prev = -1;
        for (let ms = 0; ms <= MEKA.chargeMs; ms += MEKA.chargeMs / 10) {
            const { intensity } = mekaSample(ms);
            expect(intensity).toBeGreaterThanOrEqual(prev);
            prev = intensity;
        }
        expect(prev).toBeCloseTo(1);
    });

    test('blast runs its course then finishes', () => {
        expect(mekaSample(MEKA.chargeMs).blastT).toBeCloseTo(0);
        expect(mekaSample(MEKA.chargeMs + MEKA.blastMs / 2).blastT).toBeCloseTo(0.5);
        expect(mekaSample(MEKA.chargeMs + MEKA.blastMs).done).toBe(true);
    });

    test('flicker stays bounded', () => {
        for (let ms = 0; ms < MEKA.chargeMs; ms += 13) {
            const { flicker } = mekaSample(ms);
            expect(flicker).toBeGreaterThanOrEqual(0);
            expect(flicker).toBeLessThanOrEqual(1);
        }
    });
});
