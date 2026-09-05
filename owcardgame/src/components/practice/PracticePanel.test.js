import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import gameContext from 'context/gameContext';
import turnContext from 'context/turnContext';
import PracticePanel from './PracticePanel';

jest.mock('pixi.js', () => ({
    Application: class {},
    Container: class {},
    Graphics: class {},
    Sprite: class {},
    Text: class {},
    Texture: { WHITE: {}, from: () => ({}) },
    Assets: { load: () => Promise.resolve({}) },
}));

function renderPanel({ cards = {}, playerTurn = 1 } = {}) {
    const dispatched = [];
    const turnState = { turnCount: 1, playerTurn, player1Passed: false, player2Passed: false };
    const setTurnState = jest.fn();
    const gameState = {
        playerCards: {
            player1cards: { id: 'player1cards', cards: cards.player1 || {} },
            player2cards: { id: 'player2cards', cards: cards.player2 || {} },
        },
    };

    render(
        <gameContext.Provider value={{ gameState, dispatch: (a) => dispatched.push(a) }}>
            <turnContext.Provider value={{ turnState, setTurnState }}>
                <PracticePanel />
            </turnContext.Provider>
        </gameContext.Provider>
    );
    return { dispatched, setTurnState };
}

describe('card injection', () => {
    test('adding a hero creates it and puts it in hand', () => {
        const { dispatched } = renderPanel();
        fireEvent.click(screen.getByTitle(/Add Reaper to Player 1/));

        expect(dispatched).toHaveLength(2);
        expect(dispatched[0].payload).toMatchObject({ playerNum: 1, heroId: 'reaper' });
        expect(dispatched[1].payload).toMatchObject({ playerNum: 1, playerHeroId: '1reaper' });
    });

    test('switching sides targets the other player', () => {
        const { dispatched } = renderPanel();
        fireEvent.click(screen.getByRole('button', { name: 'Player 2' }));
        fireEvent.click(screen.getByTitle(/Add Reaper to Player 2/));

        expect(dispatched[0].payload).toMatchObject({ playerNum: 2 });
        expect(dispatched[1].payload).toMatchObject({ playerHeroId: '2reaper' });
    });

    // Card ids encode the owner, so a side cannot hold two of the same hero.
    test('a hero already on that side is disabled', () => {
        renderPanel({ cards: { player1: { '1reaper': { id: 'reaper' } } } });
        expect(screen.getByTitle(/already has Reaper/).disabled).toBe(true);
    });

    test('the same hero is still addable on the opposite side', () => {
        renderPanel({ cards: { player1: { '1reaper': { id: 'reaper' } } } });
        fireEvent.click(screen.getByRole('button', { name: 'Player 2' }));
        expect(screen.getByTitle(/Add Reaper to Player 2/).disabled).toBe(false);
    });
});

describe('roster', () => {
    // Testing summon-only cards is a main reason the sandbox exists.
    test('summon-only specials are offered', () => {
        renderPanel();
        expect(screen.getByTitle(/Add Bob to Player 1/)).toBeTruthy();
    });

    test('search narrows the list', () => {
        renderPanel();
        fireEvent.change(screen.getByPlaceholderText('Search heroes…'), {
            target: { value: 'reap' },
        });
        expect(screen.getByTitle(/Add Reaper/)).toBeTruthy();
        expect(screen.queryByTitle(/Add Ana/)).toBeNull();
    });

    test('a search matching nothing says so', () => {
        renderPanel();
        fireEvent.change(screen.getByPlaceholderText('Search heroes…'), {
            target: { value: 'zzzznope' },
        });
        expect(screen.getByText(/No hero matches/)).toBeTruthy();
    });
});

describe('turn control', () => {
    test('shows whose turn it is and can hand over', () => {
        const { setTurnState } = renderPanel({ playerTurn: 2 });
        expect(screen.getByText(/Turn: Player 2/)).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Switch' }));
        expect(setTurnState).toHaveBeenCalled();

        const updater = setTurnState.mock.calls[0][0];
        expect(updater({ playerTurn: 2 })).toMatchObject({ playerTurn: 1 });
        expect(updater({ playerTurn: 1 })).toMatchObject({ playerTurn: 2 });
    });
});
