import { dealDamage, subscribe } from './damageBus';

jest.mock('../heroes/mirage', () => ({ popMirage: jest.fn() }));
jest.mock('./effectsBus', () => ({
    __esModule: true,
    default: { publish: jest.fn() },
    Effects: { beam: jest.fn(), impact: jest.fn(), showDamage: jest.fn() },
}));

const { popMirage } = require('../heroes/mirage');

let cards;
let damageEvents;
let unsubscribe;

// Health is applied by the bus's subscribers, not by dealDamage itself, so the
// published event is what says whether damage was actually dealt.
beforeEach(() => {
    jest.clearAllMocks();
    damageEvents = [];
    unsubscribe = subscribe((event) => {
        if (event?.type === 'damage') damageEvents.push(event);
    });
    cards = {
        '2mirage': { id: 'mirage', health: 3, shield: 0, effects: [] },
        '2ana': { id: 'ana', health: 3, shield: 0, effects: [] },
    };
    window.__ow_getCard = (id) => cards[id];
    window.__ow_getRow = () => ({ cardIds: ['2mirage', '2ana'] });
    window.__ow_setCardHealth = jest.fn();
    window.__ow_getMaxHealth = () => 3;
    window.__ow_isSlotInvulnerable = undefined;
});

afterEach(() => {
    unsubscribe?.();
});

/*
 * The illusion shows 3 health to pass for a real hero, but nothing is holding
 * it up except not having been touched. The check used to sit at the bottom of
 * the damage pipeline behind `finalAmount > 0`, so a hit blocked down to
 * nothing left the decoy standing — which told the attacker it was the real
 * Rajah.
 */
describe('anything aimed at the illusion destroys it', () => {
    test('a plain hit pops it', () => {
        dealDamage('2mirage', '2f', 1, false, '1reaper');

        expect(popMirage).toHaveBeenCalledWith({
            mirageId: '2mirage',
            sourceCardId: '1reaper',
        });
    });

    test('a hit that lands for zero still pops it', () => {
        dealDamage('2mirage', '2f', 0, false, '1reaper');

        expect(popMirage).toHaveBeenCalled();
    });

    test('a shield big enough to eat the hit does not save it', () => {
        cards['2mirage'].shield = 10;

        dealDamage('2mirage', '2f', 2, false, '1reaper');

        expect(popMirage).toHaveBeenCalled();
    });

    test('it pops with no attacker named', () => {
        dealDamage('2mirage', '2f', 1);

        expect(popMirage).toHaveBeenCalledWith({
            mirageId: '2mirage',
            sourceCardId: null,
        });
    });

    // Nothing is left to take damage, so the pipeline stops at the pop rather
    // than also chipping health off a card that is already gone.
    test('no damage is dealt on top of the pop', () => {
        dealDamage('2mirage', '2f', 3, false, '1reaper');

        expect(damageEvents).toEqual([]);
    });

    test('a real hero takes its damage as normal', () => {
        dealDamage('2ana', '2f', 1, false, '1reaper');

        expect(popMirage).not.toHaveBeenCalled();
        expect(damageEvents).toHaveLength(1);
        expect(damageEvents[0]).toMatchObject({ targetCardId: '2ana', amount: 1 });
    });
});
