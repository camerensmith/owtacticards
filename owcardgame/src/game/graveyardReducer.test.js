import { reducer, ACTIONS } from '../App';
import data from '../data';

// App pulls in PixiBoard, and pixi.js ships untranspiled ESM that Jest cannot
// parse. The reducer never touches it, so a stub keeps this a pure state test.
// Babel hoists this above the imports above.
jest.mock('pixi.js', () => ({
    Application: class {},
    Container: class {},
    Graphics: class {},
    Sprite: class {},
    Text: class {},
    Texture: { WHITE: {}, from: () => ({}) },
    Assets: { load: () => Promise.resolve({}) },
}));

/** Minimal slice of game state: just what the graveyard actions touch. */
function baseState(overrides = {}) {
    return {
        rows: {
            '1f': { id: '1f', cardIds: [] },
            '1m': { id: '1m', cardIds: [] },
            '1b': { id: '1b', cardIds: [] },
            '2f': { id: '2f', cardIds: [] },
            '2m': { id: '2m', cardIds: [] },
            '2b': { id: '2b', cardIds: [] },
        },
        playerCards: {
            player1cards: { id: 'player1cards', cards: {} },
            player2cards: { id: 'player2cards', cards: {} },
        },
        ultimateUsage: { player1: [], player2: [] },
        graveyards: { player1: [], player2: [] },
        ...overrides,
    };
}

function withCardOnBoard(cardId, rowId) {
    const state = baseState();
    const playerNum = parseInt(cardId[0]);
    state.rows[rowId].cardIds.push(cardId);
    state.playerCards[`player${playerNum}cards`].cards[cardId] = { id: cardId.slice(1), health: 0 };
    return state;
}

describe('MOVE_CARD_TO_GRAVEYARD', () => {
    test('takes the card off the board and buries it', () => {
        const state = withCardOnBoard('1reaper', '1f');
        const next = reducer(state, {
            type: ACTIONS.MOVE_CARD_TO_GRAVEYARD,
            payload: { cardId: '1reaper' },
        });

        expect(next.rows['1f'].cardIds).toEqual([]);
        expect(next.playerCards.player1cards.cards['1reaper']).toBeUndefined();
        expect(next.graveyards.player1).toEqual([{ heroId: 'reaper', playerHeroId: '1reaper' }]);
        expect(next.graveyards.player2).toEqual([]);
    });

    test('buries into the owning player\'s graveyard', () => {
        const state = withCardOnBoard('2reaper', '2m');
        const next = reducer(state, {
            type: ACTIONS.MOVE_CARD_TO_GRAVEYARD,
            payload: { cardId: '2reaper' },
        });

        expect(next.graveyards.player2).toHaveLength(1);
        expect(next.graveyards.player1).toEqual([]);
    });

    // Summoned cards must never reach the graveyard, or a reshuffle would deal them.
    test('special cards are removed but not buried', () => {
        expect(data.heroes.bob.special).toBe(true);
        const state = withCardOnBoard('1bob', '1f');
        const next = reducer(state, {
            type: ACTIONS.MOVE_CARD_TO_GRAVEYARD,
            payload: { cardId: '1bob' },
        });

        expect(next.rows['1f'].cardIds).toEqual([]);
        expect(next.graveyards.player1).toEqual([]);
    });

    // The damage bus, the board sweep and AI cleanup can all report one death.
    // Without an idempotency guard the hero is buried twice and duplicated in the deck.
    test('burying the same card twice adds only one entry', () => {
        const state = withCardOnBoard('1reaper', '1f');
        const bury = (s) =>
            reducer(s, { type: ACTIONS.MOVE_CARD_TO_GRAVEYARD, payload: { cardId: '1reaper' } });

        const next = bury(bury(state));

        expect(next.graveyards.player1).toHaveLength(1);
        expect(next.rows['1f'].cardIds).toEqual([]);
    });

    // Abilities that zero health via EDIT_CARD never reach the damage bus, so the
    // sweep buries them; the action must not care how the hero died.
    test('buries a hero killed outside the damage bus', () => {
        const state = withCardOnBoard('2ana', '2b');
        state.playerCards.player2cards.cards['2ana'].health = 0;

        const next = reducer(state, {
            type: ACTIONS.MOVE_CARD_TO_GRAVEYARD,
            payload: { cardId: '2ana' },
        });

        expect(next.graveyards.player2).toEqual([{ heroId: 'ana', playerHeroId: '2ana' }]);
        expect(next.rows['2b'].cardIds).toEqual([]);
    });

    test('does not disturb other cards in the row', () => {
        const state = withCardOnBoard('1reaper', '1f');
        state.rows['1f'].cardIds.unshift('1ana');
        const next = reducer(state, {
            type: ACTIONS.MOVE_CARD_TO_GRAVEYARD,
            payload: { cardId: '1reaper' },
        });

        expect(next.rows['1f'].cardIds).toEqual(['1ana']);
    });
});

describe('resurrection actions', () => {
    test('REMOVE_FROM_GRAVEYARD takes exactly one copy', () => {
        const state = baseState({
            graveyards: {
                player1: [
                    { heroId: 'reaper', playerHeroId: '1reaper' },
                    { heroId: 'ana', playerHeroId: '1ana' },
                ],
                player2: [],
            },
        });
        const next = reducer(state, {
            type: ACTIONS.REMOVE_FROM_GRAVEYARD,
            payload: { playerNum: 1, heroId: 'reaper' },
        });

        expect(next.graveyards.player1).toEqual([{ heroId: 'ana', playerHeroId: '1ana' }]);
    });

    test('ADD_CARD_TO_ROW places the hero without duplicating', () => {
        const state = baseState();
        let next = reducer(state, {
            type: ACTIONS.ADD_CARD_TO_ROW,
            payload: { rowId: '1m', playerHeroId: '1reaper' },
        });
        next = reducer(next, {
            type: ACTIONS.ADD_CARD_TO_ROW,
            payload: { rowId: '1m', playerHeroId: '1reaper' },
        });

        expect(next.rows['1m'].cardIds).toEqual(['1reaper']);
    });

    test('Cage Fight blocks hero rez into a locked row but allows a turret drop', () => {
        const state = baseState();
        state.rows['1m'].locked = true;
        state.rows['1m'].lockedBy = '2mauga';
        state.playerCards.player1cards.cards['1reaper'] = { id: 'reaper', health: 3 };
        state.playerCards.player1cards.cards['1turret'] = { id: 'turret', turret: true, health: 3 };

        const hero = reducer(state, {
            type: ACTIONS.ADD_CARD_TO_ROW,
            payload: { rowId: '1m', playerHeroId: '1reaper', playerNum: 1 },
        });
        expect(hero.rows['1m'].cardIds).toEqual([]);

        const turret = reducer(state, {
            type: ACTIONS.ADD_CARD_TO_ROW,
            payload: { rowId: '1m', playerHeroId: '1turret', playerNum: 1 },
        });
        expect(turret.rows['1m'].cardIds).toEqual(['1turret']);
    });

    test('Cage Fight lock survives round start and clears only when that Mauga dies', () => {
        let state = reducer(baseState(), {
            type: ACTIONS.APPLY_ROW_LOCK,
            payload: { rowId: '2f', sourceCardId: '1mauga' },
        });
        expect(state.rows['2f'].locked).toBe(true);
        expect(state.rows['2f'].lockedBy).toBe('1mauga');

        state = reducer(state, { type: ACTIONS.RESET_ULTIMATE_USAGE });
        expect(state.rows['2f'].locked).toBe(true);
        expect(state.rows['2f'].lockedBy).toBe('1mauga');

        state = reducer(state, {
            type: ACTIONS.CLEAR_ROW_LOCKS,
            payload: { sourceCardId: '1mauga' },
        });
        expect(state.rows['2f'].locked).toBe(false);
        expect(state.rows['2f'].lockedBy).toBeNull();
    });

    // "Their ultimates can still be played" — a hero that ulted before dying is unlocked on return.
    test('CLEAR_ULTIMATE_USAGE frees that hero to ult again', () => {
        const state = baseState({
            ultimateUsage: { player1: ['reaper', 'ana'], player2: ['reaper'] },
        });
        const next = reducer(state, {
            type: ACTIONS.CLEAR_ULTIMATE_USAGE,
            payload: { playerNum: 1, heroId: 'reaper' },
        });

        expect(next.ultimateUsage.player1).toEqual(['ana']);
        expect(next.ultimateUsage.player2).toEqual(['reaper']);
    });
});

describe('CLEAR_GRAVEYARD', () => {
    test('empties only that player on reshuffle', () => {
        const state = baseState({
            graveyards: {
                player1: [{ heroId: 'reaper', playerHeroId: '1reaper' }],
                player2: [{ heroId: 'ana', playerHeroId: '2ana' }],
            },
        });
        const next = reducer(state, {
            type: ACTIONS.CLEAR_GRAVEYARD,
            payload: { playerNum: 1 },
        });

        expect(next.graveyards.player1).toEqual([]);
        expect(next.graveyards.player2).toHaveLength(1);
    });
});
