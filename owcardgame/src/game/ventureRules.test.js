import {
    bestColumn,
    collectShufflable,
    columnTargets,
    enemyColumnCount,
    enemyRowIdsFor,
    isShufflableHero,
    shuffledRowStates,
} from './ventureRules';

const rows = {
    '2f': { cardIds: ['2a', '2b', '2c'] },
    '2m': { cardIds: ['2d', '2e'] },
    '2b': { cardIds: ['2f2'] },
};
const getRow = (id) => rows[id];
const alive = (id) => (id === '2e' ? { id: 'turret', health: 3 } : { id: id.slice(1), health: 3 });

describe('who the quake picks up', () => {
    test('structures are shaken but not shuffled or struck', () => {
        expect(isShufflableHero({ id: 'reaper', health: 2 })).toBe(true);
        expect(isShufflableHero({ id: 'turret', health: 2 })).toBe(false);
        expect(isShufflableHero({ id: 'bob', health: 2 })).toBe(false);
        expect(isShufflableHero({ id: 'reaper', health: 0 })).toBe(false);
    });

    test('collects living heroes across all three enemy rows', () => {
        const ids = collectShufflable(2, getRow, alive).map((h) => h.cardId);
        expect(ids).toEqual(['2a', '2b', '2c', '2d', '2f2']);
        expect(ids).not.toContain('2e');
    });
});

describe('the shuffle', () => {
    const heroes = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((cardId) => ({ cardId }));

    test('keeps every hero, losing and duplicating none', () => {
        const states = shuffledRowStates(2, heroes);
        const all = enemyRowIdsFor(2).flatMap((r) => states[r]);
        expect(all.sort()).toEqual(heroes.map((h) => h.cardId).sort());
    });

    // Round-robin: piling everyone into one row would not be a shuffle.
    test('spreads heroes evenly across the rows', () => {
        const states = shuffledRowStates(2, heroes);
        for (const rowId of enemyRowIdsFor(2)) {
            expect(states[rowId]).toHaveLength(2);
        }
    });

    test('an uneven count still distributes as evenly as it can', () => {
        const states = shuffledRowStates(2, heroes.slice(0, 4));
        const sizes = enemyRowIdsFor(2).map((r) => states[r].length).sort();
        expect(sizes).toEqual([1, 1, 2]);
    });

    test('the order actually changes', () => {
        const grouped = shuffledRowStates(2, heroes, () => 0);
        expect(enemyRowIdsFor(2).flatMap((r) => grouped[r]))
            .not.toEqual(heroes.map((h) => h.cardId));
    });

    test('an empty board yields empty rows', () => {
        const states = shuffledRowStates(2, []);
        for (const rowId of enemyRowIdsFor(2)) expect(states[rowId]).toEqual([]);
    });
});

describe('the struck column', () => {
    // The whole point of the rework: the column is chosen, not derived from
    // whichever row Venture happens to be standing in.
    test('hits everyone standing in the chosen column', () => {
        expect(columnTargets(2, 0, getRow, alive).map((t) => t.cardId))
            .toEqual(['2a', '2d', '2f2']);
        expect(columnTargets(2, 2, getRow, alive).map((t) => t.cardId)).toEqual(['2c']);
    });

    test('skips structures standing in the column', () => {
        // '2e' is a turret in column 1 and must be spared.
        expect(columnTargets(2, 1, getRow, alive).map((t) => t.cardId)).toEqual(['2b']);
    });

    test('an empty column is safe to strike', () => {
        expect(columnTargets(2, 9, getRow, alive)).toEqual([]);
        expect(columnTargets(2, -1, getRow, alive)).toEqual([]);
        expect(columnTargets(2, null, getRow, alive)).toEqual([]);
    });

    test('column count is the widest row', () => {
        expect(enemyColumnCount(2, getRow)).toBe(3);
        expect(enemyColumnCount(2, () => undefined)).toBe(0);
    });
});

describe('AI column choice', () => {
    test('picks the most crowded column', () => {
        expect(bestColumn(2, getRow, alive)).toBe(0);
    });

    test('returns nothing when the enemy side is empty', () => {
        expect(bestColumn(2, () => ({ cardIds: [] }), alive)).toBeNull();
    });
});
