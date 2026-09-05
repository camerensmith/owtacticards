import {
    DRONE,
    beaconAlpha,
    droneLaunchSample,
    droneOrbitSample,
    emberOffsets,
    impactFlashSample,
} from './fxMath';

const from = { x: 100, y: 400 };
const to = { x: 500, y: 120 };
const bounds = { x: 400, y: 200, width: 600, height: 300 };

describe('launch arc', () => {
    test('starts on the Warden card and ends at the first orbit point', () => {
        const start = droneLaunchSample(0, from, to);
        const end = droneLaunchSample(1, from, to);

        expect(start.x).toBeCloseTo(from.x);
        expect(start.y).toBeCloseTo(from.y);
        expect(end.x).toBeCloseTo(to.x);
        expect(end.y).toBeCloseTo(to.y);
    });

    // "should start small from the origination point"
    test('grows from a speck to full size', () => {
        expect(droneLaunchSample(0, from, to).scale).toBeCloseTo(DRONE.startScale);
        expect(droneLaunchSample(1, from, to).scale).toBeCloseTo(1);
        expect(DRONE.startScale).toBeLessThan(0.3);
    });

    test('scale only ever increases', () => {
        let prev = -Infinity;
        for (let t = 0; t <= 1.0001; t += 0.1) {
            const { scale } = droneLaunchSample(t, from, to);
            expect(scale).toBeGreaterThanOrEqual(prev);
            prev = scale;
        }
    });

    // A straight line would read as a slide; the arc is what sells the launch.
    test('arcs above the straight line between the ends', () => {
        const mid = droneLaunchSample(0.5, from, to);
        const straightY = (from.y + to.y) / 2;
        expect(mid.y).toBeLessThan(straightY);
    });

    test('clamps outside 0..1 instead of overshooting', () => {
        expect(droneLaunchSample(-5, from, to).x).toBeCloseTo(from.x);
        expect(droneLaunchSample(9, from, to).x).toBeCloseTo(to.x);
    });

    test('missing endpoints do not produce NaN', () => {
        const s = droneLaunchSample(0.5);
        expect(Number.isFinite(s.x)).toBe(true);
        expect(Number.isFinite(s.y)).toBe(true);
    });
});

describe('orbit wander', () => {
    test('stays inside the enemy half', () => {
        const maxX = bounds.width * DRONE.driftXExtent;
        const maxY = bounds.height * DRONE.driftYExtent;
        for (let ms = 0; ms < 120000; ms += 250) {
            const s = droneOrbitSample(ms, bounds);
            expect(Math.abs(s.x - bounds.x)).toBeLessThanOrEqual(maxX + 1e-6);
            expect(Math.abs(s.y - bounds.y)).toBeLessThanOrEqual(maxY + 1e-6);
        }
    });

    test('keeps moving rather than settling', () => {
        const a = droneOrbitSample(0, bounds);
        const b = droneOrbitSample(4000, bounds);
        expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeGreaterThan(1);
    });

    // Incommensurate rates: the path should not retrace itself on a short loop.
    test('does not repeat on a simple period', () => {
        const a = droneOrbitSample(0, bounds);
        const later = droneOrbitSample((2 * Math.PI) / DRONE.driftXRate, bounds);
        expect(Math.hypot(later.x - a.x, later.y - a.y)).toBeGreaterThan(1);
    });

    test('reports a finite heading', () => {
        expect(Number.isFinite(droneOrbitSample(1234, bounds).angle)).toBe(true);
    });
});

describe('red warning strobe', () => {
    test('never fully dark and never fully opaque', () => {
        for (let ms = 0; ms < 6000; ms += 25) {
            const a = beaconAlpha(ms);
            expect(a).toBeGreaterThanOrEqual(DRONE.beaconMinAlpha - 1e-9);
            expect(a).toBeLessThanOrEqual(DRONE.beaconMaxAlpha + 1e-9);
        }
    });

    test('peaks at the start of each blink', () => {
        expect(beaconAlpha(0)).toBeCloseTo(DRONE.beaconMaxAlpha);
        expect(beaconAlpha(DRONE.beaconPeriodMs)).toBeCloseTo(DRONE.beaconMaxAlpha);
    });

    // Two blinks per period is what makes it read as a searching beacon.
    test('blinks twice per period', () => {
        const half = DRONE.beaconPeriodMs / 2;
        expect(beaconAlpha(half)).toBeCloseTo(DRONE.beaconMaxAlpha);
        expect(beaconAlpha(half * 0.9)).toBeCloseTo(DRONE.beaconMinAlpha);
    });
});

describe('fiery impact', () => {
    test('ring expands while fading out', () => {
        const early = impactFlashSample(0.1);
        const late = impactFlashSample(0.9);
        expect(late.radius).toBeGreaterThan(early.radius);
        expect(late.alpha).toBeLessThan(early.alpha);
    });

    test('the hot core dies before the shock ring', () => {
        expect(impactFlashSample(0.6).coreAlpha).toBe(0);
        expect(impactFlashSample(0.6).alpha).toBeGreaterThan(0);
    });

    test('fully faded by the end', () => {
        const end = impactFlashSample(1);
        expect(end.alpha).toBe(0);
        expect(end.emberAlpha).toBe(0);
        expect(end.emberRadius).toBe(0);
    });

    test('embers ring the impact evenly', () => {
        const embers = emberOffsets(6, 10);
        expect(embers).toHaveLength(6);
        for (const ember of embers) {
            expect(Math.hypot(ember.x, ember.y)).toBeCloseTo(10);
        }
    });

    test('zero embers is safe', () => {
        expect(emberOffsets(0, 10)).toEqual([]);
    });
});
