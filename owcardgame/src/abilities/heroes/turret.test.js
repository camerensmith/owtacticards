import { processTurretDamage } from './turret';
import { dealDamage } from '../engine/damageBus';
import effectsBus from '../engine/effectsBus';
import { TURRET_BURST } from '../../presentation/pixi/fxConfig';

jest.mock('../../assets/imageImports', () => ({ playAudioByKey: jest.fn() }));
jest.mock('../engine/damageBus', () => ({ dealDamage: jest.fn() }));
jest.mock('../engine/targetingBus', () => ({
    showMessage: jest.fn(),
    clearMessage: jest.fn(),
}));

/** Turret in 1f, three living enemies opposite it. */
function boardState({ forgeHammer = false } = {}) {
    const turret = {
        id: 'turret',
        health: 2,
        effects: forgeHammer ? [{ id: 'forge-hammer', hero: 'torbjorn' }] : [],
    };
    return {
        rows: {
            '1f': { cardIds: ['1turret'] },
            '1m': { cardIds: [] },
            '1b': { cardIds: [] },
            '2f': { cardIds: ['2ana', '2reaper', '2mercy'] },
            '2m': { cardIds: [] },
            '2b': { cardIds: [] },
        },
        playerCards: {
            player1cards: { cards: { '1turret': turret } },
            player2cards: {
                cards: {
                    '2ana': { id: 'ana', health: 3 },
                    '2reaper': { id: 'reaper', health: 4 },
                    '2mercy': { id: 'mercy', health: 3 },
                },
            },
        },
    };
}

beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(effectsBus, 'publish').mockImplementation(() => {});
});

afterEach(() => {
    effectsBus.publish.mockRestore?.();
});

const bursts = () => effectsBus.publish.mock.calls
    .map(([event]) => event)
    .filter((event) => event?.type === 'fx:bullet');

describe('Turret fire', () => {
    test('strikes exactly one enemy', () => {
        processTurretDamage(boardState(), 1);

        expect(dealDamage).toHaveBeenCalledTimes(1);
        expect(dealDamage.mock.calls[0][2]).toBe(1);
    });

    // Forge Hammer makes the burst hit harder, not wider.
    test('still strikes only one enemy under Forge Hammer', () => {
        processTurretDamage(boardState({ forgeHammer: true }), 1);

        expect(dealDamage).toHaveBeenCalledTimes(1);
        expect(dealDamage.mock.calls[0][2]).toBe(2);
    });

    test('fires a burst instead of a beam', () => {
        processTurretDamage(boardState(), 1);

        expect(dealDamage.mock.calls[0][6]).toEqual({ skipProjectileFx: true });
        expect(bursts()).toHaveLength(1);
    });

    test('the burst is four rounds, spaced for an emplaced gun', () => {
        processTurretDamage(boardState(), 1);

        const [burst] = bursts();
        expect(burst.payload.rounds).toBe(4);
        expect(burst.payload.cfg.burstGapMs).toBe(90);
    });

    test('the burst goes from the turret to the one it shoots', () => {
        processTurretDamage(boardState(), 1);

        const [burst] = bursts();
        expect(burst.payload.fromCardId).toBe('1turret');
        expect(burst.payload.toCardId).toBe(dealDamage.mock.calls[0][0]);
    });

    test('holds fire when the opposite row is empty', () => {
        const state = boardState();
        state.rows['2f'].cardIds = [];

        processTurretDamage(state, 1);

        expect(dealDamage).not.toHaveBeenCalled();
        expect(bursts()).toHaveLength(0);
    });

    test('holds fire when everyone opposite is already dead', () => {
        const state = boardState();
        Object.values(state.playerCards.player2cards.cards).forEach((c) => { c.health = 0; });

        processTurretDamage(state, 1);

        expect(dealDamage).not.toHaveBeenCalled();
    });

    test('a destroyed turret does not fire', () => {
        const state = boardState();
        state.playerCards.player1cards.cards['1turret'].health = 0;

        processTurretDamage(state, 1);

        expect(dealDamage).not.toHaveBeenCalled();
    });
});

test('the turret burst is slower and tighter than a pistol burst', () => {
    expect(TURRET_BURST.burstGapMs).toBeGreaterThan(65);
    expect(TURRET_BURST.spread).toBeLessThan(5);
});
