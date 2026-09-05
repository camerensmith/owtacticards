import { onEnter, onUltimate } from './wuyang';
import effectsBus, { Effects } from '../engine/effectsBus';
import { playAudioByKey } from '../../assets/imageImports';
import { staffHitMs } from '../../presentation/pixi/fxMath';

jest.mock('../../assets/imageImports', () => ({
    playAudioByKey: jest.fn(),
}));

jest.mock('../engine/damageBus', () => ({
    dealDamage: jest.fn(),
}));

jest.mock('../engine/targetingBus', () => ({
    showMessage: jest.fn(),
    clearMessage: jest.fn(),
}));

jest.mock('../engine/effectsBus', () => {
    const Effects = {
        showHeal: (cardId, amount) => ({ type: 'overlay:heal', payload: { cardId, amount } }),
        showDamage: (cardId, amount) => ({ type: 'overlay:damage', payload: { cardId, amount } }),
        rowWash: (rowId, color) => ({ type: 'fx:rowWash', payload: { rowId, color } }),
        push: (cardId, fromRowId, toRowId) => ({
            type: 'fx:push',
            payload: { cardId, fromRowId, toRowId },
        }),
        staffOrb: (fromCardId, targetCardIds) => ({
            type: 'fx:staffOrb',
            payload: { fromCardId, targetCardIds },
        }),
        tideWave: (cardId) => ({ type: 'fx:tideWave', payload: { cardId } }),
    };
    return {
        __esModule: true,
        default: { publish: jest.fn(), subscribe: jest.fn() },
        Effects,
    };
});

function setupBoard(cards, rows) {
    window.__ow_getCard = (id) => cards[id];
    window.__ow_getMaxHealth = (id) => cards[id]?.maxHealth;
    window.__ow_setCardHealth = jest.fn((id, health) => {
        if (cards[id]) cards[id].health = health;
    });
    window.__ow_getRow = (id) => ({ cardIds: rows[id] || [] });
    window.__ow_isRowFull = () => false;
    window.__ow_moveCardToRow = jest.fn();
}

test('Xuanwu Staff does not heal an ally past base HP', async () => {
    const cards = {
        '1wuyang': { id: 'wuyang', health: 3, maxHealth: 3 },
        '1ana': { id: 'ana', health: 3, maxHealth: 3 },
    };
    setupBoard(cards, { '1f': ['1wuyang', '1ana'] });
    jest.spyOn(Math, 'random').mockReturnValue(0);

    await onEnter({ playerHeroId: '1wuyang' });

    expect(cards['1ana'].health).toBe(3);
    expect(cards['1wuyang'].health).toBe(3);
    Math.random.mockRestore();
});

test('Guardian Tide does not heal allies past base HP', async () => {
    const cards = {
        '1wuyang': { id: 'wuyang', health: 3, maxHealth: 3 },
        '1ana': { id: 'ana', health: 3, maxHealth: 3 },
        '1reaper': { id: 'reaper', health: 1, maxHealth: 4 },
    };
    setupBoard(cards, {
        '1b': ['1wuyang'],
        '1m': ['1reaper'],
        '1f': ['1ana'],
    });

    await onUltimate({ playerHeroId: '1wuyang', rowId: '1b' });

    expect(cards['1ana'].health).toBe(3);
    expect(cards['1reaper'].health).toBe(2);
    expect(cards['1wuyang'].health).toBe(3);
});

test('Xuanwu Staff hops a water orb across its targets', async () => {
    const cards = {
        '1wuyang': { id: 'wuyang', health: 3, maxHealth: 3 },
        '1ana': { id: 'ana', health: 2, maxHealth: 3 },
        '2reaper': { id: 'reaper', health: 3, maxHealth: 4 },
    };
    setupBoard(cards, {
        '1f': ['1wuyang', '1ana'],
        '2f': ['2reaper'],
    });
    jest.spyOn(Math, 'random').mockReturnValue(0);

    await onEnter({ playerHeroId: '1wuyang' });

    expect(effectsBus.publish).toHaveBeenCalledWith(
        Effects.staffOrb('1wuyang', expect.any(Array)),
    );
    Math.random.mockRestore();
});

test('Xuanwu Staff sounds a hit as the orb reaches each target', async () => {
    jest.useFakeTimers();
    const cards = {
        '1wuyang': { id: 'wuyang', health: 3, maxHealth: 3 },
        '1ana': { id: 'ana', health: 2, maxHealth: 3 },
        '2reaper': { id: 'reaper', health: 3, maxHealth: 4 },
        '2ana': { id: 'ana', health: 3, maxHealth: 3 },
    };
    setupBoard(cards, {
        '1f': ['1wuyang', '1ana'],
        '2f': ['2reaper', '2ana'],
    });
    jest.spyOn(Math, 'random').mockReturnValue(0);
    playAudioByKey.mockClear();

    await onEnter({ playerHeroId: '1wuyang' });

    const hits = () => playAudioByKey.mock.calls.filter((c) => c[0] === 'wuyang-ability1-sfx');
    // Nothing has landed yet — the orb is still on its way to the first target.
    expect(hits()).toHaveLength(0);

    jest.advanceTimersByTime(staffHitMs(0));
    expect(hits()).toHaveLength(1);

    jest.advanceTimersByTime(staffHitMs(2) - staffHitMs(0));
    expect(hits()).toHaveLength(3);

    Math.random.mockRestore();
    jest.useRealTimers();
});

// The hops are shorter than playAudioByKey's default debounce window, so
// without this the second and third strikes are silently dropped as repeats.
test('every strike sounds, despite the hops being closer than the debounce', async () => {
    jest.useFakeTimers();
    const cards = {
        '1wuyang': { id: 'wuyang', health: 3, maxHealth: 3 },
        '2reaper': { id: 'reaper', health: 3, maxHealth: 4 },
        '2ana': { id: 'ana', health: 3, maxHealth: 3 },
        '2mercy': { id: 'mercy', health: 3, maxHealth: 3 },
    };
    setupBoard(cards, { '1f': ['1wuyang'], '2f': ['2reaper', '2ana', '2mercy'] });
    jest.spyOn(Math, 'random').mockReturnValue(0);
    playAudioByKey.mockClear();

    await onEnter({ playerHeroId: '1wuyang' });
    jest.advanceTimersByTime(staffHitMs(2));

    const hits = playAudioByKey.mock.calls.filter((c) => c[0] === 'wuyang-ability1-sfx');
    expect(hits).toHaveLength(3);
    for (const call of hits) expect(call[1]).toEqual({ debounceMs: 0 });

    Math.random.mockRestore();
    jest.useRealTimers();
});

test('Guardian Tide sends a wave from Wuyang', async () => {
    const cards = {
        '1wuyang': { id: 'wuyang', health: 3, maxHealth: 3 },
    };
    setupBoard(cards, { '1b': ['1wuyang'] });

    await onUltimate({ playerHeroId: '1wuyang', rowId: '1b' });

    expect(effectsBus.publish).toHaveBeenCalledWith(Effects.tideWave('1wuyang'));
});
