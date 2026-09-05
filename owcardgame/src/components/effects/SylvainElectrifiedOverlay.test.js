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
    expect(screen.getByTitle('Electrified').textContent).toBe('E');
});

test('hides when the card is not electrified', () => {
    render(<SylvainElectrifiedOverlay cardId="2ana" effects={[{ id: 'jq-wound' }]} />);
    expect(screen.queryByTitle('Electrified')).toBeNull();
});
