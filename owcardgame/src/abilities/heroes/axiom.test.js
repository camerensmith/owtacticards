import { onDraw, onEnter, onUltimate } from './axiom';
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

jest.mock('../engine/effectsBus', () => {
    const Effects = {
        rowWash: (rowId, color) => ({ type: 'fx:rowWash', payload: { rowId, color } }),
        shatter: (cardId) => ({ type: 'fx:shatter', payload: { cardId } }),
        ward: (cardId) => ({ type: 'fx:ward', payload: { cardId } }),
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
    window.__ow_updateSynergy = jest.fn();
    window.__ow_addSpecialCardToHand = jest.fn();
    window.__ow_createCardOnRow = jest.fn();
    window.__ow_isRowFull = () => false;
}

test('onDraw plays the intro', () => {
    onDraw();
    expect(playAudioByKey).toHaveBeenCalledWith('axiom-intro');
});

test('Enchant plays resolve audio and drops a relic token', async () => {
    setup({ '1m': { cardIds: [], allyEffects: [], enemyEffects: [] } }, {});
    selectRowTarget.mockResolvedValue({ rowId: '1m' });

    await onEnter({ playerHeroId: '1axiom', rowId: '1f' });

    expect(playAudioByKey).toHaveBeenCalledWith('axiom-enter');
    expect(playAudioByKey).toHaveBeenCalledWith('axiom-ability1-resolve');
    expect(window.__ow_appendRowEffect).toHaveBeenCalledWith(
        '1m',
        'allyEffects',
        expect.objectContaining({
            id: 'minor-relic',
            hero: 'axiom',
            visual: 'relic',
        })
    );
    expect(window.__ow_updateSynergy).toHaveBeenCalledWith('1m', 1);
    expect(effectsBus.publish).toHaveBeenCalledWith(Effects.rowWash('1m', expect.any(Number)));
});

test('Enchant cancel does not place a relic', async () => {
    setup({}, {});
    selectRowTarget.mockResolvedValue(null);

    await onEnter({ playerHeroId: '1axiom', rowId: '1f' });

    expect(window.__ow_appendRowEffect).not.toHaveBeenCalled();
    expect(playAudioByKey).not.toHaveBeenCalledWith('axiom-ability1-resolve');
});

test('Stoneguard plays ult audio and puts the relic in hand', async () => {
    setup({ '1b': { cardIds: [], allyEffects: [], enemyEffects: [] } }, {});

    await onUltimate({ playerHeroId: '1axiom' });

    expect(playAudioByKey).toHaveBeenCalledWith('axiom-ultimate');
    expect(window.__ow_addSpecialCardToHand).toHaveBeenCalledWith(1, 'stoneguard');
    expect(window.__ow_createCardOnRow).not.toHaveBeenCalled();
});

test('Stoneguard already in hand or on board is refused', async () => {
    setup({ player1hand: { cardIds: ['1stoneguard'] } }, {
        '1stoneguard': { id: 'stoneguard', health: 3 },
    });
    window.__ow_getRow = (id) => {
        if (id === 'player1hand') return { cardIds: ['1stoneguard'] };
        return { cardIds: [], allyEffects: [], enemyEffects: [] };
    };

    await onUltimate({ playerHeroId: '1axiom' });

    expect(playAudioByKey).not.toHaveBeenCalled();
    expect(window.__ow_addSpecialCardToHand).not.toHaveBeenCalled();
});
