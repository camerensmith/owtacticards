import { dealDamage, subscribe } from '../engine/damageBus';
import effectsBus from '../engine/effectsBus';

jest.mock('../../assets/imageImports', () => ({ playAudioByKey: jest.fn() }));
jest.mock('../engine/targeting', () => ({ selectRowTarget: jest.fn() }));
jest.mock('../engine/targetingBus', () => ({
    showMessage: jest.fn(),
    clearMessage: jest.fn(),
}));

// The module subscribes at import time to learn who killed Junkrat, so the
// handler has to be captured rather than stubbed away.
let trackDamage;
jest.mock('../engine/damageBus', () => ({
    dealDamage: jest.fn(),
    subscribe: jest.fn(),
}));

const { onDeath } = require('./junkrat');

beforeAll(() => {
    [trackDamage] = subscribe.mock.calls[0];
});

const ROWS = {
    '1f': ['1junkrat'],
    '2f': ['2ana', '2reaper', '2mercy'],
};

function setupBoard() {
    window.__ow_getRow = (id) => ({ cardIds: ROWS[id] || [] });
    window.__ow_getCard = (id) => ({ id: id.slice(1), health: 3 });
    dealDamage.mockClear();
    jest.spyOn(effectsBus, 'publish').mockImplementation(() => {});
    // Reaper, in the middle of the enemy front row, lands the killing blow.
    trackDamage({ type: 'damage', targetCardId: '1junkrat', sourceCardId: '2reaper' });
}

afterEach(() => {
    effectsBus.publish.mockRestore?.();
});

describe('Total Mayhem', () => {
    test('hits the killer for 2 and their neighbours for 1', () => {
        setupBoard();

        onDeath({ playerHeroId: '1junkrat', rowId: '1f' });

        const hits = dealDamage.mock.calls.map(([cardId, , amount]) => [cardId, amount]);
        expect(hits).toEqual([['2reaper', 2], ['2ana', 1], ['2mercy', 1]]);
    });

    // Junkrat is already off the board when this goes off, so a beam drawn from
    // his card has nowhere to start.
    test('draws no beam from the card that just died', () => {
        setupBoard();

        onDeath({ playerHeroId: '1junkrat', rowId: '1f' });

        for (const call of dealDamage.mock.calls) {
            expect(call[6]).toEqual({ skipProjectileFx: true });
        }
    });

    test('shows a number on every victim', () => {
        setupBoard();

        onDeath({ playerHeroId: '1junkrat', rowId: '1f' });

        const shown = effectsBus.publish.mock.calls
            .map(([event]) => event)
            .filter((event) => event?.type === 'overlay:damage')
            .map((event) => [event.payload.cardId, event.payload.amount]);
        expect(shown).toEqual([['2reaper', 2], ['2ana', 1], ['2mercy', 1]]);
    });

    test('marks each hit where it lands', () => {
        setupBoard();

        onDeath({ playerHeroId: '1junkrat', rowId: '1f' });

        const impacts = effectsBus.publish.mock.calls
            .map(([event]) => event)
            .filter((event) => event?.type === 'fx:impact')
            .map((event) => event.payload.cardId);
        expect(impacts).toEqual(['2reaper', '2ana', '2mercy']);
    });

    test('always plays a death shockwave on Junkrat first', () => {
        setupBoard();

        onDeath({ playerHeroId: '1junkrat', rowId: '1f' });

        const first = effectsBus.publish.mock.calls[0][0];
        expect(first).toEqual({ type: 'fx:shockwave', payload: { cardId: '1junkrat' } });
    });

    // Only blows aimed at Junkrat count, or damage he deals on his way out
    // would rewrite who gets blamed for killing him.
    test('damage Junkrat deals to others does not become the killer', () => {
        setupBoard();
        trackDamage({ type: 'damage', targetCardId: '2ana', sourceCardId: '1junkrat' });
        dealDamage.mockClear();

        onDeath({ playerHeroId: '1junkrat', rowId: '1f' });

        expect(dealDamage.mock.calls[0][0]).toBe('2reaper');
    });
});
