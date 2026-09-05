import { onEnter1, onEnter2 } from './ashe';
import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';
import { selectCardTargets } from '../engine/targeting';
import { playAudioByKey } from '../../assets/imageImports';

jest.mock('../../assets/imageImports', () => ({
    playAudioByKey: jest.fn(),
    getAudioFile: jest.fn(() => null),
}));

jest.mock('../engine/damageBus', () => ({
    dealDamage: jest.fn(),
}));

jest.mock('../engine/targeting', () => ({
    selectCardTargets: jest.fn(),
}));

jest.mock('../engine/targetingBus', () => ({
    showMessage: jest.fn(),
    clearMessage: jest.fn(),
}));

jest.mock('../engine/modalController', () => ({
    showOnEnterChoice: jest.fn(),
}));

jest.mock('../engine/effectsBus', () => {
    const Effects = {
        bullet: (from, to, rounds = 1) => ({
            type: 'fx:bullet',
            payload: { fromCardId: from, toCardId: to, rounds },
        }),
        showDamage: (cardId, amount) => ({
            type: 'fx:showDamage',
            payload: { cardId, amount },
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
    window.__ow_aiTriggering = false;
    window.__ow_isAITurn = false;
    window.__ow_getRow = jest.fn();
    window.__ow_getCard = jest.fn();
});

test('The Viper fires a McCree-style bullet instead of a beam', async () => {
    selectCardTargets.mockResolvedValue([{ cardId: '2ana', rowId: '2f' }]);

    await onEnter1({ playerHeroId: '1ashe', rowId: '1b', playerNum: 1 });

    expect(effectsBus.publish).toHaveBeenCalledWith(Effects.bullet('1ashe', '2ana', 1));
    expect(dealDamage).toHaveBeenCalledWith(
        '2ana', '2f', 2, true, '1ashe', false, { skipProjectileFx: true },
    );
    expect(playAudioByKey).toHaveBeenCalledWith('ashe-shoot1');
});

test('Split Fire fires a bullet at each target', async () => {
    selectCardTargets.mockResolvedValue([
        { cardId: '2ana', rowId: '2f' },
        { cardId: '2reaper', rowId: '2f' },
    ]);

    await onEnter2({ playerHeroId: '1ashe', rowId: '1b', playerNum: 1 });

    expect(effectsBus.publish).toHaveBeenCalledWith(Effects.bullet('1ashe', '2ana', 1));
    expect(effectsBus.publish).toHaveBeenCalledWith(Effects.bullet('1ashe', '2reaper', 1));
    expect(dealDamage).toHaveBeenCalledWith(
        '2ana', '2f', 1, true, '1ashe', false, { skipProjectileFx: true },
    );
    expect(dealDamage).toHaveBeenCalledWith(
        '2reaper', '2f', 1, true, '1ashe', false, { skipProjectileFx: true },
    );
});
