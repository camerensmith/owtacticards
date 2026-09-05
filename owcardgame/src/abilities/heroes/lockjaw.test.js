import { onDraw, onEnter, onUltimate } from './lockjaw';
import { playAudioByKey } from '../../assets/imageImports';
import { selectRowTarget } from '../engine/targeting';
import effectsBus, { Effects } from '../engine/effectsBus';

jest.mock('../../assets/imageImports', () => ({
    playAudioByKey: jest.fn(),
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

jest.mock('../engine/effectsBus', () => {
    const Effects = {
        rowWash: (rowId, color) => ({ type: 'fx:rowWash', payload: { rowId, color } }),
        push: (cardId, fromRowId, toRowId) => ({ type: 'fx:push', payload: { cardId, fromRowId, toRowId } }),
        impact: (cardId) => ({ type: 'fx:impact', payload: { cardId } }),
        lockOn: (cardId) => ({ type: 'fx:lockOn', payload: { cardId } }),
    };
    return {
        __esModule: true,
        default: { publish: jest.fn(), subscribe: jest.fn() },
        Effects,
    };
});

function setup(rows, cards) {
    window.__ow_practiceMode = false;
    window.__ow_aiTriggering = false;
    window.__ow_isAITurn = false;
    window.__ow_getRow = (id) => rows[id] || { cardIds: [], enemyEffects: [], allyEffects: [] };
    window.__ow_getCard = (id) => cards[id];
    window.__ow_appendRowEffect = jest.fn();
    window.__ow_removeRowEffect = jest.fn();
    window.__ow_moveCardToRow = jest.fn();
    window.__ow_isRowFull = () => false;
}

test('onDraw plays the intro', () => {
    onDraw();
    expect(playAudioByKey).toHaveBeenCalledWith('lockjaw-intro');
});

test('Magnetic Clamp plays resolve audio, drops a lockjaw token, and washes the row', async () => {
    const rows = {
        '2f': { cardIds: ['2ana'], enemyEffects: [], allyEffects: [] },
    };
    setup(rows, { '2ana': { id: 'ana', health: 3 } });
    selectRowTarget.mockResolvedValue({ rowId: '2f' });

    await onEnter({ playerHeroId: '1lockjaw', rowId: '1b' });

    expect(playAudioByKey).toHaveBeenCalledWith('lockjaw-ability1-resolve');
    expect(window.__ow_appendRowEffect).toHaveBeenCalledWith(
        '2f',
        'enemyEffects',
        expect.objectContaining({
            id: 'magnetic-clamp',
            hero: 'lockjaw',
            visual: 'lockjaw-icon',
        })
    );
    expect(effectsBus.publish).toHaveBeenCalledWith(Effects.rowWash('2f', expect.any(Number)));
});

test('Crush Zone plays ultimate audio and publishes pull FX', async () => {
    const rows = {
        '2f': {
            cardIds: ['2ana'],
            enemyEffects: [{ id: 'magnetic-clamp', sourceCardId: '1lockjaw' }],
            allyEffects: [],
        },
        '2m': { cardIds: [], enemyEffects: [], allyEffects: [] },
        '2b': { cardIds: [], enemyEffects: [], allyEffects: [] },
    };
    setup(rows, { '2ana': { id: 'ana', health: 3 } });
    selectRowTarget.mockResolvedValue({ rowId: '2m' });

    await onUltimate({ playerHeroId: '1lockjaw' });

    expect(playAudioByKey).toHaveBeenCalledWith('lockjaw-ult-start');
    expect(playAudioByKey).toHaveBeenCalledWith('lockjaw-ultimate-resolve');
    expect(window.__ow_moveCardToRow).toHaveBeenCalledWith('2ana', '2m');
    expect(effectsBus.publish).toHaveBeenCalledWith(Effects.push('2ana', '2f', '2m'));
    expect(effectsBus.publish).toHaveBeenCalledWith(Effects.rowWash('2m', expect.any(Number)));
});

test('Crush Zone does not play resolve audio if targeting is cancelled', async () => {
    setup({}, {});
    selectRowTarget.mockResolvedValue(null);

    await onUltimate({ playerHeroId: '1lockjaw' });

    expect(playAudioByKey).toHaveBeenCalledWith('lockjaw-ult-start');
    expect(playAudioByKey).not.toHaveBeenCalledWith('lockjaw-ultimate-resolve');
    expect(window.__ow_moveCardToRow).not.toHaveBeenCalled();
});
