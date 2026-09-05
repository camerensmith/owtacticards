import React from 'react';
import { render, screen } from '@testing-library/react';
import BobSmashCounterOverlay from './BobSmashCounterOverlay';
import { turnsCounterEffect } from '../../game/bobRules';

test('shows Smash turn counter near the ability', () => {
    render(
        <BobSmashCounterOverlay
            cardId="1bob"
            effects={[turnsCounterEffect(3)]}
        />
    );
    const badge = screen.getByTitle('Smash: 3 damage (turns on field)');
    expect(badge.textContent).toBe('3');
    expect(badge.style.bottom).toBeTruthy();
});

test('hides when BOB has no turns counter', () => {
    render(<BobSmashCounterOverlay cardId="1bob" effects={[]} />);
    expect(screen.queryByTitle(/Smash:/)).toBeNull();
});
