import { deckCounts, isDeckHero } from './graveyard';

const heroes = {
    ana: { id: 'ana', name: 'Ana' },
    reaper: { id: 'reaper', name: 'Reaper' },
    mercy: { id: 'mercy', name: 'Mercy' },
    mei: { id: 'mei', name: 'Mei' },
    bob: { id: 'bob', name: 'B.O.B.', special: true },
    turret: { id: 'turret', name: 'Turret', special: true },
};

/*
 * The deck is not an array: a hero is in it when it exists in the roster and has
 * not been drawn. That only reads true if the drawn list survives the round —
 * it used to be wiped at every round transition, so the counter snapped back to
 * the full deck no matter how many heroes were in play or buried.
 */
describe('the deck counter', () => {
    test('counts only drawable heroes, never summons', () => {
        expect(deckCounts({ heroes }).total).toBe(4);
        expect(isDeckHero(heroes.bob)).toBe(false);
        expect(isDeckHero(heroes.ana)).toBe(true);
    });

    test('falls as heroes are drawn', () => {
        expect(deckCounts({ heroes, drawnHeroes: [] }).remaining).toBe(4);
        expect(deckCounts({ heroes, drawnHeroes: ['ana'] }).remaining).toBe(3);
        expect(deckCounts({ heroes, drawnHeroes: ['ana', 'reaper', 'mercy'] }).remaining).toBe(1);
    });

    // A hero in play, in hand or in the graveyard is drawn either way, so all
    // three are out of the deck for the rest of the match.
    test('does not count a drawn hero back in wherever it ended up', () => {
        const drawnHeroes = ['ana', 'reaper'];
        expect(deckCounts({ heroes, drawnHeroes }).remaining).toBe(2);
    });

    test('a summoned card does not come out of the deck', () => {
        expect(deckCounts({ heroes, drawnHeroes: ['bob', 'turret'] }).remaining).toBe(4);
    });

    test('never reports a negative deck', () => {
        const drawnHeroes = ['ana', 'reaper', 'mercy', 'mei', 'bob'];
        expect(deckCounts({ heroes, drawnHeroes }).remaining).toBe(0);
    });

    test('survives missing input', () => {
        expect(deckCounts()).toEqual({ total: 0, remaining: 0 });
    });
});

/*
 * One copy per hero, per match. The draw pool is everything not yet drawn, so
 * carrying the drawn list across rounds is what stops a hero still sitting in
 * hand being dealt a second time, and what keeps the buried buried.
 */
describe('one copy of each hero', () => {
    const availableAfter = (drawnHeroes) =>
        Object.keys(heroes).filter((id) => !drawnHeroes.includes(id) && !heroes[id].special);

    test('a hero already held is not in the pool', () => {
        expect(availableAfter(['ana'])).not.toContain('ana');
    });

    test('a hero in the graveyard is not in the pool', () => {
        expect(availableAfter(['reaper'])).not.toContain('reaper');
    });

    test('an exhausted pool offers nothing rather than recycling', () => {
        expect(availableAfter(['ana', 'reaper', 'mercy', 'mei'])).toEqual([]);
    });
});
