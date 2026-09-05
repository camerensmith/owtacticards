import {
    SANDSTORM,
    sandstormGusts,
    sandstormHaze,
    sandstormMotes,
} from './fxMath';

const board = { left: 0, top: 0, width: 1200, height: 700 };

describe('Sandstorm haze', () => {
    // It hangs over the board for a whole turn, so it must never build to
    // something you would rather look past.
    test('stays faint at every point in its breath', () => {
        for (let ms = 0; ms <= SANDSTORM.hazeBreatheMs; ms += 100) {
            const { alpha } = sandstormHaze(ms);
            expect(alpha).toBeGreaterThan(0);
            expect(alpha).toBeLessThanOrEqual(SANDSTORM.hazeAlpha);
        }
    });

    test('breathes rather than sitting flat', () => {
        const samples = [0, 1, 2, 3].map((i) => sandstormHaze(SANDSTORM.hazeBreatheMs * i / 4).alpha);
        expect(Math.max(...samples)).toBeGreaterThan(Math.min(...samples));
    });

    test('the breath loops seamlessly', () => {
        expect(sandstormHaze(SANDSTORM.hazeBreatheMs).alpha).toBeCloseTo(sandstormHaze(0).alpha, 10);
    });
});

describe('Sandstorm grains', () => {
    test('fills the board without leaving it', () => {
        const motes = sandstormMotes(3000, board);
        expect(motes).toHaveLength(SANDSTORM.motes);
        for (const mote of motes) {
            expect(mote.x).toBeGreaterThanOrEqual(board.left);
            expect(mote.x).toBeLessThanOrEqual(board.left + board.width);
        }
    });

    test('grains drift instead of sitting still', () => {
        const before = sandstormMotes(0, board).map((m) => m.x);
        const after = sandstormMotes(1200, board).map((m) => m.x);
        expect(before).not.toEqual(after);
    });

    test('grains keep their own lanes and sizes frame to frame', () => {
        const a = sandstormMotes(1000, board);
        const b = sandstormMotes(1000, board);
        expect(a).toEqual(b);
        expect(a[3].radius).toBe(sandstormMotes(5000, board)[3].radius);
    });

    test('grains travel at their own speeds, not in lockstep', () => {
        const start = sandstormMotes(0, board);
        const later = sandstormMotes(900, board);
        const moved = start.map((m, i) => later[i].x - m.x);
        expect(new Set(moved.map((d) => d.toFixed(4))).size).toBeGreaterThan(1);
    });

    // Wrapping is what makes it continuous; a hard wrap would show as a flicker
    // along one edge.
    test('a grain fades in and out at the wrap rather than popping', () => {
        const motes = sandstormMotes(2500, board);
        for (const mote of motes) expect(mote.alpha).toBeGreaterThanOrEqual(0);

        // Follow one grain right through its wrap: it must be faint at both ends.
        const alphaAt = (ms) => sandstormMotes(ms, board)[0].alpha;
        const crossing = [];
        for (let ms = 0; ms < SANDSTORM.driftMs * 2; ms += 60) crossing.push(alphaAt(ms));
        expect(Math.min(...crossing)).toBeLessThan(0.02);
    });

    test('stays subtle at its brightest', () => {
        const motes = sandstormMotes(4000, board);
        expect(Math.max(...motes.map((m) => m.alpha))).toBeLessThanOrEqual(SANDSTORM.moteAlpha);
    });
});

describe('Sandstorm gusts', () => {
    test('trail back the way they came', () => {
        for (const gust of sandstormGusts(2000, board)) {
            expect(gust.tailX).toBeLessThan(gust.x);
        }
    });

    test('are fainter than the grains they ride over', () => {
        const gusts = sandstormGusts(2600, board);
        expect(gusts).toHaveLength(SANDSTORM.gusts);
        expect(Math.max(...gusts.map((g) => g.alpha))).toBeLessThanOrEqual(SANDSTORM.gustAlpha);
    });

    test('drift on their own clock, slower than the grains', () => {
        expect(SANDSTORM.gustMs).toBeLessThan(SANDSTORM.driftMs);
        expect(sandstormGusts(0, board)[0].x).not.toBeCloseTo(sandstormGusts(1500, board)[0].x, 3);
    });
});
