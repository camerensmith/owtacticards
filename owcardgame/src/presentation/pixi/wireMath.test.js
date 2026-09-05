import { WIRE, wireControlPoint, wirePoint, wireSample, wireSparks, ZAP, zapBolt } from './fxMath';

const from = { x: 0, y: 0 };
const to = { x: 100, y: 0 };

describe('neon tripwire', () => {
    test('sags off the straight line between the two rows', () => {
        const mid = wirePoint(from, to, 0.5);
        expect(mid.x).toBeCloseTo(50);
        expect(mid.y).not.toBeCloseTo(0);
        const control = wireControlPoint(from, to);
        expect(control.y).not.toBeCloseTo(0);
    });

    test('endpoints sit on the two row anchors', () => {
        expect(wirePoint(from, to, 0)).toEqual(from);
        expect(wirePoint(from, to, 1)).toEqual(to);
    });

    test('breathes between its alpha bounds', () => {
        for (let ms = 0; ms < WIRE.pulseMs * 2; ms += 41) {
            const { alpha } = wireSample(ms);
            expect(alpha).toBeGreaterThanOrEqual(WIRE.minAlpha - 1e-9);
            expect(alpha).toBeLessThanOrEqual(WIRE.maxAlpha + 1e-9);
        }
    });

    test('sparks travel along the wire over time', () => {
        const a = wireSparks(from, to, 0)[0];
        const b = wireSparks(from, to, WIRE.sparkPeriodMs / 2)[0];
        expect(a.x).not.toBeCloseTo(b.x);
        expect(wireSparks(from, to, 0)).toHaveLength(WIRE.sparkCount);
    });
});

const card = { x: 200, y: 120, width: 80, height: 100 };

describe('killswitch zap', () => {
    test('keeps bolts on the affected card', () => {
        const bolt = zapBolt(card, 0, 0);
        expect(bolt.points.length).toBeGreaterThan(2);
        for (const p of bolt.points) {
            expect(p.x).toBeGreaterThan(card.x - card.width);
            expect(p.x).toBeLessThan(card.x + card.width);
            expect(p.y).toBeGreaterThanOrEqual(card.y - card.height / 2 - 1);
            expect(p.y).toBeLessThanOrEqual(card.y + card.height / 2 + 1);
        }
    });

    test('fades out over its lifetime', () => {
        expect(zapBolt(card, 0, 0).alpha).toBeGreaterThan(zapBolt(card, ZAP.ms, 0).alpha);
        expect(zapBolt(card, ZAP.ms, 0).gone).toBe(true);
    });
});
