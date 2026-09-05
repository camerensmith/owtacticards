import React from 'react';
import { render, screen } from '@testing-library/react';
import SylvainElectrifiedOverlay from './SylvainElectrifiedOverlay';

test('shows a stylized E on electrified cards', () => {
    render(
        <SylvainElectrifiedOverlay
            cardId="2ana"
            effects={[{ id: 'electrified', tooltip: 'Electrified' }]}
        />
    );
    const badge = screen.getByTitle('Electrified');
    expect(badge.textContent).toBe('E');
    expect(badge.style.left).toBe('6px');
    expect(badge.style.right).toBe('');
});

test('hides when the card is not electrified', () => {
    render(<SylvainElectrifiedOverlay cardId="2ana" effects={[{ id: 'jq-wound' }]} />);
    expect(screen.queryByTitle('Electrified')).toBeNull();
});
