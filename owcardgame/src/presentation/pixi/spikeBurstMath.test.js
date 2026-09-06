import {
    SPIKE_BURST,
    SPIKE_BURST_TOTAL_MS,
    spikeBurstSample,
    spikeBurstLayout,
} from './fxMath';

describe('spike burst timeline', () => {
    test('grows then fades to done', () => {
        expect(spikeBurstSample(0).grow).toBeCloseTo(0);
        expect(spikeBurstSample(0).alpha).toBe(1);
        expect(spikeBurstSample(SPIKE_BURST.growMs).grow).toBe(1);
        const midFade = spikeBurstSample(SPIKE_BURST.growMs + SPIKE_BURST.holdMs + SPIKE_BURST.fadeMs * 0.5);
        expect(midFade.alpha).toBeLessThan(1);
        expect(midFade.alpha).toBeGreaterThan(0);
        expect(spikeBurstSample(SPIKE_BURST_TOTAL_MS).done).toBe(true);
        expect(spikeBurstSample(SPIKE_BURST_TOTAL_MS).alpha).toBe(0);
    });
});

describe('spike burst layout', () => {
    test('places spikes around the card perimeter pointing outward', () => {
        const rect = { left: 100, top: 50, width: 80, height: 120 };
        const spikes = spikeBurstLayout(rect, SPIKE_BURST.count);
        expect(spikes).toHaveLength(SPIKE_BURST.count);
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        for (const s of spikes) {
            const toBaseX = s.baseX - cx;
            const toBaseY = s.baseY - cy;
            // Outward normal aligns with vector from center to base
            expect(s.nx * toBaseX + s.ny * toBaseY).toBeGreaterThan(0);
        }
    });
});
