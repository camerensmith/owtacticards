import { onEnter, onUltimate } from './vega';
import { playAudioByKey, heroCardImages } from '../../assets/imageImports';
import { selectCardTarget } from '../engine/targeting';
import { showReorderModal } from '../engine/modalController';
import effectsBus, { Effects } from '../engine/effectsBus';

jest.mock('../../assets/imageImports', () => ({
    playAudioByKey: jest.fn(),
    heroCardImages: { ana: 'ana.png', mei: 'mei.png', reaper: 'reaper.png', 'card-back': 'back.png' },
}));

jest.mock('../engine/targeting', () => ({
    selectCardTarget: jest.fn(),
}));

jest.mock('../engine/targetingBus', () => ({
    showMessage: jest.fn(),
    clearMessage: jest.fn(),
}));

jest.mock('../engine/modalController', () => ({
    __esModule: true,
    showReorderModal: jest.fn(),
}));

jest.mock('../engine/effectsBus', () => {
    const Effects = {
        temporalRift: (cardId) => ({ type: 'fx:temporalRift', payload: { cardId } }),
        chronoshift: (fromCardId, toCardId) => ({
            type: 'fx:chronoshift',
            payload: { fromCardId, toCardId },
        }),
    };
    return {
        __esModule: true,
        default: { publish: jest.fn(), subscribe: jest.fn() },
        Effects,
    };
});

beforeEach(() => {
    jest.clearAllMocks();
    showReorderModal.mockImplementation(({ onConfirm, heroIds }) => {
        onConfirm([...(heroIds || [])]);
    });
    window.__ow_practiceMode = true;
    window.__ow_aiTriggering = false;
    window.__ow_isAITurn = false;
    window.__ow_getDrawnHeroes = () => [];
    window.__ow_getHeroRoster = () => ({
        ana: { id: 'ana' },
        mei: { id: 'mei' },
        reaper: { id: 'reaper' },
        bob: { id: 'bob', special: true },
    });
    window.__ow_getDrawQueue = () => [];
    window.__ow_setDrawQueue = jest.fn();
    window.__ow_getAbilityModule = (id) => (
        id === 'ana' ? { onEnter: jest.fn(), onEnterAbility1: jest.fn() } : null
    );
    window.__ow_getRow = (id) => (id === '1f' ? { cardIds: ['1vega', '1ana'] } : { cardIds: [] });
    window.__ow_getCard = (id) => ({
        '1vega': { health: 3 },
        '1ana': { health: 2 },
    }[id]);
    window.__ow_rerunEnterAbility = jest.fn().mockResolvedValue(true);
    selectCardTarget.mockResolvedValue({ cardId: '1ana', rowId: '1f' });
});

test('Temporal Rift peeks three undrawn heroes and writes the draw queue', async () => {
    await onEnter({ playerHeroId: '1vega', rowId: '1f' });
    expect(playAudioByKey).toHaveBeenCalledWith('vega-temporalrift');
    expect(effectsBus.publish).toHaveBeenCalledWith(Effects.temporalRift('1vega'));
    expect(showReorderModal).toHaveBeenCalled();
    expect(window.__ow_setDrawQueue).toHaveBeenCalledWith(
        1,
        expect.arrayContaining(['ana', 'mei', 'reaper'])
    );
    expect(window.__ow_setDrawQueue.mock.calls[0][1]).toHaveLength(3);
});

test('Chronoshift warps onto the ally and re-runs their Enter', async () => {
    const ok = await onUltimate({ playerHeroId: '1vega', rowId: '1f', cost: 3 });
    expect(ok).toBe(true);
    expect(playAudioByKey).toHaveBeenCalledWith('vega-ult-start');
    expect(playAudioByKey).toHaveBeenCalledWith('vega-ult-resolve');
    expect(effectsBus.publish).toHaveBeenCalledWith(Effects.chronoshift('1vega', '1ana'));
    expect(window.__ow_rerunEnterAbility).toHaveBeenCalledWith('1ana', '1f');
});

test('AI Chronoshift picks an eligible ally without opening targeting', async () => {
    window.__ow_practiceMode = false;
    window.__ow_aiTriggering = true;
    window.__ow_getRow = (id) => (id === '2f' ? { cardIds: ['2vega', '2ana'] } : { cardIds: [] });
    window.__ow_getCard = (id) => ({
        '2vega': { health: 3 },
        '2ana': { health: 2 },
    }[id]);
    const ok = await onUltimate({ playerHeroId: '2vega', rowId: '2f', cost: 3 });
    expect(ok).toBe(true);
    expect(selectCardTarget).not.toHaveBeenCalled();
    expect(window.__ow_rerunEnterAbility).toHaveBeenCalledWith('2ana', '2f');
});
