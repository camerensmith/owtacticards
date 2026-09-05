import { onEnter, onUltimate } from './echo';
import { playAudioByKey } from '../../assets/imageImports';
import { selectCardTarget } from '../engine/targeting';
import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';

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

jest.mock('../engine/effectsBus', () => {
    const Effects = {
        showDamage: (cardId, amount) => ({ type: 'overlay:damage', payload: { cardId, amount } }),
        focusingBeam: (fromCardId, toCardId) => ({ type: 'fx:focusingBeam', payload: { fromCardId, toCardId } }),
        duplicate: (cardId) => ({ type: 'fx:duplicate', payload: { cardId } }),
    };
    return {
        __esModule: true,
        default: { publish: jest.fn(), subscribe: jest.fn() },
        Effects,
    };
});

function livingBoard() {
    window.__ow_getRow = (id) => {
        if (id === '2f') return { cardIds: ['2reaper'] };
        return { cardIds: [] };
    };
    window.__ow_getCard = (id) => ({
        '2reaper': { id: 'reaper', health: 2, maxHealth: 4 },
    }[id]);
    window.__ow_getMaxHealth = () => 4;
}

test('Focusing Beam fires a dedicated beam at the wounded target', async () => {
    livingBoard();
    selectCardTarget.mockResolvedValue({ cardId: '2reaper', rowId: '2f' });

    await onEnter({ playerHeroId: '1echo', rowId: '1b' });

    expect(dealDamage).toHaveBeenCalledWith(
        '2reaper', '2f', 2, false, '1echo', false, { skipProjectileFx: true },
    );
    expect(effectsBus.publish).toHaveBeenCalledWith(Effects.focusingBeam('1echo', '2reaper'));
    expect(playAudioByKey).toHaveBeenCalledWith('echo-enter');
});

test('Duplicate plays a burst on Echo when the copy starts', async () => {
    window.__ow_getLastUltimateUsed = () => ({
        heroId: '1reaper',
        heroName: 'Reaper',
        abilityName: 'Death Blossom',
    });
    window.__ow_executeDuplicatedUltimate = jest.fn().mockResolvedValue(true);

    await onUltimate({ playerHeroId: '1echo', rowId: '1b' });

    expect(effectsBus.publish).toHaveBeenCalledWith(Effects.duplicate('1echo'));
    expect(playAudioByKey).toHaveBeenCalledWith('echo-ultimate');
});
