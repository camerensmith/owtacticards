import { landBurstSample } from './fxMath';

describe('landBurstSample', () => {
    test('starts small and opaque, ends larger and gone', () => {
        const start = landBurstSample(0, 40);
        const end = landBurstSample(1, 40);
        expect(start.alpha).toBe(1);
        expect(end.alpha).toBe(0);
        expect(end.radius).toBeGreaterThan(start.radius);
        expect(start.innerAlpha).toBeGreaterThan(end.innerAlpha);
    });

    test('clamps t to 0..1', () => {
        expect(landBurstSample(-1, 40).alpha).toBe(1);
        expect(landBurstSample(2, 40).alpha).toBe(0);
    });
});
