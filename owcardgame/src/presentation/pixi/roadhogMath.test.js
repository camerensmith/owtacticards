import {
    HOG,
    HOOK,
    chainLinkPoints,
    hogParticleSample,
    hookSample,
    hookTotalMs,
} from './fxMath';

const from = { x: 100, y: 400 };
const to = { x: 400, y: 400 };

describe('chain hook', () => {
    test('throws out, bites, then reels back', () => {
        expect(hookSample(0).reach).toBeCloseTo(0);
        expect(hookSample(HOOK.throwMs).phase).toBe('hold');
        expect(hookSample(HOOK.throwMs).reach).toBeCloseTo(1);
        expect(hookSample(HOOK.throwMs + HOOK.holdMs / 2).reach).toBe(1);
        expect(hookSample(hookTotalMs()).reach).toBeCloseTo(0);
    });

    test('reports its phase and finishes', () => {
        expect(hookSample(HOOK.throwMs / 2).phase).toBe('throw');
        expect(hookSample(HOOK.throwMs + HOOK.holdMs + 10).phase).toBe('reel');
        expect(hookSample(hookTotalMs() - 1).done).toBe(false);
        expect(hookSample(hookTotalMs()).done).toBe(true);
    });

    test('the hook returns to Roadhog rather than stopping short', () => {
        const points = chainLinkPoints(from, to, hookSample(hookTotalMs()).reach);
        const head = points[points.length - 1];
        expect(head.x).toBeCloseTo(from.x);
        expect(head.y).toBeCloseTo(from.y);
    });
});

describe('chain', () => {
    test('runs from Roadhog to the hook head', () => {
        const points = chainLinkPoints(from, to, 1);
        expect(points[0].x).toBeCloseTo(from.x);
        expect(points[points.length - 1].x).toBeCloseTo(to.x);
        expect(points).toHaveLength(HOOK.links + 1);
    });

    test('follows the hook as it travels', () => {
        const half = chainLinkPoints(from, to, 0.5);
        expect(half[half.length - 1].x).toBeCloseTo(from.x + (to.x - from.x) * 0.5);
    });

    // Slack is what makes it read as a chain rather than a rod.
    test('sags in the middle and is taut at both ends', () => {
        const points = chainLinkPoints(from, to, 1);
        const mid = points[Math.floor(points.length / 2)];
        expect(Math.abs(mid.y - from.y)).toBeCloseTo(HOOK.sag, 0);
        expect(points[0].y).toBeCloseTo(from.y);
        expect(points[points.length - 1].y).toBeCloseTo(to.y);
    });

    test('degenerate input does not produce NaN', () => {
        for (const point of chainLinkPoints({}, {}, 1)) {
            expect(Number.isFinite(point.x)).toBe(true);
            expect(Number.isFinite(point.y)).toBe(true);
        }
    });
});

describe('whole hog spray', () => {
    const origin = { x: 300, y: 500 };
    const RIGHT = 0;              // aiming along +x
    const UP = -Math.PI / 2;

    // The board lays the halves out side by side, so the spray has to follow the
    // angle it is given rather than assuming the enemy is above or below.
    test('sprays along whatever angle it is aimed', () => {
        const right = hogParticleSample(3, 300, origin, RIGHT);
        expect(right.x).toBeGreaterThan(origin.x);

        const left = hogParticleSample(3, 300, origin, Math.PI);
        expect(left.x).toBeLessThan(origin.x);

        const up = hogParticleSample(3, 300, origin, UP);
        expect(up.y).toBeLessThan(origin.y);
    });

    test('starts at Roadhog and travels outward', () => {
        const start = hogParticleSample(1, 0, origin, RIGHT);
        expect(start.x).toBeCloseTo(origin.x);
        expect(start.y).toBeCloseTo(origin.y);

        const later = hogParticleSample(1, 400, origin, RIGHT);
        expect(Math.hypot(later.x - origin.x, later.y - origin.y)).toBeGreaterThan(50);
    });

    // A V, not a line: chunks must fan but stay within the cone.
    test('fans out within the cone around the aim', () => {
        const angles = [];
        for (let seed = 0; seed < 40; seed += 1) {
            const s = hogParticleSample(seed, 300, origin, RIGHT);
            angles.push(Math.atan2(s.y - origin.y, s.x - origin.x));
        }
        expect(Math.max(...angles) - Math.min(...angles)).toBeGreaterThan(0.2);
        for (const angle of angles) {
            expect(Math.abs(angle - RIGHT)).toBeLessThanOrEqual(HOG.spread + 1e-9);
        }
    });

    // A chunk that changed heading mid-flight would look like static.
    test('a chunk holds its heading for its whole life', () => {
        const early = hogParticleSample(7, 100, origin, RIGHT);
        const late = hogParticleSample(7, 400, origin, RIGHT);
        const a1 = Math.atan2(early.y - origin.y, early.x - origin.x);
        const a2 = Math.atan2(late.y - origin.y, late.x - origin.x);
        expect(a1).toBeCloseTo(a2, 5);
    });

    test('chunks tumble as they fly', () => {
        const early = hogParticleSample(5, 50, origin, RIGHT);
        const late = hogParticleSample(5, 400, origin, RIGHT);
        expect(early.rotation).not.toBeCloseTo(late.rotation);
    });

    // Yellow, grey and soot — a single colour would read as smoke.
    test('chunks come in all three debris colours', () => {
        const kinds = new Set();
        for (let seed = 0; seed < 60; seed += 1) {
            kinds.add(hogParticleSample(seed, 100, origin, RIGHT).kind);
        }
        expect(kinds).toEqual(new Set([0, 1, 2]));
    });

    test('shrinks and fades out, then expires', () => {
        const young = hogParticleSample(2, 0, origin, RIGHT);
        const old = hogParticleSample(2, HOG.lifeMs * 0.9, origin, RIGHT);
        expect(old.size).toBeLessThan(young.size);
        expect(old.alpha).toBeLessThan(young.alpha);
        expect(hogParticleSample(2, HOG.lifeMs, origin, RIGHT).done).toBe(true);
    });

    test('chunks differ from one another', () => {
        const a = hogParticleSample(11, 300, origin, RIGHT);
        const b = hogParticleSample(12, 300, origin, RIGHT);
        expect(a.x).not.toBeCloseTo(b.x);
    });
});
