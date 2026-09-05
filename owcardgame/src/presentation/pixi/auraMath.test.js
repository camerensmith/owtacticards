import {
    CREVICE,
    INFRA,
    SPRAY,
    SUPERCHARGE,
    bloodSprayDrops,
    bloodSpraySample,
    creviceSample,
    creviceTotalMs,
    creviceWedge,
    infraSheenSample,
    superchargeWave,
} from './fxMath';

const card = { x: 200, y: 300, width: 64, height: 90 };

describe('supercharger line', () => {
    test('spans the card and is pinned at both ends', () => {
        const points = superchargeWave(card, 0);
        expect(points[0].x).toBeCloseTo(card.x - card.width / 2);
        expect(points[points.length - 1].x).toBeCloseTo(card.x + card.width / 2);
        // Attached to the hero, not floating over: no wobble at the edges.
        expect(points[0].y).toBeCloseTo(card.y);
        expect(points[points.length - 1].y).toBeCloseTo(card.y);
    });

    test('wobbles in the middle, within its amplitude', () => {
        const points = superchargeWave(card, 400);
        const limit = card.height * SUPERCHARGE.amplitude;
        const deviations = points.map((p) => Math.abs(p.y - card.y));
        expect(Math.max(...deviations)).toBeGreaterThan(0);
        for (const d of deviations) expect(d).toBeLessThanOrEqual(limit + 1e-6);
    });

    test('the wave travels over time', () => {
        const a = superchargeWave(card, 0);
        const b = superchargeWave(card, 600);
        expect(a[5].y).not.toBeCloseTo(b[5].y);
    });
});

describe('infra-sight sheen', () => {
    // Periodic, not constant: it should be idle most of the time.
    test('rests between sweeps', () => {
        expect(infraSheenSample(0).active).toBe(true);
        const resting = INFRA.periodMs * (INFRA.sweepFraction + 0.2);
        expect(infraSheenSample(resting).active).toBe(false);
        expect(infraSheenSample(resting).alpha).toBe(0);
    });

    test('crosses the row once per period', () => {
        expect(infraSheenSample(0).u).toBeCloseTo(0);
        const end = INFRA.periodMs * INFRA.sweepFraction * 0.99;
        expect(infraSheenSample(end).u).toBeGreaterThan(0.95);
        expect(infraSheenSample(INFRA.periodMs).u).toBeCloseTo(0);
    });

    test('stays subtle and fades in and out across the sweep', () => {
        const mid = infraSheenSample(INFRA.periodMs * INFRA.sweepFraction * 0.5);
        expect(mid.alpha).toBeCloseTo(INFRA.peakAlpha);
        expect(mid.alpha).toBeLessThanOrEqual(INFRA.peakAlpha + 1e-9);
        expect(infraSheenSample(1).alpha).toBeLessThan(mid.alpha);
    });
});

describe('earthshatter crevice', () => {
    const a = { x: 100, y: 100 };
    const b = { x: 100, y: 400 };

    test('tears open, holds, then grinds shut', () => {
        expect(creviceSample(0).open).toBeCloseTo(0);
        expect(creviceSample(CREVICE.openMs).open).toBeCloseTo(1);
        expect(creviceSample(CREVICE.openMs + CREVICE.holdMs / 2).open).toBe(1);
        expect(creviceSample(creviceTotalMs()).done).toBe(true);
    });

    // A slam, not a creeping fissure.
    test('opens faster than it closes', () => {
        expect(CREVICE.openMs).toBeLessThan(CREVICE.closeMs);
    });

    test('the wedge is a closed shape spanning both ends', () => {
        const wedge = creviceWedge(a, b, 1);
        expect(wedge.length).toBe((CREVICE.segments + 1) * 2);
        expect(wedge[0].y).toBeCloseTo(a.y);
        expect(wedge[wedge.length - 1].y).toBeCloseTo(a.y);
    });

    test('is widest in the middle and tapers to nothing at the ends', () => {
        const wedge = creviceWedge(a, b, 1);
        const half = CREVICE.segments + 1;
        const widthAt = (i) => Math.abs(wedge[i].x - wedge[wedge.length - 1 - i].x);
        expect(widthAt(0)).toBeCloseTo(0);
        expect(widthAt(Math.floor(half / 2))).toBeGreaterThan(0);
    });

    test('a closed crevice has no width', () => {
        for (const point of creviceWedge(a, b, 0)) {
            expect(point.x).toBeCloseTo(a.x);
        }
    });
});

describe('blood spray', () => {
    test('splashes out almost immediately then sits', () => {
        expect(bloodSpraySample(0).spread).toBeCloseTo(0);
        expect(bloodSpraySample(SPRAY.lifeMs * 0.1).spread).toBeCloseTo(1);
    });

    // "Fades away after a couple of seconds": it holds, then goes.
    test('holds before fading, and clears completely', () => {
        expect(bloodSpraySample(SPRAY.lifeMs * SPRAY.holdFraction).alpha).toBe(1);
        const fading = bloodSpraySample(SPRAY.lifeMs * 0.8).alpha;
        expect(fading).toBeGreaterThan(0);
        expect(fading).toBeLessThan(1);
        expect(bloodSpraySample(SPRAY.lifeMs).alpha).toBe(0);
        expect(bloodSpraySample(SPRAY.lifeMs).done).toBe(true);
        expect(SPRAY.lifeMs).toBeGreaterThanOrEqual(2000);
    });

    test('drops scatter around the hit but stay in range', () => {
        const drops = bloodSprayDrops(card);
        expect(drops).toHaveLength(SPRAY.drops);
        for (const drop of drops) {
            expect(Math.hypot(drop.dx, drop.dy)).toBeLessThanOrEqual(SPRAY.spread + 1e-6);
            expect(drop.radius).toBeLessThanOrEqual(SPRAY.maxRadius);
        }
    });

    // Splatter that re-scattered every frame would crawl across the board.
    test('the splatter pattern is stable', () => {
        expect(bloodSprayDrops(card)).toEqual(bloodSprayDrops(card));
    });
});
