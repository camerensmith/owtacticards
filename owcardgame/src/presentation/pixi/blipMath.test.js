import { BLIP, blipSample } from './fxMath';

describe('marked-target blip', () => {
    // The mark is permanent, so the dot must never blink out entirely —
    // a disappearing dot would read as the mark having expired.
    test('the dot is always visible', () => {
        for (let ms = 0; ms < BLIP.periodMs * 3; ms += 11) {
            const { dotAlpha } = blipSample(ms);
            expect(dotAlpha).toBeGreaterThanOrEqual(BLIP.minAlpha - 1e-9);
            expect(dotAlpha).toBeLessThanOrEqual(BLIP.maxAlpha + 1e-9);
        }
    });

    test('the dot breathes rather than holding still', () => {
        const quarter = blipSample(BLIP.periodMs / 4).dotAlpha;
        const threeQuarter = blipSample((BLIP.periodMs * 3) / 4).dotAlpha;
        expect(quarter).toBeCloseTo(BLIP.maxAlpha);
        expect(threeQuarter).toBeCloseTo(BLIP.minAlpha);
    });

    test('the ring pings outward from the dot and fades', () => {
        const start = blipSample(0);
        const late = blipSample(BLIP.periodMs * 0.9);
        expect(start.ringRadius).toBeCloseTo(BLIP.dotRadius);
        expect(late.ringRadius).toBeGreaterThan(start.ringRadius);
        expect(late.ringRadius).toBeLessThanOrEqual(BLIP.ringRadius);
        expect(late.ringAlpha).toBeLessThan(start.ringAlpha);
    });

    test('the ring never grows past its limit', () => {
        for (let ms = 0; ms < BLIP.periodMs * 3; ms += 13) {
            const { ringRadius } = blipSample(ms);
            expect(ringRadius).toBeGreaterThanOrEqual(BLIP.dotRadius);
            expect(ringRadius).toBeLessThanOrEqual(BLIP.ringRadius + 1e-9);
        }
    });

    test('it repeats every period rather than running out', () => {
        expect(blipSample(BLIP.periodMs).ringRadius).toBeCloseTo(blipSample(0).ringRadius);
        expect(blipSample(BLIP.periodMs * 10).dotAlpha).toBeCloseTo(blipSample(0).dotAlpha);
    });

    test('stays subtle: the ring is fainter than the dot at its brightest', () => {
        expect(blipSample(0).ringAlpha).toBeLessThan(BLIP.maxAlpha);
    });
});
