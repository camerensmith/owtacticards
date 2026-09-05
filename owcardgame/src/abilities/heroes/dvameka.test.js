import { onUltimate } from './dvameka';
import { dealDamage } from '../engine/damageBus';

jest.mock('../../assets/imageImports', () => ({
    playAudioByKey: jest.fn(),
}));

jest.mock('../engine/damageBus', () => ({
    dealDamage: jest.fn(),
}));

jest.mock('../engine/targetingBus', () => ({
    showMessage: jest.fn(),
    clearMessage: jest.fn(),
}));

jest.mock('../engine/effectsBus', () => ({
    __esModule: true,
    default: { publish: jest.fn(), subscribe: jest.fn(() => () => {}) },
    Effects: { showDamage: (cardId, amount) => ({ type: 'overlay:damage', payload: { cardId, amount } }) },
}));

function setupBoard() {
    window.__ow_getRow = (id) => {
        if (id === '1f') return { cardIds: ['1ana'] };
        if (id === '1m') return { cardIds: ['1dvameka'] };
        if (id === '2b') return { cardIds: ['2reaper'] };
        return { cardIds: [] };
    };
    window.__ow_getCard = (id) => ({
        id: id.slice(1),
        health: id === '1dvameka' ? 4 : 3,
    });
    window.__ow_replaceWithDva = jest.fn();
}

test('Self Destruct deals 4 to every living hero, then D.Va ejects into the same row', async () => {
    setupBoard();
    dealDamage.mockClear();

    await onUltimate({ playerHeroId: '1dvameka', rowId: '1m' });

    const hit = dealDamage.mock.calls.map((call) => call[0]).sort();
    expect(hit).toEqual(['1ana', '1dvameka', '2reaper']);
    for (const call of dealDamage.mock.calls) {
        expect(call[2]).toBe(4);
        expect(call[6]).toEqual({ skipProjectileFx: true });
    }
    expect(window.__ow_replaceWithDva).toHaveBeenCalledWith('1dvameka', '1m', 1);
});
