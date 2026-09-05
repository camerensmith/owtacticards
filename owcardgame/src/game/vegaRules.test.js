import {
    chronoshiftEligibleAllies,
    orderUpcomingForAi,
    pickBestChronoshiftAlly,
} from './vegaRules';

test('chronoshiftEligibleAllies skips self, dead, structures, and heroes without enter', () => {
    const rows = {
        '1f': { cardIds: ['1vega', '1ana', '1stoneguard'] },
        '1m': { cardIds: ['1reaper'] },
        '1b': { cardIds: ['1bob'] },
    };
    const cards = {
        '1vega': { health: 3 },
        '1ana': { health: 2 },
        '1stoneguard': { health: 3, structure: true, special: true },
        '1reaper': { health: 0 },
        '1bob': { health: 3, special: true },
    };
    const hasOnEnter = (id) => id === 'ana';
    expect(chronoshiftEligibleAllies({
        vegaCardId: '1vega',
        getRow: (id) => rows[id],
        getCard: (id) => cards[id],
        hasOnEnter,
    })).toEqual([{ cardId: '1ana', rowId: '1f', heroId: 'ana' }]);
});

test('orderUpcomingForAi puts higher enter priority first', () => {
    const priorityOf = (id) => ({ reaper: 9, ana: 5, mei: 3 }[id] || 0);
    expect(orderUpcomingForAi(['mei', 'reaper', 'ana'], priorityOf)).toEqual([
        'reaper', 'ana', 'mei',
    ]);
});

test('pickBestChronoshiftAlly prefers the highest enter priority', () => {
    const eligible = [
        { cardId: '2mei', rowId: '2f', heroId: 'mei' },
        { cardId: '2ana', rowId: '2m', heroId: 'ana' },
    ];
    const priorityOf = (id) => ({ ana: 8, mei: 4 }[id] || 0);
    expect(pickBestChronoshiftAlly(eligible, priorityOf)).toEqual(eligible[1]);
});
