import { onEnter } from './doomfist';
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

jest.mock('../engine/effectsBus', () => {
    const Effects = {
        punch: (from, to) => ({ type: 'fx:punch', payload: { from, to } }),
    };
    return { __esModule: true, default: { publish: jest.fn() }, Effects };
});

function setup(rows) {
    window.__ow_practiceMode = false;
    window.__ow_aiTriggering = false;
    window.__ow_isAITurn = false;
    window.__ow_getCard = (id) => ({ id: id.slice(1), health: 3 });
    window.__ow_getRow = (id) => ({ cardIds: rows[id] || [] });
    window.__ow_isRowFull = (id) => (rows[id] || []).length >= 4;
    window.__ow_moveCardToRow = jest.fn((cardId, dest) => {
        Object.keys(rows).forEach((rid) => {
            rows[rid] = (rows[rid] || []).filter((id) => id !== cardId);
        });
        rows[dest] = [...(rows[dest] || []), cardId];
    });
    dealDamage.mockClear();
}

test('Rocket Punch deals 2 even when the target is already in the back row', async () => {
    setup({ '2b': ['2reaper'] });
    selectCardTarget.mockResolvedValue({ cardId: '2reaper', rowId: '2b' });

    await onEnter({ playerHeroId: '1doomfist', rowId: '1f' });

    expect(window.__ow_moveCardToRow).not.toHaveBeenCalled();
    expect(dealDamage).toHaveBeenCalledWith(
        '2reaper', '2b', 2, false, '1doomfist', false, { skipProjectileFx: true },
    );
});

test('Rocket Punch deals 2 on the current row when the row behind is full', async () => {
    setup({
        '2f': ['2reaper'],
        '2m': ['2ana', '2mei', '2mercy', '2lucio'],
    });
    selectCardTarget.mockResolvedValue({ cardId: '2reaper', rowId: '2f' });

    await onEnter({ playerHeroId: '1doomfist', rowId: '1f' });

    expect(window.__ow_moveCardToRow).not.toHaveBeenCalled();
    expect(dealDamage).toHaveBeenCalledWith(
        '2reaper', '2f', 2, false, '1doomfist', false, { skipProjectileFx: true },
    );
});

test('Rocket Punch still deals 2 if the push is blocked after being attempted', async () => {
    setup({ '2f': ['2reaper'], '2m': [] });
    window.__ow_isRowFull = () => false;
    window.__ow_moveCardToRow = jest.fn(); // clamp / lock: dispatch no-ops, card stays
    selectCardTarget.mockResolvedValue({ cardId: '2reaper', rowId: '2f' });

    await onEnter({ playerHeroId: '1doomfist', rowId: '1f' });

    expect(dealDamage).toHaveBeenCalledWith(
        '2reaper', '2f', 2, false, '1doomfist', false, { skipProjectileFx: true },
    );
});
