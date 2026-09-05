import { MATCH_MODE, isPractice } from './screens';
import {
    canAddToSide,
    isOpponentSeat,
    showsMirageTell,
    practiceCardId,
    practiceRoster,
    shouldShowFace,
} from './practice';

const heroes = {
    reaper: { id: 'reaper', name: 'Reaper', role: 'offense' },
    ana: { id: 'ana', name: 'Ana', role: 'support' },
    bob: { id: 'bob', name: 'B.O.B.', role: 'offense', special: true },
    turret: { id: 'turret', name: 'Turret', role: 'defense', special: true },
    broken: { name: 'No Id' },
};

describe('match mode', () => {
    test('only practice counts as practice', () => {
        expect(isPractice(MATCH_MODE.PRACTICE)).toBe(true);
        expect(isPractice(MATCH_MODE.VERSUS_AI)).toBe(false);
        expect(isPractice(undefined)).toBe(false);
    });
});

describe('practice roster', () => {
    // The point of a test field is being able to try summon-only cards too.
    test('includes specials, which normal play hides', () => {
        const ids = practiceRoster(heroes).map((h) => h.id);
        expect(ids).toContain('bob');
        expect(ids).toContain('turret');
        expect(ids).toContain('reaper');
    });

    test('flags which entries are summon-only', () => {
        const byId = Object.fromEntries(practiceRoster(heroes).map((h) => [h.id, h]));
        expect(byId.bob.special).toBe(true);
        expect(byId.reaper.special).toBe(false);
    });

    test('drawable heroes sort ahead of specials, each alphabetical', () => {
        const names = practiceRoster(heroes).map((h) => h.name);
        expect(names).toEqual(['Ana', 'Reaper', 'B.O.B.', 'Turret']);
    });

    test('skips malformed entries', () => {
        expect(practiceRoster(heroes).some((h) => h.name === 'No Id')).toBe(false);
    });

    test('empty input is safe', () => {
        expect(practiceRoster()).toEqual([]);
    });
});

describe('adding cards to a side', () => {
    test('card id encodes the owner', () => {
        expect(practiceCardId(1, 'reaper')).toBe('1reaper');
        expect(practiceCardId(2, 'reaper')).toBe('2reaper');
    });

    // Both sides can field the same hero at once; the id keeps them distinct.
    test('each side tracks its own copy', () => {
        const cards = { '1reaper': {} };
        expect(canAddToSide(cards, 1, 'reaper')).toBe(false);
        expect(canAddToSide(cards, 2, 'reaper')).toBe(true);
    });

    test('a free hero can be added', () => {
        expect(canAddToSide({}, 1, 'ana')).toBe(true);
    });

    test('a missing hero id is rejected', () => {
        expect(canAddToSide({}, 1, undefined)).toBe(false);
    });
});

describe('player 2 visibility', () => {
    // The bug: practice hid player 2's hand behind card backs, because the seat
    // was treated as the AI's purely from its number.
    test('player 2 is the AI seat only outside practice', () => {
        expect(isOpponentSeat(2, false)).toBe(true);
        expect(isOpponentSeat(2, true)).toBe(false);
        expect(isOpponentSeat(1, false)).toBe(false);
        expect(isOpponentSeat(1, true)).toBe(false);
    });

    describe('Rajah\'s mirage', () => {
        test('is marked on your own side, so you know which Rajah is real', () => {
            expect(showsMirageTell(1, false)).toBe(true);
        });

        // The opponent picking the decoy out at a glance defeats the card.
        test('is not marked on the opponent\'s side', () => {
            expect(showsMirageTell(2, false)).toBe(false);
        });

        test('is marked on both sides in practice, where you hold both seats', () => {
            expect(showsMirageTell(1, true)).toBe(true);
            expect(showsMirageTell(2, true)).toBe(true);
        });
    });

    /*
     * Your own hand stays readable while the AI takes its turn. Hiding a hand
     * on the off-turn only made sense for a hot-seat match, and there is no
     * hot-seat mode — so all it did was blank your hand from you.
     */
    test('your own hand stays visible on the opponent\'s turn', () => {
        expect(shouldShowFace({ playerTurn: 2, playerNum: 1 })).toBe(true);
        expect(shouldShowFace({ playerTurn: 1, playerNum: 1 })).toBe(true);
    });

    // Face-down is the only thing that hides a card, and it must always win.
    test('an explicitly face-down card stays down', () => {
        expect(shouldShowFace({
            faceDown: true, playerTurn: 2, playerNum: 2, practiceMode: true, isPlayed: true,
        })).toBe(false);
    });

    test('played cards on the board are always visible', () => {
        expect(shouldShowFace({ isPlayed: true, playerTurn: 1, playerNum: 2 })).toBe(true);
    });

    test('practice shows both hands', () => {
        expect(shouldShowFace({ playerTurn: 1, playerNum: 2, practiceMode: true })).toBe(true);
    });

    test('missing input does not throw', () => {
        expect(shouldShowFace()).toBe(true);
    });
});
