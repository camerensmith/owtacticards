import { HACK, hackColumnAlpha, hackGlyphIsOne, hackSample } from './fxMath';

/*
 * The hack itself is instant — shields and tokens are gone before this draws —
 * so the sweep is what sells it as an intrusion rather than another number
 * floating off a card. It has to read as advancing left to right.
 */
describe('the hack sweep', () => {
    test('runs from the left edge to the right and finishes', () => {
        expect(hackSample(0).front).toBe(0);
        expect(hackSample(HACK.sweepMs).front).toBe(1);
        expect(hackSample(HACK.sweepMs).done).toBe(true);
        expect(hackSample(HACK.sweepMs - 1).done).toBe(false);
    });

    test('clamps rather than running off the board', () => {
        expect(hackSample(HACK.sweepMs * 4).front).toBe(1);
        expect(hackSample(-500).front).toBe(0);
    });
});

describe('how a column lights', () => {
    const front = 0.5;
    const frontColumn = front * HACK.columns;

    test('is brightest right at the front', () => {
        const atFront = hackColumnAlpha(Math.floor(frontColumn), front);
        const behind = hackColumnAlpha(Math.floor(frontColumn) - 4, front);

        expect(atFront).toBeGreaterThan(behind);
        expect(atFront).toBeLessThanOrEqual(HACK.maxAlpha);
    });

    test('fades along the tail behind the front', () => {
        const near = hackColumnAlpha(frontColumn - 1, front);
        const far = hackColumnAlpha(frontColumn - 5, front);

        expect(near).toBeGreaterThan(far);
        expect(far).toBeGreaterThan(0);
    });

    test('is dark well behind and well ahead of the sweep', () => {
        expect(hackColumnAlpha(frontColumn - HACK.trailColumns - 1, front)).toBe(0);
        expect(hackColumnAlpha(frontColumn + HACK.leadColumns + 1, front)).toBe(0);
    });

    // A faint glow just ahead reads as the intrusion arriving.
    test('glows faintly just ahead of the front', () => {
        const ahead = hackColumnAlpha(frontColumn + 0.5, front);

        expect(ahead).toBeGreaterThan(0);
        expect(ahead).toBeLessThan(hackColumnAlpha(frontColumn, front));
    });

    test('nothing is lit before the sweep starts', () => {
        expect(hackColumnAlpha(10, 0)).toBe(0);
        expect(hackColumnAlpha(HACK.columns - 1, 0)).toBe(0);
    });
});

/*
 * Glyphs re-roll on a cadence rather than every frame: hissing at 60fps reads
 * as noise, not data.
 */
describe('the binary glyphs', () => {
    test('hold still between re-rolls', () => {
        expect(hackGlyphIsOne(3, 4, 0)).toBe(hackGlyphIsOne(3, 4, HACK.rerollMs - 1));
    });

    test('are a stable function of position and step', () => {
        expect(hackGlyphIsOne(3, 4, 500)).toBe(hackGlyphIsOne(3, 4, 500));
    });

    test('are not all the same glyph', () => {
        const values = [];
        for (let c = 0; c < 12; c += 1) {
            for (let r = 0; r < 12; r += 1) values.push(hackGlyphIsOne(c, r, 0));
        }
        expect(values).toContain(true);
        expect(values).toContain(false);
    });

    test('change over the run of a sweep', () => {
        const early = hackGlyphIsOne(2, 2, 0);
        const steps = [];
        for (let t = 0; t < HACK.sweepMs; t += HACK.rerollMs) {
            steps.push(hackGlyphIsOne(2, 2, t));
        }
        expect(steps.some((v) => v !== early)).toBe(true);
    });
});
