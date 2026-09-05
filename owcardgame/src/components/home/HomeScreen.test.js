import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import HomeScreen from './HomeScreen';
import { MATCH_MODE } from '../../game/screens';

const noop = () => {};

function renderHome(overrides = {}) {
    const props = {
        onStartMatch: noop,
        matchModes: MATCH_MODE,
        aiDifficulty: 'medium',
        aiPersonality: 'balanced',
        onDifficultyChange: noop,
        onPersonalityChange: noop,
        playAudio: false,
        setPlayAudio: noop,
        ...overrides,
    };
    return render(<HomeScreen {...props} />);
}

test('renders the menu with a start button', () => {
    renderHome();
    expect(screen.getByText('Start Match')).toBeTruthy();
    expect(screen.getByText('Overwatch Tacticards')).toBeTruthy();
});

test('start match fires the callback', () => {
    let started = 0;
    renderHome({ onStartMatch: () => { started += 1; } });
    fireEvent.click(screen.getByText('Start Match'));
    expect(started).toBe(1);
});

/** Reads the "N of M heroes shown" line the Collection panel renders. */
function shownCount() {
    const summary = screen.getByText(/heroes shown/i).textContent;
    const [, shown, total] = summary.match(/(\d+) of (\d+)/);
    return { shown: Number(shown), total: Number(total) };
}

test('collection panel lists heroes and filters by role', () => {
    renderHome();
    fireEvent.click(screen.getByText('Collection'));

    const all = shownCount();
    expect(all.shown).toBe(all.total);
    expect(all.total).toBeGreaterThan(10);

    fireEvent.click(screen.getByText('Tank'));
    const tanks = shownCount();
    expect(tanks.shown).toBeGreaterThan(0);
    expect(tanks.shown).toBeLessThan(all.shown);
});

test('collection includes the new roster heroes and not summoned tokens', () => {
    renderHome();
    fireEvent.click(screen.getByText('Collection'));
    expect(screen.getByText('Bravo-X2')).toBeTruthy();
    expect(screen.getByText('Cyclo')).toBeTruthy();
    expect(screen.getByText('Emre')).toBeTruthy();
    expect(screen.getByText('Fika')).toBeTruthy();
    expect(screen.getByText('Rajah')).toBeTruthy();
    expect(screen.getByText('Warden')).toBeTruthy();
    expect(screen.getByText('Wuyang')).toBeTruthy();
    expect(screen.getByText('Sylvain')).toBeTruthy();
    expect(screen.getByText('Axiom')).toBeTruthy();
    expect(screen.getByText('Lockjaw')).toBeTruthy();
    expect(screen.queryByText('Mirage')).toBeNull();
    expect(screen.queryByText('Stoneguard')).toBeNull();
});

test('intel and settings panels render', () => {
    renderHome();
    fireEvent.click(screen.getByText('Intel'));
    expect(screen.getByText('Winning')).toBeTruthy();
    expect(screen.getByText(/Armor is its own pool/i)).toBeTruthy();

    fireEvent.click(screen.getByText('Settings'));
    expect(screen.getByText('Theme music')).toBeTruthy();
});

describe('practice mode entry', () => {
    test('Play offers Practice alongside Start Match', () => {
        renderHome();
        expect(screen.getByText('Practice')).toBeTruthy();
        expect(screen.getByText('Start Match')).toBeTruthy();
    });

    test('Start Match asks for a versus-AI match', () => {
        const modes = [];
        renderHome({ onStartMatch: (mode) => modes.push(mode) });
        fireEvent.click(screen.getByText('Start Match'));
        expect(modes).toEqual([MATCH_MODE.VERSUS_AI]);
    });

    test('Practice asks for a practice match', () => {
        const modes = [];
        renderHome({ onStartMatch: (mode) => modes.push(mode) });
        fireEvent.click(screen.getByText('Practice'));
        expect(modes).toEqual([MATCH_MODE.PRACTICE]);
    });
});
