import { isRedeployLocked } from './rules';

/*
 * Symmetra's Teleporter pulls an allied hero back into the hand. It sits out
 * one turn, then goes back on the board. The lock used to last a whole round,
 * which in practice meant forever: the only thing that lifted it was the round
 * reset, and that discards the board and deals fresh hands.
 */
describe('a hero held after being returned to hand', () => {
    const returnedOnTurn3 = { id: 'symmetra', redeployLockedUntilTurn: 4 };

    test('cannot go back out on the turn it was returned', () => {
        expect(isRedeployLocked(returnedOnTurn3, 3)).toBe(true);
    });

    test('is free from the next turn on', () => {
        expect(isRedeployLocked(returnedOnTurn3, 4)).toBe(false);
        expect(isRedeployLocked(returnedOnTurn3, 5)).toBe(false);
        expect(isRedeployLocked(returnedOnTurn3, 18)).toBe(false);
    });

    test('an ordinary card is never held', () => {
        expect(isRedeployLocked({ id: 'ana' }, 3)).toBe(false);
        expect(isRedeployLocked(undefined, 3)).toBe(false);
        expect(isRedeployLocked(null, 3)).toBe(false);
    });

    // The round reset zeroes the field rather than deleting it.
    test('a cleared lock reads as free', () => {
        expect(isRedeployLocked({ redeployLockedUntilTurn: 0 }, 1)).toBe(false);
    });

    test('a missing turn count does not hold a card hostage', () => {
        expect(isRedeployLocked({ id: 'ana' }, undefined)).toBe(false);
    });
});
