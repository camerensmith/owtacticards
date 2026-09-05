import {
    ADAPTIVE,
    MINE_BLAST,
    MINEFIELD,
    adaptiveSample,
    mineBlastSample,
    minefieldBlink,
    minefieldPositions,
} from './fxMath';

const row = { left: 100, top: 200, width: 150, height: 600 };

describe('Minefield scatter', () => {
    test('draws one mine per remaining charge', () => {
        expect(minefieldPositions(row, 0)).toHaveLength(0);
        expect(minefieldPositions(row, 4)).toHaveLength(4);
    });

    test('mines stay inside the row', () => {
        for (const mine of minefieldPositions(row, 6)) {
            expect(mine.x).toBeGreaterThan(row.left);
            expect(mine.x).toBeLessThan(row.left + row.width);
            expect(mine.y).toBeGreaterThan(row.top);
            expect(mine.y).toBeLessThan(row.top + row.height);
        }
    });

    test('mines are scattered, not stacked', () => {
        const mines = minefieldPositions(row, 5);
        const spots = new Set(mines.map((m) => `${m.x},${m.y}`));
        expect(spots.size).toBe(5);
    });

    // Spending a charge should take one mine off the board, not reshuffle the
    // whole field into new spots.
    test('spending a charge only removes the last mine', () => {
        const before = minefieldPositions(row, 5);
        const after = minefieldPositions(row, 4);
        expect(after).toEqual(before.slice(0, 4));
    });

    test('mines blink out of step with each other', () => {
        const a = minefieldBlink(300, 0).alpha;
        const b = minefieldBlink(300, 1).alpha;
        expect(a).not.toBeCloseTo(b, 3);
    });

    test('a blink never goes fully dark or oversized', () => {
        for (let ms = 0; ms < MINEFIELD.blinkMs; ms += 90) {
            const blink = minefieldBlink(ms, 2);
            expect(blink.alpha).toBeGreaterThan(0.5);
            expect(blink.alpha).toBeLessThanOrEqual(1);
            expect(blink.radius).toBeLessThanOrEqual(MINEFIELD.radius * 1.13);
        }
    });
});

describe('A mine going off', () => {
    test('expands and fades', () => {
        const early = mineBlastSample(MINE_BLAST.ms * 0.2);
        const late = mineBlastSample(MINE_BLAST.ms * 0.8);
        expect(late.radius).toBeGreaterThan(early.radius);
        expect(late.alpha).toBeLessThan(early.alpha);
        expect(mineBlastSample(MINE_BLAST.ms).done).toBe(true);
    });

    test('shards fly outward and never invert', () => {
        expect(mineBlastSample(MINE_BLAST.ms * 0.9).shardDistance)
            .toBeGreaterThan(mineBlastSample(0).shardDistance);
        expect(mineBlastSample(MINE_BLAST.ms).shardAlpha).toBeGreaterThanOrEqual(0);
        expect(mineBlastSample(MINE_BLAST.ms).coreRadius).toBeGreaterThanOrEqual(0);
    });
});

describe('Adaptive Shield', () => {
    test('breathes around a steady size', () => {
        const scales = [];
        for (let ms = 0; ms <= ADAPTIVE.breatheMs; ms += ADAPTIVE.breatheMs / 8) {
            scales.push(adaptiveSample(ms).scale);
        }
        expect(Math.max(...scales)).toBeCloseTo(1 + ADAPTIVE.swell, 4);
        expect(Math.min(...scales)).toBeCloseTo(1 - ADAPTIVE.swell, 4);
    });

    test('stays faint and never disappears', () => {
        for (let ms = 0; ms <= ADAPTIVE.breatheMs; ms += 100) {
            const s = adaptiveSample(ms);
            expect(s.alpha).toBeGreaterThan(0);
            expect(s.alpha).toBeLessThanOrEqual(ADAPTIVE.alpha);
        }
    });
});
