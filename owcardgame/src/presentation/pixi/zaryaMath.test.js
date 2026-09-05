import {
    PARTICLE_BEAM,
    ZARYA_ORB,
    particleBeamSample,
    particleBeamTotalMs,
    particleBlastMs,
    zaryaArcPoints,
    zaryaOrbSample,
} from './fxMath';

describe('Projected Barrier orb', () => {
    test('fades out over its life', () => {
        expect(zaryaOrbSample(0).done).toBe(false);
        expect(zaryaOrbSample(ZARYA_ORB.ms * 0.9).alpha)
            .toBeLessThan(zaryaOrbSample(0).alpha);
        expect(zaryaOrbSample(ZARYA_ORB.ms).done).toBe(true);
    });

    test('crackles rather than glowing steadily', () => {
        const flashes = [0, 30, 60, 90, 120].map((ms) => zaryaOrbSample(ms).flash);
        expect(new Set(flashes).size).toBeGreaterThan(1);
    });

    test('an arc closes the gap to the next one', () => {
        const first = zaryaArcPoints({ x: 0, y: 0 }, 50, 0, 0);
        const second = zaryaArcPoints({ x: 0, y: 0 }, 50, 1, 0);
        expect(first).toHaveLength(ZARYA_ORB.arcSegments + 1);
        // Each arc spans exactly its share of the rim, so the ring is covered.
        const endAngle = Math.atan2(first[first.length - 1].y, first[first.length - 1].x);
        const startAngle = Math.atan2(second[0].y, second[0].x);
        expect(endAngle).toBeCloseTo(startAngle, 5);
    });

    test('arcs snap in steps instead of crawling every frame', () => {
        const stepMs = 1000 / ZARYA_ORB.flashHz;
        const a = zaryaArcPoints({ x: 0, y: 0 }, 50, 0, 1);
        const b = zaryaArcPoints({ x: 0, y: 0 }, 50, 0, stepMs * 0.5);
        const c = zaryaArcPoints({ x: 0, y: 0 }, 50, 0, stepMs * 1.5);
        expect(b).toEqual(a);
        expect(c).not.toEqual(a);
    });

    test('arcs kink off the rim rather than tracing it', () => {
        const points = zaryaArcPoints({ x: 0, y: 0 }, 50, 2, 0);
        const radii = points.map((p) => Math.hypot(p.x, p.y));
        expect(Math.max(...radii)).toBeGreaterThan(50);
        expect(Math.min(...radii)).toBeLessThan(50);
    });
});

describe('Particle Cannon', () => {
    test('every orb gathers before the first blast', () => {
        const atGather = particleBeamSample(PARTICLE_BEAM.gatherMs - 1, 2, 3);
        expect(atGather.blasting).toBe(false);
        expect(atGather.orbAlpha).toBeGreaterThan(0.9);
    });

    test('targets are blasted in turn, not together', () => {
        const ms = PARTICLE_BEAM.gatherMs + PARTICLE_BEAM.blastMs * 0.5;
        expect(particleBeamSample(ms, 0, 3).blasting).toBe(true);
        expect(particleBeamSample(ms, 2, 3).blasting).toBe(false);
    });

    test('the beam wipes out from the caster', () => {
        const start = particleBeamSample(PARTICLE_BEAM.gatherMs + 1, 0, 3);
        const end = particleBeamSample(PARTICLE_BEAM.gatherMs + PARTICLE_BEAM.blastMs * 0.9, 0, 3);
        expect(end.beamReach).toBeGreaterThan(start.beamReach);
    });

    test('an orb clears as its own blast lands', () => {
        const mid = particleBeamSample(PARTICLE_BEAM.gatherMs + PARTICLE_BEAM.blastMs * 0.9, 0, 3);
        expect(mid.orbAlpha).toBeLessThan(0.3);
    });

    test('the last target still finishes inside the run', () => {
        const total = particleBeamTotalMs(3);
        expect(particleBeamSample(total - 1, 2, 3).done).toBe(false);
        expect(particleBeamSample(total, 2, 3).done).toBe(true);
    });

    test('damage lands during its own blast, in target order', () => {
        expect(particleBlastMs(0)).toBeGreaterThan(PARTICLE_BEAM.gatherMs);
        expect(particleBlastMs(1)).toBeGreaterThan(particleBlastMs(0));
        expect(particleBlastMs(2)).toBeLessThan(particleBeamTotalMs(3));
    });
});
