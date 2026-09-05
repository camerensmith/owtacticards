import { onEnter } from './bravox2';
import { playAudioByKey } from '../../assets/imageImports';
import { selectCardTarget } from '../engine/targeting';
import { dealDamage } from '../engine/damageBus';

jest.mock('../../assets/imageImports', () => ({
    playAudioByKey: jest.fn(),
}));

jest.mock('../engine/targeting', () => ({
    selectCardTarget: jest.fn(),
}));

jest.mock('../engine/damageBus', () => ({
    dealDamage: jest.fn(),
}));

jest.mock('../engine/targetingBus', () => ({
    showMessage: jest.fn(),
    clearMessage: jest.fn(),
}));

function setupBoard() {
    window.__ow_getRow = (id) => ({
        cardIds: id === '2f' ? ['2reaper'] : [],
        synergy: 0,
    });
    window.__ow_getCard = (id) => (
        id === '2reaper' ? { id: 'reaper', health: 3, power: { f: 2, m: 1, b: 1 } } : { id: 'bravox2', health: 3 }
    );
    window.__ow_aiTriggering = false;
    window.__ow_isAITurn = false;
}

test('Lock On does not play ability1-resolve until it actually fires', async () => {
    setupBoard();
    playAudioByKey.mockClear();
    let resolveTarget;
    selectCardTarget.mockImplementation(() => new Promise((resolve) => {
        resolveTarget = resolve;
    }));

    const pending = onEnter({ playerHeroId: '1bravox2', rowId: '1m' });
    await Promise.resolve();
    expect(playAudioByKey).not.toHaveBeenCalledWith('bravox2-ability1-resolve');

    resolveTarget({ cardId: '2reaper', rowId: '2f' });
    await pending;
    expect(playAudioByKey).toHaveBeenCalledWith('bravox2-ability1-resolve');
    expect(dealDamage).toHaveBeenCalled();
});

test('Lock On cancel does not play ability1-resolve', async () => {
    setupBoard();
    playAudioByKey.mockClear();
    selectCardTarget.mockResolvedValue(null);

    await onEnter({ playerHeroId: '1bravox2', rowId: '1m' });
    expect(playAudioByKey).not.toHaveBeenCalledWith('bravox2-ability1-resolve');
});
