import { onDeath, onUltimate } from './tracer';
import { playAudioByKey } from '../../assets/imageImports';
import effectsBus, { Effects } from '../engine/effectsBus';
import { TRACER_RECALL_COST } from '../../game/redeployRules';

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

jest.mock('../engine/modalController', () => ({
    showOnEnterChoice: jest.fn(),
}));

jest.mock('../engine/effectsBus', () => ({
    __esModule: true,
    default: { publish: jest.fn(), subscribe: jest.fn() },
    Effects: {
        teleport: (cardId, playerNum) => ({ type: 'fx:teleport', payload: { cardId, playerNum } }),
        showDamage: jest.fn(),
        bullet: jest.fn(),
    },
}));

beforeEach(() => {
    jest.clearAllMocks();
    window.__ow_getRow = (id) => (id === '1f' ? { synergy: 3, cardIds: ['1tracer'] } : { synergy: 0, cardIds: [] });
    window.__ow_getCard = (id) => (
        id === '1tracer'
            ? { id: 'tracer', health: 0, maxHealth: 2, effects: [{ id: 'bleed' }] }
            : null
    );
    window.__ow_hasUsedUltimate = jest.fn(() => false);
    window.__ow_updateSynergy = jest.fn();
    window.__ow_setCardHealth = jest.fn();
    window.__ow_removeCardEffect = jest.fn();
    window.__ow_dispatchAction = jest.fn();
    window.__ow_getTurnCount = () => 4;
});

test('Recall on death spends synergy, plays ult sound, and returns Tracer to hand', () => {
    onDeath({ playerHeroId: '1tracer', rowId: '1f' });

    expect(window.__ow_updateSynergy).toHaveBeenCalledWith('1f', -TRACER_RECALL_COST);
    expect(playAudioByKey).toHaveBeenCalledWith('tracer-ultimate');
    expect(effectsBus.publish).toHaveBeenCalledWith(Effects.teleport('1tracer', 1));
    expect(window.__ow_setCardHealth).toHaveBeenCalledWith('1tracer', 2, true);
            expect(window.__ow_dispatchAction).toHaveBeenCalledWith(expect.objectContaining({
        type: 'mark-ultimate-used',
    }));
    expect(window.__ow_dispatchAction).toHaveBeenCalledWith(expect.objectContaining({
        type: 'return-hero-to-hand',
        payload: expect.objectContaining({
            cardId: '1tracer',
            rowId: '1f',
            suppressEnterOnRedeploy: false,
        }),
    }));
});

test('Recall fails without synergy and leaves her dead', () => {
    window.__ow_getRow = () => ({ synergy: 1, cardIds: ['1tracer'] });
    onDeath({ playerHeroId: '1tracer', rowId: '1f' });
    expect(window.__ow_updateSynergy).not.toHaveBeenCalled();
    expect(window.__ow_dispatchAction).not.toHaveBeenCalled();
});

test('Recall fails if ultimate already used', () => {
    window.__ow_hasUsedUltimate.mockReturnValue(true);
    onDeath({ playerHeroId: '1tracer', rowId: '1f' });
    expect(window.__ow_updateSynergy).not.toHaveBeenCalled();
});

test('manual onUltimate is not a board ult', () => {
    expect(onUltimate({})).toBe(false);
});
