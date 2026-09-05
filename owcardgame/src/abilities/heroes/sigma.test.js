import { onUltimate } from './sigma';
import { playAudioByKey } from '../../assets/imageImports';
import { selectRowTarget } from '../engine/targeting';
import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';
import { fluxSlamAtMs } from '../../presentation/pixi/fxMath';

jest.mock('../../assets/imageImports', () => ({ playAudioByKey: jest.fn() }));
jest.mock('../engine/targeting', () => ({ selectRowTarget: jest.fn() }));
jest.mock('../engine/damageBus', () => ({ dealDamage: jest.fn() }));
jest.mock('../engine/targetingBus', () => ({
    showMessage: jest.fn(),
    clearMessage: jest.fn(),
}));
jest.mock('../engine/effectsBus', () => ({
    __esModule: true,
    default: { publish: jest.fn() },
    Effects: {
        graviticFlux: (rowId, cardIds, sourceCardId) => ({
            type: 'fx:graviticFlux',
            payload: { rowId, cardIds, sourceCardId },
        }),
        showDamage: (cardId, amount) => ({
            type: 'fx:showDamage',
            payload: { cardId, amount },
        }),
    },
}));

beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    window.__ow_getRow = (id) => (
        id === '2f' ? { cardIds: ['2ana', '2reaper'] } : { cardIds: [] }
    );
    window.__ow_getCard = (id) => ({ id: id.slice(1), health: 3 });
    window.__ow_updateSynergy = jest.fn();
    selectRowTarget.mockResolvedValue({ rowId: '2f' });
});

afterEach(() => {
    jest.useRealTimers();
});

test('Gravitic Flux publishes sourceCardId and waits for slam before damage', async () => {
    const pending = onUltimate({ playerHeroId: '1sigma', rowId: '1m', cost: 3 });

    // Let selectRowTarget resolve and the FX publish before slam.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(effectsBus.publish).toHaveBeenCalledWith(
        Effects.graviticFlux('2f', ['2ana', '2reaper'], '1sigma'),
    );
    expect(dealDamage).not.toHaveBeenCalled();
    expect(window.__ow_updateSynergy).not.toHaveBeenCalled();

    jest.advanceTimersByTime(fluxSlamAtMs());
    await pending;

    expect(dealDamage).toHaveBeenCalledTimes(2);
    expect(dealDamage).toHaveBeenCalledWith(
        '2ana', '2f', 1, false, '1sigma', false, { skipProjectileFx: true },
    );
    expect(dealDamage).toHaveBeenCalledWith(
        '2reaper', '2f', 1, false, '1sigma', false, { skipProjectileFx: true },
    );
    expect(window.__ow_updateSynergy).toHaveBeenCalledWith('2f', -999);
});
