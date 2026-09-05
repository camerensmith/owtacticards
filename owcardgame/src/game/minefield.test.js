import { isMinefieldToken, minefieldCharges, minefieldToken } from './minefield';

test('a minefield token is wreckingball plus minefield type, id, or visual', () => {
    expect(isMinefieldToken({ hero: 'wreckingball', type: 'minefield' })).toBe(true);
    expect(isMinefieldToken({ hero: 'wreckingball', id: 'minefield' })).toBe(true);
    expect(isMinefieldToken({ hero: 'wreckingball', type: 'damage-field', visual: 'minefield' })).toBe(true);
    expect(isMinefieldToken({ hero: 'hanzo', type: 'minefield' })).toBe(false);
    expect(isMinefieldToken({ hero: 'wreckingball', type: 'token' })).toBe(false);
});

test('charges fall back to damage so a field still has mines to draw', () => {
    expect(minefieldCharges({ charges: 4 })).toBe(4);
    expect(minefieldCharges({ damage: 3 })).toBe(3);
    expect(minefieldCharges({})).toBe(0);
});

test('minefieldToken always stamps type minefield and a charge count', () => {
    const token = minefieldToken({ charges: 5, sourceCardId: '1wreckingball', sourceRowId: '1m', now: 9 });
    expect(token).toEqual(expect.objectContaining({
        hero: 'wreckingball',
        type: 'minefield',
        charges: 5,
        sourceCardId: '1wreckingball',
        sourceRowId: '1m',
        visual: 'minefield',
    }));
    expect(token.id).toContain('wreckingball-minefield');
});
