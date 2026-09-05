import { onEnter, onUltimate } from './lifeweaver';
import effectsBus, { Effects } from '../engine/effectsBus';
import { playAudioByKey } from '../../assets/imageImports';

jest.mock('../../assets/imageImports', () => ({ playAudioByKey: jest.fn() }));
jest.mock('../engine/targetingBus', () => ({
    showMessage: jest.fn(),
    clearMessage: jest.fn(),
}));
jest.mock('../engine/effectsBus', () => {
    const Effects = {
        lifeGrip: (fromCardId, toCardId) => ({ type: 'fx:lifeGrip', payload: { fromCardId, toCardId } }),
        treeOfLife: (cardIds) => ({ type: 'fx:treeOfLife', payload: { cardIds } }),
        push: (cardId, fromRowId, toRowId) => ({ type: 'fx:push', payload: { cardId, fromRowId, toRowId } }),
    };
    return { __esModule: true, default: { publish: jest.fn() }, Effects };
});

beforeEach(() => {
    jest.clearAllMocks();
    window.__ow_aiTriggering = false;
    window.__ow_isAITurn = false;
    window.__ow_isRowFull = jest.fn(() => false);
    window.__ow_moveCardToRow = jest.fn();
    window.__ow_dispatchShieldUpdate = jest.fn();
    window.__ow_appendCardEffect = jest.fn();
    window.__ow_getMaxHealth = jest.fn(() => 4);
    window.__ow_getRow = jest.fn((id) => {
        if (id === '1f') return { cardIds: ['1ana'] };
        if (id === '1m') return { cardIds: ['1lifeweaver'] };
        if (id === '1b') return { cardIds: [] };
        return { cardIds: [] };
    });
    window.__ow_getCard = jest.fn((id) => {
        if (id === '1ana') return { name: 'Ana', health: 1, shield: 0 };
        if (id === '1lifeweaver') return { name: 'Lifeweaver', health: 3, shield: 0 };
        return null;
    });
});

test('Life Grip pulls the wounded ally with a vine and the ability clip', () => {
    onEnter({ playerHeroId: '1lifeweaver', rowId: '1m' });
    expect(playAudioByKey).toHaveBeenCalledWith('lifeweaver-ability1');
    expect(effectsBus.publish).toHaveBeenCalledWith(Effects.lifeGrip('1ana', '1lifeweaver'));
    expect(effectsBus.publish).toHaveBeenCalledWith(Effects.push('1ana', '1f', '1m'));
    expect(window.__ow_moveCardToRow).toHaveBeenCalledWith('1ana', '1m');
});

test('Tree of Life blossoms on Lifeweaver and adjacent allies', () => {
    onUltimate({ playerHeroId: '1lifeweaver', rowId: '1m' });
    expect(effectsBus.publish).toHaveBeenCalledWith(Effects.treeOfLife(['1lifeweaver', '1ana']));
});
