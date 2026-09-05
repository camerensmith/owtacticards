import {
    ANNIHILATE,
    BARRIER,
    FLUX,
    annihilateSample,
    fizzSample,
    fluxSample,
    fluxTotalMs,
    fluxSlamAtMs,
    fluxBeamAlpha,
    fluxGravityRipples,
    frontBarrierArc,
    frontEdge,
    synergySwirlSample,
} from './fxMath';

const rect = { x: 300, y: 200, width: 400, height: 90 };

describe('front edge', () => {
    // The board sets the halves side by side, so a y-only assumption points
    // barriers along the wrong axis entirely.
    test('picks the edge on whichever axis faces the enemy', () => {
        const right = frontEdge(rect, { x: 1, y: 0 });
        expect(right.a.x).toBeCloseTo(rect.x + rect.width / 2);
        expect(right.b.x).toBeCloseTo(rect.x + rect.width / 2);
        expect(right.normal).toEqual({ x: 1, y: 0 });

        const up = frontEdge(rect, { x: 0, y: -1 });
        expect(up.a.y).toBeCloseTo(rect.y - rect.height / 2);
        expect(up.normal).toEqual({ x: 0, y: -1 });
    });

    test('flips to the opposite edge for the opposite facing', () => {
        expect(frontEdge(rect, { x: -1, y: 0 }).a.x).toBeCloseTo(rect.x - rect.width / 2);
        expect(frontEdge(rect, { x: 0, y: 1 }).a.y).toBeCloseTo(rect.y + rect.height / 2);
    });

    test('the edge spans the full side it sits on', () => {
        expect(frontEdge(rect, { x: 1, y: 0 }).length).toBeCloseTo(rect.height);
        expect(frontEdge(rect, { x: 0, y: -1 }).length).toBeCloseTo(rect.width);
    });

    // A bulge measured against the long side made a tall row bow halfway across
    // the board; depth is the extent along the normal instead.
    test('depth is the extent along the normal, not the long side', () => {
        expect(frontEdge(rect, { x: 1, y: 0 }).depth).toBeCloseTo(rect.width);
        expect(frontEdge(rect, { x: 0, y: -1 }).depth).toBeCloseTo(rect.height);
    });

    test('a tall row bulges by far less than its height', () => {
        const tall = { x: 0, y: 0, width: 150, height: 600 };
        const edge = frontEdge(tall, { x: 1, y: 0 });
        expect(edge.depth * BARRIER.rowBulge).toBeLessThan(tall.width / 2);
    });
});

describe('front barrier', () => {
    const edge = frontEdge(rect, { x: 1, y: 0 });

    test('bows outward along the edge normal, not across the row', () => {
        const points = frontBarrierArc(edge, 30, 0, BARRIER.segments);
        const mid = points[Math.floor(points.length / 2)];
        expect(mid.x).toBeGreaterThan(edge.a.x);
    });

    // "Bleeds off it": the wall runs past both ends of the row it covers.
    test('overhang extends it past both ends', () => {
        const flush = frontBarrierArc(edge, 0, 0);
        const over = frontBarrierArc(edge, 0, 0.2);
        const flushSpan = Math.abs(flush[flush.length - 1].y - flush[0].y);
        const overSpan = Math.abs(over[over.length - 1].y - over[0].y);
        expect(overSpan).toBeGreaterThan(flushSpan);
    });

    test('degenerate input does not produce NaN', () => {
        for (const point of frontBarrierArc(frontEdge({}, { x: 1, y: 0 }), 10, 0.1)) {
            expect(Number.isFinite(point.x)).toBe(true);
            expect(Number.isFinite(point.y)).toBe(true);
        }
    });
});

describe('gravitic flux', () => {
    const h = 90;

    test('lifts, hangs, slams, then settles', () => {
        expect(fluxSample(0, h).phase).toBe('lift');
        expect(fluxSample(FLUX.liftMs, h).phase).toBe('hang');
        expect(fluxSample(FLUX.liftMs + FLUX.hangMs + 1, h).phase).toBe('slam');
        expect(fluxSample(FLUX.liftMs + FLUX.hangMs + FLUX.slamMs + 1, h).phase).toBe('settle');
        expect(fluxSample(fluxTotalMs(), h).done).toBe(true);
    });

    test('rises to full height and comes all the way back down', () => {
        expect(fluxSample(0, h).height).toBeCloseTo(0);
        expect(fluxSample(FLUX.liftMs, h).height).toBeCloseTo(h * FLUX.lift);
        expect(fluxSample(FLUX.liftMs + FLUX.hangMs + FLUX.slamMs, h).height).toBeCloseTo(0);
    });

    // The shadow is what sells the height; it must tighten as the card climbs.
    test('the shadow shrinks on the way up and returns on the way down', () => {
        expect(fluxSample(0, h).shadow).toBeCloseTo(1);
        expect(fluxSample(FLUX.liftMs, h).shadow).toBeCloseTo(FLUX.shadowMin);
        expect(fluxSample(fluxTotalMs(), h).shadow).toBeCloseTo(1);
    });

    test('the slam is quicker than the lift', () => {
        expect(FLUX.slamMs).toBeLessThan(FLUX.liftMs);
    });

    test('synergy spirals outward then expires', () => {
        const early = synergySwirlSample(0, 100, { x: 0, y: 0 });
        const late = synergySwirlSample(0, FLUX.swirlMs * 0.9, { x: 0, y: 0 });
        expect(Math.hypot(late.x, late.y)).toBeGreaterThan(Math.hypot(early.x, early.y));
        expect(late.alpha).toBeLessThan(early.alpha);
        expect(synergySwirlSample(0, FLUX.swirlMs, { x: 0, y: 0 }).visible).toBe(false);
    });

    test('motes are spread around the row rather than stacked', () => {
        const xs = Array.from({ length: FLUX.swirlCount }, (_, i) => (
            synergySwirlSample(i, 300, { x: 0, y: 0 }).x
        ));
        expect(new Set(xs.map((x) => Math.round(x))).size).toBeGreaterThan(3);
    });

    test('slam moment is lift + hang', () => {
        expect(fluxSlamAtMs()).toBe(FLUX.liftMs + FLUX.hangMs);
    });

    test('tether alpha holds through hang and dies at slam', () => {
        expect(fluxBeamAlpha(1)).toBeGreaterThan(0);
        expect(fluxBeamAlpha(FLUX.beamFadeInMs)).toBeCloseTo(1);
        expect(fluxBeamAlpha(FLUX.liftMs)).toBeCloseTo(1);
        expect(fluxBeamAlpha(FLUX.liftMs + FLUX.hangMs - 1)).toBeCloseTo(1);
        expect(fluxBeamAlpha(FLUX.liftMs + FLUX.hangMs)).toBe(0);
        expect(fluxBeamAlpha(fluxTotalMs())).toBe(0);
    });

    test('gravity ripples expand then vanish once slam starts', () => {
        const mid = fluxGravityRipples(FLUX.liftMs / 2);
        expect(mid.length).toBe(FLUX.rippleRings);
        expect(mid.some((r) => r.rx > 0 && r.alpha > 0)).toBe(true);
        expect(fluxGravityRipples(fluxSlamAtMs())).toEqual([]);
        const enemy = fluxGravityRipples(FLUX.liftMs / 2, { scale: 0.65 });
        expect(Math.max(...enemy.map((r) => r.rx))).toBeLessThan(Math.max(...mid.map((r) => r.rx)));
    });
});

describe('annihilation beam', () => {
    test('burns in fast, holds, then gutters out', () => {
        expect(annihilateSample(0).reach).toBeCloseTo(0);
        expect(annihilateSample(ANNIHILATE.durationMs * 0.2).reach).toBeCloseTo(1);
        expect(annihilateSample(ANNIHILATE.durationMs * 0.5).alpha).toBe(1);
        expect(annihilateSample(ANNIHILATE.durationMs * 0.9).alpha).toBeLessThan(1);
        expect(annihilateSample(ANNIHILATE.durationMs).done).toBe(true);
    });

    test('sparks sit along the beam and drift off it', () => {
        const a = { x: 0, y: 0 };
        const b = { x: 200, y: 0 };
        const young = fizzSample(4, 0, a, b);
        const old = fizzSample(4, ANNIHILATE.fizzLifeMs * 0.8, a, b);

        expect(young.y).toBeCloseTo(0);
        expect(Math.abs(old.y)).toBeGreaterThan(0);
        expect(old.alpha).toBeLessThan(young.alpha);
        expect(fizzSample(4, ANNIHILATE.fizzLifeMs, a, b).visible).toBe(false);
    });

    test('sparks land at different points along the beam', () => {
        const a = { x: 0, y: 0 };
        const b = { x: 200, y: 0 };
        const xs = Array.from({ length: 20 }, (_, i) => fizzSample(i, 10, a, b).x);
        expect(new Set(xs.map((x) => Math.round(x))).size).toBeGreaterThan(10);
    });
});
