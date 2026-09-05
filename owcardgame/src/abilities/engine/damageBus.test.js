import { dealDamage, subscribe } from './damageBus';
import effectsBus from './effectsBus';
import { popMirage } from '../heroes/mirage';

jest.mock('../heroes/mirage', () => ({
    popMirage: jest.fn(() => ({ popped: true, disoriented: true })),
    popMirageIfEnemyPicked: jest.fn(),
}));

function setupTarget({ allyEffects = [], card = { id: 'ana', health: 3, effects: [] } } = {}) {
    window.__ow_getRow = () => ({
        cardIds: ['2ana'],
        allyEffects,
        enemyEffects: [],
        synergy: 0,
    });
    window.__ow_getCard = () => card;
    window.__ow_isSlotInvulnerable = undefined;
    window.__ow_getReinhardtFunctions = undefined;
}

test('ignoreShields does not let Orisa reduce Chain Hook damage', () => {
    setupTarget({
        allyEffects: [{ id: 'orisa-barrier', type: 'damageReduction', value: 1 }],
    });
    const events = [];
    const unsub = subscribe((event) => events.push(event));
    dealDamage('2ana', '2f', 2, true, '1roadhog');
    unsub();
    expect(events[0].amount).toBe(2);
    expect(events[0].ignoreShields).toBe(true);
});

test('Orisa still reduces damage that does not ignore shields', () => {
    setupTarget({
        allyEffects: [{ id: 'orisa-barrier', type: 'damageReduction', value: 1 }],
    });
    const events = [];
    const unsub = subscribe((event) => events.push(event));
    dealDamage('2ana', '2f', 2, false, '1roadhog');
    unsub();
    expect(events[0].amount).toBe(1);
});

test('skipProjectileFx does not fire a beam', () => {
    setupTarget();
    const fx = [];
    const unsubFx = effectsBus.subscribe((event) => fx.push(event));
    dealDamage('2ana', '2f', 2, false, '1junkrat', false, { skipProjectileFx: true });
    unsubFx();
    expect(fx.some((event) => event.type === 'fx:beam')).toBe(false);
    expect(fx.some((event) => event.type === 'fx:impact')).toBe(false);
});

test('ignoreShields does not let Reinhardt barrier absorb Chain Hook damage', () => {
    setupTarget({
        card: {
            id: 'reinhardt',
            health: 5,
            effects: [{ id: 'barrier-field', type: 'barrier', absorbing: true }],
        },
    });
    window.__ow_getCard = (id) => (
        id === '2reinhardt'
            ? {
                id: 'reinhardt',
                health: 5,
                effects: [{ id: 'barrier-field', type: 'barrier', absorbing: true }],
            }
            : { id: 'ana', health: 3, effects: [] }
    );
    window.__ow_getRow = (id) => ({
        cardIds: id === '2f' ? ['2reinhardt', '2ana'] : [],
        allyEffects: [],
        enemyEffects: [],
        synergy: 0,
    });
    window.__ow_getReinhardtFunctions = () => ({
        shouldAbsorbDamage: () => true,
        absorbDamage: () => 2,
    });
    const events = [];
    const unsub = subscribe((event) => events.push(event));
    dealDamage('2ana', '2f', 2, true, '1roadhog');
    unsub();
    expect(events[0].amount).toBe(2);
});

test('1 damage to an enemy mirage pops it', () => {
    popMirage.mockClear();
    window.__ow_getCard = (id) => (id === '1mirage'
        ? { id: 'mirage', health: 3, effects: [] }
        : { id: 'reaper', health: 3, effects: [] });
    window.__ow_getRow = () => ({ cardIds: ['1mirage'], allyEffects: [], enemyEffects: [], synergy: 0 });
    window.__ow_isSlotInvulnerable = undefined;
    window.__ow_getReinhardtFunctions = undefined;
    dealDamage('1mirage', '1m', 1, false, '2reaper');
    expect(popMirage).toHaveBeenCalledWith({ mirageId: '1mirage', sourceCardId: '2reaper' });
});

test('null source still pops a mirage', () => {
    popMirage.mockClear();
    window.__ow_getCard = () => ({ id: 'mirage', health: 3, effects: [] });
    window.__ow_getRow = () => ({ cardIds: ['1mirage'], allyEffects: [], enemyEffects: [], synergy: 0 });
    window.__ow_isSlotInvulnerable = undefined;
    window.__ow_getReinhardtFunctions = undefined;
    dealDamage('1mirage', '1m', 1, false, null);
    expect(popMirage).toHaveBeenCalledWith({ mirageId: '1mirage', sourceCardId: null });
});
