import {
    ROCKET,
    SENTRY,
    TANK_FORM,
    rocketSample,
    sentrySweep,
    tankFormSample,
} from './fxMath';

describe('sentry scan', () => {
    test('sweeps the full width of the row', () => {
        expect(sentrySweep(0).u).toBeCloseTo(0);
        expect(sentrySweep(SENTRY.sweepMs / 2).u).toBeCloseTo(1);
        expect(sentrySweep(SENTRY.sweepMs).u).toBeCloseTo(0);
    });

    test('never leaves the row', () => {
        for (let ms = 0; ms < SENTRY.sweepMs * 3; ms += 31) {
            const { u } = sentrySweep(ms);
            expect(u).toBeGreaterThanOrEqual(0);
            expect(u).toBeLessThanOrEqual(1);
        }
    });

    // Cosine ping-pong: it should ease at the turnarounds, not snap back.
    test('slows at each end and is quickest mid-sweep', () => {
        const step = SENTRY.sweepMs / 100;
        const nearEnd = Math.abs(sentrySweep(step).u - sentrySweep(0).u);
        const midway = Math.abs(
            sentrySweep(SENTRY.sweepMs / 4 + step).u - sentrySweep(SENTRY.sweepMs / 4).u
        );
        expect(midway).toBeGreaterThan(nearEnd);
    });

    test('stays subtle', () => {
        for (let ms = 0; ms < SENTRY.sweepMs * 2; ms += 29) {
            const { alpha } = sentrySweep(ms);
            expect(alpha).toBeGreaterThanOrEqual(0);
            expect(alpha).toBeLessThanOrEqual(SENTRY.maxAlpha + 1e-9);
        }
    });
});

describe('tank form', () => {
    test('fades in on activation', () => {
        expect(tankFormSample(0).alpha).toBeCloseTo(0);
        expect(tankFormSample(TANK_FORM.fadeMs).alpha).toBeCloseTo(1);
    });

    // Leaving it up would strand Bastion in tank form for the rest of the match.
    test('fades out and reports gone when standing down', () => {
        expect(tankFormSample(0, true).alpha).toBeCloseTo(1);
        expect(tankFormSample(TANK_FORM.fadeMs, true).alpha).toBeCloseTo(0);
        expect(tankFormSample(TANK_FORM.fadeMs, true).gone).toBe(true);
        expect(tankFormSample(TANK_FORM.fadeMs).gone).toBe(false);
    });

    test('bobs around its resting position rather than drifting', () => {
        const offsets = [];
        for (let ms = 0; ms <= TANK_FORM.bobMs; ms += TANK_FORM.bobMs / 8) {
            offsets.push(tankFormSample(ms).offsetY);
        }
        for (const offset of offsets) {
            expect(Math.abs(offset)).toBeLessThanOrEqual(TANK_FORM.bob + 1e-9);
        }
        expect(tankFormSample(TANK_FORM.bobMs).offsetY).toBeCloseTo(tankFormSample(0).offsetY);
    });
});

describe('rockets', () => {
    const from = { x: 0, y: 0 };
    const to = { x: 400, y: 0 };

    test('travels from Bastion to the target', () => {
        expect(rocketSample(0, 0, from, to).head.x).toBeCloseTo(0);
        expect(rocketSample(ROCKET.travelMs, 0, from, to).visible).toBe(false);
        expect(rocketSample(ROCKET.travelMs * 0.99, 0, from, to).head.x).toBeGreaterThan(390);
    });

    // A salvo down one line reads as a single thick streak.
    test('consecutive rockets bow to opposite sides', () => {
        const a = rocketSample(ROCKET.travelMs * 0.5, 0, from, to);
        const b = rocketSample(ROCKET.staggerMs + ROCKET.travelMs * 0.5, 1, from, to);
        expect(Math.sign(a.head.y)).toBe(-Math.sign(b.head.y));
    });

    test('the bow closes at both ends so it still hits', () => {
        expect(rocketSample(0, 0, from, to).head.y).toBeCloseTo(0);
        const arriving = rocketSample(ROCKET.travelMs * 0.999, 0, from, to);
        expect(Math.abs(arriving.head.y)).toBeLessThan(1);
    });

    test('later rockets of a salvo launch later', () => {
        expect(rocketSample(0, 1, from, to).visible).toBe(false);
        expect(rocketSample(ROCKET.staggerMs + 1, 1, from, to).visible).toBe(true);
    });

    test('smoke trails behind and thins with age', () => {
        const s = rocketSample(ROCKET.travelMs * 0.8, 0, from, to);
        expect(s.smoke.length).toBeGreaterThan(1);
        expect(s.smoke[0].x).toBeLessThan(s.head.x);
        expect(s.smoke[s.smoke.length - 1].alpha).toBeLessThan(s.smoke[0].alpha);
    });

    test('no smoke before it has flown anywhere', () => {
        expect(rocketSample(0, 0, from, to).smoke).toEqual([]);
    });

    test('bursts only on arrival, then finishes', () => {
        expect(rocketSample(ROCKET.travelMs * 0.5, 0, from, to).explodeT).toBe(0);
        expect(rocketSample(ROCKET.travelMs + ROCKET.explodeMs * 0.5, 0, from, to).explodeT)
            .toBeGreaterThan(0);
        expect(rocketSample(ROCKET.travelMs + ROCKET.explodeMs, 0, from, to).done).toBe(true);
    });

    test('degenerate input does not produce NaN', () => {
        const s = rocketSample(100, 0, {}, {});
        expect(Number.isFinite(s.head.x)).toBe(true);
        expect(Number.isFinite(s.angle)).toBe(true);
    });
});
