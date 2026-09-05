import {
    addToGraveyard,
    countDeckHeroes,
    deckCounts,
    graveyardHeroIds,
    isDeckHero,
    pickBestResurrection,
    removeFromGraveyard,
    scoreResurrectionTarget,
    shouldReshuffle,
} from './graveyard';

const heroes = {
    ana: { id: 'ana', role: 'support', health: 2, power: { f: 1, m: 2, b: 2 } },
    reaper: { id: 'reaper', role: 'offense', health: 4, power: { f: 3, m: 2, b: 1 } },
    reinhardt: { id: 'reinhardt', role: 'tank', health: 5, power: { f: 3, m: 1, b: 1 } },
    bob: { id: 'bob', role: 'offense', health: 4, special: true, power: { f: 2, m: 2, b: 2 } },
};

describe('deck accounting', () => {
    test('special cards are not part of the deck', () => {
        expect(isDeckHero(heroes.ana)).toBe(true);
        expect(isDeckHero(heroes.bob)).toBe(false);
        expect(countDeckHeroes(heroes)).toBe(3);
    });

    test('remaining counts down as heroes are drawn', () => {
        expect(deckCounts({ heroes, drawnHeroes: [] })).toEqual({ remaining: 3, total: 3 });
        expect(deckCounts({ heroes, drawnHeroes: ['ana', 'reaper'] })).toEqual({ remaining: 1, total: 3 });
    });

    test('drawn special cards do not shrink the deck', () => {
        expect(deckCounts({ heroes, drawnHeroes: ['bob'] })).toEqual({ remaining: 3, total: 3 });
    });

    test('remaining never goes negative', () => {
        const counts = deckCounts({ heroes, drawnHeroes: ['ana', 'reaper', 'reinhardt', 'ghost'] });
        expect(counts.remaining).toBe(0);
    });

    test('empty inputs are safe', () => {
        expect(deckCounts()).toEqual({ remaining: 0, total: 0 });
    });
});

describe('graveyard contents', () => {
    test('adds and lists entries', () => {
        let grave = addToGraveyard([], { heroId: 'ana', playerHeroId: '1ana' });
        grave = addToGraveyard(grave, { heroId: 'reaper', playerHeroId: '1reaper' });
        expect(graveyardHeroIds(grave)).toEqual(['ana', 'reaper']);
    });

    test('ignores entries with no hero', () => {
        expect(addToGraveyard([], {})).toEqual([]);
    });

    test('does not mutate the input', () => {
        const grave = [{ heroId: 'ana', playerHeroId: '1ana' }];
        addToGraveyard(grave, { heroId: 'reaper', playerHeroId: '1reaper' });
        removeFromGraveyard(grave, 'ana');
        expect(grave).toHaveLength(1);
    });

    test('removes a single copy only', () => {
        const grave = [
            { heroId: 'ana', playerHeroId: '1ana' },
            { heroId: 'ana', playerHeroId: '1ana' },
        ];
        expect(removeFromGraveyard(grave, 'ana')).toHaveLength(1);
    });

    test('removing an absent hero is a no-op', () => {
        const grave = [{ heroId: 'ana', playerHeroId: '1ana' }];
        expect(removeFromGraveyard(grave, 'reaper')).toEqual(grave);
    });
});

describe('reshuffle trigger', () => {
    test('fires only when the deck is spent and the graveyard has cards', () => {
        expect(shouldReshuffle({ remaining: 0, graveyardSize: 3 })).toBe(true);
        expect(shouldReshuffle({ remaining: 2, graveyardSize: 3 })).toBe(false);
        expect(shouldReshuffle({ remaining: 0, graveyardSize: 0 })).toBe(false);
        expect(shouldReshuffle()).toBe(false);
    });
});

describe('resurrection ranking', () => {
    test('offense outranks tank of similar stats', () => {
        expect(scoreResurrectionTarget(heroes.reaper)).toBeGreaterThan(
            scoreResurrectionTarget(heroes.reinhardt)
        );
    });

    test('picks the best entry in the graveyard', () => {
        const grave = [
            { heroId: 'reinhardt', playerHeroId: '2reinhardt' },
            { heroId: 'reaper', playerHeroId: '2reaper' },
            { heroId: 'ana', playerHeroId: '2ana' },
        ];
        expect(pickBestResurrection(grave, heroes).heroId).toBe('reaper');
    });

    test('an empty graveyard yields nothing', () => {
        expect(pickBestResurrection([], heroes)).toBeNull();
        expect(scoreResurrectionTarget(undefined)).toBe(-1);
    });
});
