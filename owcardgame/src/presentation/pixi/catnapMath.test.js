import { CATNAP, catnapZzzSample } from './fxMath';

describe('catnap Zzz', () => {
    const card = { x: 100, y: 200, width: 80, height: 120 };

    test('rises upward over the climb', () => {
        const a = catnapZzzSample(0, 0, card);
        const b = catnapZzzSample(0, CATNAP.riseMs * 0.5, card);
        const c = catnapZzzSample(0, CATNAP.riseMs * 0.9, card);
        expect(a.visible).toBe(true);
        expect(b.y).toBeLessThan(a.y);
        expect(c.y).toBeLessThan(b.y);
    });

    test('hides during the gap between climbs', () => {
        expect(catnapZzzSample(0, CATNAP.riseMs + 1, card).visible).toBe(false);
    });

    test('staggered seeds use z / Z / z labels', () => {
        expect(catnapZzzSample(0, 0, card).label).toBe('z');
        expect(catnapZzzSample(1, 0, card).label).toBe('Z');
        expect(catnapZzzSample(2, 0, card).label).toBe('z');
    });

    test('fades near the top of the rise', () => {
        expect(catnapZzzSample(0, CATNAP.riseMs * 0.2, card).alpha).toBeCloseTo(0.95);
        const fading = catnapZzzSample(0, CATNAP.riseMs * 0.85, card);
        expect(fading.alpha).toBeGreaterThan(0);
        expect(fading.alpha).toBeLessThan(0.95);
    });
});
