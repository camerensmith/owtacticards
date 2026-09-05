import { onEnter, onUltimate, processBobTurnsAtTurnStart } from './bob';
import effectsBus, { Effects } from '../engine/effectsBus';
import { dealDamage } from '../engine/damageBus';
import { selectCardTarget } from '../engine/targeting';
import { turnsCounterEffect } from '../../game/bobRules';

jest.mock('jquery', () => ({
    __esModule: true,
    default: () => ({ closest: () => ({ attr: () => null }), on: () => {}, off: () => {} }),
}));

jest.mock('../../assets/imageImports', () => ({
    getAudioFile: () => null,
    playAudioByKey: jest.fn(),
}));

jest.mock('../engine/targeting', () => ({
    selectRowTarget: jest.fn(),
    selectCardTarget: jest.fn(),
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

beforeEach(() => {
    jest.clearAllMocks();
    window.__ow_aiTriggering = false;
    window.__ow_isAITurn = false;
    window.__ow_practiceMode = false;
    window.__ow_appendCardEffect = jest.fn();
    window.__ow_removeCardEffect = jest.fn();
    window.__ow_appendRowEffect = jest.fn();
    window.__ow_getRow = jest.fn(() => ({ cardIds: [] }));
    window.__ow_getCard = jest.fn();
});

test('Suppressing Fire sprays the chosen enemy row', () => {
    window.__ow_aiTriggering = true;
    const roll = Math.random;
    Math.random = () => 0;

    onEnter({ playerHeroId: '1bob', rowId: '1f' });

    expect(effectsBus.publish).toHaveBeenCalledWith(Effects.suppressingFire('1bob', '2f'));
    expect(window.__ow_appendCardEffect).toHaveBeenCalledWith('1bob', turnsCounterEffect(1));
    Math.random = roll;
});

test('Smash deals turns-on-field damage to one enemy in the opposite row', async () => {
    window.__ow_aiTriggering = true;
    window.__ow_getRow = (id) => {
        if (id === '2f') return { cardIds: ['2ana', '2reaper'] };
        return { cardIds: [] };
    };
    window.__ow_getCard = (id) => {
        if (id === '1bob') return { id: 'bob', health: 3, effects: [turnsCounterEffect(3)] };
        return { health: 3, effects: [] };
    };

    await onUltimate({ playerHeroId: '1bob', rowId: '1f' });

    expect(dealDamage).toHaveBeenCalledWith(
        '2ana', '2f', 3, false, '1bob', false, { skipProjectileFx: true },
    );
    expect(dealDamage).toHaveBeenCalledTimes(1);
    expect(effectsBus.publish).toHaveBeenCalledWith(Effects.smash(['2ana']));
});

test('Smash for humans only accepts the opposite row', async () => {
    window.__ow_getCard = (id) => {
        if (id === '1bob') return { id: 'bob', health: 3, effects: [turnsCounterEffect(2)] };
        return { health: 3 };
    };
    selectCardTarget
        .mockResolvedValueOnce({ cardId: '2mei', rowId: '2m' })
        .mockResolvedValueOnce({ cardId: '2ana', rowId: '2f' });

    await onUltimate({ playerHeroId: '1bob', rowId: '1f' });

    expect(dealDamage).toHaveBeenCalledWith(
        '2ana', '2f', 2, false, '1bob', false, { skipProjectileFx: true },
    );
});

test('owner turn start increments BOB turns on field', () => {
    window.__ow_getRow = (id) => {
        if (id === '1f') return { cardIds: ['1bob'] };
        return { cardIds: [] };
    };
    window.__ow_getCard = (id) => {
        if (id === '1bob') return { id: 'bob', health: 3, effects: [turnsCounterEffect(1)] };
        return null;
    };

    processBobTurnsAtTurnStart(1);

    expect(window.__ow_removeCardEffect).toHaveBeenCalledWith('1bob', 'bob-turns-on-field');
    expect(window.__ow_appendCardEffect).toHaveBeenCalledWith('1bob', turnsCounterEffect(2));
});

test('enemy turn start does not increment ally BOB', () => {
    window.__ow_getRow = (id) => {
        if (id === '1f') return { cardIds: ['1bob'] };
        return { cardIds: [] };
    };
    window.__ow_getCard = (id) => {
        if (id === '1bob') return { id: 'bob', health: 3, effects: [turnsCounterEffect(1)] };
        return null;
    };

    processBobTurnsAtTurnStart(2);

    expect(window.__ow_appendCardEffect).not.toHaveBeenCalled();
});
