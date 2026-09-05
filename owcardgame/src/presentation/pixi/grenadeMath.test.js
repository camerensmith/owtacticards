import {
    DEADEYE,
    FLASHBANG,
    GRENADE,
    NANO,
    deadeyeOrbSample,
    grenadeSample,
    grenadeTotalMs,
    nanoBolt,
    nanoBoltSample,
    nanoSample,
} from './fxMath';

const from = { x: 0, y: 400 };
const to = { x: 300, y: 400, width: 400, height: 80 };
const row = { left: 50, top: 200, width: 400, height: 80 };

describe('thrown grenade', () => {
    test('leaves the thrower and lands on the target', () => {
        expect(grenadeSample(0, from, to).x).toBeCloseTo(from.x);
        const landing = grenadeSample(GRENADE.travelMs, from, to);
        expect(landing.x).toBeCloseTo(to.x);
        expect(landing.y).toBeCloseTo(to.y);
    });

    // A lob, not a straight throw: it must rise between the two ends.
    test('arcs above the straight line and comes back down', () => {
        const mid = grenadeSample(GRENADE.travelMs / 2, from, to);
        expect(mid.y).toBeCloseTo(from.y - GRENADE.arc);
        expect(mid.y).toBeLessThan(from.y);
        expect(grenadeSample(GRENADE.travelMs, from, to).y).toBeCloseTo(to.y);
    });

    test('spins in flight', () => {
        expect(grenadeSample(0, from, to).rotation).toBeCloseTo(0);
        expect(grenadeSample(300, from, to).rotation).toBeGreaterThan(0);
    });

    test('bursts only after it lands, then finishes', () => {
        expect(grenadeSample(GRENADE.travelMs / 2, from, to).burstT).toBe(0);
        expect(grenadeSample(GRENADE.travelMs / 2, from, to).flying).toBe(true);

        const burst = grenadeSample(GRENADE.travelMs + GRENADE.burstMs / 2, from, to);
        expect(burst.flying).toBe(false);
        expect(burst.burstT).toBeGreaterThan(0);

        expect(grenadeSample(grenadeTotalMs(), from, to).done).toBe(true);
    });

    test('degenerate input does not produce NaN', () => {
        const s = grenadeSample(100, {}, {});
        expect(Number.isFinite(s.x)).toBe(true);
        expect(Number.isFinite(s.y)).toBe(true);
    });

    // Flashbang's toss SFX is a snap, not Ana's 620ms lob.
    test('flashbang lands on a snap throw while the default grenade is still in the air', () => {
        expect(FLASHBANG.travelMs).toBeLessThanOrEqual(240);
        expect(FLASHBANG.travelMs).toBeLessThan(GRENADE.travelMs / 2);

        expect(grenadeSample(FLASHBANG.travelMs, from, to, FLASHBANG).flying).toBe(false);
        expect(grenadeSample(FLASHBANG.travelMs, from, to, FLASHBANG).x).toBeCloseTo(to.x);
        expect(grenadeSample(FLASHBANG.travelMs, from, to).flying).toBe(true);
    });
});

describe('dead eye orbs', () => {
    // Starting wide and closing is what makes it read as taking aim.
    test('zeroes in from wide onto the mark', () => {
        expect(deadeyeOrbSample(0).spread).toBeCloseTo(DEADEYE.approach);
        expect(DEADEYE.approach).toBeGreaterThan(1);
        expect(deadeyeOrbSample(DEADEYE.settleMs).spread).toBeCloseTo(1);
    });

    test('closes monotonically', () => {
        let prev = Infinity;
        for (let ms = 0; ms <= DEADEYE.settleMs; ms += DEADEYE.settleMs / 10) {
            const { spread } = deadeyeOrbSample(ms);
            expect(spread).toBeLessThanOrEqual(prev + 1e-9);
            prev = spread;
        }
    });

    test('fades in as it settles', () => {
        expect(deadeyeOrbSample(0).alpha).toBeCloseTo(0);
        expect(deadeyeOrbSample(DEADEYE.settleMs).alpha).toBeCloseTo(1);
    });

    test('keeps pulsing once held, without ballooning', () => {
        for (let ms = 0; ms < DEADEYE.pulseMs * 3; ms += 20) {
            const { pulse } = deadeyeOrbSample(ms);
            expect(pulse).toBeGreaterThanOrEqual(0.79);
            expect(pulse).toBeLessThanOrEqual(1.01);
        }
    });
});

describe('nano boost arcs', () => {
    test('a bolt spans the row and is pinned at both ends', () => {
        const points = nanoBolt(0, row);
        expect(points[0].x).toBeCloseTo(row.left);
        expect(points[points.length - 1].x).toBeCloseTo(row.left + row.width);

        const midY = row.top + row.height / 2;
        expect(points[0].y).toBeCloseTo(midY);
        expect(points[points.length - 1].y).toBeCloseTo(midY);
    });

    test('the middle actually deviates, and stays on the row', () => {
        const points = nanoBolt(1, row);
        const midY = row.top + row.height / 2;
        const mid = points[Math.floor(points.length / 2)];
        expect(Math.abs(mid.y - midY)).toBeGreaterThan(0);
        for (const point of points) {
            expect(Math.abs(point.y - midY)).toBeLessThanOrEqual(row.height * NANO.jitter + 1e-9);
        }
    });

    // A bolt that re-randomised each frame would shimmer instead of striking.
    test('a bolt holds its shape between calls', () => {
        expect(nanoBolt(2, row)).toEqual(nanoBolt(2, row));
    });

    test('bolts differ from one another', () => {
        expect(nanoBolt(0, row)).not.toEqual(nanoBolt(1, row));
    });

    test('bolts strike on a stagger and decay', () => {
        expect(nanoBoltSample(0, 0).visible).toBe(true);
        expect(nanoBoltSample(0, 1).visible).toBe(false);
        expect(nanoBoltSample(0, 0).alpha).toBeCloseTo(1);
        expect(nanoBoltSample(NANO.strikeMs * 0.9, 0).alpha).toBeLessThan(0.3);
        expect(nanoBoltSample(NANO.strikeMs + 1, 0).visible).toBe(false);
    });

    test('runs for a couple of seconds, fading out at the end', () => {
        expect(NANO.durationMs).toBeGreaterThanOrEqual(2000);
        expect(nanoSample(0).alpha).toBe(1);
        expect(nanoSample(NANO.durationMs * 0.5).alpha).toBe(1);
        expect(nanoSample(NANO.durationMs * 0.9).alpha).toBeLessThan(1);
        expect(nanoSample(NANO.durationMs).done).toBe(true);
    });
});
