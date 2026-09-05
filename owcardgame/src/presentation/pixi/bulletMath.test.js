import { BULLET, bulletSample, bulletTotalMs } from './fxMath';

const from = { x: 0, y: 0 };
const to = { x: 300, y: 0 };

describe('pulse pistol rounds', () => {
    test('a round leaves the muzzle and reaches the target', () => {
        const start = bulletSample(0, 0, from, to);
        expect(start.head.x).toBeCloseTo(from.x, 0);

        const arriving = bulletSample(BULLET.travelMs - 1, 0, from, to);
        expect(arriving.head.x).toBeGreaterThan(290);
    });

    // Easing would read as something thrown; a shot travels at constant speed.
    test('travels at constant speed', () => {
        const quarter = bulletSample(BULLET.travelMs * 0.25, 0, from, to).head.x;
        const half = bulletSample(BULLET.travelMs * 0.5, 0, from, to).head.x;
        const threeQuarter = bulletSample(BULLET.travelMs * 0.75, 0, from, to).head.x;
        expect(half - quarter).toBeCloseTo(threeQuarter - half, 3);
    });

    test('the round is elongated behind its head', () => {
        const s = bulletSample(BULLET.travelMs * 0.5, 0, from, to);
        expect(s.head.x - s.tail.x).toBeCloseTo(BULLET.length);
        // The streak reaches further back than the body.
        expect(s.tail.x - s.trail.x).toBeCloseTo(BULLET.trail);
    });

    test('body and streak trail the direction of travel', () => {
        const s = bulletSample(80, 0, from, { x: 0, y: 300 });
        expect(s.tail.y).toBeLessThan(s.head.y);
        expect(s.trail.y).toBeLessThan(s.tail.y);
    });

    test('later rounds of a burst are still in the barrel', () => {
        expect(bulletSample(0, 0, from, to).visible).toBe(true);
        expect(bulletSample(0, 1, from, to).visible).toBe(false);
        expect(bulletSample(BULLET.burstGapMs + 1, 1, from, to).visible).toBe(true);
    });

    // The spark is the hit landing; it must not precede arrival.
    test('sparks only after the round arrives', () => {
        expect(bulletSample(BULLET.travelMs * 0.5, 0, from, to).sparkT).toBe(0);
        const hit = bulletSample(BULLET.travelMs + BULLET.sparkMs * 0.5, 0, from, to);
        expect(hit.visible).toBe(false);
        expect(hit.sparkT).toBeGreaterThan(0);
    });

    test('a round finishes after its spark', () => {
        expect(bulletSample(BULLET.travelMs, 0, from, to).done).toBe(false);
        expect(bulletSample(BULLET.travelMs + BULLET.sparkMs, 0, from, to).done).toBe(true);
    });

    // A burst on one line would read as a single thick beam.
    test('rounds scatter across the line of fire but stay stable', () => {
        const a = bulletSample(BULLET.travelMs * 0.5, 0, from, to);
        const b = bulletSample(BULLET.burstGapMs + BULLET.travelMs * 0.5, 1, from, to);
        expect(a.head.y).not.toBeCloseTo(b.head.y);
        expect(Math.abs(a.head.y)).toBeLessThanOrEqual(BULLET.spread);

        const again = bulletSample(BULLET.travelMs * 0.5, 0, from, to);
        expect(again.head.y).toBeCloseTo(a.head.y);
    });

    test('burst duration covers every round plus its spark', () => {
        expect(bulletTotalMs(1)).toBe(BULLET.travelMs + BULLET.sparkMs);
        expect(bulletTotalMs(2)).toBe(BULLET.burstGapMs + BULLET.travelMs + BULLET.sparkMs);
        expect(bulletTotalMs(2)).toBeGreaterThan(bulletTotalMs(1));
    });

    test('degenerate input does not produce NaN', () => {
        const s = bulletSample(50, 0, {}, {});
        expect(Number.isFinite(s.head.x)).toBe(true);
        expect(Number.isFinite(s.tail.y)).toBe(true);
    });
});
