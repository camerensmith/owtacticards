import {
    ORB_TOKEN,
    TRANSCEND,
    orbJumpSample,
    orbRestPoint,
    transcendRays,
    transcendSample,
} from './fxMath';

const card = { x: 200, y: 300, width: 64, height: 90 };

describe('orb hover', () => {
    // The orb belongs to the card it is on, so it sits above that card.
    test('rests above the card it is attached to', () => {
        const rest = orbRestPoint(card, 0);
        expect(rest.x).toBeCloseTo(card.x);
        expect(rest.y).toBeLessThan(card.y);
    });

    test('bobs gently without drifting away', () => {
        const base = card.y - card.height * ORB_TOKEN.hover;
        for (let ms = 0; ms < ORB_TOKEN.bobMs * 2; ms += 40) {
            const { y } = orbRestPoint(card, ms);
            expect(Math.abs(y - base)).toBeLessThanOrEqual(ORB_TOKEN.bob + 1e-6);
        }
        expect(orbRestPoint(card, ORB_TOKEN.bobMs).y).toBeCloseTo(orbRestPoint(card, 0).y);
    });

    test('turns slowly', () => {
        expect(orbRestPoint(card, 0).rotation).toBeCloseTo(0);
        expect(orbRestPoint(card, 2000).rotation).toBeGreaterThan(0);
    });
});

describe('orb jump', () => {
    test('travels from old host to new and settles', () => {
        expect(orbJumpSample(0).t).toBeCloseTo(0);
        expect(orbJumpSample(ORB_TOKEN.jumpMs).t).toBeCloseTo(1);
        expect(orbJumpSample(ORB_TOKEN.jumpMs).done).toBe(true);
    });

    // Lifting between the two cards is what makes the jump readable.
    test('arcs in flight and lands flat at both ends', () => {
        expect(orbJumpSample(0).arc).toBeCloseTo(0);
        expect(orbJumpSample(ORB_TOKEN.jumpMs / 2).arc).toBeCloseTo(ORB_TOKEN.jumpArc);
        expect(orbJumpSample(ORB_TOKEN.jumpMs).arc).toBeCloseTo(0);
    });

    test('swells mid-flight then returns to size', () => {
        expect(orbJumpSample(0).scale).toBeCloseTo(1);
        expect(orbJumpSample(ORB_TOKEN.jumpMs / 2).scale).toBeGreaterThan(1);
        expect(orbJumpSample(ORB_TOKEN.jumpMs).scale).toBeCloseTo(1);
    });
});

describe('transcendence', () => {
    test('bursts once, then stops bursting', () => {
        expect(transcendSample(0).bursting).toBe(true);
        expect(transcendSample(TRANSCEND.burstMs).bursting).toBe(false);
    });

    test('rays extend then fade', () => {
        expect(transcendSample(0).rayLength).toBeCloseTo(0);
        expect(transcendSample(TRANSCEND.burstMs).rayLength).toBeCloseTo(TRANSCEND.rayLength);
        expect(transcendSample(TRANSCEND.burstMs * 0.5).rayAlpha).toBeCloseTo(1);
        expect(transcendSample(TRANSCEND.burstMs).rayAlpha).toBeCloseTo(0);
    });

    // The glow lasts the round, so it must never fade out on its own.
    test('the golden glow persists long after the burst', () => {
        for (const ms of [0, 5000, 60000, 600000]) {
            const { glow } = transcendSample(ms);
            expect(glow).toBeGreaterThanOrEqual(TRANSCEND.glowMin - 1e-9);
            expect(glow).toBeLessThanOrEqual(TRANSCEND.glowMax + 1e-9);
        }
    });

    test('rays ring the card and alternate length', () => {
        const rays = transcendRays(0);
        expect(rays).toHaveLength(TRANSCEND.rays);
        expect(new Set(rays.map((r) => r.scale)).size).toBe(2);
        expect(rays[rays.length - 1].angle).toBeLessThan(Math.PI * 2);
    });

    test('the halo turns over time', () => {
        expect(transcendRays(4000)[0].angle).toBeGreaterThan(transcendRays(0)[0].angle);
    });
});
