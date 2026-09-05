import {
    LUCIO_TOKEN,
    SOUND_BARRIER,
    lucioRings,
    lucioSwirl,
    soundBarrierSample,
    soundBarrierTotalMs,
} from './fxMath';

describe('Crossfade healing rings', () => {
    test('rings roll outward one after another, not as one pulse', () => {
        const rings = lucioRings(0);
        expect(rings).toHaveLength(LUCIO_TOKEN.rings);
        expect(new Set(rings.map((r) => r.t)).size).toBe(LUCIO_TOKEN.rings);
    });

    test('a ring grows as it travels', () => {
        const ring = (ms) => lucioRings(ms)[0].reach;
        expect(ring(LUCIO_TOKEN.cycleMs * 0.6)).toBeGreaterThan(ring(0));
    });

    test('each ring fades in and back out, so nothing pops', () => {
        const first = lucioRings(0)[0];
        expect(first.alpha).toBeCloseTo(0, 5);
        expect(lucioRings(LUCIO_TOKEN.cycleMs / 2)[0].alpha).toBeGreaterThan(0.9);
    });

    test('the cycle loops seamlessly', () => {
        lucioRings(0).forEach((ring, i) => {
            expect(lucioRings(LUCIO_TOKEN.cycleMs)[i].reach).toBeCloseTo(ring.reach, 10);
        });
    });
});

describe('Crossfade shuffle swirl', () => {
    test('arms are spaced around the row rather than stacked', () => {
        const arms = lucioSwirl(0);
        expect(arms).toHaveLength(LUCIO_TOKEN.swirlArms);
        expect(new Set(arms.map((a) => a.start)).size).toBe(LUCIO_TOKEN.swirlArms);
    });

    test('the swirl turns over time', () => {
        expect(lucioSwirl(0)[0].start).not.toBeCloseTo(lucioSwirl(800)[0].start, 3);
    });

    test('stays subtle', () => {
        for (let ms = 0; ms < LUCIO_TOKEN.swirlMs; ms += 150) {
            for (const arm of lucioSwirl(ms)) {
                expect(arm.alpha).toBeLessThanOrEqual(LUCIO_TOKEN.shuffleAlpha);
                expect(arm.alpha).toBeGreaterThanOrEqual(0);
            }
        }
    });
});

describe('Sound Barrier ripple', () => {
    const sweep = SOUND_BARRIER.sweepMs;

    test('runs the length of the row on its first pass', () => {
        expect(soundBarrierSample(0).along).toBeCloseTo(0, 5);
        expect(soundBarrierSample(sweep * 0.999).along).toBeGreaterThan(0.99);
    });

    // Cascading up and down is the whole point: it has to turn around.
    test('bounces back the way it came on the next pass', () => {
        const out = soundBarrierSample(sweep * 0.25);
        const back = soundBarrierSample(sweep * 1.25);
        expect(out.along).toBeCloseTo(0.25, 5);
        expect(back.along).toBeCloseTo(0.75, 5);
        expect(back.bounce).toBe(out.bounce + 1);
    });

    test('makes the configured number of passes', () => {
        const seen = new Set();
        for (let ms = 0; ms < soundBarrierTotalMs(); ms += 20) {
            seen.add(soundBarrierSample(ms).bounce);
        }
        expect(seen.size).toBe(SOUND_BARRIER.bounces);
    });

    test('loses energy with every bounce, so it dies out', () => {
        const energies = [0, 1, 2, 3].map((i) => soundBarrierSample(sweep * (i + 0.5)).energy);
        for (let i = 1; i < energies.length; i += 1) {
            expect(energies[i]).toBeLessThan(energies[i - 1]);
        }
        expect(Math.min(...energies)).toBeGreaterThan(0);
    });

    test('never brightens past its ceiling', () => {
        for (let ms = 0; ms < soundBarrierTotalMs(); ms += 40) {
            expect(soundBarrierSample(ms).alpha).toBeLessThanOrEqual(SOUND_BARRIER.alpha);
        }
    });

    test('finishes at the end of the last pass', () => {
        expect(soundBarrierSample(soundBarrierTotalMs() - 1).done).toBe(false);
        expect(soundBarrierSample(soundBarrierTotalMs()).done).toBe(true);
    });
});
