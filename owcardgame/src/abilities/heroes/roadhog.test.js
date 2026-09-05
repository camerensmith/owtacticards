import { onEnter } from './roadhog';
import { dealDamage } from '../engine/damageBus';
import { selectCardTarget } from '../engine/targeting';

jest.mock('../../assets/imageImports', () => ({
    playAudioByKey: jest.fn(),
}));

jest.mock('../engine/targeting', () => ({
    selectCardTarget: jest.fn(),
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
        chainHook: (...args) => ({ type: 'fx:chainHook', payload: args }),
        showDamage: (...args) => ({ type: 'fx:showDamage', payload: args }),
    };
    return {
        __esModule: true,
        default: { publish: jest.fn() },
        Effects,
    };
});

function setupBoard({ anaHealth = 3 } = {}) {
    const cards = {
        '2ana': { id: 'ana', health: anaHealth, shield: 0, armor: 0 },
        '1roadhog': { id: 'roadhog', health: 5, armor: 0 },
    };
    window.__ow_getRow = (id) => ({
        cardIds: id === '2m' ? ['2ana'] : id === '1f' ? ['1roadhog'] : [],
    });
    window.__ow_getCard = (id) => cards[id];
    window.__ow_isRowFull = () => false;
    window.__ow_moveCardToRow = jest.fn();
    window.__ow_dispatchArmorUpdate = jest.fn((id, armor) => {
        if (cards[id]) cards[id].armor = armor;
    });
    window.__ow_aiTriggering = false;
    window.__ow_isAITurn = false;
    dealDamage.mockImplementation((cardId, _row, amount) => {
        const card = cards[cardId];
        if (card) card.health = Math.max(0, (card.health || 0) - amount);
    });
    return cards;
}

test('Chain Hook deals 2 damage that ignores shields and armor', async () => {
    setupBoard();
    selectCardTarget.mockResolvedValue({ cardId: '2ana', rowId: '2m' });

    await onEnter({ playerHeroId: '1roadhog', rowId: '1f' });

    expect(dealDamage).toHaveBeenCalledWith(
        '2ana', '2f', 2, true, '1roadhog', false, { skipProjectileFx: true },
    );
});

test('Chain Hook gives Roadhog +1 armor when the target survives', async () => {
    setupBoard({ anaHealth: 3 });
    selectCardTarget.mockResolvedValue({ cardId: '2ana', rowId: '2m' });

    await onEnter({ playerHeroId: '1roadhog', rowId: '1f' });

    expect(window.__ow_dispatchArmorUpdate).toHaveBeenCalledWith('1roadhog', 1);
});

test('Chain Hook grants no armor when the target dies', async () => {
    setupBoard({ anaHealth: 2 });
    selectCardTarget.mockResolvedValue({ cardId: '2ana', rowId: '2m' });

    await onEnter({ playerHeroId: '1roadhog', rowId: '1f' });

    expect(window.__ow_dispatchArmorUpdate).not.toHaveBeenCalled();
});
