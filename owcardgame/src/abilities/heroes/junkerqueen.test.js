import { onEnter, processWoundsAtTurnStart } from './junkerqueen';
import { dealDamage } from '../engine/damageBus';

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

function setupBoard() {
    const ana = { id: 'ana', health: 3, shield: 0, effects: [] };
    const jq = { id: 'junkerqueen', health: 3, effects: [] };
    const cards = { '2ana': ana, '1junkerqueen': jq };

    window.__ow_getRow = (id) => ({
        cardIds: id === '2f' ? ['2ana'] : [],
        allyEffects: [],
    });
    window.__ow_getCard = (id) => cards[id];
    window.__ow_appendCardEffect = (id, effect) => {
        if (!cards[id]) return;
        if (!Array.isArray(cards[id].effects)) cards[id].effects = [];
        cards[id].effects.push(effect);
    };
    window.__ow_removeCardEffect = (id, effectId) => {
        if (!cards[id] || !Array.isArray(cards[id].effects)) return;
        cards[id].effects = cards[id].effects.filter((e) => e.id !== effectId);
    };

    return { ana, jq };
}

test('Jagged Blade wound lasts two of the wounded player turns then expires', () => {
    const { ana } = setupBoard();
    dealDamage.mockClear();

    onEnter({ playerHeroId: '1junkerqueen', rowId: '1f' });

    expect(ana.effects.some((e) => e.id === 'jq-wound')).toBe(true);

    processWoundsAtTurnStart(2);
    expect(dealDamage).toHaveBeenCalledTimes(1);
    // skipProjectileFx keeps the damage bus from firing a beam out of Junker
    // Queen: a wound bleeds on the victim rather than being shot at them.
    expect(dealDamage).toHaveBeenLastCalledWith(
        '2ana', '2f', 1, true, '1junkerqueen', false, { skipProjectileFx: true },
    );
    expect(ana.effects.some((e) => e.id === 'jq-wound')).toBe(true);

    processWoundsAtTurnStart(2);
    expect(dealDamage).toHaveBeenCalledTimes(2);
    expect(ana.effects.some((e) => e.id === 'jq-wound')).toBe(false);

    processWoundsAtTurnStart(2);
    expect(dealDamage).toHaveBeenCalledTimes(2);
});
