import { onEnter, onUltimate } from './bob';
import effectsBus, { Effects } from '../engine/effectsBus';

jest.mock('jquery', () => ({
    __esModule: true,
    default: () => ({ closest: () => ({ attr: () => null }), on: () => {}, off: () => {} }),
}));

jest.mock('../../assets/imageImports', () => ({
    getAudioFile: () => null,
}));

jest.mock('../engine/targeting', () => ({
    selectRowTarget: jest.fn(),
}));

jest.mock('../engine/targetingBus', () => ({
    showMessage: jest.fn(),
    clearMessage: jest.fn(),
}));

jest.mock('../engine/damageBus', () => ({
    dealDamage: jest.fn(),
}));

jest.mock('../engine/aimLineBus', () => ({
    __esModule: true,
    default: { setArrowSource: jest.fn(), clearArrow: jest.fn() },
}));

jest.mock('../engine/effectsBus', () => {
    const Effects = {
        showDamage: (cardId, amount) => ({ type: 'overlay:damage', payload: { cardId, amount } }),
        suppressingFire: (fromCardId, rowId) => ({
            type: 'fx:suppressingFire',
            payload: { fromCardId, rowId },
        }),
        smash: (cardIds) => ({ type: 'fx:smash', payload: { cardIds } }),
    };
    return {
        __esModule: true,
        default: { publish: jest.fn(), subscribe: jest.fn() },
        Effects,
    };
});

test('Suppressing Fire sprays the chosen enemy row', () => {
    window.__ow_aiTriggering = true;
    window.__ow_appendRowEffect = jest.fn();
    const roll = Math.random;
    Math.random = () => 0;

    onEnter({ playerHeroId: '1bob', rowId: '1f' });

    expect(effectsBus.publish).toHaveBeenCalledWith(Effects.suppressingFire('1bob', '2f'));
    Math.random = roll;
});

test('Smash slams the heroes it hits', async () => {
    window.__ow_aiTriggering = true;
    window.__ow_getRow = (id) => {
        if (id === '2f') return { cardIds: ['2ana', '2reaper'] };
        return { cardIds: [] };
    };
    window.__ow_getCard = () => ({ health: 3 });

    onUltimate({ playerHeroId: '1bob', rowId: '1f' });
    await new Promise((r) => setTimeout(r, 0));

    expect(effectsBus.publish).toHaveBeenCalledWith(Effects.smash(['2ana', '2reaper']));
});
