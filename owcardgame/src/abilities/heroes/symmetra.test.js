import { onEnter } from './symmetra';
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

function setupBoard() {
    const cards = {
        '1symmetra': { id: 'symmetra', health: 3, effects: [] },
        '1ana': { id: 'ana', health: 2, effects: [] },
        '2reaper': { id: 'reaper', health: 3, effects: [] },
        '2symmetra': { id: 'symmetra', health: 3, effects: [] },
        '2ana': { id: 'ana', health: 1, effects: [] },
    };
    window.__ow_getCard = (id) => cards[id];
    window.__ow_getRow = (id) => {
        if (id === '1f') return { cardIds: ['1ana'] };
        if (id === '1m') return { cardIds: ['1symmetra'] };
        if (id === '2f') return { cardIds: ['2reaper'] };
        if (id === '2m') return { cardIds: ['2symmetra'] };
        if (id === '2b') return { cardIds: ['2ana'] };
        if (id === 'player1hand') return { cardIds: [] };
        if (id === 'player2hand') return { cardIds: [] };
        return { cardIds: [] };
    };
    window.__ow_dispatchAction = jest.fn();
    window.__ow_removeCardEffect = jest.fn();
    window.__ow_removeRowEffect = jest.fn();
    window.__ow_dispatchShieldUpdate = jest.fn();
    window.__ow_getMaxHealth = () => 3;
    window.__ow_isAITurn = false;
    window.__ow_aiTriggering = false;
}

test('Teleporter does not return an enemy to hand', async () => {
    setupBoard();
    selectCardTarget.mockResolvedValue({ cardId: '2reaper', rowId: '2f' });

    await onEnter({ playerHeroId: '1symmetra', rowId: '1m' });

    expect(window.__ow_dispatchAction).not.toHaveBeenCalled();
});

test('Teleporter returns an ally to hand', async () => {
    setupBoard();
    selectCardTarget.mockResolvedValue({ cardId: '1ana', rowId: '1f' });

    await onEnter({ playerHeroId: '1symmetra', rowId: '1m' });

    expect(selectCardTarget).toHaveBeenCalledWith(expect.objectContaining({ isHeal: true }));
    expect(window.__ow_dispatchAction).toHaveBeenCalledWith({
        type: 'return-hero-to-hand',
        payload: { cardId: '1ana', rowId: '1f', suppressEnterOnRedeploy: true },
    });
});

test('AI Teleporter does not bounce an enemy when no ally is worth saving', async () => {
    setupBoard();
    window.__ow_isAITurn = true;
    window.__ow_aiTriggering = true;
    window.__ow_getRow = (id) => {
        if (id === '2m') return { cardIds: ['2symmetra'] };
        if (id === '1f') return { cardIds: ['1ana'] };
        if (id === 'player2hand') return { cardIds: [] };
        return { cardIds: [] };
    };

    await onEnter({ playerHeroId: '2symmetra', rowId: '2m' });

    expect(window.__ow_dispatchAction).not.toHaveBeenCalled();
});
