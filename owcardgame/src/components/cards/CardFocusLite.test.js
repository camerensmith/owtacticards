import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CardFocusLite from './CardFocusLite';

const focusFor = (extra) => ({ playerHeroId: '1ana', rowId: '1f', ...extra });

test('renders nothing without a focus', () => {
    render(<CardFocusLite focus={null} onClose={() => {}} />);
    expect(screen.queryByAltText('Card Focus')).toBeNull();
});

test('pinned preview captures clicks and closes', () => {
    let closed = 0;
    render(<CardFocusLite focus={focusFor()} onClose={() => { closed += 1; }} />);

    const backdrop = screen.getByTestId('card-focus-backdrop');
    expect(backdrop.style.pointerEvents).toBe('auto');

    fireEvent.click(backdrop);
    expect(closed).toBe(1);
});

// An Alt+hover preview sits under the cursor. If its backdrop captured the
// pointer it would fire mouseleave on the card and flicker open/closed forever.
test('hover preview is pointer-transparent and has no close handler', () => {
    let closed = 0;
    render(<CardFocusLite focus={focusFor({ hover: true })} onClose={() => { closed += 1; }} />);

    const backdrop = screen.getByTestId('card-focus-backdrop');
    expect(backdrop.style.pointerEvents).toBe('none');

    fireEvent.click(backdrop);
    expect(closed).toBe(0);
});
