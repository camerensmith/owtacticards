import {
    DRAGONSTRIKE,
    SONIC,
    dragonstrikeHitMs,
    dragonstrikeSample,
    dragonstrikeStrand,
    sonicArrowSample,
    sonicPulseArcs,
} from './fxMath';

const from = { x: 80, y: 300 };
const to = { x: 700, y: 300 };

describe('Sonic Arrow', () => {
    test('flies from Hanzo to the row and lands', () => {
        expect(sonicArrowSample(0, from, to).x).toBeCloseTo(from.x);
        const end = sonicArrowSample(SONIC.arrowMs, from, to);
        expect(end.x).toBeCloseTo(to.x);
        expect(end.done).toBe(true);
    });

    test('points the way it is travelling', () => {
        const up = sonicArrowSample(10, { x: 0, y: 100 }, { x: 0, y: 0 });
        expect(up.angle).toBeCloseTo(-Math.PI / 2, 5);
    });

    test('never fades to a negative alpha', () => {
        for (let ms = 0; ms <= SONIC.arrowMs; ms += 20) {
            expect(sonicArrowSample(ms, from, to).alpha).toBeGreaterThanOrEqual(0);
        }
    });
});

describe('Sonar breath on a marked row', () => {
    test('rolls arcs one after another rather than throbbing together', () => {
        const arcs = sonicPulseArcs(0);
        expect(arcs).toHaveLength(SONIC.arcs);
        const positions = arcs.map((a) => a.t);
        expect(new Set(positions).size).toBe(SONIC.arcs);
    });

    test('each arc fades in and back out across its travel', () => {
        const arc = (ms) => sonicPulseArcs(ms)[0];
        expect(arc(0).alpha).toBeCloseTo(0, 5);
        expect(arc(SONIC.pulseMs / 2).alpha).toBeGreaterThan(arc(0).alpha);
    });

    test('stays subtle', () => {
        for (let ms = 0; ms < SONIC.pulseMs; ms += 120) {
            for (const arc of sonicPulseArcs(ms)) {
                expect(arc.alpha).toBeLessThanOrEqual(SONIC.alpha);
            }
        }
    });

    test('the cycle repeats seamlessly', () => {
        const looped = sonicPulseArcs(SONIC.pulseMs);
        sonicPulseArcs(0).forEach((arc, i) => {
            expect(looped[i].t).toBeCloseTo(arc.t, 10);
            expect(looped[i].alpha).toBeCloseTo(arc.alpha, 10);
        });
    });
});

describe('Dragonstrike helix', () => {
    test('the tail clears the far end before the effect finishes', () => {
        const end = dragonstrikeSample(DRAGONSTRIKE.ms);
        expect(end.head).toBeGreaterThan(1);
        expect(end.done).toBe(true);
    });

    test('the body slides on rather than appearing whole', () => {
        const early = dragonstrikeStrand(0.05, from, to, 0);
        const mid = dragonstrikeStrand(0.5, from, to, 0);
        expect(early.length).toBeLessThan(mid.length);
    });

    test('the body leaves the board at the end', () => {
        // At exactly head = 1 + bodyLength only the very tip of the tail is
        // still on the path; a moment later nothing is left.
        const tail = dragonstrikeStrand(1 + DRAGONSTRIKE.bodyLength, from, to, 0);
        expect(tail).toHaveLength(1);
        expect(tail[0].x).toBeCloseTo(to.x, 5);
        expect(dragonstrikeStrand(1 + DRAGONSTRIKE.bodyLength + 0.01, from, to, 0)).toHaveLength(0);
    });

    test('the two strands run apart from one another', () => {
        const a = dragonstrikeStrand(0.5, from, to, 0);
        const b = dragonstrikeStrand(0.5, from, to, 1);
        expect(a).toHaveLength(b.length);
        // Half a turn apart, so they cross rather than overlap.
        expect(Math.abs(a[0].y - b[0].y)).toBeGreaterThan(1);
    });

    test('it twists rather than running straight', () => {
        const points = dragonstrikeStrand(0.9, from, to, 0);
        const offsets = points.map((p) => p.y - from.y);
        expect(Math.max(...offsets)).toBeGreaterThan(0);
        expect(Math.min(...offsets)).toBeLessThan(0);
    });

    test('the body tapers toward its tail', () => {
        const points = dragonstrikeStrand(0.9, from, to, 0);
        expect(points[points.length - 1].width).toBeLessThan(points[0].width);
    });

    test('rows are struck in order as the dragon passes, not on release', () => {
        expect(dragonstrikeHitMs(0)).toBeGreaterThan(0);
        expect(dragonstrikeHitMs(1)).toBeGreaterThan(dragonstrikeHitMs(0));
        expect(dragonstrikeHitMs(2)).toBeLessThan(DRAGONSTRIKE.ms);
    });
});
