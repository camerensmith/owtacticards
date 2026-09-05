import { onUltimate } from './reinhardt';
import { dealDamage } from '../engine/damageBus';

jest.mock('../../assets/imageImports', () => ({ playAudioByKey: jest.fn() }));
jest.mock('../engine/damageBus', () => ({ dealDamage: jest.fn() }));
jest.mock('../engine/targeting', () => ({ selectCardTarget: jest.fn() }));
jest.mock('../engine/targetingBus', () => ({
    showMessage: jest.fn(),
    clearMessage: jest.fn(),
}));

let rows;
let synergyCalls;

beforeEach(() => {
    jest.clearAllMocks();
    synergyCalls = [];
    rows = {
        '2f': { cardIds: ['2ana', '2reaper'], synergy: 3 },
        '2m': { cardIds: ['2mercy', '2mei'], synergy: 2 },
        '2b': { cardIds: ['2bastion', '2hanzo'], synergy: 1 },
    };
    window.__ow_getRow = (id) => rows[id];
    window.__ow_getCard = () => ({ health: 3 });
    window.__ow_updateSynergy = jest.fn((rowId, delta) => {
        synergyCalls.push({ rowId, delta });
        rows[rowId].synergy += delta;
    });
    // The AI branch picks its own column, so no click is needed.
    window.__ow_isAITurn = true;
    window.__ow_aiTriggering = false;
});

afterEach(() => {
    delete window.__ow_isAITurn;
});

/*
 * Earthshatter reads "2 damage to all enemies in target column and remove 1
 * synergy from all enemy rows" — the damage is columnar, the synergy drain is
 * not. Synergy is only ever held per row, so there is nothing per-column to
 * take.
 */
describe('Earthshatter', () => {
    test('takes one synergy from every enemy row', async () => {
        await onUltimate({ playerHeroId: '1reinhardt', rowId: '1f', cost: 3 });

        expect(synergyCalls).toHaveLength(3);
        expect(synergyCalls.every((c) => c.delta === -1)).toBe(true);
        expect(synergyCalls.map((c) => c.rowId).sort()).toEqual(['2b', '2f', '2m']);
    });

    test('leaves a row that has none rather than going negative', async () => {
        rows['2b'].synergy = 0;

        await onUltimate({ playerHeroId: '1reinhardt', rowId: '1f', cost: 3 });

        expect(synergyCalls.map((c) => c.rowId).sort()).toEqual(['2f', '2m']);
        expect(rows['2b'].synergy).toBe(0);
    });

    test('drains regardless of who is standing in the row', async () => {
        rows['2m'].cardIds = [];

        await onUltimate({ playerHeroId: '1reinhardt', rowId: '1f', cost: 3 });

        expect(synergyCalls.some((c) => c.rowId === '2m')).toBe(true);
    });

    test('damages down one column, not the whole board', async () => {
        await onUltimate({ playerHeroId: '1reinhardt', rowId: '1f', cost: 3 });

        // One per enemy row at most: three rows, one column.
        expect(dealDamage.mock.calls.length).toBeLessThanOrEqual(3);
        for (const call of dealDamage.mock.calls) {
            expect(call[2]).toBe(2);
        }
    });

    test('only touches enemy rows', async () => {
        await onUltimate({ playerHeroId: '1reinhardt', rowId: '1f', cost: 3 });

        expect(synergyCalls.every((c) => c.rowId.startsWith('2'))).toBe(true);
    });
});
