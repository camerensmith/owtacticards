import { SPARKLE, sparkleSample } from './fxMath';

const card = { x: 200, y: 300, width: 64, height: 90 };

describe('immortality sparkle', () => {
    test('motes orbit the card, just outside its edge', () => {
        const hw = (card.width / 2) * (1 + SPARKLE.halo);
        const hh = (card.height / 2) * (1 + SPARKLE.halo);
        for (let seed = 0; seed < 20; seed += 1) {
            const s = sparkleSample(seed, 400, card);
            expect(Math.abs(s.x - card.x)).toBeLessThanOrEqual(hw + 1e-6);
            expect(Math.abs(s.y - card.y)).toBeLessThanOrEqual(hh + 1e-6);
        }
    });

    test('motes move over time', () => {
        const a = sparkleSample(3, 0, card);
        const b = sparkleSample(3, SPARKLE.periodMs / 3, card);
        expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeGreaterThan(1);
    });

    // Twinkling means never fully dark; the field is protection, not a blink.
    test('a mote never fully disappears', () => {
        for (let ms = 0; ms < SPARKLE.periodMs * 3; ms += 23) {
            const { alpha } = sparkleSample(5, ms, card);
            expect(alpha).toBeGreaterThanOrEqual(0.25 - 1e-9);
            expect(alpha).toBeLessThanOrEqual(1 + 1e-9);
        }
    });

    // In-unison pulsing would read as one glow rather than a sparkle.
    test('motes are out of phase with one another', () => {
        const alphas = Array.from({ length: 8 }, (_, i) => sparkleSample(i, 200, card).alpha);
        expect(new Set(alphas.map((a) => Math.round(a * 20))).size).toBeGreaterThan(3);
    });

    // The field lasts until the turn ends, so the sparkle must never expire.
    test('it keeps going indefinitely', () => {
        const late = sparkleSample(2, SPARKLE.periodMs * 500, card);
        expect(Number.isFinite(late.x)).toBe(true);
        expect(late.alpha).toBeGreaterThan(0);
    });

    test('degenerate input does not produce NaN', () => {
        const s = sparkleSample(1, 100, {});
        expect(Number.isFinite(s.x)).toBe(true);
        expect(Number.isFinite(s.y)).toBe(true);
    });
});
