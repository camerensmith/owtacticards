import {
    BUBBLE,
    BURROW,
    MATRIX,
    PRIMAL,
    TECTONIC,
    bubbleSample,
    burrowMounds,
    burrowSample,
    burrowTotalMs,
    matrixPanels,
    matrixSample,
    matrixTotalMs,
    primalSample,
    primalTotalMs,
    tectonicSample,
} from './fxMath';

const card = { x: 200, y: 300, width: 64, height: 90 };

describe('defense matrix', () => {
    test('deploys, holds, then folds away', () => {
        expect(matrixSample(0).deploy).toBeCloseTo(0);
        expect(matrixSample(MATRIX.deployMs).deploy).toBeCloseTo(1);
        expect(matrixSample(MATRIX.deployMs + MATRIX.holdMs / 2).alpha).toBe(1);
        expect(matrixSample(matrixTotalMs()).done).toBe(true);
    });

    test('shows exactly three panels', () => {
        expect(matrixPanels(card, 1)).toHaveLength(3);
        expect(MATRIX.panels).toBe(3);
    });

    // They extend out from the card, toward the enemy.
    test('panels sit progressively further out along the facing', () => {
        const panels = matrixPanels(card, 1, { x: 1, y: 0 });
        expect(panels[0].x).toBeGreaterThan(card.x);
        expect(panels[1].x).toBeGreaterThan(panels[0].x);
        expect(panels[2].x).toBeGreaterThan(panels[1].x);
    });

    test('facing flips which side they deploy to', () => {
        expect(matrixPanels(card, 1, { x: -1, y: 0 })[0].x).toBeLessThan(card.x);
        expect(matrixPanels(card, 1, { x: 0, y: 1 })[0].y).toBeGreaterThan(card.y);
    });

    // Staggering is what makes it read as unfolding rather than blinking on.
    test('outer panels lag behind inner ones on the way out', () => {
        const partial = matrixPanels(card, 0.35, { x: 1, y: 0 });
        expect(partial[0].alpha).toBeGreaterThan(partial[2].alpha);
    });

    test('all panels are stowed at zero deploy', () => {
        for (const panel of matrixPanels(card, 0, { x: 1, y: 0 })) {
            expect(panel.x).toBeCloseTo(card.x);
        }
    });
});

describe('winston bubble', () => {
    // It lasts as long as the shields, so it must never fade to nothing.
    test('holds a steady presence and shimmers', () => {
        for (let ms = 0; ms < BUBBLE.shimmerMs * 2; ms += 40) {
            const s = bubbleSample(ms);
            expect(s.coreAlpha).toBeCloseTo(BUBBLE.coreAlpha);
            expect(s.rimAlpha).toBeGreaterThan(0);
            expect(s.rimAlpha).toBeLessThanOrEqual(BUBBLE.rimAlpha + 1e-9);
        }
    });

    // "Mostly opaque center" is the brief: the core is solid, not a thin ring.
    test('the core is substantially opaque', () => {
        expect(bubbleSample(0).coreAlpha).toBeGreaterThan(0.2);
    });

    test('breathes only slightly', () => {
        for (let ms = 0; ms < BUBBLE.shimmerMs; ms += 50) {
            expect(Math.abs(bubbleSample(ms).scale - 1)).toBeLessThanOrEqual(0.03);
        }
    });
});

describe('primal rage', () => {
    test('grows, pounds, then settles back', () => {
        expect(primalSample(0).scale).toBeCloseTo(1);
        expect(primalSample(PRIMAL.growMs).scale).toBeCloseTo(PRIMAL.scale);
        expect(primalSample(primalTotalMs()).done).toBe(true);
    });

    test('lands the configured number of pounds', () => {
        const seen = new Set();
        for (let ms = PRIMAL.growMs; ms < PRIMAL.growMs + PRIMAL.pounds * PRIMAL.poundMs; ms += 20) {
            const s = primalSample(ms);
            if (s.phase === 'pound') seen.add(s.poundIndex);
        }
        expect(seen.size).toBe(PRIMAL.pounds);
    });

    test('each pound rises and returns', () => {
        const start = primalSample(PRIMAL.growMs);
        const mid = primalSample(PRIMAL.growMs + PRIMAL.poundMs / 2);
        expect(start.pound).toBeCloseTo(0);
        expect(mid.pound).toBeCloseTo(1);
    });

    test('returns to normal size by the end', () => {
        expect(primalSample(primalTotalMs()).scale).toBeCloseTo(1);
    });

    // The shockwave ages on `poundT`, not on `pound`. Driving it from the
    // rebound put the ring at radius zero exactly when it was brightest and
    // fully faded at both ends of the pound, so it could never be seen.
    test('each pound exposes its own progress for the shockwave', () => {
        const start = primalSample(PRIMAL.growMs);
        const mid = primalSample(PRIMAL.growMs + PRIMAL.poundMs / 2);
        const late = primalSample(PRIMAL.growMs + PRIMAL.poundMs * 0.95);
        expect(start.poundT).toBeCloseTo(0);
        expect(mid.poundT).toBeCloseTo(0.5);
        expect(late.poundT).toBeGreaterThan(mid.poundT);
    });

    test('the shockwave restarts with every pound', () => {
        const first = primalSample(PRIMAL.growMs + PRIMAL.poundMs * 0.1);
        const second = primalSample(PRIMAL.growMs + PRIMAL.poundMs * 1.1);
        expect(second.poundIndex).toBe(first.poundIndex + 1);
        expect(second.poundT).toBeCloseTo(first.poundT);
    });
});

describe('drill dash', () => {
    const from = { x: 0, y: 0 };
    const to = { x: 300, y: 0 };

    test('tunnels across, then erupts', () => {
        expect(burrowSample(0).digging).toBe(true);
        expect(burrowSample(BURROW.travelMs).digging).toBe(false);
        expect(burrowSample(BURROW.travelMs).eruptT).toBeCloseTo(0);
        expect(burrowSample(burrowTotalMs()).done).toBe(true);
    });

    // The trail should only exist behind the drill head.
    test('mounds appear progressively along the tunnel', () => {
        expect(burrowMounds(from, to, 0)).toHaveLength(0);
        const partial = burrowMounds(from, to, 0.5);
        const full = burrowMounds(from, to, 1);
        expect(partial.length).toBeGreaterThan(0);
        expect(full.length).toBeGreaterThan(partial.length);
        for (const mound of partial) expect(mound.x).toBeLessThanOrEqual(to.x * 0.55);
    });

    test('mounds scatter either side of the line', () => {
        const ys = burrowMounds(from, to, 1).map((m) => m.y);
        expect(Math.max(...ys)).toBeGreaterThan(0);
        expect(Math.min(...ys)).toBeLessThan(0);
        for (const y of ys) expect(Math.abs(y)).toBeLessThanOrEqual(BURROW.scatter + 1e-6);
    });

    test('the trail is stable rather than crawling', () => {
        expect(burrowMounds(from, to, 1)).toEqual(burrowMounds(from, to, 1));
    });
});

describe('tectonic shock', () => {
    test('shakes hard at first and settles by the end', () => {
        const early = tectonicSample(50, 0);
        const late = tectonicSample(TECTONIC.durationMs * 0.95, 0);
        expect(Math.hypot(early.offsetX, early.offsetY))
            .toBeGreaterThan(Math.hypot(late.offsetX, late.offsetY));
        expect(tectonicSample(TECTONIC.durationMs, 0).done).toBe(true);
    });

    test('never shakes further than its limit', () => {
        for (let ms = 0; ms < TECTONIC.durationMs; ms += 10) {
            const s = tectonicSample(ms, 3);
            expect(Math.abs(s.offsetX)).toBeLessThanOrEqual(TECTONIC.shake + 1e-6);
            expect(Math.abs(s.offsetY)).toBeLessThanOrEqual(TECTONIC.shake + 1e-6);
        }
    });

    test('tumbles a whole number of turns', () => {
        const end = tectonicSample(TECTONIC.durationMs, 0);
        expect(Math.abs(end.rotation)).toBeCloseTo(Math.PI * 2 * TECTONIC.flips);
    });

    // Cards flipping in unison would read as one object, not chaos.
    test('cards tumble out of step with one another', () => {
        const offsets = [0, 1, 2, 3].map((seed) => tectonicSample(120, seed).offsetX);
        expect(new Set(offsets.map((o) => Math.round(o * 10))).size).toBeGreaterThan(1);
        const spins = [0, 1, 2, 3, 4].map((seed) => Math.sign(tectonicSample(300, seed).rotation));
        expect(new Set(spins).size).toBeGreaterThan(1);
    });
});
