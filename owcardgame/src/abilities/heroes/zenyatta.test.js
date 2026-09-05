import { processHarmonyJump, processDiscordJump } from './zenyatta';
import effectsBus from '../engine/effectsBus';

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

jest.mock('../engine/effectsBus', () => ({
    __esModule: true,
    default: { publish: jest.fn(), subscribe: jest.fn() },
    Effects: {
        showHeal: (cardId, amount) => ({ type: 'fx:showHeal', payload: { cardId, amount } }),
    },
}));

function setup(cards, rows) {
    window.__ow_getCard = (id) => cards[id];
    window.__ow_setCardHealth = jest.fn((id, health) => {
        if (cards[id]) cards[id].health = health;
    });
    window.__ow_appendCardEffect = jest.fn((id, effect) => {
        if (!cards[id].effects) cards[id].effects = [];
        cards[id].effects.push(effect);
    });
    window.__ow_removeCardEffect = jest.fn((id, effectId) => {
        const card = cards[id];
        if (!card?.effects) return;
        card.effects = card.effects.filter((effect) => effect.id !== effectId);
    });
    window.__ow_getRow = (id) => ({ cardIds: rows[id] || [] });
}

test('Harmony heals 1 at turn start then jumps to another living ally', () => {
    const cards = {
        '1ana': {
            id: 'ana',
            health: 2,
            maxHealth: 3,
            effects: [{ id: 'harmony-1', hero: 'zenyatta', type: 'harmony', ownerPlayerNum: 1 }],
        },
        '1mercy': { id: 'mercy', health: 3, maxHealth: 3, effects: [] },
    };
    setup(cards, { '1f': ['1ana'], '1m': ['1mercy'], '1b': [] });

    processHarmonyJump('1ana');

    expect(cards['1ana'].health).toBe(3);
    expect(cards['1ana'].effects.some((e) => e.type === 'harmony')).toBe(false);
    expect(cards['1mercy'].effects.some((e) => e.type === 'harmony')).toBe(true);
    expect(effectsBus.publish).toHaveBeenCalled();
});

test('Harmony orb is discarded if the ally dies with it — it does not jump', () => {
    const cards = {
        '1ana': {
            id: 'ana',
            health: 0,
            maxHealth: 3,
            effects: [{ id: 'harmony-1', hero: 'zenyatta', type: 'harmony', ownerPlayerNum: 1 }],
        },
        '1mercy': { id: 'mercy', health: 3, maxHealth: 3, effects: [] },
    };
    setup(cards, { '1f': ['1ana'], '1m': ['1mercy'], '1b': [] });

    processHarmonyJump('1ana');

    expect(cards['1ana'].effects.some((e) => e.type === 'harmony')).toBe(false);
    expect(cards['1mercy'].effects.some((e) => e.type === 'harmony')).toBe(false);
    expect(window.__ow_appendCardEffect).not.toHaveBeenCalled();
});

test('Discord orb is discarded if the enemy dies with it — it does not jump', () => {
    const cards = {
        '2reaper': {
            id: 'reaper',
            health: 0,
            maxHealth: 4,
            effects: [{ id: 'discord-1', hero: 'zenyatta', type: 'discord', ownerPlayerNum: 1 }],
        },
        '2ana': { id: 'ana', health: 3, maxHealth: 3, effects: [] },
    };
    setup(cards, { '2f': ['2reaper'], '2m': ['2ana'], '1f': [], '1m': [], '1b': [] });

    processDiscordJump('2reaper');

    expect(cards['2reaper'].effects.some((e) => e.type === 'discord')).toBe(false);
    expect(cards['2ana'].effects.some((e) => e.type === 'discord')).toBe(false);
    expect(window.__ow_appendCardEffect).not.toHaveBeenCalled();
});

// Changed deliberately: the orb now leaves rather than sticking to its holder
// when there is nowhere to jump. It still heals on the way out.
test('Harmony is discarded if there is no other living ally to jump to', () => {
    const cards = {
        '1ana': {
            id: 'ana',
            health: 2,
            maxHealth: 3,
            effects: [{ id: 'harmony-1', hero: 'zenyatta', type: 'harmony', ownerPlayerNum: 1 }],
        },
    };
    setup(cards, { '1f': ['1ana'], '1m': [], '1b': [] });

    processHarmonyJump('1ana');

    expect(cards['1ana'].health).toBe(3);
    expect(cards['1ana'].effects.some((e) => e.type === 'harmony')).toBe(false);
});
