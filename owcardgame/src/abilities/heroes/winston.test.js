import { onUltimate } from './winston';
import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';

jest.mock('../../assets/imageImports', () => ({
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

jest.mock('../engine/effectsBus', () => {
    const Effects = {
        primalRage: (cardId, rowId) => ({ type: 'fx:primalRage', payload: { cardId, rowId } }),
        push: (cardId, fromRowId, toRowId) => ({ type: 'fx:push', payload: { cardId, fromRowId, toRowId } }),
        showDamage: (cardId, amount) => ({ type: 'fx:showDamage', payload: { cardId, amount } }),
        tectonic: (cardIds) => ({ type: 'fx:tectonic', payload: { cardIds } }),
    };
    return {
        __esModule: true,
        default: { publish: jest.fn(), subscribe: jest.fn() },
        Effects,
    };
});

function setup(cards, rows) {
    window.__ow_practiceMode = false;
    window.__ow_aiTriggering = false;
    window.__ow_isAITurn = false;
    window.__ow_getCard = (id) => cards[id];
    window.__ow_getRow = (id) => ({ cardIds: rows[id] || [] });
    window.__ow_isRowFull = (id) => (rows[id] || []).length >= 4;
    window.__ow_moveCardToRow = jest.fn((cardId, destRowId) => {
        Object.keys(rows).forEach((rowId) => {
            rows[rowId] = (rows[rowId] || []).filter((id) => id !== cardId);
        });
        rows[destRowId] = [...(rows[destRowId] || []), cardId];
    });
}

test('Primal Rage leaps Winston and shuffles enemies for 1 damage without targeting', async () => {
    const cards = {
        '1winston': { id: 'winston', health: 4 },
        '2ana': { id: 'ana', health: 3 },
        '2reaper': { id: 'reaper', health: 2 },
    };
    const rows = {
        '1f': ['1winston'], '1m': [], '1b': [],
        '2f': ['2ana', '2reaper'], '2m': [], '2b': [],
    };
    setup(cards, rows);

    const rng = jest.spyOn(Math, 'random').mockReturnValue(0);
    await onUltimate({ playerHeroId: '1winston', rowId: '1f' });
    rng.mockRestore();

    expect(window.__ow_moveCardToRow).toHaveBeenCalled();
    expect(dealDamage).toHaveBeenCalled();
    expect(dealDamage.mock.calls.every((call) => call[2] === 1)).toBe(true);
    expect(effectsBus.publish).toHaveBeenCalledWith(Effects.primalRage('1winston', expect.any(String)));
});
