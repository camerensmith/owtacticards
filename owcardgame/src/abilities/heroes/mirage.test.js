import { popMirage, popMirageIfEnemyPicked } from './mirage';
import effectsBus, { Effects } from '../engine/effectsBus';

jest.mock('../../assets/imageImports', () => ({ playAudioByKey: jest.fn() }));

jest.mock('../engine/effectsBus', () => {
    const Effects = {
        smoke: (ids) => ({ type: 'fx:smoke', payload: { cardIds: ids } }),
    };
    return { __esModule: true, default: { publish: jest.fn() }, Effects };
});

jest.mock('../engine/targetingBus', () => ({
    showMessage: jest.fn(),
    clearMessage: jest.fn(),
}));

function setup({ mirageHealth = 3 } = {}) {
    const cards = {
        '1mirage': { id: 'mirage', health: mirageHealth, effects: [] },
        '2reaper': { id: 'reaper', health: 3, effects: [] },
        '2turret': { id: 'turret', turret: true, health: 3, effects: [] },
    };
    window.__ow_getCard = (id) => cards[id];
    window.__ow_setCardHealth = jest.fn((id, hp) => { cards[id].health = hp; });
    window.__ow_appendCardEffect = jest.fn((id, effect) => {
        cards[id].effects = [...(cards[id].effects || []), effect];
    });
    window.__ow_removeCardEffect = jest.fn((id, effectId) => {
        cards[id].effects = (cards[id].effects || []).filter((e) => e.id !== effectId);
    });
    window.__ow_abilitySourceCardId = null;
    effectsBus.publish.mockClear();
    return cards;
}

test('enemy hero pop kills, puffs, and Disorients', () => {
    setup();
    const result = popMirage({ mirageId: '1mirage', sourceCardId: '2reaper' });
    expect(result).toEqual({ popped: true, disoriented: true });
    expect(window.__ow_setCardHealth).toHaveBeenCalledWith('1mirage', 0, true);
    expect(effectsBus.publish).toHaveBeenCalledWith(Effects.smoke(['1mirage']));
    expect(window.__ow_appendCardEffect).toHaveBeenCalledWith(
        '2reaper',
        expect.objectContaining({ id: 'disorient', victimPlayerNum: 2, seenVictimNext: false }),
    );
});

test('turret pop kills without Disorient', () => {
    setup();
    const result = popMirage({ mirageId: '1mirage', sourceCardId: '2turret' });
    expect(result).toEqual({ popped: true, disoriented: false });
    expect(window.__ow_appendCardEffect).not.toHaveBeenCalled();
});

test('already-dead illusion does not puff again', () => {
    setup({ mirageHealth: 0 });
    expect(popMirage({ mirageId: '1mirage', sourceCardId: '2reaper' }))
        .toEqual({ popped: false, disoriented: false });
    expect(effectsBus.publish).not.toHaveBeenCalled();
});

test('enemy pick pops the illusion', () => {
    setup();
    window.__ow_getPlayerTurn = () => 2;
    window.__ow_abilitySourceCardId = '2reaper';
    const result = popMirageIfEnemyPicked('1mirage');
    expect(result).toEqual({ popped: true, disoriented: true });
    expect(window.__ow_appendCardEffect).toHaveBeenCalledWith(
        '2reaper',
        expect.objectContaining({ id: 'disorient' }),
    );
});

test('own-side pick does not pop', () => {
    setup();
    window.__ow_getPlayerTurn = () => 1;
    expect(popMirageIfEnemyPicked('1mirage')).toEqual({ popped: false, disoriented: false });
    expect(window.__ow_setCardHealth).not.toHaveBeenCalled();
});
