import { reducer, ACTIONS } from '../App';

// App pulls in PixiBoard, and pixi.js ships untranspiled ESM that Jest cannot
// parse. The reducer never touches it, so a stub keeps this a pure state test.
jest.mock('pixi.js', () => ({
    Application: class {},
    Container: class {},
    Graphics: class {},
    Sprite: class {},
    Text: class {},
    Texture: { WHITE: {}, from: () => ({}) },
    Assets: { load: () => Promise.resolve({}) },
}));

const SUITED_UP = { id: 'suited-up', hero: 'dvameka', type: 'status' };

/** Board and hands holding whatever the case under test needs. */
function baseState({ dvaEffects = [], hand = [], rows = {} } = {}) {
    return {
        rows: {
            '1f': { id: '1f', cardIds: [] },
            '1m': { id: '1m', cardIds: [] },
            '1b': { id: '1b', cardIds: [] },
            '2f': { id: '2f', cardIds: [] },
            '2m': { id: '2m', cardIds: [] },
            '2b': { id: '2b', cardIds: [] },
            player1hand: { id: 'player1hand', cardIds: hand },
            player2hand: { id: 'player2hand', cardIds: [] },
            ...rows,
        },
        playerCards: {
            player1cards: {
                id: 'player1cards',
                cards: {
                    '1dva': { id: 'dva', health: 2, effects: dvaEffects },
                    '1dvameka': { id: 'dvameka', health: 4, effects: [], special: true },
                    '1ana': { id: 'ana', health: 3, effects: [] },
                },
            },
            player2cards: { id: 'player2cards', cards: {} },
        },
    };
}

const standDown = (state, playerNum = 1) =>
    reducer(state, { type: ACTIONS.STAND_DOWN_DVA, payload: { playerNum } });

/*
 * Suited up, D.Va waits in hand undraggable, and the only things that clear it
 * are the MEKA dying or being swept out of hand. Neither happens when a round
 * ends with the MEKA still on the board, so she carried over in hand, suited to
 * a MEKA that no longer existed, unplayable for the rest of the match.
 */
describe('a round ending with D.Va piloting the MEKA', () => {
    test('takes her out of hand so the new deck can deal her again', () => {
        const state = baseState({ dvaEffects: [SUITED_UP], hand: ['1dva', '1ana'] });

        const next = standDown(state);

        expect(next.rows.player1hand.cardIds).toEqual(['1ana']);
        expect(next.playerCards.player1cards.cards['1dva']).toBeUndefined();
    });

    test('sets the MEKA aside from wherever it stood', () => {
        const state = baseState({
            dvaEffects: [SUITED_UP],
            hand: ['1dva'],
            rows: { '1f': { id: '1f', cardIds: ['1dvameka'] } },
        });

        const next = standDown(state);

        expect(next.rows['1f'].cardIds).toEqual([]);
        expect(next.playerCards.player1cards.cards['1dvameka']).toBeUndefined();
    });

    test('sets aside a MEKA that never left the hand', () => {
        const state = baseState({ dvaEffects: [SUITED_UP], hand: ['1dva', '1dvameka'] });

        const next = standDown(state);

        expect(next.rows.player1hand.cardIds).toEqual([]);
        expect(next.playerCards.player1cards.cards['1dvameka']).toBeUndefined();
    });

    test('leaves everyone else where they were', () => {
        const state = baseState({
            dvaEffects: [SUITED_UP],
            hand: ['1ana', '1dva'],
            rows: { '1m': { id: '1m', cardIds: ['1ana'] } },
        });

        const next = standDown(state);

        expect(next.playerCards.player1cards.cards['1ana']).toBeDefined();
        expect(next.rows['1m'].cardIds).toEqual(['1ana']);
    });
});

describe('a round ending with D.Va out of the MEKA', () => {
    test('leaves an ordinary D.Va in hand like any other card', () => {
        const state = baseState({ dvaEffects: [], hand: ['1dva', '1ana'] });

        const next = standDown(state);

        expect(next.rows.player1hand.cardIds).toEqual(['1dva', '1ana']);
        expect(next.playerCards.player1cards.cards['1dva']).toBeDefined();
    });

    test('leaves a D.Va standing on the board alone', () => {
        const state = baseState({
            dvaEffects: [],
            rows: { '1f': { id: '1f', cardIds: ['1dva'] } },
        });

        const next = standDown(state);

        expect(next.rows['1f'].cardIds).toEqual(['1dva']);
    });

    test('does nothing for a side with no D.Va at all', () => {
        const state = baseState({ dvaEffects: [SUITED_UP], hand: ['1dva'] });

        expect(standDown(state, 2)).toBe(state);
    });
});
