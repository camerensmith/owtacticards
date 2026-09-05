import {
    isMirage,
    isDisoriented,
    isExemptSource,
    shouldDisorientSource,
    createDisorientEffect,
    advanceDisorient,
    cardPowerContribution,
    shouldPopMirageOnMove,
    tickDisorientOnCards,
} from './disorient';

const mirage = { id: 'mirage', health: 3, power: { f: 1, m: 2, b: 1 } };
const reaper = { id: 'reaper', health: 3, power: { f: 2, m: 2, b: 2 } };

test('isMirage is true for illusion cards', () => {
    expect(isMirage(mirage)).toBe(true);
    expect(isMirage({ id: 'rajah' })).toBe(false);
});

test('structures are exempt sources', () => {
    expect(isExemptSource({ id: 'turret', turret: true })).toBe(true);
    expect(isExemptSource({ id: 'stoneguard', structure: true })).toBe(true);
    expect(isExemptSource(reaper)).toBe(false);
});

test('enemy hero popping a mirage should Disorient', () => {
    expect(shouldDisorientSource({
        sourceCard: reaper,
        mirageCard: mirage,
        sourceCardId: '2reaper',
        mirageId: '1mirage',
    })).toBe(true);
});

test('allied, missing, or structure sources should not Disorient', () => {
    expect(shouldDisorientSource({
        sourceCard: reaper,
        mirageCard: mirage,
        sourceCardId: '1reaper',
        mirageId: '1mirage',
    })).toBe(false);
    expect(shouldDisorientSource({
        sourceCard: null,
        mirageCard: mirage,
        sourceCardId: null,
        mirageId: '1mirage',
    })).toBe(false);
    expect(shouldDisorientSource({
        sourceCard: { id: 'turret', turret: true },
        mirageCard: mirage,
        sourceCardId: '2turret',
        mirageId: '1mirage',
    })).toBe(false);
});

test('duration B: applied mid-turn, clears at start of turn after victim next', () => {
    let effect = createDisorientEffect(2);
    expect(effect.seenVictimNext).toBe(false);
    expect(advanceDisorient(effect, { playerTurn: 1 }).keep).toBe(true);
    effect = advanceDisorient(effect, { playerTurn: 1 }).effect;
    const next = advanceDisorient(effect, { playerTurn: 2 });
    expect(next.keep).toBe(true);
    expect(next.effect.seenVictimNext).toBe(true);
    expect(advanceDisorient(next.effect, { playerTurn: 1 }).keep).toBe(false);
});

test('disoriented living card contributes 0 power', () => {
    const card = { ...reaper, health: 3, effects: [createDisorientEffect(2)] };
    expect(isDisoriented(card)).toBe(true);
    expect(cardPowerContribution(card, 'f')).toBe(0);
    expect(cardPowerContribution(reaper, 'f')).toBe(2);
});

test('enemy ability moving a living illusion pops', () => {
    const getCard = (id) => (id === '1mirage'
        ? { id: 'mirage', health: 3 }
        : { id: 'wuyang', health: 3 });
    expect(shouldPopMirageOnMove({ cardId: '1mirage', sourceCardId: '2wuyang', getCard })).toBe(true);
});

test('allied move or turret source does not pop', () => {
    const getCard = (id) => (id === '1mirage'
        ? { id: 'mirage', health: 3 }
        : { id: id.slice(1), turret: id.includes('turret'), health: 3 });
    expect(shouldPopMirageOnMove({ cardId: '1mirage', sourceCardId: '1fika', getCard })).toBe(false);
    expect(shouldPopMirageOnMove({ cardId: '1mirage', sourceCardId: '2turret', getCard })).toBe(false);
});

test('tickDisorientOnCards removes after the turn after victim next', () => {
    const effect = createDisorientEffect(2);
    const afterP1 = tickDisorientOnCards({
        '2reaper': { id: 'reaper', effects: [effect] },
    }, 1);
    expect(afterP1.remove).toEqual([]);
    expect(afterP1.update).toEqual([]);
    const afterP2 = tickDisorientOnCards({
        '2reaper': { id: 'reaper', effects: [effect] },
    }, 2);
    expect(afterP2.update[0].effect.seenVictimNext).toBe(true);
    const clear = tickDisorientOnCards({
        '2reaper': { id: 'reaper', effects: [afterP2.update[0].effect] },
    }, 1);
    expect(clear.remove).toEqual([{ cardId: '2reaper' }]);
});
