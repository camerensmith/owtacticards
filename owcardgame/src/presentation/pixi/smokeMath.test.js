import { SMOKE, smokePuffs } from './fxMath';

describe('Smoke puff', () => {
    test('billows out from the card', () => {
        const spread = (t) => Math.max(...smokePuffs(SMOKE.ms * t, 100).puffs.map(
            (p) => Math.hypot(p.x, p.y),
        ));
        expect(spread(0.6)).toBeGreaterThan(spread(0.1));
    });

    test('rises as it goes', () => {
        const height = (t) => Math.min(...smokePuffs(SMOKE.ms * t, 100).puffs.map((p) => p.y));
        expect(height(0.9)).toBeLessThan(height(0.1));
    });

    test('thins out and clears', () => {
        const brightest = (t) => Math.max(...smokePuffs(SMOKE.ms * t, 100).puffs.map((p) => p.alpha));
        expect(brightest(0.8)).toBeLessThan(brightest(0));
        expect(smokePuffs(SMOKE.ms, 100).done).toBe(true);
        expect(smokePuffs(SMOKE.ms, 100).puffs.every((p) => p.alpha === 0)).toBe(true);
    });

    test('holds its shape between frames rather than boiling', () => {
        expect(smokePuffs(300, 100)).toEqual(smokePuffs(300, 100));
    });

    test('the cloud frays instead of fading as one block', () => {
        const alphas = smokePuffs(SMOKE.ms * 0.6, 100).puffs.map((p) => p.alpha);
        expect(new Set(alphas).size).toBeGreaterThan(1);
    });

    test('scales to the card it covers', () => {
        const small = smokePuffs(SMOKE.ms * 0.5, 50).puffs[0].radius;
        const large = smokePuffs(SMOKE.ms * 0.5, 200).puffs[0].radius;
        expect(large).toBeGreaterThan(small);
    });

    // Rajah and his mirage puff together; if the two clouds diverged, the pair
    // would read as two events and betray which card arrived first.
    test('two cards puffed at the same moment are identical clouds', () => {
        const rajah = smokePuffs(240, 120);
        const mirage = smokePuffs(240, 120);
        expect(rajah.puffs).toEqual(mirage.puffs);
        expect(rajah.t).toBe(mirage.t);
    });
});
