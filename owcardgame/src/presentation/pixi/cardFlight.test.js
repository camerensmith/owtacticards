import { cardFlightSample } from './fxMath';
import { CARD_FLIGHT } from './fxConfig';

const from = { x: 100, y: 500 };
const to = { x: 400, y: 120 };

const at = (ms) => cardFlightSample(ms, from, to);

describe('the card flight from hand to slot', () => {
    test('starts on the card and ends in the slot', () => {
        expect(at(0).x).toBeCloseTo(from.x);
        expect(at(0).y).toBeCloseTo(from.y);
        expect(at(CARD_FLIGHT.ms).x).toBeCloseTo(to.x);
        expect(at(CARD_FLIGHT.ms).y).toBeCloseTo(to.y);
    });

    test('reports done only once it has landed', () => {
        expect(at(CARD_FLIGHT.ms - 1).done).toBe(false);
        expect(at(CARD_FLIGHT.ms).done).toBe(true);
        expect(at(CARD_FLIGHT.ms * 5).done).toBe(true);
    });

    test('clamps past the end rather than overshooting the slot', () => {
        expect(at(CARD_FLIGHT.ms * 5).x).toBeCloseTo(to.x);
        expect(at(-100).x).toBeCloseTo(from.x);
    });

    /*
     * The point of the curve: a card the player has just thrown should leave at
     * speed and settle, not creep away from the hand. An ease-in-out covers
     * less than half the distance by the halfway point; this must cover more.
     */
    test('leaves the hand fast and settles into the slot', () => {
        const half = at(CARD_FLIGHT.ms / 2);
        const travelled = (half.x - from.x) / (to.x - from.x);

        expect(travelled).toBeGreaterThan(0.5);
    });

    test('slows as it arrives', () => {
        const early = at(CARD_FLIGHT.ms * 0.1).x - at(0).x;
        const late = at(CARD_FLIGHT.ms).x - at(CARD_FLIGHT.ms * 0.9).x;

        expect(early).toBeGreaterThan(late);
    });

    test('arcs above the straight line between the two points', () => {
        const mid = at(CARD_FLIGHT.ms / 2);
        const straight = from.y + (to.y - from.y) * 0.5;

        expect(mid.y).toBeLessThan(straight);
    });

    test('swells on the way across and is back to size on landing', () => {
        expect(at(0).scale).toBeCloseTo(1);
        expect(at(CARD_FLIGHT.ms).scale).toBeCloseTo(1);
        expect(at(CARD_FLIGHT.ms / 2).scale).toBeGreaterThan(1);
    });

    test('survives missing coordinates', () => {
        expect(cardFlightSample(50, undefined, undefined).done).toBe(false);
        expect(cardFlightSample(NaN, from, to).x).toBeCloseTo(from.x);
    });
});

/*
 * The board is locked and the played card is absent from its row until the
 * flight resolves, so this duration is felt as input lag, not as flourish.
 */
test('the flight is short enough not to read as lag', () => {
    expect(CARD_FLIGHT.ms).toBeLessThanOrEqual(280);
});
