import {
    BATTLEFIELD_MAPS,
    BATTLEFIELD_MAP_OPACITY,
    pickBattlefieldMap,
} from './battlefieldMaps';

/*
 * Asserted against the set rather than a fixed count: the count was pinned at
 * eight while the art was still placeholders, and the module has to be free to
 * gain a map without a test going red for it.
 */
test('every battlefield has art, a display name, and a unique id', () => {
    expect(BATTLEFIELD_MAPS.length).toBeGreaterThan(1);
    expect(BATTLEFIELD_MAPS.every((m) => m && m.id && m.displayName && m.image)).toBe(true);
    expect(new Set(BATTLEFIELD_MAPS.map((m) => m.id)).size).toBe(BATTLEFIELD_MAPS.length);
    expect(new Set(BATTLEFIELD_MAPS.map((m) => m.image)).size).toBe(BATTLEFIELD_MAPS.length);
});

test('the backdrop sits behind the board at 30% opacity', () => {
    expect(BATTLEFIELD_MAP_OPACITY).toBe(0.3);
});

test('pickBattlefieldMap spans the whole set from the random draw', () => {
    const last = BATTLEFIELD_MAPS.length - 1;
    expect(pickBattlefieldMap(() => 0)).toBe(BATTLEFIELD_MAPS[0]);
    expect(pickBattlefieldMap(() => 0.99)).toBe(BATTLEFIELD_MAPS[last]);
    expect(pickBattlefieldMap(() => 0.5)).toBe(
        BATTLEFIELD_MAPS[Math.floor(0.5 * BATTLEFIELD_MAPS.length)]
    );
});

// A draw of exactly 1 would index past the end without the clamp.
test('a draw at the very top of the range still lands on a map', () => {
    expect(pickBattlefieldMap(() => 1)).toBe(BATTLEFIELD_MAPS[BATTLEFIELD_MAPS.length - 1]);
});

test('announcer keys match announcer-<id> when present', () => {
    for (const map of BATTLEFIELD_MAPS) {
        if (map.announcerKey == null) continue;
        expect(map.announcerKey).toBe(`announcer-${map.id}`);
    }
});
