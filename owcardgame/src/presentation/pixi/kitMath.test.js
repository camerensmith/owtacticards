import {
    DUPLICATE,
    LAVA,
    SMASH,
    STAFF,
    TIDE,
    duplicateSample,
    lavaVein,
    smashSample,
    staffHop,
    tideCrest,
    tideFoam,
    tideSample,
    suppressShot,
} from './fxMath';

describe('Echo Duplicate', () => {
    test('rings expand and fade, then the burst is gone', () => {
        const start = duplicateSample(0);
        const mid = duplicateSample(DUPLICATE.ms / 2);
        expect(mid.radius).toBeGreaterThan(start.radius);
        expect(duplicateSample(0).alpha).toBeGreaterThan(duplicateSample(DUPLICATE.ms).alpha);
        expect(duplicateSample(DUPLICATE.ms).gone).toBe(true);
    });
});

describe('Forge Hammer lava veins', () => {
    const rect = { left: 10, top: 20, width: 80, height: 120 };

    test('each vein is a polyline down the card', () => {
        const vein = lavaVein(rect, 0, 0);
        expect(vein.points.length).toBeGreaterThan(2);
        expect(vein.points[0].y).toBeLessThan(vein.points[vein.points.length - 1].y);
        expect(vein.alpha).toBeGreaterThan(0);
    });

    test('veins stay inside the card and crackle over time', () => {
        const a = lavaVein(rect, 0, 1);
        const b = lavaVein(rect, LAVA.pulseMs / 2, 1);
        a.points.forEach((p) => {
            expect(p.x).toBeGreaterThanOrEqual(rect.left);
            expect(p.x).toBeLessThanOrEqual(rect.left + rect.width);
        });
        expect(a.alpha).not.toBeCloseTo(b.alpha);
    });
});

describe('BOB smash', () => {
    test('the slam drops onto the card then smoke expands', () => {
        const windup = smashSample(0);
        const hit = smashSample(SMASH.ms * SMASH.slamAt);
        const late = smashSample(SMASH.ms * 0.8);
        expect(windup.offsetY).toBeLessThan(0);
        expect(Math.abs(hit.offsetY)).toBeLessThan(Math.abs(windup.offsetY));
        expect(late.smokeR).toBeGreaterThan(hit.smokeR);
        expect(smashSample(SMASH.ms).gone).toBe(true);
    });
});

describe('BOB suppressing fire', () => {
    const from = { x: 50, y: 400 };
    const area = { left: 200, top: 40, width: 300, height: 80 };

    test('shots land inside the suppressed row', () => {
        const shot = suppressShot(80, 0, from, area);
        expect(shot.x).toBeGreaterThanOrEqual(area.left);
        expect(shot.x).toBeLessThanOrEqual(area.left + area.width);
        expect(shot.y).toBeGreaterThanOrEqual(area.top);
        expect(shot.y).toBeLessThanOrEqual(area.top + area.height);
    });

    test('a shot travels from BOB toward the row', () => {
        const start = suppressShot(0, 2, from, area);
        const mid = suppressShot(100, 2, from, area);
        expect(mid.head.x).not.toBeCloseTo(start.head.x);
    });
});

describe('Wuyang staff orb', () => {
    const path = [
        { x: 0, y: 0 },
        { x: 100, y: 40 },
        { x: 40, y: 120 },
    ];

    test('the orb starts on Wuyang and hops to later targets', () => {
        expect(staffHop(0, path).x).toBeCloseTo(0);
        expect(staffHop(0, path).y).toBeCloseTo(0);
        const afterFirst = staffHop(STAFF.hopMs, path);
        expect(afterFirst.x).toBeCloseTo(100);
        expect(afterFirst.y).toBeCloseTo(40);
    });

    test('a water trail sits behind the orb', () => {
        const mid = staffHop(STAFF.hopMs / 2, path);
        expect(mid.trail.x).not.toBeCloseTo(mid.x);
        expect(mid.trail.y).not.toBeCloseTo(mid.y);
    });

    test('the hop finishes after the last target', () => {
        expect(staffHop(STAFF.hopMs * (path.length - 1), path).gone).toBe(true);
    });
});

describe('Guardian Tide wave', () => {
    const from = { x: 100, y: 300 };
    const to = { x: 100, y: 40 };

    test('the crest travels from Wuyang toward the far back row', () => {
        const start = tideSample(0, from, to);
        const mid = tideSample(TIDE.ms / 2, from, to);
        const end = tideSample(TIDE.ms, from, to);
        expect(start.y).toBeCloseTo(from.y);
        expect(mid.y).toBeLessThan(start.y);
        expect(end.y).toBeCloseTo(to.y);
        expect(end.gone).toBe(true);
    });

    // The first pass drew one thin quad sliding along, which read as a smear
    // rather than water. The crest carries the wave's shape.
    describe('the crest', () => {
        const forward = { x: 0, y: -1 };
        const crest = tideCrest({ x: 100, y: 200 }, forward, 400);

        test('spans the width it is given', () => {
            expect(crest).toHaveLength(TIDE.crestPoints);
            const xs = crest.map((p) => p.x);
            expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(400, 5);
        });

        test('bows forward at its middle and flattens at the ends', () => {
            const middle = crest[Math.floor(crest.length / 2)];
            expect(middle.y).toBeLessThan(crest[0].y);
            expect(crest[0].y).toBeCloseTo(crest[crest.length - 1].y, 5);
        });

        test('lies across the direction of travel, not along it', () => {
            const sideways = tideCrest({ x: 100, y: 200 }, { x: 1, y: 0 }, 400);
            const ys = sideways.map((p) => p.y);
            expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(400, 5);
        });
    });

    describe('the foam it carries', () => {
        test('caps ride along the crest and spray is thrown ahead', () => {
            const { caps, spray } = tideFoam(0);
            expect(caps).toHaveLength(TIDE.caps);
            expect(spray).toHaveLength(TIDE.spray);
            for (const drop of spray) expect(drop.ahead).toBeGreaterThan(0);
        });

        test('caps sit at distinct points rather than bunching up', () => {
            const positions = tideFoam(0).caps.map((c) => c.f);
            expect(new Set(positions).size).toBe(TIDE.caps);
        });

        test('caps bob as the wave moves', () => {
            expect(tideFoam(0).caps[0].lift).not.toBeCloseTo(tideFoam(400).caps[0].lift, 3);
        });

        test('spray keeps its shape between frames', () => {
            expect(tideFoam(0).spray).toEqual(tideFoam(900).spray);
        });
    });
});
