import { crushZoneMoves } from './abilityRules';

const hero = (cardId, rowId, health) => ({ cardId, rowId, card: { id: cardId.slice(1), health } });

/** Three heroes in each enemy row, all at full health unless named. */
function fullBoard(overrides = {}) {
    const cards = [];
    for (const pos of ['f', 'm', 'b']) {
        for (let i = 0; i < 3; i += 1) {
            const cardId = `2${pos}${i}`;
            cards.push(hero(cardId, `2${pos}`, overrides[cardId] ?? 3));
        }
    }
    return cards;
}

const byRow = (moves) => moves.reduce((acc, m) => {
    acc[m.toRowId] = (acc[m.toRowId] || 0) + 1;
    return acc;
}, {});

/*
 * Crush Zone drags the whole enemy side toward one row, not just the few that
 * fit in it. It used to stop as soon as the destination was full, so against a
 * packed board it moved one hero and left the other eight where they stood.
 */
describe('Crush Zone against a full enemy board', () => {
    test('fills the destination and closes the rest up behind it', () => {
        const moves = crushZoneMoves({ cards: fullBoard(), destRowId: '2f' });
        const counts = byRow(moves);

        // Front had 3 of 4, so exactly one is dragged into it.
        expect(counts['2f']).toBe(1);
        // Middle frees a slot by giving one up, on top of the one it had.
        expect(counts['2m']).toBe(2);
        expect(moves).toHaveLength(3);
    });

    test('never drags anyone further from the destination', () => {
        const moves = crushZoneMoves({ cards: fullBoard(), destRowId: '2f' });
        const distance = { '2f': 0, '2m': 1, '2b': 2 };

        for (const move of moves) {
            expect(distance[move.toRowId]).toBeLessThan(distance[move.fromRowId]);
        }
    });

    test('damages by the distance actually travelled', () => {
        const moves = crushZoneMoves({ cards: fullBoard(), destRowId: '2f' });

        for (const move of moves) {
            const expected = move.fromRowId === '2b' && move.toRowId === '2f' ? 2 : 1;
            expect(move.damage).toBe(expected);
        }
    });
});

/*
 * The destination is the most dangerous place to be — the pull damages by the
 * distance travelled — so the weakest are given the longest trip.
 */
describe('who gets pulled first', () => {
    test('the lowest health goes to the destination', () => {
        const moves = crushZoneMoves({
            cards: fullBoard({ '2b0': 1, '2b1': 5, '2m0': 4 }),
            destRowId: '2f',
        });

        expect(moves[0].cardId).toBe('2b0');
        expect(moves[0].toRowId).toBe('2f');
    });

    test('orders the whole pull by health, not board position', () => {
        const moves = crushZoneMoves({
            cards: [hero('2m0', '2m', 5), hero('2m1', '2m', 1), hero('2b0', '2b', 3)],
            destRowId: '2f',
        });

        expect(moves.map((m) => m.cardId)).toEqual(['2m1', '2b0', '2m0']);
    });
});

describe('what Crush Zone will not move', () => {
    test('leaves the destination row where it is', () => {
        const moves = crushZoneMoves({ cards: fullBoard(), destRowId: '2f' });

        expect(moves.some((m) => m.fromRowId === '2f')).toBe(false);
    });

    test('leaves structures and the dead standing', () => {
        const moves = crushZoneMoves({
            cards: [
                { cardId: '2turret', rowId: '2b', card: { id: 'turret', turret: true, health: 3 } },
                { cardId: '2dead', rowId: '2b', card: { id: 'ana', health: 0 } },
                hero('2reaper', '2b', 4),
            ],
            destRowId: '2f',
        });

        expect(moves.map((m) => m.cardId)).toEqual(['2reaper']);
    });

    // Dead bodies and structures still take up the space they are standing in.
    test('counts everything present when working out room', () => {
        const moves = crushZoneMoves({
            cards: [
                { cardId: '2t1', rowId: '2f', card: { id: 'turret', turret: true, health: 3 } },
                { cardId: '2t2', rowId: '2f', card: { id: 'turret', turret: true, health: 3 } },
                { cardId: '2t3', rowId: '2f', card: { id: 'turret', turret: true, health: 3 } },
                { cardId: '2t4', rowId: '2f', card: { id: 'turret', turret: true, health: 3 } },
                hero('2reaper', '2m', 4),
            ],
            destRowId: '2f',
        });

        expect(moves).toEqual([]);
    });

    test('does nothing without a destination', () => {
        expect(crushZoneMoves({ cards: fullBoard() })).toEqual([]);
        expect(crushZoneMoves()).toEqual([]);
    });
});
