import { onUltimate, onDeath } from './mauga';
import { dealDamage } from '../engine/damageBus';
import effectsBus from '../engine/effectsBus';
import { playAudioByKey } from '../../assets/imageImports';

jest.mock('../../assets/imageImports', () => ({ playAudioByKey: jest.fn() }));
jest.mock('../engine/damageBus', () => ({ dealDamage: jest.fn() }));
jest.mock('../engine/targetingBus', () => ({
    showMessage: jest.fn(),
    clearMessage: jest.fn(),
}));
jest.mock('../engine/effectsBus', () => {
    const Effects = {
        showDamage: (id, n) => ({ type: 'fx:showDamage', payload: { id, n } }),
        showHeal: (id, n) => ({ type: 'fx:showHeal', payload: { id, n } }),
        berserk: (cardId) => ({ type: 'fx:berserk', payload: { cardId } }),
        maugaSmash: (fromCardId, toCardId) => ({
            type: 'fx:maugaSmash',
            payload: { fromCardId, toCardId },
        }),
    };
    return { __esModule: true, default: { publish: jest.fn() }, Effects };
});

function setup(cards, rows) {
    window.__ow_getCard = (id) => cards[id];
    window.__ow_getRow = (id) => rows[id];
    window.__ow_dispatchAction = jest.fn();
    dealDamage.mockClear();
    effectsBus.publish.mockClear();
    playAudioByKey.mockClear();
}

test('Cage Fight locks the opposing lane and hits every living hero with abs HP difference', async () => {
    const cards = {
        '1mauga': { id: 'mauga', health: 7 },
        '2tracer': { id: 'tracer', health: 2 },
        '2rein': { id: 'reinhardt', health: 8 },
        '2turret': { id: 'turret', health: 3, turret: true },
    };
    const rows = {
        '1f': { cardIds: ['1mauga'] },
        '2f': { cardIds: ['2tracer', '2rein', '2turret'] },
    };
    setup(cards, rows);

    await onUltimate({ playerHeroId: '1mauga', rowId: '1f' });

    expect(window.__ow_dispatchAction).toHaveBeenCalledWith({
        type: 'apply-row-lock',
        payload: { rowId: '2f', sourceCardId: '1mauga' },
    });
    // The slam is the projectile, so the damage bus must not add one of its own.
    const slam = { skipProjectileFx: true };
    expect(dealDamage).toHaveBeenCalledWith('2tracer', '2f', 5, false, '1mauga', false, slam);
    expect(dealDamage).toHaveBeenCalledWith('2rein', '2f', 1, false, '1mauga', false, slam);
    expect(dealDamage).not.toHaveBeenCalledWith(
        '2turret',
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
    );
});

// A hit that deals nothing is still a hit: he goes through the whole cage.
test('Cage Fight slams every hero, including one it deals no damage to', async () => {
    const cards = {
        '1mauga': { id: 'mauga', health: 4 },
        '2tracer': { id: 'tracer', health: 2 },
        // Equal health to Mauga, so the difference is zero.
        '2rein': { id: 'reinhardt', health: 4 },
        '2turret': { id: 'turret', health: 3, turret: true },
    };
    setup(cards, {
        '1f': { cardIds: ['1mauga'] },
        '2f': { cardIds: ['2tracer', '2rein', '2turret'] },
    });

    await onUltimate({ playerHeroId: '1mauga', rowId: '1f' });

    const smashed = effectsBus.publish.mock.calls
        .map(([event]) => event)
        .filter((event) => event?.type === 'fx:maugaSmash')
        .map((event) => event.payload.toCardId);

    expect(smashed).toEqual(['2tracer', '2rein']);
    // Reinhardt is slammed but takes nothing; the turret is not a hero.
    expect(dealDamage).toHaveBeenCalledTimes(1);
    expect(dealDamage).toHaveBeenCalledWith(
        '2tracer', '2f', 2, false, '1mauga', false, { skipProjectileFx: true },
    );

    // A thud per hero, including the one that took nothing. Debouncing has to
    // be off or the slams land inside the default window and go silent.
    const hits = playAudioByKey.mock.calls.filter(([key]) => key === 'mauga-cagefight-hit');
    expect(hits).toHaveLength(2);
    for (const call of hits) expect(call[1]).toEqual({ debounceMs: 0 });
});

test('Mauga death unlocks only his cages', () => {
    setup({}, {});
    onDeath({ playerHeroId: '1mauga' });
    expect(window.__ow_dispatchAction).toHaveBeenCalledWith({
        type: 'clear-row-locks',
        payload: { sourceCardId: '1mauga' },
    });
});
