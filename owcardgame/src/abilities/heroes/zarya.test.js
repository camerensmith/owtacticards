import { onEnter } from './zarya';
import { selectCardTarget } from '../engine/targeting';

jest.mock('../../assets/imageImports', () => ({
    playAudioByKey: jest.fn(),
}));

jest.mock('../engine/targeting', () => ({
    selectCardTarget: jest.fn(),
}));

jest.mock('../engine/targetingBus', () => ({
    showMessage: jest.fn(),
    clearMessage: jest.fn(),
}));

jest.mock('../engine/damageBus', () => ({
    dealDamage: jest.fn(),
}));

function setupBoard() {
    const cards = {
        '2zarya': { id: 'zarya', health: 3, effects: [] },
        '2ana': { id: 'ana', health: 1, effects: [] },
        '1reaper': { id: 'reaper', health: 3, effects: [] },
    };
    window.__ow_getCard = (id) => cards[id];
    window.__ow_getRow = (id) => {
        if (id === '2m') return { cardIds: ['2zarya'] };
        if (id === '2f') return { cardIds: ['2ana'] };
        if (id === '1f') return { cardIds: ['1reaper'] };
        return { cardIds: [] };
    };
    window.__ow_appendCardEffect = jest.fn();
    window.__ow_isAITurn = false;
    window.__ow_aiTriggering = false;
    window.__ow_practiceMode = false;
}

test('AI Zarya places tokens without asking the human', async () => {
    setupBoard();
    selectCardTarget.mockImplementation(() => new Promise(() => {}));

    await onEnter({ playerHeroId: '2zarya', rowId: '2m' });

    expect(selectCardTarget).not.toHaveBeenCalled();
    expect(window.__ow_appendCardEffect).toHaveBeenCalledWith(
        '2ana',
        expect.objectContaining({ hero: 'zarya', type: 'zarya-shield', amount: 3 }),
    );
});
