import {
    BLOSSOM_COLUMNS,
    BLOSSOM_DAMAGE_PER_TARGET,
    buildBlossomTicks,
    deathBlossomTargets,
} from './reaperRules';

const rows = {
    '2f': { cardIds: ['2a', '2b', '2c', '2d'] },
    '2m': { cardIds: ['2e', '2f2', '2g', '2h'] },
    '2b': { cardIds: ['2i', '2j', '2k', '2l'] },
};
const getRow = (id) => rows[id];
const alive = () => ({ health: 3 });

describe('death blossom targeting', () => {
    // Cross: the two centre columns across all three enemy rows.
    test('catches the centre columns of every row', () => {
        const ids = deathBlossomTargets(2, getRow, alive).map((t) => t.cardId);
        expect(ids).toEqual(['2b', '2c', '2f2', '2g', '2j', '2k']);
    });

    test('spares the outer columns', () => {
        const ids = deathBlossomTargets(2, getRow, alive).map((t) => t.cardId);
        for (const outer of ['2a', '2d', '2e', '2h', '2i', '2l']) {
            expect(ids).not.toContain(outer);
        }
    });

    test('only the two centre columns are in the blast', () => {
        expect(BLOSSOM_COLUMNS).toEqual([1, 2]);
        for (const target of deathBlossomTargets(2, getRow, alive)) {
            expect(BLOSSOM_COLUMNS).toContain(target.column);
        }
    });

    test('skips the dead and empty slots', () => {
        const sparse = {
            '2f': { cardIds: ['2a', '2b'] },
            '2m': { cardIds: [] },
            '2b': { cardIds: ['2i', '2j', '2k'] },
        };
        const health = (id) => (id === '2j' ? { health: 0 } : { health: 2 });
        const ids = deathBlossomTargets(2, (r) => sparse[r], health).map((t) => t.cardId);
        expect(ids).toEqual(['2b', '2k']);
    });

    test('an empty board yields no targets', () => {
        expect(deathBlossomTargets(2, () => undefined, alive)).toEqual([]);
    });
});

describe('tick distribution', () => {
    const targets = [
        { cardId: '2b', rowId: '2f' },
        { cardId: '2g', rowId: '2m' },
    ];

    // The randomness is pacing only: totals must not drift.
    test('every target takes exactly the full amount', () => {
        const ticks = buildBlossomTicks(targets, BLOSSOM_DAMAGE_PER_TARGET);
        expect(ticks).toHaveLength(targets.length * BLOSSOM_DAMAGE_PER_TARGET);

        const counts = ticks.reduce((acc, t) => {
            acc[t.cardId] = (acc[t.cardId] || 0) + 1;
            return acc;
        }, {});
        expect(counts).toEqual({ '2b': 3, '2g': 3 });
    });

    test('totals hold whatever the shuffle does', () => {
        for (const rand of [() => 0, () => 0.999, Math.random]) {
            const counts = buildBlossomTicks(targets, 3, rand).reduce((acc, t) => {
                acc[t.cardId] = (acc[t.cardId] || 0) + 1;
                return acc;
            }, {});
            expect(counts).toEqual({ '2b': 3, '2g': 3 });
        }
    });

    test('the order actually varies', () => {
        const ordered = buildBlossomTicks(targets, 3, () => 0).map((t) => t.cardId);
        const grouped = ['2b', '2b', '2b', '2g', '2g', '2g'];
        // A no-op shuffle would leave the ticks grouped by target.
        expect(ordered).not.toEqual(grouped);
    });

    test('no targets means no ticks', () => {
        expect(buildBlossomTicks([], 3)).toEqual([]);
        expect(buildBlossomTicks(targets, 0)).toEqual([]);
    });
});
