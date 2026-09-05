import { onUltimate, offerChainsword } from './cyclo';
import { playAudioByKey } from '../../assets/imageImports';
import { selectCardTarget } from '../engine/targeting';
import { dealDamage } from '../engine/damageBus';
import { showOnEnterChoice } from '../engine/modalController';

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

jest.mock('../engine/modalController', () => ({
    showOnEnterChoice: jest.fn(),
}));

function setupBoard() {
    window.__ow_getRow = (id) => ({
        cardIds: id === '1m' ? ['1cyclo'] : id === '2f' ? ['2reaper'] : [],
    });
    window.__ow_getCard = (id) => (
        id === '1cyclo' ? { id: 'cyclo', health: 4 } : { id: 'reaper', health: 4 }
    );
    window.__ow_isRowFull = () => false;
    window.__ow_reshuffleToDeck = jest.fn();
    window.__ow_moveCardToRow = jest.fn();
    window.__ow_flyToDeck = jest.fn(() => Promise.resolve());
    window.__ow_practiceMode = false;
    window.__ow_aiTriggering = false;
    window.__ow_isAITurn = false;
}

test('Turbojack does not play audio until a target is chosen', async () => {
    setupBoard();
    playAudioByKey.mockClear();
    let resolveTarget;
    selectCardTarget.mockImplementation(() => new Promise((resolve) => {
        resolveTarget = resolve;
    }));

    const pending = onUltimate({ playerHeroId: '1cyclo', rowId: '1m' });
    await Promise.resolve();
    expect(playAudioByKey).not.toHaveBeenCalled();

    resolveTarget({ cardId: '2reaper', rowId: '2f' });
    await pending;
    expect(playAudioByKey).toHaveBeenCalledWith('cyclo-ultimate');
});

test('Turbojack reshuffles the surviving enemy, not Cyclo, and flies them to the deck', async () => {
    setupBoard();
    selectCardTarget.mockResolvedValue({ cardId: '2reaper', rowId: '2f' });

    await onUltimate({ playerHeroId: '1cyclo', rowId: '1m' });

    // The cyclone is the projectile, so the damage bus must not add one of its own.
    expect(dealDamage).toHaveBeenCalledWith(
        '2reaper', '2f', 3, true, '1cyclo', false, { skipProjectileFx: true },
    );
    expect(window.__ow_flyToDeck).toHaveBeenCalledWith('2reaper');
    // Marked on the way into the deck: it comes back playable, but without its
    // on-enter and wearing the banner that says why.
    expect(window.__ow_reshuffleToDeck).toHaveBeenCalledWith('2reaper', { turbojacked: true });
    expect(window.__ow_reshuffleToDeck).not.toHaveBeenCalledWith('1cyclo', expect.anything());
    expect(window.__ow_moveCardToRow).toHaveBeenCalledWith('1cyclo', '1f');
});

test('Turbojack cancel does not play audio or remove Cyclo', async () => {
    setupBoard();
    playAudioByKey.mockClear();
    selectCardTarget.mockResolvedValue(null);

    const result = await onUltimate({ playerHeroId: '1cyclo', rowId: '1m' });

    expect(result).toBe(false);
    expect(playAudioByKey).not.toHaveBeenCalled();
    expect(window.__ow_reshuffleToDeck).not.toHaveBeenCalled();
    expect(window.__ow_moveCardToRow).not.toHaveBeenCalled();
});

test('AI Cyclo Chainsword retaliates without asking the human', () => {
    setupBoard();
    dealDamage.mockClear();
    showOnEnterChoice.mockClear();
    window.__ow_isAITurn = false;
    window.__ow_aiTriggering = false;

    offerChainsword({ attackerCardId: '1ana', attackerRowId: '1f', cycloId: '2cyclo' });

    expect(dealDamage).toHaveBeenCalledWith('1ana', '1f', 1, false, '2cyclo');
    expect(showOnEnterChoice).not.toHaveBeenCalled();
});

test('Human Cyclo still chooses whether to Chainsword', () => {
    setupBoard();
    dealDamage.mockClear();
    showOnEnterChoice.mockClear();

    offerChainsword({ attackerCardId: '2reaper', attackerRowId: '2f', cycloId: '1cyclo' });

    expect(showOnEnterChoice).toHaveBeenCalled();
    expect(dealDamage).not.toHaveBeenCalled();
});
