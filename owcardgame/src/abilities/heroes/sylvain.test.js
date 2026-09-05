import { onDraw, onEnter, onUltimate, applyTripwireEnter } from './sylvain';
import { playAudioByKey } from '../../assets/imageImports';
import { selectRowTarget } from '../engine/targeting';
import effectsBus, { Effects } from '../engine/effectsBus';
import { dealDamage } from '../engine/damageBus';

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
        lockOn: (cardId) => ({ type: 'fx:lockOn', payload: { cardId } }),
        impact: (cardId) => ({ type: 'fx:impact', payload: { cardId } }),
        zap: (cardId) => ({ type: 'fx:zap', payload: { cardId } }),
        beam: (fromCardId, toCardId) => ({ type: 'fx:beam', payload: { fromCardId, toCardId } }),
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
    window.__ow_appendCardEffect = jest.fn();
    window.__ow_dispatchArmorUpdate = jest.fn();
}

test('onDraw plays the intro', () => {
    onDraw();
    expect(playAudioByKey).toHaveBeenCalledWith('sylvain-intro');
});

test('Tripwire plays resolve audio and drops paired tokens on adjacent enemy rows', async () => {
    const rows = {
        '2f': { cardIds: [], enemyEffects: [], allyEffects: [] },
        '2m': { cardIds: ['2ana'], enemyEffects: [], allyEffects: [] },
    };
    setup(rows, { '2ana': { id: 'ana', health: 3, effects: [] } });
    selectRowTarget
        .mockResolvedValueOnce({ rowId: '2f' })
        .mockResolvedValueOnce({ rowId: '2m' });

    await onEnter({ playerHeroId: '1sylvain', rowId: '1b' });

    expect(selectRowTarget).toHaveBeenCalledWith({ isDamage: true });
    expect(playAudioByKey).toHaveBeenCalledWith('sylvain-enter');
    expect(playAudioByKey).toHaveBeenCalledWith('sylvain-ability1-resolve');
    expect(window.__ow_appendRowEffect).toHaveBeenCalledWith(
        '2f',
        'enemyEffects',
        expect.objectContaining({
            id: 'tripwire',
            hero: 'sylvain',
            visual: 'sylvain-icon',
            partnerRowId: '2m',
        })
    );
    expect(window.__ow_appendRowEffect).toHaveBeenCalledWith(
        '2m',
        'enemyEffects',
        expect.objectContaining({
            id: 'tripwire',
            partnerRowId: '2f',
        })
    );
    expect(effectsBus.publish).toHaveBeenCalledWith(Effects.rowWash('2f', expect.any(Number)));
    expect(effectsBus.publish).toHaveBeenCalledWith(Effects.rowWash('2m', expect.any(Number)));
});

test('Tripwire refuses ally-side rows', async () => {
    setup({}, {});
    selectRowTarget
        .mockResolvedValueOnce({ rowId: '1f' })
        .mockResolvedValueOnce({ rowId: '1m' });

    await onEnter({ playerHeroId: '1sylvain', rowId: '1b' });

    expect(playAudioByKey).not.toHaveBeenCalledWith('sylvain-ability1-resolve');
    expect(window.__ow_appendRowEffect).not.toHaveBeenCalled();
});

test('entering a Tripwire row plays the electrocute trigger', () => {
    const rows = {
        '2f': {
            cardIds: ['2ana'],
            enemyEffects: [{ id: 'tripwire', sourceCardId: '1sylvain', partnerRowId: '2m' }],
            allyEffects: [],
        },
    };
    setup(rows, { '2ana': { id: 'ana', health: 3, effects: [] } });

    applyTripwireEnter('2ana', '2f');

    expect(window.__ow_appendCardEffect).toHaveBeenCalledWith(
        '2ana',
        expect.objectContaining({ id: 'electrified', sourceCardId: '1sylvain' }),
    );
    expect(playAudioByKey).toHaveBeenCalledWith('sylvain-ability1-trigger');
});

test('already Electrified heroes do not retrigger the electrocute sound', () => {
    const rows = {
        '2f': {
            cardIds: ['2ana'],
            enemyEffects: [{ id: 'tripwire', sourceCardId: '1sylvain', partnerRowId: '2m' }],
            allyEffects: [],
        },
    };
    setup(rows, {
        '2ana': { id: 'ana', health: 3, effects: [{ id: 'electrified', sourceCardId: '1sylvain' }] },
    });

    applyTripwireEnter('2ana', '2f');

    expect(window.__ow_appendCardEffect).not.toHaveBeenCalled();
    expect(playAudioByKey).not.toHaveBeenCalledWith('sylvain-ability1-trigger');
});

test('Tripwire refuses a front-back span and does not place wires', async () => {
    setup({}, {});
    selectRowTarget
        .mockResolvedValueOnce({ rowId: '2f' })
        .mockResolvedValueOnce({ rowId: '2b' });

    await onEnter({ playerHeroId: '1sylvain', rowId: '1m' });

    expect(playAudioByKey).toHaveBeenCalledWith('sylvain-enter');
    expect(playAudioByKey).not.toHaveBeenCalledWith('sylvain-ability1-resolve');
    expect(window.__ow_appendRowEffect).not.toHaveBeenCalled();
});

test('Tripwire does not place if the second row is cancelled', async () => {
    setup({}, {});
    selectRowTarget
        .mockResolvedValueOnce({ rowId: '2f' })
        .mockResolvedValueOnce(null);

    await onEnter({ playerHeroId: '1sylvain', rowId: '1b' });

    expect(window.__ow_appendRowEffect).not.toHaveBeenCalled();
    expect(playAudioByKey).not.toHaveBeenCalledWith('sylvain-ability1-resolve');
});

test('Killswitch plays both ult clips and zaps affected enemies without a beam from Sylvain', async () => {
    const rows = {
        '2f': {
            cardIds: ['2ana'],
            enemyEffects: [{ id: 'tripwire', sourceCardId: '1sylvain', partnerRowId: '2m' }],
            allyEffects: [],
        },
        '2m': {
            cardIds: [],
            enemyEffects: [{ id: 'tripwire', sourceCardId: '1sylvain', partnerRowId: '2f' }],
            allyEffects: [],
        },
        '1f': { cardIds: [], enemyEffects: [], allyEffects: [] },
        '1m': { cardIds: [], enemyEffects: [], allyEffects: [] },
        '1b': { cardIds: [], enemyEffects: [], allyEffects: [] },
        '2b': { cardIds: [], enemyEffects: [], allyEffects: [] },
    };
    setup(rows, { '2ana': { id: 'ana', health: 3, armor: 0, effects: [{ id: 'electrified' }] } });

    await onUltimate({ playerHeroId: '1sylvain' });

    expect(playAudioByKey).toHaveBeenCalledWith('sylvain-ult');
    expect(playAudioByKey).toHaveBeenCalledWith('sylvain-ult-resolve');
    expect(dealDamage).toHaveBeenCalledWith(
        '2ana', '2f', 2, false, '1sylvain', false, { skipProjectileFx: true },
    );
    expect(effectsBus.publish).toHaveBeenCalledWith(Effects.zap('2ana'));
    expect(effectsBus.publish).not.toHaveBeenCalledWith(Effects.beam('1sylvain', '2ana'));
});

test('Killswitch destroys turrets in a Tripwire row but not BOB', async () => {
    const rows = {
        '2f': {
            cardIds: ['2turret', '2bob', '2ana'],
            enemyEffects: [{ id: 'tripwire', sourceCardId: '1sylvain', partnerRowId: '2m' }],
            allyEffects: [],
        },
        '2m': {
            cardIds: [],
            enemyEffects: [{ id: 'tripwire', sourceCardId: '1sylvain', partnerRowId: '2f' }],
            allyEffects: [],
        },
        '1f': { cardIds: [], enemyEffects: [], allyEffects: [] },
        '1m': { cardIds: [], enemyEffects: [], allyEffects: [] },
        '1b': { cardIds: [], enemyEffects: [], allyEffects: [] },
        '2b': { cardIds: [], enemyEffects: [], allyEffects: [] },
    };
    setup(rows, {
        '2turret': { id: 'turret', turret: true, special: true, health: 3, armor: 0, effects: [] },
        '2bob': { id: 'bob', special: true, health: 3, armor: 0, effects: [] },
        '2ana': { id: 'ana', health: 3, armor: 0, effects: [] },
    });

    await onUltimate({ playerHeroId: '1sylvain' });

    expect(dealDamage).toHaveBeenCalledWith(
        '2turret', '2f', 99, true, '1sylvain', false, { skipProjectileFx: true },
    );
    expect(dealDamage).not.toHaveBeenCalledWith(
        '2bob', expect.anything(), 99, expect.anything(), expect.anything(), expect.anything(), expect.anything(),
    );
    expect(dealDamage).not.toHaveBeenCalledWith(
        '2ana', expect.anything(), 99, expect.anything(), expect.anything(), expect.anything(), expect.anything(),
    );
});

test('Killswitch removes tripwire tokens from the wired rows', async () => {
    const rows = {
        '2f': {
            cardIds: ['2ana'],
            enemyEffects: [{ id: 'tripwire', sourceCardId: '1sylvain', partnerRowId: '2m' }],
            allyEffects: [],
        },
        '2m': {
            cardIds: [],
            enemyEffects: [{ id: 'tripwire', sourceCardId: '1sylvain', partnerRowId: '2f' }],
            allyEffects: [],
        },
        '1f': { cardIds: [], enemyEffects: [], allyEffects: [] },
        '1m': { cardIds: [], enemyEffects: [], allyEffects: [] },
        '1b': { cardIds: [], enemyEffects: [], allyEffects: [] },
        '2b': { cardIds: [], enemyEffects: [], allyEffects: [] },
    };
    setup(rows, { '2ana': { id: 'ana', health: 3, armor: 0, effects: [{ id: 'electrified' }] } });

    await onUltimate({ playerHeroId: '1sylvain' });

    expect(window.__ow_removeRowEffect).toHaveBeenCalledWith('2f', 'enemyEffects', 'tripwire');
    expect(window.__ow_removeRowEffect).toHaveBeenCalledWith('2m', 'enemyEffects', 'tripwire');
});
