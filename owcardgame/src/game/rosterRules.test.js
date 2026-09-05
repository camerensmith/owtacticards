import {
    lockOnDamage,
    unusedSynergy,
    overkillAmount,
    spreadOverkillRandom,
    randomIntInclusive,
    pickRandomIds,
    alliesInFrontPositions,
    pushBackPosition,
    nearestOtherIds,
    chainswordApplies,
    chainswordCycloId,
    rowsWithSpace,
    seekerHitsEntering,
    listOpenBoardSlots,
    pickRandomBoardSlot,
    placeCardOnRow,
    disguiseMirageForAi,
    getCardForAi,
    turbojackOutcome,
    planPrimalRage,
} from './rosterRules';

test('lockOnDamage uses the target power', () => {
    expect(lockOnDamage(3)).toBe(3);
    expect(lockOnDamage(0)).toBe(0);
});

test('unusedSynergy sums three rows', () => {
    expect(unusedSynergy(2, 0, 1)).toBe(3);
});

test('overkillAmount', () => {
    expect(overkillAmount(5, 2)).toBe(3);
    expect(overkillAmount(1, 4)).toBe(0);
});

test('spreadOverkillRandom assigns exactly N points', () => {
    const rng = (() => {
        let i = 0;
        return () => {
            const vals = [0, 0.9, 0.4];
            return vals[i++ % 3];
        };
    })();
    const hits = spreadOverkillRandom(3, ['a', 'b'], rng);
    expect(Object.values(hits).reduce((s, n) => s + n, 0)).toBe(3);
});

test('randomIntInclusive is in range', () => {
    expect(randomIntInclusive(0, 3, () => 0)).toBe(0);
    expect(randomIntInclusive(0, 3, () => 0.999)).toBe(3);
});

test('pickRandomIds unique and capped', () => {
    const ids = pickRandomIds(['a', 'b', 'c'], 2, () => 0);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(pickRandomIds(['a'], 4, () => 0)).toEqual(['a']);
});

test('alliesInFrontPositions', () => {
    expect(alliesInFrontPositions('b')).toEqual(['m', 'f']);
    expect(alliesInFrontPositions('m')).toEqual(['f']);
    expect(alliesInFrontPositions('f')).toEqual([]);
});

test('pushBackPosition', () => {
    expect(pushBackPosition('f')).toBe('m');
    expect(pushBackPosition('m')).toBe('b');
    expect(pushBackPosition('b')).toBe('b');
});

test('nearestOtherIds', () => {
    expect(nearestOtherIds(['a', 'b', 'c', 'd'], 3, 2)).toEqual(['c', 'b']);
    expect(nearestOtherIds(['a'], 0, 2)).toEqual([]);
});

test('chainswordApplies', () => {
    expect(chainswordApplies({ attackerPlayerNum: 2, defenderRowPlayerNum: 1, sourceCardId: '2reaper' })).toBe(true);
    expect(chainswordApplies({ attackerPlayerNum: 2, defenderRowPlayerNum: 1, sourceCardId: null })).toBe(false);
    expect(chainswordApplies({ attackerPlayerNum: 1, defenderRowPlayerNum: 1, sourceCardId: '1ana' })).toBe(false);
});

test('chainswordCycloId finds Cyclo on the row even if that attack killed them', () => {
    const getCard = (id) => ({ health: id === '1cyclo' ? 0 : 3 });
    expect(chainswordCycloId(['1ana', '1cyclo'], getCard)).toBe('1cyclo');
    expect(chainswordCycloId(['2cyclo'], getCard)).toBe('2cyclo');
    expect(chainswordCycloId(['1ana', '1reaper'], getCard)).toBe(null);
});

test('rowsWithSpace', () => {
    expect(rowsWithSpace([
        { id: '1f', cardIds: ['a', 'b', 'c', 'd'] },
        { id: '1m', cardIds: ['e'] },
    ])).toEqual(['1m']);
});

test('seekerHitsEntering', () => {
    expect(seekerHitsEntering({ seekerOwnerNum: 1, enteringPlayerNum: 2 })).toBe(true);
    expect(seekerHitsEntering({ seekerOwnerNum: 1, enteringPlayerNum: 1 })).toBe(false);
});

test('listOpenBoardSlots includes every insert index on rows with space', () => {
    const slots = listOpenBoardSlots([
        { id: '1f', cardIds: ['a', 'b', 'c', 'd'] },
        { id: '1m', cardIds: ['e'] },
        { id: '1b', cardIds: [] },
    ]);
    expect(slots).toEqual([
        { rowId: '1m', insertIndex: 0 },
        { rowId: '1m', insertIndex: 1 },
        { rowId: '1b', insertIndex: 0 },
    ]);
});

test('pickRandomBoardSlot returns null when every row is full', () => {
    expect(pickRandomBoardSlot([
        { id: '1f', cardIds: ['a', 'b', 'c', 'd'] },
        { id: '1m', cardIds: ['e', 'f', 'g', 'h'] },
        { id: '1b', cardIds: ['i', 'j', 'k', 'l'] },
    ])).toBe(null);
});

test('pickRandomBoardSlot uses rng to pick among open slots', () => {
    const rows = [
        { id: '1f', cardIds: ['a'] },
        { id: '1m', cardIds: [] },
    ];
    expect(pickRandomBoardSlot(rows, () => 0)).toEqual({ rowId: '1f', insertIndex: 0 });
    expect(pickRandomBoardSlot(rows, () => 0.99)).toEqual({ rowId: '1m', insertIndex: 0 });
});

test('placeCardOnRow inserts at index and refuses a full row', () => {
    expect(placeCardOnRow({ cardIds: ['a', 'b'] }, 'x', 1)).toEqual(['a', 'x', 'b']);
    expect(placeCardOnRow({ cardIds: ['a', 'b', 'c', 'd'] }, 'x', 0)).toBe(null);
});

test('disguiseMirageForAi hides illusion identity and 1 HP from the AI', () => {
    const seen = disguiseMirageForAi({
        id: 'mirage',
        name: 'Mirage',
        health: 1,
        maxHealth: 1,
        special: true,
        power: { f: 1, m: 2, b: 1 },
        synergy: { f: 0, m: 0, b: 0 },
        playerHeroId: '1mirage',
        role: 'defense',
    });
    expect(seen.id).toBe('rajah');
    expect(seen.name).toBe('Rajah');
    expect(seen.health).toBe(3);
    expect(seen.maxHealth).toBe(3);
    expect(seen.special).toBe(false);
    expect(seen.synergy).toEqual({ f: 2, m: 1, b: 2 });
    expect(seen.playerHeroId).toBe('1mirage');
});

test('disguiseMirageForAi leaves other cards unchanged', () => {
    const ana = { id: 'ana', health: 2, name: 'Ana' };
    expect(disguiseMirageForAi(ana)).toBe(ana);
});

test('getCardForAi disguises an enemy mirage but not the AI own illusion', () => {
    const cards = {
        '1mirage': { id: 'mirage', health: 1, playerHeroId: '1mirage', name: 'Rajah' },
        '2mirage': { id: 'mirage', health: 1, playerHeroId: '2mirage', name: 'Rajah' },
    };
    const getCard = (id) => cards[id];
    expect(getCardForAi('1mirage', getCard).id).toBe('rajah');
    expect(getCardForAi('1mirage', getCard).health).toBe(3);
    expect(getCardForAi('2mirage', getCard).id).toBe('mirage');
    expect(getCardForAi('2mirage', getCard).health).toBe(1);
});

test('turbojackOutcome plays audio only when the ram resolves on an enemy', () => {
    const miss = turbojackOutcome({
        sourceCardId: '1cyclo',
        targetCardId: null,
        targetHealth: 4,
        cycloRowId: '1m',
        frontRowId: '1f',
        frontHasSpace: true,
    });
    expect(miss.playAudio).toBe(false);
    expect(miss.resolved).toBe(false);

    const hit = turbojackOutcome({
        sourceCardId: '1cyclo',
        targetCardId: '2reaper',
        targetHealth: 4,
        cycloRowId: '1m',
        frontRowId: '1f',
        frontHasSpace: true,
    });
    expect(hit.playAudio).toBe(true);
    expect(hit.resolved).toBe(true);
    expect(hit.reshuffleTarget).toBe(true);
    expect(hit.healthAfter).toBe(1);
    expect(hit.moveCycloToFront).toBe(true);
});

test('turbojackOutcome does not reshuffle Cyclo or a killed target', () => {
    const self = turbojackOutcome({
        sourceCardId: '1cyclo',
        targetCardId: '1cyclo',
        targetHealth: 4,
        cycloRowId: '1m',
        frontRowId: '1f',
        frontHasSpace: true,
    });
    expect(self.resolved).toBe(false);
    expect(self.reshuffleTarget).toBe(false);
    expect(self.playAudio).toBe(false);

    const kill = turbojackOutcome({
        sourceCardId: '1cyclo',
        targetCardId: '2reaper',
        targetHealth: 3,
        cycloRowId: '1f',
        frontRowId: '1f',
        frontHasSpace: true,
    });
    expect(kill.reshuffleTarget).toBe(false);
    expect(kill.healthAfter).toBe(0);
    expect(kill.moveCycloToFront).toBe(false);
});

const seq = (values) => {
    let i = 0;
    return () => values[Math.min(i++, values.length - 1)];
};

test('planPrimalRage leaps Winston into an open friendly row', () => {
    const plan = planPrimalRage({
        winstonRowId: '1f',
        friendlyRowIds: ['1f', '1m', '1b'],
        enemyRowIds: ['2f', '2m', '2b'],
        enemies: [],
        occupancy: { '1f': 1, '1m': 4, '1b': 1 },
        rng: seq([0.9]),
    });
    expect(plan.leapRowId).toBe('1b');
    expect(plan.shuffles).toEqual([]);
});

test('planPrimalRage shuffles 1-5 living enemies for 1 damage each', () => {
    const plan = planPrimalRage({
        winstonRowId: '1b',
        friendlyRowIds: ['1f', '1m', '1b'],
        enemyRowIds: ['2f', '2m', '2b'],
        enemies: [
            { cardId: '2ana', rowId: '2f', health: 3 },
            { cardId: '2reaper', rowId: '2f', health: 2 },
            { cardId: '2mercy', rowId: '2m', health: 0 },
        ],
        occupancy: { '1b': 1, '2f': 2, '2m': 1, '2b': 0 },
        rng: seq([0, 0.99, 0, 0, 0.9, 0]),
    });
    expect(plan.shuffles).toHaveLength(2);
    expect(plan.shuffles.every((s) => s.damage === 1)).toBe(true);
    expect(plan.shuffles.map((s) => s.cardId).sort()).toEqual(['2ana', '2reaper']);
    expect(plan.shuffles.every((s) => s.destRowId !== s.fromRowId || s.destRowId === '2f')).toBe(true);
});
