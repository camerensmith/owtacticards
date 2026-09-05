import {
    BLIZZARD_SURCHARGE,
    CRYO_MULTIPLIER,
    blizzardToken,
    findBlizzardRow,
    isBlizzardToken,
    isRowFrozen,
    rowUltimateCost,
} from './blizzard';

const blizzard = blizzardToken({ sourceCardId: '1mei', sourceRowId: '1m' });
const frozen = blizzardToken({ sourceCardId: '1mei', sourceRowId: '1m', frozen: true });
const bobHuman = { id: 'bob-token', type: 'ultCost', value: 2 };
const bobAi = { id: 'bob-row-suppression', type: 'ultimateCostModifier', value: 2 };

describe('The Blizzard mark', () => {
    test('both states are the same token, so there is one thing to clean up', () => {
        expect(blizzard.id).toBe(frozen.id);
        expect(isBlizzardToken(blizzard)).toBe(true);
        expect(isBlizzardToken(frozen)).toBe(true);
        expect(isBlizzardToken(bobAi)).toBe(false);
    });

    test('says which terms it is on', () => {
        expect(blizzard.frozen).toBe(false);
        expect(frozen.frozen).toBe(true);
        expect(blizzard.tooltip).toMatch(/\+1/);
        expect(frozen.tooltip).toMatch(/double/i);
    });

    test('is found on whichever row carries it', () => {
        const rows = { '2f': {}, '2m': { enemyEffects: [blizzard] }, '2b': {} };
        const getRow = (id) => rows[id];
        expect(findBlizzardRow(getRow, ['2f', '2m', '2b'])).toBe('2m');
        expect(isRowFrozen(getRow, '2m')).toBe(false);
    });

    test('reports nothing when Mei has not marked a row', () => {
        const getRow = () => ({ enemyEffects: [bobHuman] });
        expect(findBlizzardRow(getRow, ['2f', '2m', '2b'])).toBeNull();
        expect(isRowFrozen(getRow, '2f')).toBe(false);
    });

    test('reports a frozen row once Cryo Freeze has landed', () => {
        const getRow = () => ({ enemyEffects: [frozen] });
        expect(isRowFrozen(getRow, '2m')).toBe(true);
    });
});

describe('What an ultimate costs from a marked row', () => {
    test('an unmarked row costs what it says on the card', () => {
        expect(rowUltimateCost(3, [])).toBe(3);
        expect(rowUltimateCost(3)).toBe(3);
    });

    test('Blizzard adds one', () => {
        expect(rowUltimateCost(3, [blizzard])).toBe(3 + BLIZZARD_SURCHARGE);
    });

    test('Cryo Freeze doubles instead of adding', () => {
        expect(rowUltimateCost(3, [frozen])).toBe(3 * CRYO_MULTIPLIER);
    });

    // BOB lands first so a frozen row doubles the whole bill, not just the
    // printed cost — the surcharge is part of what freezes over.
    test('BOB stacks under Mei rather than beside her', () => {
        expect(rowUltimateCost(3, [bobHuman, blizzard])).toBe(3 + 2 + 1);
        expect(rowUltimateCost(3, [bobHuman, frozen])).toBe((3 + 2) * 2);
    });

    test('the order effects were placed in does not change the bill', () => {
        expect(rowUltimateCost(3, [frozen, bobHuman]))
            .toBe(rowUltimateCost(3, [bobHuman, frozen]));
    });

    /**
     * BOB writes his surcharge under two shapes: `ultCost` from the human path
     * and `ultimateCostModifier` from the AI one. The old reader keyed on the
     * type, so an AI BOB fell through Mei's branch and *doubled* the cost while
     * a human BOB added 2 — against what his own tooltip promises.
     */
    test('BOB adds the same whether he was placed by a human or the AI', () => {
        expect(rowUltimateCost(3, [bobAi])).toBe(5);
        expect(rowUltimateCost(3, [bobAi])).toBe(rowUltimateCost(3, [bobHuman]));
    });

    test('several surcharges all land', () => {
        expect(rowUltimateCost(2, [bobHuman, bobAi])).toBe(2 + 2 + 2);
    });

    test('a nonsense base cost does not produce a negative bill', () => {
        expect(rowUltimateCost(-5, [blizzard])).toBe(1);
        expect(rowUltimateCost(undefined, [frozen])).toBe(0);
    });

    test('effects with no value are ignored rather than counted as NaN', () => {
        expect(rowUltimateCost(3, [{ id: 'x', type: 'ultCost' }])).toBe(3);
    });
});
