import { skipsDropSettle } from './rules';

/*
 * A deploy is carried to its slot by the Pixi flyer, so the DOM card must not
 * also glide home — two copies of the card would be in the air at once. Every
 * other drop keeps the drag library's settle.
 */
describe('which drops skip the drag library settle', () => {
    test('a deploy from hand to a row skips it', () => {
        expect(skipsDropSettle('player1hand', '1f')).toBe(true);
        expect(skipsDropSettle('player2hand', '2b')).toBe(true);
    });

    test('reordering within the hand keeps it', () => {
        expect(skipsDropSettle('player1hand', 'player1hand')).toBe(false);
    });

    test('moving a card between rows keeps it', () => {
        expect(skipsDropSettle('1f', '1m')).toBe(false);
        expect(skipsDropSettle('1b', '1b')).toBe(false);
    });

    // Dropped on nothing: the card just goes back where it came from, and
    // nothing else is animating it.
    test('a drop outside every list keeps it', () => {
        expect(skipsDropSettle('player1hand', null)).toBe(false);
        expect(skipsDropSettle('player1hand', undefined)).toBe(false);
        expect(skipsDropSettle('1f', null)).toBe(false);
    });
});
