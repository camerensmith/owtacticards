import { LOCK_ON, LOCK_ON_TOTAL_MS, lockOnCorners, lockOnSample } from './fxMath';

const box = { width: 64, height: 90 };
const SNAP = LOCK_ON.snapMs;
const HOLD = LOCK_ON.holdMs;

describe('reticle timeline', () => {
    test('starts wide and invisible, so it converges into view', () => {
        const s = lockOnSample(0);
        expect(s.scale).toBeCloseTo(LOCK_ON.startScale);
        expect(s.alpha).toBeCloseTo(0);
        expect(LOCK_ON.startScale).toBeGreaterThan(1);
    });

    test('closes in monotonically during the snap', () => {
        let prev = Infinity;
        for (let ms = 0; ms <= SNAP; ms += SNAP / 10) {
            const { scale } = lockOnSample(ms);
            expect(scale).toBeLessThanOrEqual(prev + 1e-9);
            prev = scale;
        }
    });

    // Biting inside the card then easing back out is what makes it feel like a lock.
    test('overshoots inside the card before settling on the edge', () => {
        const onContact = lockOnSample(SNAP);
        expect(onContact.scale).toBeCloseTo(LOCK_ON.overshoot);
        expect(onContact.scale).toBeLessThan(1);

        const settled = lockOnSample(SNAP + HOLD - 1);
        expect(settled.scale).toBeGreaterThan(onContact.scale);
        expect(settled.scale).toBeLessThanOrEqual(1);
    });

    test('flashes only at the moment of lock', () => {
        expect(lockOnSample(SNAP * 0.5).flashAlpha).toBe(0);
        expect(lockOnSample(SNAP).flashAlpha).toBeGreaterThan(0.9);
        expect(lockOnSample(SNAP + HOLD * 0.5).flashAlpha).toBe(0);
    });

    test('holds fully opaque through the lock', () => {
        expect(lockOnSample(SNAP + HOLD * 0.5).alpha).toBe(1);
    });

    test('fades out and then reports done', () => {
        const fading = lockOnSample(SNAP + HOLD + LOCK_ON.fadeMs * 0.5);
        expect(fading.alpha).toBeLessThan(1);
        expect(fading.alpha).toBeGreaterThan(0);
        expect(fading.done).toBe(false);

        expect(lockOnSample(LOCK_ON_TOTAL_MS).done).toBe(true);
        expect(lockOnSample(LOCK_ON_TOTAL_MS + 5000).alpha).toBe(0);
    });

    // Spin unwinds to exactly square, or the brackets sit crooked on the card.
    test('rotation unwinds to square by the time it locks', () => {
        expect(Math.abs(lockOnSample(0).spin)).toBeCloseTo(LOCK_ON.spinFrom);
        expect(lockOnSample(SNAP).spin).toBe(0);
        expect(lockOnSample(SNAP + HOLD + 10).spin).toBe(0);
    });

    test('negative time is treated as the start', () => {
        expect(lockOnSample(-100).scale).toBeCloseTo(LOCK_ON.startScale);
    });
});

describe('corner brackets', () => {
    test('four corners, one per card corner', () => {
        const corners = lockOnCorners(box);
        expect(corners).toHaveLength(4);

        const signs = corners.map((c) => `${Math.sign(c.x)},${Math.sign(c.y)}`);
        expect(new Set(signs).size).toBe(4);
    });

    test('sit on the card edge at scale 1', () => {
        for (const corner of lockOnCorners(box, 1)) {
            expect(Math.abs(corner.x)).toBeCloseTo(box.width / 2);
            expect(Math.abs(corner.y)).toBeCloseTo(box.height / 2);
        }
    });

    test('scale pushes them outward', () => {
        const wide = lockOnCorners(box, 2);
        expect(Math.abs(wide[0].x)).toBeCloseTo(box.width);
    });

    // Arms must point back toward the centre, or the brackets open outward.
    test('arms point inward from every corner', () => {
        for (const corner of lockOnCorners(box)) {
            expect(Math.sign(corner.armX)).toBe(-Math.sign(corner.x));
            expect(Math.sign(corner.armY)).toBe(-Math.sign(corner.y));
        }
    });

    test('arms stay visible on a tiny card', () => {
        const [corner] = lockOnCorners({ width: 2, height: 2 });
        expect(Math.abs(corner.armX)).toBeGreaterThanOrEqual(4);
    });

    test('a missing box does not produce NaN', () => {
        const [corner] = lockOnCorners();
        expect(Number.isFinite(corner.x)).toBe(true);
        expect(Number.isFinite(corner.armX)).toBe(true);
    });
});
