import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import gameContext from 'context/gameContext';
import Graveyard from './Graveyard';
import { selectFromGraveyard, getRequest, cancelSelection } from '../../abilities/engine/graveyardBus';

function renderGraveyard({ playerNum = 1, graveyards } = {}) {
    const gameState = {
        graveyards: graveyards || {
            player1: [
                { heroId: 'reaper', playerHeroId: '1reaper' },
                { heroId: 'ana', playerHeroId: '1ana' },
            ],
            player2: [],
        },
    };
    return render(
        <gameContext.Provider value={{ gameState, dispatch: () => {} }}>
            <Graveyard playerNum={playerNum} />
        </gameContext.Provider>
    );
}

afterEach(() => {
    if (getRequest()) cancelSelection();
});

describe('the pile', () => {
    test('shows how many heroes have fallen', () => {
        renderGraveyard();
        expect(screen.getByText('2')).toBeTruthy();
    });

    test('an empty graveyard does not open', () => {
        renderGraveyard({ graveyards: { player1: [], player2: [] } });
        fireEvent.click(screen.getByText('Graveyard'));
        expect(screen.queryByText('Player 1 graveyard')).toBeNull();
    });

    test('clicking a filled pile opens the grid', () => {
        renderGraveyard();
        fireEvent.click(screen.getByText('Graveyard'));
        expect(screen.getByText('Reaper')).toBeTruthy();
        expect(screen.getByText('Ana')).toBeTruthy();
    });
});

describe('browse mode', () => {
    test('entries are not selectable when just browsing', () => {
        renderGraveyard();
        fireEvent.click(screen.getByText('Graveyard'));
        // jest-dom is not set up in this project, so assert the DOM property directly.
        expect(screen.getByRole('button', { name: /Reaper/ }).disabled).toBe(true);
    });
});

describe('select mode for Mercy', () => {
    test('a select request opens the graveyard without a click', async () => {
        renderGraveyard();
        await act(async () => {
            selectFromGraveyard(1);
        });
        expect(screen.getByText('Resurrect a hero')).toBeTruthy();
    });

    test('choosing a hero resolves the awaiting promise', async () => {
        renderGraveyard();
        let picked;
        await act(async () => {
            selectFromGraveyard(1).then((heroId) => { picked = heroId; });
        });

        fireEvent.click(screen.getByRole('button', { name: /Reaper/ }));

        await waitFor(() => expect(picked).toBe('reaper'));
    });

    test('cancelling resolves null rather than stranding the ability', async () => {
        renderGraveyard();
        let picked = 'unset';
        await act(async () => {
            selectFromGraveyard(1).then((heroId) => { picked = heroId; });
        });

        fireEvent.keyDown(window, { key: 'Escape' });

        await waitFor(() => expect(picked).toBeNull());
    });

    // Player 1's pile must not answer a request aimed at player 2.
    test('ignores a request for the other player', async () => {
        renderGraveyard({ playerNum: 1 });
        await act(async () => {
            selectFromGraveyard(2);
        });
        expect(screen.queryByText('Resurrect a hero')).toBeNull();
    });
});
