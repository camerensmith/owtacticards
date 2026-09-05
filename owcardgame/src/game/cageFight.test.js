import {
    cageFightDamage,
    cageFightTargetIds,
    opposingRowId,
    structureMayEnterLockedRow,
    heroBlockedByCage,
} from './cageFight';

test('absolute HP gap either way, zero when equal', () => {
    expect(cageFightDamage(7, 2)).toBe(5);
    expect(cageFightDamage(7, 8)).toBe(1);
    expect(cageFightDamage(7, 7)).toBe(0);
    expect(cageFightDamage(undefined, 3)).toBe(3);
});

test('targets living heroes and skips structures and corpses', () => {
    expect(cageFightTargetIds([
        { cardId: '2tracer', card: { id: 'tracer', health: 2 } },
        { cardId: '2rein', card: { id: 'reinhardt', health: 8 } },
        { cardId: '2turret', card: { id: 'turret', health: 3, turret: true } },
        { cardId: '2stoneguard', card: { id: 'stoneguard', health: 3 } },
        { cardId: '2bob', card: { id: 'bob', health: 3, isSpecial: true } },
        { cardId: '2mirage', card: { id: 'mirage', health: 3 } },
        { cardId: '2ana', card: { id: 'ana', health: 0 } },
    ])).toEqual(['2tracer', '2rein', '2bob', '2mirage']);
});

test('opposing row keeps the lane', () => {
    expect(opposingRowId('1f')).toBe('2f');
    expect(opposingRowId('2m')).toBe('1m');
});

test('structures may enter a locked row; heroes may not', () => {
    const locked = { locked: true, lockedBy: '1mauga' };
    expect(structureMayEnterLockedRow({ id: 'turret' })).toBe(true);
    expect(structureMayEnterLockedRow({ id: 'stoneguard' })).toBe(true);
    expect(structureMayEnterLockedRow({ id: 'ana' })).toBe(false);
    expect(heroBlockedByCage({ id: 'ana' }, locked)).toBe(true);
    expect(heroBlockedByCage({ id: 'turret' }, locked)).toBe(false);
    expect(heroBlockedByCage({ id: 'ana' }, { locked: false })).toBe(false);
});
