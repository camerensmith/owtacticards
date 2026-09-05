import { applyTokenEnter } from './bastion';
import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';
import { playAudioByKey } from '../../assets/imageImports';

jest.mock('../../assets/imageImports', () => ({ playAudioByKey: jest.fn() }));
jest.mock('../engine/targetingBus', () => ({
    showMessage: jest.fn(),
    clearMessage: jest.fn(),
}));
jest.mock('../engine/modalController', () => ({ showOnEnterChoice: jest.fn() }));
jest.mock('../engine/targeting', () => ({
    selectCardTarget: jest.fn(),
    selectRowTarget: jest.fn(),
}));
jest.mock('../engine/damageBus', () => ({ dealDamage: jest.fn() }));
jest.mock('../engine/effectsBus', () => {
    const Effects = {
        sentryShot: (rowId, cardId) => ({ type: 'fx:sentryShot', payload: { rowId, cardId } }),
        showDamage: (cardId, amount) => ({ type: 'overlay:damage', payload: { cardId, amount } }),
        tankForm: (cardId, on) => ({ type: 'fx:tankForm', payload: { cardId, on } }),
        rocket: (from, to, count) => ({ type: 'fx:rocket', payload: { fromCardId: from, toCardId: to, count } }),
    };
    return { __esModule: true, default: { publish: jest.fn() }, Effects };
});
jest.mock('../engine/aiContextHelper', () => ({ withAIContext: (fn) => fn() }));

beforeEach(() => {
    jest.clearAllMocks();
    window.__ow_getRow = jest.fn(() => ({
        enemyEffects: [{ id: 'bastion-token', hero: 'bastion', sourceCardId: '1bastion' }],
    }));
    window.__ow_getCard = jest.fn(() => ({ health: 3 }));
});

test('Bastion token fires at an enemy who enters the watched row', () => {
    applyTokenEnter('2ana', '2f');
    expect(effectsBus.publish).toHaveBeenCalledWith(Effects.sentryShot('2f', '2ana'));
    expect(dealDamage).toHaveBeenCalledWith('2ana', '2f', 1, false, '1bastion', false, { skipProjectileFx: true });
    expect(playAudioByKey).toHaveBeenCalledWith('bastion-ability1');
});

test('Bastion token does nothing when the row is unwatched', () => {
    window.__ow_getRow = jest.fn(() => ({ enemyEffects: [] }));
    applyTokenEnter('2ana', '2f');
    expect(dealDamage).not.toHaveBeenCalled();
    expect(effectsBus.publish).not.toHaveBeenCalled();
});
