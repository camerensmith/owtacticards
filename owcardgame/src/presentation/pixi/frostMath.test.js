import {
    FREEZE,
    FROST,
    freezeSample,
    freezeShards,
    frostShimmer,
    frostSpikes,
    spiralPoints,
} from './fxMath';

const row = { left: 100, top: 200, width: 400, height: 80 };

describe('row rime', () => {
    test('shimmer breathes between its bounds', () => {
        for (let ms = 0; ms < 8000; ms += 37) {
            const a = frostShimmer(ms);
            expect(a).toBeGreaterThanOrEqual(FROST.minAlpha - 1e-9);
            expect(a).toBeLessThanOrEqual(FROST.maxAlpha + 1e-9);
        }
    });

    // Quarter and three-quarter period are the peak and trough; half a period
    // returns to the same value, so comparing those two proves nothing.
    test('shimmer actually moves', () => {
        const peak = frostShimmer(FROST.shimmerMs / 4);
        const trough = frostShimmer((FROST.shimmerMs * 3) / 4);
        expect(peak).toBeCloseTo(FROST.maxAlpha);
        expect(trough).toBeCloseTo(FROST.minAlpha);
    });

    test('spikes tile the full width of the row', () => {
        const spikes = frostSpikes(row, 1);
        expect(spikes).toHaveLength(FROST.spikeCount);
        expect(spikes[0].baseLeft.x).toBeCloseTo(row.left);
        expect(spikes[spikes.length - 1].baseRight.x).toBeCloseTo(row.left + row.width);
    });

    test('spikes grow inward from the edge they are on', () => {
        const fromTop = frostSpikes(row, 1);
        expect(fromTop[0].baseLeft.y).toBeCloseTo(row.top);
        expect(fromTop[0].tip.y).toBeGreaterThan(row.top);

        const fromBottom = frostSpikes(row, -1);
        expect(fromBottom[0].baseLeft.y).toBeCloseTo(row.top + row.height);
        expect(fromBottom[0].tip.y).toBeLessThan(row.top + row.height);
    });

    // Ice that re-randomised every frame would crawl; depths must be stable.
    test('spike depths are stable between calls', () => {
        const a = frostSpikes(row, 1);
        const b = frostSpikes(row, 1);
        expect(a.map((s) => s.tip.y)).toEqual(b.map((s) => s.tip.y));
    });

    test('spikes vary in depth rather than forming a flat band', () => {
        const depths = frostSpikes(row, 1).map((s) => s.tip.y - row.top);
        expect(new Set(depths.map((d) => Math.round(d))).size).toBeGreaterThan(3);
    });

    test('never reaches more than halfway across the row', () => {
        for (const spike of frostSpikes(row, 1)) {
            expect(spike.tip.y - row.top).toBeLessThanOrEqual(row.height / 2 + 1e-6);
        }
    });
});

describe('freeze spiral', () => {
    test('draws itself outward then completes', () => {
        expect(freezeSample(0).progress).toBeCloseTo(0);
        expect(freezeSample(FREEZE.durationMs * FREEZE.drawUntil).progress).toBeCloseTo(1);
        expect(freezeSample(FREEZE.durationMs).progress).toBe(1);
    });

    test('spins throughout', () => {
        expect(freezeSample(0).spin).toBeCloseTo(0);
        expect(freezeSample(400).spin).toBeGreaterThan(0);
    });

    // Shards should form around a finished spiral, not race it.
    test('shards only appear once the spiral is drawn', () => {
        expect(freezeSample(FREEZE.durationMs * FREEZE.drawUntil * 0.5).shardAlpha).toBe(0);
        expect(freezeSample(FREEZE.durationMs * FREEZE.holdUntil).shardAlpha).toBeCloseTo(1);
    });

    test('holds before fading, and ends invisible', () => {
        expect(freezeSample(FREEZE.durationMs * FREEZE.holdUntil).alpha).toBe(1);
        expect(freezeSample(FREEZE.durationMs).alpha).toBe(0);
        expect(freezeSample(FREEZE.durationMs).done).toBe(true);
    });

    test('spiral starts at the centre and reaches the given radius', () => {
        const points = spiralPoints(100, 1, 0);
        expect(Math.hypot(points[0].x, points[0].y)).toBeCloseTo(0);
        const last = points[points.length - 1];
        expect(Math.hypot(last.x, last.y)).toBeCloseTo(100, 0);
    });

    test('partial progress draws only part of the curve', () => {
        expect(spiralPoints(100, 0.5, 0).length).toBeLessThan(spiralPoints(100, 1, 0).length);
    });

    test('spin rotates the whole curve', () => {
        const a = spiralPoints(100, 1, 0);
        const b = spiralPoints(100, 1, Math.PI / 2);
        const ai = a[a.length - 1];
        const bi = b[b.length - 1];
        expect(Math.hypot(ai.x, ai.y)).toBeCloseTo(Math.hypot(bi.x, bi.y));
        expect(ai.x).not.toBeCloseTo(bi.x);
    });

    test('shards ring the target pointing outward', () => {
        const shards = freezeShards(100, 8, 0);
        expect(shards).toHaveLength(8);
        for (const shard of shards) {
            expect(Math.hypot(shard.tip.x, shard.tip.y))
                .toBeGreaterThan(Math.hypot(shard.base.x, shard.base.y));
        }
    });

    test('zero shards is safe', () => {
        expect(freezeShards(100, 0, 0)).toEqual([]);
    });
});
