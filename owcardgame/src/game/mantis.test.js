import {
    isMantisCard,
    isCloakedMantis,
    oppositeRowId,
    cloakMirrorRowId,
    deployRowAllowed,
    countsAsEnemyHero,
    isBladeDanceCountable,
    isBladeDanceRecipient,
    bladeDanceAssignments,
    createCloakEffect,
    CLOAK_TRIP_DAMAGE,
} from './mantis';

test('deployRowAllowed: only Mantis may drop on an enemy row', () => {
    expect(deployRowAllowed({ cardId: '1mantis', ownerPlayerNum: 1, finishRowId: '2f' })).toBe(true);
    expect(deployRowAllowed({ cardId: '1mantis', ownerPlayerNum: 1, finishRowId: '1f' })).toBe(false);
    expect(deployRowAllowed({ cardId: '1ana', ownerPlayerNum: 1, finishRowId: '2f' })).toBe(false);
    expect(deployRowAllowed({ cardId: '1ana', ownerPlayerNum: 1, finishRowId: '1m' })).toBe(true);
});

test('cloak mirror and opposite helpers', () => {
    expect(oppositeRowId('2f')).toBe('1f');
    expect(cloakMirrorRowId(1, '2b')).toBe('1b');
    expect(isMantisCard('2mantis')).toBe(true);
});

test('cloaked Mantis is not an enemy for counts', () => {
    const cloaked = { id: 'mantis', effects: [createCloakEffect()] };
    expect(isCloakedMantis(cloaked)).toBe(true);
    expect(countsAsEnemyHero('2mantis', cloaked)).toBe(false);
    expect(countsAsEnemyHero('2ana', { id: 'ana', effects: [] })).toBe(true);
});

test('Blade Dance: summons raise X but only heroes receive hits', () => {
    expect(isBladeDanceCountable('2turret', { id: 'turret', health: 2, special: true, turret: true })).toBe(true);
    expect(isBladeDanceCountable('2bob', { id: 'bob', health: 4, special: true })).toBe(true);
    expect(isBladeDanceCountable('2ana', { id: 'ana', health: 3 })).toBe(true);

    expect(isBladeDanceRecipient('2turret', { id: 'turret', health: 2, special: true, turret: true })).toBe(false);
    expect(isBladeDanceRecipient('2bob', { id: 'bob', health: 4, special: true })).toBe(false);
    expect(isBladeDanceRecipient('2nemesis', { id: 'nemesis', health: 3, special: true })).toBe(false);
    expect(isBladeDanceRecipient('2ana', { id: 'ana', health: 3 })).toBe(true);
    expect(isBladeDanceRecipient('1mantis', {
        id: 'mantis',
        health: 3,
        effects: [createCloakEffect()],
    })).toBe(false);
});

test('bladeDanceAssignments uses hitCount for X and only recipients for landing', () => {
    // 8 targets on board, 6 hero recipients → 8 strikes among the 6 heroes
    const hits = bladeDanceAssignments(8, ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'], () => 0);
    expect(hits).toHaveLength(8);
    expect(hits.every((id) => id === 'h1')).toBe(true);
    expect(bladeDanceAssignments(3, [], () => 0)).toEqual([]);
    expect(CLOAK_TRIP_DAMAGE).toBe(2);
});
