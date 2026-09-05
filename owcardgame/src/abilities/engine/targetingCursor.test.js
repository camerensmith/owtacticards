import { usesEnemyTargetCursor, enemyTargetCursorCss } from './targetingCursor';

test('enemy damage and debuff targeting use the bullseye cursor', () => {
    expect(usesEnemyTargetCursor({ isDamage: true })).toBe(true);
    expect(usesEnemyTargetCursor({ isDebuff: true })).toBe(true);
    expect(usesEnemyTargetCursor({})).toBe(true);
});

test('ally heal and buff targeting do not use the bullseye cursor', () => {
    expect(usesEnemyTargetCursor({ isHeal: true })).toBe(false);
    expect(usesEnemyTargetCursor({ isBuff: true })).toBe(false);
    expect(usesEnemyTargetCursor({ isHeal: true, isBuff: true })).toBe(false);
});

test('enemyTargetCursorCss uses the Ashe bullseye hotspot', () => {
    expect(enemyTargetCursorCss('/crosshair.svg')).toBe('url(/crosshair.svg) 5 5, crosshair');
});
