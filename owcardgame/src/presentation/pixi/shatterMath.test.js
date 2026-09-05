import { SHATTER, WARD, shatterShard, wardSample } from './fxMath';

const origin = { x: 100, y: 80 };

describe('relic shatter', () => {
    test('throws shards outward from the card', () => {
        const start = shatterShard(origin, 0, 0);
        const mid = shatterShard(origin, SHATTER.ms / 2, 0);
        expect(start.x).toBeCloseTo(origin.x);
        expect(start.y).toBeCloseTo(origin.y);
        expect(Math.hypot(mid.x - origin.x, mid.y - origin.y)).toBeGreaterThan(8);
        expect(shatterShard(origin, 0, 0).alpha).toBeGreaterThan(
            shatterShard(origin, SHATTER.ms, 0).alpha
        );
        expect(shatterShard(origin, SHATTER.ms, 0).gone).toBe(true);
    });

    test('seeds a shard per count', () => {
        const seen = new Set();
        for (let i = 0; i < SHATTER.shardCount; i += 1) {
            seen.add(shatterShard(origin, SHATTER.ms / 3, i).x);
        }
        expect(seen.size).toBeGreaterThan(1);
    });
});

describe('proximity ward', () => {
    test('ring grows and fades on the allied card', () => {
        const start = wardSample(0);
        const mid = wardSample(WARD.ms / 2);
        expect(mid.radius).toBeGreaterThan(start.radius);
        expect(start.alpha).toBeGreaterThan(mid.alpha);
        expect(wardSample(WARD.ms).gone).toBe(true);
    });
});
