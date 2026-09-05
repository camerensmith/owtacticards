import { onDeath } from './rajah';

jest.mock('../../assets/imageImports', () => ({ playAudioByKey: jest.fn() }));
jest.mock('../engine/targetingBus', () => ({
    showMessage: jest.fn(),
    clearMessage: jest.fn(),
}));
jest.mock('../engine/effectsBus', () => ({
    __esModule: true,
    default: { publish: jest.fn() },
    Effects: { smoke: jest.fn(), showDeath: jest.fn() },
}));

let cards;

beforeEach(() => {
    jest.clearAllMocks();
    cards = {
        '1rajah': { id: 'rajah', health: 0 },
        '1mirage': { id: 'mirage', health: 3 },
        '2reaper': { id: 'reaper', health: 4 },
    };
    window.__ow_getCard = (id) => cards[id];
    window.__ow_setCardHealth = jest.fn((id, hp) => { cards[id].health = hp; });
    window.__ow_appendCardEffect = jest.fn();
    window.__ow_removeCardEffect = jest.fn();
    window.__ow_getPlayerTurn = () => 2;
    window.__ow_abilitySourceCardId = null;
});

/*
 * The illusion reads as a 3-health hero, but its health was never what kept it
 * on the board — Rajah was. It goes with him.
 */
describe('when the real Rajah dies', () => {
    test('his illusion dies too', () => {
        onDeath({ playerHeroId: '1rajah' });

        expect(window.__ow_setCardHealth).toHaveBeenCalledWith('1mirage', 0, true);
        expect(cards['1mirage'].health).toBe(0);
    });

    test('does nothing when there is no illusion out', () => {
        delete cards['1mirage'];

        expect(() => onDeath({ playerHeroId: '1rajah' })).not.toThrow();
        expect(window.__ow_setCardHealth).not.toHaveBeenCalled();
    });

    test('does not touch an illusion that is already gone', () => {
        cards['1mirage'].health = 0;

        onDeath({ playerHeroId: '1rajah' });

        expect(window.__ow_setCardHealth).not.toHaveBeenCalled();
    });

    /*
     * Disorient is the penalty for picking the illusion. Nobody picked it here,
     * so whoever killed Rajah must not be punished for it — including when an
     * enemy ability is mid-resolve and has left its own card id on the bridge.
     */
    test('does not disorient the enemy who killed him', () => {
        window.__ow_abilitySourceCardId = '2reaper';

        onDeath({ playerHeroId: '1rajah' });

        expect(cards['1mirage'].health).toBe(0);
        expect(window.__ow_appendCardEffect).not.toHaveBeenCalled();
    });

    test('reads the owner from the dying card', () => {
        cards['2rajah'] = { id: 'rajah', health: 0 };
        cards['2mirage'] = { id: 'mirage', health: 3 };

        onDeath({ playerHeroId: '2rajah' });

        expect(window.__ow_setCardHealth).toHaveBeenCalledWith('2mirage', 0, true);
        expect(cards['1mirage'].health).toBe(3);
    });
});
