import { onUltimate, checkMinefieldTrigger } from './wreckingball';
import { selectRowTarget } from '../engine/targeting';
import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';
import { playAudioByKey } from '../../assets/imageImports';
import { minefieldToken } from '../../game/minefield';

jest.mock('../../assets/imageImports', () => ({ playAudioByKey: jest.fn() }));
jest.mock('../engine/targeting', () => ({ selectRowTarget: jest.fn() }));
jest.mock('../engine/targetingBus', () => ({
    showMessage: jest.fn(),
    clearMessage: jest.fn(),
}));
jest.mock('../engine/damageBus', () => ({ dealDamage: jest.fn() }));
jest.mock('../engine/effectsBus', () => {
    const Effects = {
        mineBlast: (cardId) => ({ type: 'fx:mineBlast', payload: { cardId } }),
        showDamage: (cardId, amount) => ({ type: 'overlay:damage', payload: { cardId, amount } }),
    };
    return { __esModule: true, default: { publish: jest.fn() }, Effects };
});

beforeEach(() => {
    jest.clearAllMocks();
    window.__ow_aiTriggering = false;
    window.__ow_isAITurn = false;
    window.__ow_getRow = jest.fn((id) => {
        if (id === '1m') return { synergy: 4, enemyEffects: [] };
        return { synergy: 0, enemyEffects: [], cardIds: [] };
    });
    window.__ow_appendRowEffect = jest.fn();
    window.__ow_setRowArray = jest.fn();
    window.__ow_updateSynergy = jest.fn();
    window.__ow_getCard = jest.fn(() => ({ health: 3, effects: [] }));
    window.__ow_removeRowEffect = jest.fn();
});

test('human Minefield drops a charged minefield token on the chosen enemy row', async () => {
    selectRowTarget.mockResolvedValue({ rowId: '2f' });
    await onUltimate({ playerHeroId: '1wreckingball', rowId: '1m' });
    expect(window.__ow_appendRowEffect).toHaveBeenCalledWith(
        '2f',
        'enemyEffects',
        expect.objectContaining({
            hero: 'wreckingball',
            type: 'minefield',
            charges: 4,
            visual: 'minefield',
        }),
    );
});

test('AI Minefield uses the same charged minefield token, not a damage-field', async () => {
    window.__ow_aiTriggering = true;
    window.__ow_getRow = jest.fn((id) => {
        if (id === '1m') return { synergy: 3, enemyEffects: [] };
        if (id === '2f') return { cardIds: ['2ana', '2reaper'] };
        if (id === '2m') return { cardIds: [] };
        if (id === '2b') return { cardIds: ['2mei'] };
        return { cardIds: [], enemyEffects: [] };
    });
    await onUltimate({ playerHeroId: '1wreckingball', rowId: '1m' });
    expect(window.__ow_appendRowEffect).toHaveBeenCalledWith(
        '2m',
        'enemyEffects',
        expect.objectContaining({ type: 'minefield', charges: 3 }),
    );
});

test('stepping on a mine blasts the card and spends a charge', () => {
    const token = minefieldToken({
        charges: 2,
        sourceCardId: '1wreckingball',
        sourceRowId: '1m',
        now: 1,
    });
    window.__ow_getRow = jest.fn(() => ({ enemyEffects: [token] }));
    checkMinefieldTrigger('2ana', '2f');
    expect(effectsBus.publish).toHaveBeenCalledWith(Effects.mineBlast('2ana'));
    expect(dealDamage).toHaveBeenCalledWith(
        '2ana', '2f', 2, false, '1wreckingball', false, { skipProjectileFx: true },
    );
    expect(playAudioByKey).toHaveBeenCalledWith('junkrat-explosion');
});
