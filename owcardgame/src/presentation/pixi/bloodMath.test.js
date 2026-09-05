import { BLOOD, bloodDropSample, bloodTotalMs } from './fxMath';

const card = { x: 200, y: 300, width: 64, height: 90 };

describe('bleed droplets', () => {
    // The whole point: a wound happens on the victim, not travelling from a source.
    test('every bead stays on the wounded card', () => {
        for (let i = 0; i < BLOOD.count; i += 1) {
            for (let ms = i * BLOOD.staggerMs; ms < bloodTotalMs(); ms += 40) {
                const s = bloodDropSample(ms, i, card);
                if (!s.visible) continue;
                expect(Math.abs(s.x - card.x)).toBeLessThanOrEqual(card.width * 0.35);
                expect(Math.abs(s.y - card.y)).toBeLessThanOrEqual(card.height);
            }
        }
    });

    test('a bead swells before it runs', () => {
        expect(bloodDropSample(0, 0, card).radius).toBeCloseTo(0);
        expect(bloodDropSample(BLOOD.swellMs, 0, card).radius).toBeCloseTo(BLOOD.radius);
    });

    test('runs downward and speeds up', () => {
        const a = bloodDropSample(200, 0, card).y;
        const b = bloodDropSample(400, 0, card).y;
        const c = bloodDropSample(600, 0, card).y;
        expect(b).toBeGreaterThan(a);
        expect(c - b).toBeGreaterThan(b - a);
    });

    test('starts round and stretches as it runs, never beyond the cap', () => {
        expect(bloodDropSample(0, 0, card).stretch).toBeCloseTo(1);

        let prev = 0;
        for (let ms = 0; ms <= BLOOD.dropMs; ms += BLOOD.dropMs / 12) {
            const { stretch } = bloodDropSample(ms, 0, card);
            expect(stretch).toBeGreaterThanOrEqual(prev - 1e-9);
            expect(stretch).toBeLessThanOrEqual(BLOOD.stretch + 1e-9);
            prev = stretch;
        }
        expect(prev).toBeGreaterThan(1);
    });

    test('beads are staggered, not simultaneous', () => {
        expect(bloodDropSample(0, 0, card).visible).toBe(true);
        expect(bloodDropSample(0, 1, card).visible).toBe(false);
        expect(bloodDropSample(BLOOD.staggerMs + 1, 1, card).visible).toBe(true);
    });

    test('beads sit in different places', () => {
        const xs = Array.from({ length: BLOOD.count }, (_, i) => (
            bloodDropSample(i * BLOOD.staggerMs + BLOOD.swellMs, i, card).x
        ));
        expect(new Set(xs).size).toBe(BLOOD.count);
    });

    test('holds opaque then fades out', () => {
        expect(bloodDropSample(BLOOD.dropMs * 0.4, 0, card).alpha).toBe(1);
        const fading = bloodDropSample(BLOOD.dropMs * 0.85, 0, card).alpha;
        expect(fading).toBeGreaterThan(0);
        expect(fading).toBeLessThan(1);
        expect(bloodDropSample(BLOOD.dropMs, 0, card).alpha).toBe(0);
    });

    test('finishes, and the whole bleed covers every bead', () => {
        expect(bloodDropSample(BLOOD.dropMs, 0, card).done).toBe(true);
        const last = BLOOD.count - 1;
        expect(bloodDropSample(bloodTotalMs(), last, card).done).toBe(true);
        expect(bloodDropSample(bloodTotalMs() - 1, last, card).done).toBe(false);
    });

    test('degenerate input does not produce NaN', () => {
        const s = bloodDropSample(100, 0, {});
        expect(Number.isFinite(s.x)).toBe(true);
        expect(Number.isFinite(s.y)).toBe(true);
    });
});
