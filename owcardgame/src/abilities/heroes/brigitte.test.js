import { onEnter, onUltimate } from './brigitte';
import { selectCardTarget } from '../engine/targeting';

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

function setup(cards, rows) {
    window.__ow_practiceMode = false;
    window.__ow_aiTriggering = false;
    window.__ow_isAITurn = false;
    window.__ow_getCard = (id) => cards[id];
    window.__ow_getMaxHealth = (id) => cards[id]?.maxHealth;
    window.__ow_setCardHealth = jest.fn((id, health) => {
        if (cards[id]) cards[id].health = health;
    });
    window.__ow_dispatchArmorUpdate = jest.fn((id, armor) => {
        if (cards[id]) cards[id].armor = armor;
    });
    window.__ow_appendCardEffect = jest.fn();
    window.__ow_getRow = (id) => ({ cardIds: rows[id] || [] });
}

test('Repair Pack heals 2 and overflow past base HP becomes armor', async () => {
    const cards = {
        '1brigitte': { id: 'brigitte', health: 4, maxHealth: 4, armor: 0 },
        '1ana': { id: 'ana', health: 3, maxHealth: 3, armor: 0 },
    };
    setup(cards, { '1f': ['1brigitte'], '1m': ['1ana'] });
    selectCardTarget.mockResolvedValue({ cardId: '1ana', rowId: '1m' });

    await onEnter({ playerHeroId: '1brigitte', rowId: '1f' });

    expect(cards['1ana'].health).toBe(3);
    expect(window.__ow_dispatchArmorUpdate).toHaveBeenCalledWith('1ana', 2);
});

test('Repair Pack can heal a structure', async () => {
    const cards = {
        '1brigitte': { id: 'brigitte', health: 4, maxHealth: 4, armor: 0 },
        '1turret': { id: 'turret', turret: true, health: 1, maxHealth: 3, armor: 0 },
    };
    setup(cards, { '1f': ['1brigitte'], '1b': ['1turret'] });
    selectCardTarget.mockResolvedValue({ cardId: '1turret', rowId: '1b' });

    await onEnter({ playerHeroId: '1brigitte', rowId: '1f' });

    expect(window.__ow_setCardHealth).toHaveBeenCalledWith(
        '1turret',
        3,
        false,
        { allowStructureHeal: true }
    );
});

test('Shield Bash locks ultimate and does not grant shields', async () => {
    const cards = {
        '1brigitte': { id: 'brigitte', health: 4, maxHealth: 4, shield: 0, armor: 0 },
        '2reaper': { id: 'reaper', health: 3, maxHealth: 3 },
    };
    setup(cards, { '1f': ['1brigitte'], '2f': ['2reaper'] });
    window.__ow_dispatchShieldUpdate = jest.fn();
    selectCardTarget.mockResolvedValue({ cardId: '2reaper', rowId: '2f' });

    await onUltimate({ playerHeroId: '1brigitte', rowId: '1f' });

    expect(window.__ow_dispatchShieldUpdate).not.toHaveBeenCalled();
    expect(window.__ow_appendCardEffect).toHaveBeenCalledWith(
        '2reaper',
        expect.objectContaining({ id: 'shield-bash' })
    );
});
