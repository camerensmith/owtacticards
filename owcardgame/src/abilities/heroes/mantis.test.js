import { onEnter, onUltimate, onRowIntrusion } from './mantis';
import { playAudioByKey } from '../../assets/imageImports';
import { dealDamage } from '../engine/damageBus';
import { createCloakEffect, MANTIS_CLOAK_ID } from '../../game/mantis';

jest.mock('../../assets/imageImports', () => ({ playAudioByKey: jest.fn() }));
jest.mock('../engine/damageBus', () => ({ dealDamage: jest.fn() }));
jest.mock('../engine/targetingBus', () => ({
    showMessage: jest.fn(),
    clearMessage: jest.fn(),
}));
jest.mock('../engine/effectsBus', () => ({
    __esModule: true,
    default: { publish: jest.fn() },
    Effects: {
        showDamage: (...args) => ({ type: 'fx:showDamage', payload: args }),
        mantisCloak: (cardId) => ({ type: 'fx:mantisCloak', payload: { cardId } }),
        energySlash: (cardId) => ({ type: 'fx:energySlash', payload: { cardId } }),
        bladeDance: (casterId, targetCardIds) => ({
            type: 'fx:bladeDance',
            payload: { casterId, targetCardIds },
        }),
    },
}));

beforeEach(() => {
    jest.clearAllMocks();
    window.__ow_appendCardEffect = jest.fn();
    window.__ow_removeCardEffect = jest.fn();
    window.__ow_moveCardToRow = jest.fn();
    window.__ow_getCard = (id) => (
        id === '1mantis'
            ? { id: 'mantis', health: 3, effects: [createCloakEffect()] }
            : { id: id.slice(1), health: 3, effects: [] }
    );
    window.__ow_getRow = (id) => {
        if (id === '2f') return { cardIds: ['1mantis', '2ana'] };
        if (id === '2m') return { cardIds: ['2reaper'] };
        return { cardIds: [] };
    };
});

test('Cloak appends the cloak effect', async () => {
    await onEnter({ playerHeroId: '1mantis', rowId: '2f' });
    expect(playAudioByKey).toHaveBeenCalledWith('mantis-ability1');
    expect(window.__ow_appendCardEffect).toHaveBeenCalledWith(
        '1mantis',
        expect.objectContaining({ id: MANTIS_CLOAK_ID })
    );
});

test('Cloak trip damages the entrant and sends Mantis home', () => {
    onRowIntrusion({ entrantCardId: '2ana', rowId: '2f' });
    expect(dealDamage).toHaveBeenCalledWith('2ana', '2f', 2, false, '1mantis', false, { skipProjectileFx: true });
    expect(window.__ow_removeCardEffect).toHaveBeenCalledWith('1mantis', MANTIS_CLOAK_ID);
    expect(window.__ow_moveCardToRow).toHaveBeenCalledWith('1mantis', '1f');
});

test('Blade Dance strikes once per enemy', async () => {
    const ok = await onUltimate({ playerHeroId: '1mantis', cost: 2 });
    expect(ok).toBe(true);
    expect(playAudioByKey).toHaveBeenCalledWith('mantis-ult');
    expect(dealDamage.mock.calls.length).toBe(2);
});

test('Blade Dance: summons raise X but damage only hits heroes', async () => {
    window.__ow_getCard = (id) => {
        if (id === '2turret') return { id: 'turret', health: 2, special: true, turret: true };
        if (id === '2bob') return { id: 'bob', health: 4, special: true };
        if (id === '2ana') return { id: 'ana', health: 3, effects: [] };
        if (id === '2reaper') return { id: 'reaper', health: 3, effects: [] };
        return { id: id.slice(1), health: 3, effects: [] };
    };
    window.__ow_getRow = (rid) => {
        if (rid === '2f') return { cardIds: ['2ana', '2turret'] };
        if (rid === '2m') return { cardIds: ['2bob', '2reaper'] };
        return { cardIds: [] };
    };
    // X = 4 (ana, turret, bob, reaper); recipients = ana, reaper only
    const ok = await onUltimate({ playerHeroId: '1mantis', cost: 2 });
    expect(ok).toBe(true);
    expect(dealDamage.mock.calls.length).toBe(4);
    expect(dealDamage.mock.calls.every((c) => ['2ana', '2reaper'].includes(c[0]))).toBe(true);
    expect(dealDamage.mock.calls.some((c) => c[0] === '2turret')).toBe(false);
    expect(dealDamage.mock.calls.some((c) => c[0] === '2bob')).toBe(false);
});
