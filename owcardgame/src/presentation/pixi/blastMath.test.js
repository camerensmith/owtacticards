import {
    BLAST,
    BLAST_TOTAL_MS,
    CHARGE,
    beamQuad,
    blastSample,
    chargeCoreSample,
    chargeRamp,
    chargeRingSamples,
} from './fxMath';

describe('charge spool-up', () => {
    test('power builds then holds at full', () => {
        expect(chargeRamp(0)).toBe(0);
        expect(chargeRamp(CHARGE.rampMs / 2)).toBeCloseTo(0.5);
        expect(chargeRamp(CHARGE.rampMs)).toBe(1);
        expect(chargeRamp(CHARGE.rampMs * 10)).toBe(1);
    });

    test('one ring per configured ring', () => {
        expect(chargeRingSamples(0)).toHaveLength(CHARGE.ringCount);
    });

    // Rings must travel inward; outward would read as an explosion, not a charge.
    test('rings close in on the card', () => {
        const [ring] = chargeRingSamples(0);
        expect(ring.scale).toBeCloseTo(CHARGE.startRadius);
        expect(CHARGE.endRadius).toBeLessThan(CHARGE.startRadius);

        const later = chargeRingSamples(CHARGE.ringPeriodMs * 0.9)[0];
        expect(later.scale).toBeLessThan(ring.scale);
    });

    test('rings are staggered so one is always mid-flight', () => {
        const scales = chargeRingSamples(0).map((r) => r.scale);
        expect(new Set(scales).size).toBe(CHARGE.ringCount);
    });

    test('rings never draw at negative alpha', () => {
        for (let ms = 0; ms < 6000; ms += 37) {
            for (const ring of chargeRingSamples(ms)) {
                expect(ring.alpha).toBeGreaterThanOrEqual(0);
                expect(ring.alpha).toBeLessThanOrEqual(1);
            }
        }
    });

    test('the core grows with the ramp and keeps pulsing', () => {
        expect(chargeCoreSample(0).scale).toBeCloseTo(CHARGE.coreMinScale);
        expect(chargeCoreSample(CHARGE.rampMs).scale).toBeCloseTo(CHARGE.coreMaxScale);

        const a = chargeCoreSample(CHARGE.rampMs + CHARGE.corePulseMs * 0.25).alpha;
        const b = chargeCoreSample(CHARGE.rampMs + CHARGE.corePulseMs * 0.75).alpha;
        expect(a).not.toBeCloseTo(b);
    });

    test('core alpha stays in range for a long aim', () => {
        for (let ms = 0; ms < 30000; ms += 53) {
            const c = chargeCoreSample(ms);
            expect(c.alpha).toBeGreaterThanOrEqual(0);
            expect(c.alpha).toBeLessThanOrEqual(1);
        }
    });
});

describe('blast timeline', () => {
    test('reaches the target then sustains', () => {
        expect(blastSample(0).reach).toBeCloseTo(0);
        expect(blastSample(BLAST.travelMs).reach).toBe(1);
        expect(blastSample(BLAST.travelMs + BLAST.holdMs / 2).reach).toBe(1);
    });

    test('reach only ever advances', () => {
        let prev = -Infinity;
        for (let ms = 0; ms <= BLAST.travelMs; ms += BLAST.travelMs / 10) {
            const { reach } = blastSample(ms);
            expect(reach).toBeGreaterThanOrEqual(prev);
            prev = reach;
        }
    });

    // The flash must not fire before the beam lands, or the hit precedes the shot.
    test('impact waits for the beam to arrive', () => {
        expect(blastSample(0).impactT).toBe(0);
        expect(blastSample(BLAST.travelMs * 0.9).impactT).toBe(0);
        expect(blastSample(BLAST.travelMs + 1).impactT).toBeGreaterThan(0);
    });

    test('column is widest while sustaining, then collapses', () => {
        expect(blastSample(BLAST.travelMs + BLAST.holdMs / 2).width).toBe(1);
        const fading = blastSample(BLAST.travelMs + BLAST.holdMs + BLAST.fadeMs * 0.5);
        expect(fading.width).toBeLessThan(1);
        expect(fading.width).toBeGreaterThan(0);
    });

    test('reports done at the end', () => {
        expect(blastSample(BLAST_TOTAL_MS).done).toBe(true);
        expect(blastSample(BLAST_TOTAL_MS).alpha).toBe(0);
        expect(blastSample(BLAST_TOTAL_MS + 9000).done).toBe(true);
    });
});

describe('beam geometry', () => {
    const from = { x: 0, y: 0 };
    const to = { x: 100, y: 0 };

    test('quad spans the full width across the beam', () => {
        const { points } = beamQuad(from, to, 20, 1);
        expect(points).toHaveLength(8);
        // Horizontal beam: the two source corners straddle y by half the width.
        expect(Math.abs(points[1] - points[7])).toBeCloseTo(20);
    });

    test('head advances with reach', () => {
        expect(beamQuad(from, to, 10, 0.5).head.x).toBeCloseTo(50);
        expect(beamQuad(from, to, 10, 1).head.x).toBeCloseTo(100);
    });

    test('reach is clamped', () => {
        expect(beamQuad(from, to, 10, 4).head.x).toBeCloseTo(100);
        expect(beamQuad(from, to, 10, -2).head.x).toBeCloseTo(0);
    });

    test('thickness is perpendicular on a diagonal shot', () => {
        const diag = beamQuad({ x: 0, y: 0 }, { x: 100, y: 100 }, 20, 1);
        const offX = diag.points[0];
        const offY = diag.points[1];
        // Offset must be perpendicular to the 45-degree travel direction.
        expect(offX + offY).toBeCloseTo(0);
        expect(Math.hypot(offX, offY)).toBeCloseTo(10);
    });

    // Source and target overlapping must not divide by zero.
    test('zero-length beam is safe', () => {
        const { points } = beamQuad(from, from, 10, 1);
        for (const value of points) expect(Number.isFinite(value)).toBe(true);
    });
});
