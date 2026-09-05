import {
    BARRIER,
    CRYSTAL,
    CRYSTAL_TOTAL_MS,
    RIPTIRE,
    RIPTIRE_TOTAL_MS,
    arcPoints,
    crystalSample,
    heroShieldArc,
    riptireSample,
    rowBarrierArc,
    shardSeed,
} from './fxMath';

const area = { left: 0, top: 100, width: 600, height: 300 };

describe('crystal rain', () => {
    // Staggered release is what makes it read as weather instead of one burst.
    test('shards are released on a stagger', () => {
        expect(crystalSample(0, 0, area).visible).toBe(true);
        expect(crystalSample(0, 5, area).visible).toBe(false);
        expect(crystalSample(5 * CRYSTAL.staggerMs + 1, 5, area).visible).toBe(true);
    });

    test('each shard keeps its lane for the whole fall', () => {
        const early = crystalSample(CRYSTAL.staggerMs * 3 + 50, 3, area);
        const late = crystalSample(CRYSTAL.staggerMs * 3 + 400, 3, area);
        expect(early.x).toBeCloseTo(late.x);
    });

    test('lanes are spread across the side, not stacked', () => {
        const xs = Array.from({ length: CRYSTAL.count }, (_, i) => crystalSample(
            i * CRYSTAL.staggerMs + 10, i, area
        ).x);
        expect(new Set(xs).size).toBeGreaterThan(CRYSTAL.count / 2);
        for (const x of xs) {
            expect(x).toBeGreaterThanOrEqual(area.left);
            expect(x).toBeLessThanOrEqual(area.left + area.width);
        }
    });

    test('falls downward and accelerates', () => {
        const a = crystalSample(100, 0, area);
        const b = crystalSample(200, 0, area);
        const c = crystalSample(300, 0, area);
        expect(b.y).toBeGreaterThan(a.y);
        expect(c.y - b.y).toBeGreaterThan(b.y - a.y);
    });

    test('starts above the side so shards enter from off-board', () => {
        expect(crystalSample(0, 0, area).y).toBeLessThan(area.top);
    });

    test('everything is finished by the total duration', () => {
        for (let i = 0; i < CRYSTAL.count; i += 1) {
            expect(crystalSample(CRYSTAL_TOTAL_MS, i, area).visible).toBe(false);
        }
    });

    test('shards tumble as they fall', () => {
        const early = crystalSample(80, 0, area);
        const late = crystalSample(500, 0, area);
        expect(typeof early.rot).toBe('number');
        expect(late.rot).not.toBeCloseTo(early.rot);
    });

    test('seeds are stable and in range', () => {
        expect(shardSeed(3)).toBeCloseTo(shardSeed(3));
        for (let i = 0; i < 40; i += 1) {
            expect(shardSeed(i)).toBeGreaterThanOrEqual(0);
            expect(shardSeed(i)).toBeLessThan(1);
        }
    });
});

describe('rip-tire', () => {
    const from = { x: 50, y: 400 };
    const to = { x: 500, y: 150 };

    test('rolls for 2.25 seconds before arriving', () => {
        expect(riptireSample(0, from, to).travelling).toBe(true);
        expect(riptireSample(0, from, to).alpha).toBe(1);
        expect(riptireSample(2249, from, to).travelling).toBe(true);
        const arrival = riptireSample(2250, from, to);
        expect(arrival.travelling).toBe(false);
        expect(arrival.x).toBeCloseTo(to.x);
        expect(arrival.y).toBeCloseTo(to.y);
    });

    test('wanders off the straight line, then lands on the target', () => {
        const t0 = RIPTIRE.windupMs || 0;
        const mid = riptireSample(t0 + RIPTIRE.travelMs / 2, from, to);
        const straightX = from.x + (to.x - from.x) * 0.5;
        const straightY = from.y + (to.y - from.y) * 0.5;
        const dist = Math.hypot(mid.x - straightX, mid.y - straightY);
        expect(dist).toBeGreaterThan(40);
        const end = riptireSample(t0 + RIPTIRE.travelMs, from, to);
        expect(end.x).toBeCloseTo(to.x);
        expect(end.y).toBeCloseTo(to.y);
    });

    test('rolls from Junkrat to the target row', () => {
        const t0 = RIPTIRE.windupMs;
        expect(riptireSample(t0, from, to).x).toBeCloseTo(from.x);
        const arrival = riptireSample(t0 + RIPTIRE.travelMs, from, to);
        expect(arrival.x).toBeCloseTo(to.x);
        expect(arrival.y).toBeCloseTo(to.y);
    });

    test('spins the whole way', () => {
        const t0 = RIPTIRE.windupMs;
        expect(riptireSample(t0, from, to).rotation).toBeCloseTo(0);
        expect(riptireSample(t0 + 500, from, to).rotation).toBeGreaterThan(0);
    });

    // Hops must flatten out or the tyre lands hovering above the row.
    test('hops in transit but arrives on the ground', () => {
        const t0 = RIPTIRE.windupMs;
        const mid = riptireSample(t0 + RIPTIRE.travelMs / 2, from, to);
        const straightY = from.y + (to.y - from.y) * 0.5;
        expect(mid.y).toBeLessThanOrEqual(straightY);
        expect(riptireSample(t0 + RIPTIRE.travelMs, from, to).y).toBeCloseTo(to.y);
    });

    test('explodes only after arriving', () => {
        const t0 = RIPTIRE.windupMs;
        expect(riptireSample(t0 + RIPTIRE.travelMs / 2, from, to).explodeT).toBe(0);
        expect(riptireSample(t0 + RIPTIRE.travelMs / 2, from, to).travelling).toBe(true);
        const boom = riptireSample(t0 + RIPTIRE.travelMs + RIPTIRE.explodeMs / 2, from, to);
        expect(boom.travelling).toBe(false);
        expect(boom.explodeT).toBeGreaterThan(0);
    });

    test('reports done once the blast finishes', () => {
        expect(riptireSample(RIPTIRE_TOTAL_MS - 1, from, to).done).toBe(false);
        expect(riptireSample(RIPTIRE_TOTAL_MS, from, to).done).toBe(true);
    });
});

describe('curved barriers', () => {
    test('arc is flat at the ends and deepest in the middle', () => {
        const points = arcPoints(0, 0, 100, 40, -1, 10);
        expect(points[0].y).toBeCloseTo(0);
        expect(points[points.length - 1].y).toBeCloseTo(0);
        expect(points[5].y).toBeCloseTo(-40);
    });

    test('facing flips which way it bows', () => {
        expect(arcPoints(0, 0, 100, 40, -1, 10)[5].y).toBeLessThan(0);
        expect(arcPoints(0, 0, 100, 40, 1, 10)[5].y).toBeGreaterThan(0);
    });

    test('spans symmetrically about the centre', () => {
        const points = arcPoints(50, 0, 100, 40, -1, 10);
        expect(points[0].x).toBeCloseTo(-50);
        expect(points[points.length - 1].x).toBeCloseTo(150);
    });

    // "Bleeds off it": the arc must be wider than the row it covers.
    test('row barrier overhangs the row', () => {
        const rect = { x: 300, y: 200, width: 400, height: 60 };
        const points = rowBarrierArc(rect, -1);
        const span = points[points.length - 1].x - points[0].x;
        expect(span).toBeGreaterThan(rect.width);
        expect(BARRIER.rowOverhang).toBeGreaterThan(0);
    });

    test('row barrier sits on the enemy-facing edge', () => {
        const rect = { x: 300, y: 200, width: 400, height: 60 };
        expect(rowBarrierArc(rect, -1)[0].y).toBeCloseTo(rect.y - rect.height / 2);
        expect(rowBarrierArc(rect, 1)[0].y).toBeCloseTo(rect.y + rect.height / 2);
    });

    test('hero shield is wider than the card and stands in front of it', () => {
        const card = { x: 100, y: 300, width: 64, height: 90 };
        const points = heroShieldArc(card, -1);
        const span = points[points.length - 1].x - points[0].x;
        expect(span).toBeCloseTo(card.width * BARRIER.shieldSpan);

        // Deepest point must be ahead of the card, not on top of it.
        const mid = points[Math.floor(points.length / 2)];
        expect(mid.y).toBeLessThan(card.y - card.height / 2);
    });

    test('hero shield flips with facing', () => {
        const card = { x: 100, y: 300, width: 64, height: 90 };
        const up = heroShieldArc(card, -1);
        const down = heroShieldArc(card, 1);
        expect(up[Math.floor(up.length / 2)].y).toBeLessThan(card.y);
        expect(down[Math.floor(down.length / 2)].y).toBeGreaterThan(card.y);
    });

    test('degenerate input does not produce NaN', () => {
        for (const point of rowBarrierArc()) {
            expect(Number.isFinite(point.x)).toBe(true);
            expect(Number.isFinite(point.y)).toBe(true);
        }
    });
});
