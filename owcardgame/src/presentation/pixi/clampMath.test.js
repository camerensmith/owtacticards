import { CLAMP, clampFieldSample, clampJaws, clampSparks } from './fxMath';

const row = { left: 100, top: 200, width: 400, height: 80 };

describe('clamp field', () => {
    test('breathes between its alpha bounds', () => {
        for (let ms = 0; ms < CLAMP.pulseMs * 3; ms += 37) {
            const { alpha } = clampFieldSample(ms);
            expect(alpha).toBeGreaterThanOrEqual(CLAMP.minAlpha - 1e-9);
            expect(alpha).toBeLessThanOrEqual(CLAMP.maxAlpha + 1e-9);
        }
    });

    test('jaws open and close rather than sitting still', () => {
        const open = clampFieldSample(CLAMP.pulseMs / 4).jaw;
        const shut = clampFieldSample((CLAMP.pulseMs * 3) / 4).jaw;
        expect(open).toBeGreaterThan(shut);
    });
});

describe('clamp jaws', () => {
    test('bite inward from the top and bottom of the row', () => {
        const jaws = clampJaws(row, 0.2);
        expect(jaws.top.y).toBeCloseTo(row.top);
        expect(jaws.top.depth).toBeCloseTo(16);
        expect(jaws.bottom.y).toBeCloseTo(row.top + row.height);
        expect(jaws.bottom.depth).toBeCloseTo(16);
    });
});

describe('clamp sparks', () => {
    test('seed a spark per count along the row', () => {
        const sparks = clampSparks(row, 0);
        expect(sparks).toHaveLength(CLAMP.sparkCount);
        expect(sparks[0].x).toBeGreaterThanOrEqual(row.left);
        expect(sparks[sparks.length - 1].x).toBeLessThanOrEqual(row.left + row.width);
    });

    test('travel over time instead of sitting still', () => {
        const a = clampSparks(row, 0)[0].x;
        const b = clampSparks(row, CLAMP.sparkPeriodMs / 2)[0].x;
        expect(a).not.toBeCloseTo(b);
    });
});
