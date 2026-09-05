import {
    BASH,
    TURBOJACK,
    bashSample,
    cycloneSample,
    flingSample,
    swirlArms,
    turbojackTotalMs,
} from './fxMath';

describe('Shield Bash spark', () => {
    test('is over quickly', () => {
        expect(bashSample(BASH.ms).done).toBe(true);
        expect(BASH.ms).toBeLessThan(500);
    });

    test('flashes hard then dies rather than blooming', () => {
        expect(bashSample(0).alpha).toBeCloseTo(1, 5);
        expect(bashSample(BASH.ms * 0.7).alpha).toBe(0);
    });

    test('throws spikes out in every direction', () => {
        const s = bashSample(BASH.ms * 0.5);
        expect(s.spikes).toHaveLength(BASH.spikes);
        for (const spike of s.spikes) {
            expect(spike.outer).toBeGreaterThan(spike.inner);
        }
    });

    test('the ring expands', () => {
        expect(bashSample(BASH.ms * 0.9).ringRadius).toBeGreaterThan(bashSample(0).ringRadius);
    });
});

describe('Turbojack cyclone', () => {
    const from = { x: 100, y: 300 };
    const to = { x: 500, y: 300 };

    test('crosses to the target', () => {
        expect(cycloneSample(0, from, to).x).toBeCloseTo(from.x);
        const end = cycloneSample(TURBOJACK.cycloneMs, from, to);
        expect(end.x).toBeCloseTo(to.x);
        expect(end.done).toBe(true);
    });

    test('the funnel is pinched at the tip and wide behind', () => {
        const ribs = cycloneSample(TURBOJACK.cycloneMs / 2, from, to).ribs;
        expect(ribs).toHaveLength(TURBOJACK.ribs);
        expect(ribs[ribs.length - 1].width).toBeGreaterThan(ribs[0].width);
    });

    test('it spins as it travels', () => {
        const a = cycloneSample(60, from, to).ribs.map((r) => r.y);
        const b = cycloneSample(260, from, to).ribs.map((r) => r.y);
        expect(a).not.toEqual(b);
    });

    test('the funnel fades out as it lands', () => {
        const late = cycloneSample(TURBOJACK.cycloneMs * 0.97, from, to);
        expect(late.ribs[0].alpha).toBeLessThan(1);
        expect(late.ribs[0].alpha).toBeGreaterThanOrEqual(0);
    });
});

describe('Turbojack swirl', () => {
    test('turns and is swallowed inward', () => {
        const s = swirlArms(TURBOJACK.swirlMs / 2, 50);
        expect(s.arms).toHaveLength(TURBOJACK.swirlArms);
        for (const arm of s.arms) {
            const outer = Math.hypot(arm[0].x, arm[0].y);
            const inner = Math.hypot(arm[arm.length - 1].x, arm[arm.length - 1].y);
            expect(inner).toBeLessThan(outer);
        }
    });

    test('rotates over time', () => {
        expect(swirlArms(0, 50).arms[0][0]).not.toEqual(swirlArms(300, 50).arms[0][0]);
    });

    test('fades in and out rather than snapping', () => {
        expect(swirlArms(0, 50).alpha).toBeCloseTo(0, 5);
        expect(swirlArms(TURBOJACK.swirlMs / 2, 50).alpha).toBeGreaterThan(0.9);
        expect(swirlArms(TURBOJACK.swirlMs, 50).done).toBe(true);
    });

    test('the whole ultimate covers the cyclone and what follows it', () => {
        expect(turbojackTotalMs()).toBeGreaterThan(TURBOJACK.cycloneMs + TURBOJACK.swirlMs - 1);
    });
});

describe('Fling to the deck', () => {
    const from = { x: 500, y: 300 };
    const to = { x: 120, y: 60 };

    test('arrives at the deck', () => {
        const end = flingSample(TURBOJACK.flingMs, from, to);
        expect(end.x).toBeCloseTo(to.x);
        expect(end.y).toBeCloseTo(to.y);
        expect(end.done).toBe(true);
    });

    test('is thrown, not tweened: it bows and spins', () => {
        const mid = flingSample(TURBOJACK.flingMs / 2, from, to);
        const straightX = (from.x + to.x) / 2;
        const straightY = (from.y + to.y) / 2;
        expect(Math.hypot(mid.x - straightX, mid.y - straightY)).toBeGreaterThan(10);
        expect(Math.abs(mid.rotation)).toBeGreaterThan(Math.PI);
    });

    test('shrinks away as it goes', () => {
        expect(flingSample(TURBOJACK.flingMs, from, to).scale)
            .toBeLessThan(flingSample(0, from, to).scale);
        expect(flingSample(TURBOJACK.flingMs, from, to).alpha).toBeCloseTo(0, 5);
    });
});
