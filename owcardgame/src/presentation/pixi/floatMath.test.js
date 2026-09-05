import { FLOAT, PUSH, floatSample, pushSample } from './fxMath';

describe('floating combat numbers', () => {
    test('starts at the card and climbs', () => {
        expect(floatSample(0).offsetY).toBeCloseTo(0);
        expect(floatSample(FLOAT.lifeMs).offsetY).toBeCloseTo(-FLOAT.rise);
    });

    test('only ever rises', () => {
        let prev = Infinity;
        for (let ms = 0; ms <= FLOAT.lifeMs; ms += FLOAT.lifeMs / 12) {
            const { offsetY } = floatSample(ms);
            expect(offsetY).toBeLessThanOrEqual(prev + 1e-9);
            prev = offsetY;
        }
    });

    // The pop is what makes a hit land; without it numbers just slide upward.
    test('punches past full size then settles', () => {
        expect(floatSample(FLOAT.popMs / 2).scale).toBeCloseTo(FLOAT.popScale);
        expect(floatSample(FLOAT.popMs).scale).toBeCloseTo(1);
        expect(floatSample(FLOAT.lifeMs / 2).scale).toBe(1);
    });

    test('holds opaque before fading, and ends invisible', () => {
        expect(floatSample(FLOAT.lifeMs * (FLOAT.fadeFrom / 2)).alpha).toBe(1);
        const fading = floatSample(FLOAT.lifeMs * 0.8);
        expect(fading.alpha).toBeGreaterThan(0);
        expect(fading.alpha).toBeLessThan(1);
        expect(floatSample(FLOAT.lifeMs).alpha).toBe(0);
    });

    test('reports done at the end of life', () => {
        expect(floatSample(FLOAT.lifeMs - 1).done).toBe(false);
        expect(floatSample(FLOAT.lifeMs).done).toBe(true);
        expect(floatSample(FLOAT.lifeMs * 4).done).toBe(true);
    });

    // Two hits on one card in the same frame must not sit exactly on top of each other.
    test('seed spreads simultaneous hits sideways', () => {
        expect(floatSample(100, 0).offsetX).toBeCloseTo(-FLOAT.driftX);
        expect(floatSample(100, 1).offsetX).toBeCloseTo(FLOAT.driftX);
        expect(floatSample(100, 0.5).offsetX).toBeCloseTo(0);
    });

    test('alpha never goes negative', () => {
        for (let ms = 0; ms <= FLOAT.lifeMs * 2; ms += 25) {
            expect(floatSample(ms).alpha).toBeGreaterThanOrEqual(0);
        }
    });
});

describe('forced movement', () => {
    const from = { x: 0, y: 200 };
    const to = { x: 300, y: 200 };

    test('spans exactly from the old slot to the new one', () => {
        const start = pushSample(0, from, to);
        const end = pushSample(1, from, to);
        expect(start.x).toBeCloseTo(from.x);
        expect(end.x).toBeCloseTo(to.x);
        expect(end.y).toBeCloseTo(to.y);
    });

    // A flat slide reads as a glitch; the lift makes it read as a shove.
    test('lifts off the board mid-flight', () => {
        const mid = pushSample(0.5, from, to);
        expect(mid.y).toBeLessThan(from.y);
        expect(from.y - mid.y).toBeCloseTo(PUSH.lift);
    });

    test('lands flat at both ends', () => {
        expect(pushSample(0, from, to).y).toBeCloseTo(from.y);
        expect(pushSample(1, from, to).y).toBeCloseTo(to.y);
    });

    test('scales up mid-flight and back down', () => {
        expect(pushSample(0, from, to).scale).toBeCloseTo(1);
        expect(pushSample(0.5, from, to).scale).toBeCloseTo(PUSH.peakScale);
        expect(pushSample(1, from, to).scale).toBeCloseTo(1);
    });

    test('clamps outside 0..1', () => {
        expect(pushSample(-3, from, to).x).toBeCloseTo(from.x);
        expect(pushSample(7, from, to).x).toBeCloseTo(to.x);
    });

    test('missing endpoints do not produce NaN', () => {
        const s = pushSample(0.5);
        expect(Number.isFinite(s.x)).toBe(true);
        expect(Number.isFinite(s.y)).toBe(true);
    });
});
