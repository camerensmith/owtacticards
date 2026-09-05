import { onEnter, onUltimate } from './moira';
import { selectCardTarget } from '../engine/targeting';
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
        showHeal: (cardId, amount) => ({ type: 'overlay:heal', payload: { cardId, amount } }),
        siphon: (fromCardId, toCardId) => ({ type: 'fx:siphon', payload: { fromCardId, toCardId } }),
        bioticHeal: (fromCardId, toCardId) => ({ type: 'fx:bioticHeal', payload: { fromCardId, toCardId } }),
        coalescence: (yellowIds, purpleIds) => ({ type: 'fx:coalescence', payload: { yellowIds, purpleIds } }),
    };
    return {
        __esModule: true,
        default: { publish: jest.fn(), subscribe: jest.fn() },
        Effects,
    };
});

function board() {
    const cards = {
        '1moira': { id: 'moira', health: 2, maxHealth: 3 },
        '1ana': { id: 'ana', health: 1, maxHealth: 3 },
        '2reaper': { id: 'reaper', health: 3, maxHealth: 4 },
    };
    window.__ow_getCard = (id) => cards[id];
    window.__ow_getMaxHealth = (id) => cards[id]?.maxHealth;
    window.__ow_setCardHealth = jest.fn((id, hp) => { cards[id].health = hp; });
    window.__ow_getRow = (id) => {
        if (id === '1m') return { cardIds: ['1moira'] };
        if (id === '1f') return { cardIds: ['1ana'] };
        if (id === '2f') return { cardIds: ['2reaper'] };
        return { cardIds: [] };
    };
    return cards;
}

test('Biotic Grasp siphons purple then heals yellow', async () => {
    board();
    selectCardTarget
        .mockResolvedValueOnce({ cardId: '2reaper', rowId: '2f' })
        .mockResolvedValueOnce({ cardId: '1ana', rowId: '1f' });

    await onEnter({ playerHeroId: '1moira', rowId: '1m' });

    expect(effectsBus.publish).toHaveBeenCalledWith(Effects.siphon('2reaper', '1moira'));
    expect(effectsBus.publish).toHaveBeenCalledWith(Effects.bioticHeal('1moira', '1ana'));
});

test('Coalescence paints the column yellow on allies and purple on enemies', async () => {
    board();
    selectCardTarget.mockResolvedValue({ cardId: '1ana', rowId: '1f' });

    await onUltimate({ playerHeroId: '1moira', rowId: '1m' });

    expect(effectsBus.publish).toHaveBeenCalledWith(
        Effects.coalescence(expect.arrayContaining(['1ana']), ['2reaper']),
    );
});
