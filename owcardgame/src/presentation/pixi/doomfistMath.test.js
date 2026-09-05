import {
    METEOR,
    PUNCH,
    RIFLE,
    meteorCracks,
    meteorDebris,
    meteorRipple,
    meteorSample,
    meteorTotalMs,
    punchSample,
    punchTotalMs,
    rifleSample,
} from './fxMath';

describe('rocket punch', () => {
    test('snaps out, connects, then withdraws', () => {
        expect(punchSample(0).reach).toBeCloseTo(0);
        expect(punchSample(PUNCH.outMs).reach).toBeCloseTo(1);
        expect(punchSample(PUNCH.outMs + PUNCH.holdMs / 2).reach).toBe(1);
        expect(punchSample(punchTotalMs()).done).toBe(true);
    });

    // The tail catching up is what makes it retract rather than just vanish.
    test('retracts by drawing the tail in, not by fading out', () => {
        expect(punchSample(PUNCH.outMs).tail).toBe(0);
        const back = punchSample(PUNCH.outMs + PUNCH.holdMs + PUNCH.backMs * 0.9);
        expect(back.tail).toBeGreaterThan(0.8);
        expect(back.alpha).toBeGreaterThan(0.5);
    });

    // A jab: out fast, back slower.
    test('the strike is quicker than the recovery', () => {
        expect(PUNCH.outMs).toBeLessThan(PUNCH.backMs);
    });
});

describe('meteor strike', () => {
    test('runs launch, hang, slam, ripple, return', () => {
        const at = (ms) => meteorSample(ms).phase;
        expect(at(0)).toBe('launch');
        expect(at(METEOR.launchMs + 1)).toBe('hang');
        expect(at(METEOR.launchMs + METEOR.hangMs + 1)).toBe('slam');
        expect(at(METEOR.launchMs + METEOR.hangMs + METEOR.slamMs + 1)).toBe('ripple');
        expect(meteorSample(meteorTotalMs()).done).toBe(true);
    });

    // He has to actually leave the board, or it reads as a hop.
    test('climbs out of sight on the way up', () => {
        expect(meteorSample(0).climb).toBeCloseTo(0);
        expect(meteorSample(0).alpha).toBeCloseTo(1);
        const top = meteorSample(METEOR.launchMs);
        expect(top.climb).toBeCloseTo(METEOR.climb);
        expect(top.alpha).toBeCloseTo(0);
    });

    test('drops onto the target from above and lands flat', () => {
        const start = meteorSample(METEOR.launchMs + METEOR.hangMs + 1);
        expect(start.climb).toBeGreaterThan(0);
        const landed = meteorSample(METEOR.launchMs + METEOR.hangMs + METEOR.slamMs);
        expect(landed.climb).toBeCloseTo(0);
    });

    test('the slam is faster than the climb', () => {
        expect(METEOR.slamMs).toBeLessThan(METEOR.launchMs);
    });

    test('returns all the way home', () => {
        expect(meteorSample(meteorTotalMs() - 1).progress).toBeGreaterThan(0.9);
    });

    // The landing used to be three thin rings and nothing else. These are the
    // parts that make it read as falling out of the sky.
    describe('the landing', () => {
        const impact = METEOR.launchMs + METEOR.hangMs + METEOR.slamMs;

        test('a shadow gathers on the target before he arrives', () => {
            const early = meteorSample(METEOR.launchMs + 1);
            const late = meteorSample(METEOR.launchMs + METEOR.hangMs - 1);
            expect(early.shadow).toBeGreaterThan(0);
            expect(late.shadow).toBeGreaterThan(early.shadow);
        });

        test('the shadow tightens to full size as he lands', () => {
            expect(meteorSample(impact - 1).shadow).toBeCloseTo(1, 1);
        });

        test('the hang is long enough to read as anticipation', () => {
            expect(METEOR.hangMs).toBeGreaterThan(METEOR.slamMs);
        });

        test('contact whites out, then clears well before the ripple ends', () => {
            expect(meteorSample(impact + 1).flash).toBeGreaterThan(0.9);
            expect(meteorSample(impact + METEOR.flashMs + 1).flash).toBe(0);
        });

        test('cracks tear outward from the crater and fade', () => {
            const early = meteorCracks(0.15, 100);
            const late = meteorCracks(0.8, 100);
            expect(early).toHaveLength(METEOR.cracks);
            const reach = (cracks) => Math.max(...cracks.map((c) => Math.hypot(
                c.points[c.points.length - 1].x,
                c.points[c.points.length - 1].y,
            )));
            expect(reach(late)).toBeGreaterThan(reach(early));
            expect(late[0].alpha).toBeLessThan(early[0].alpha);
        });

        test('a crack keeps its shape as it lengthens rather than writhing', () => {
            const angleOf = (t) => {
                const tip = meteorCracks(t, 100)[0].points[2];
                return Math.atan2(tip.y, tip.x);
            };
            expect(angleOf(0.4)).toBeCloseTo(angleOf(0.9), 1);
        });

        test('debris is thrown up and pulled back down', () => {
            const chunks = meteorDebris(0.5, 100);
            expect(chunks).toHaveLength(METEOR.debris);
            // Highest point is mid-flight, not at the start or the end.
            const height = (t) => Math.min(...meteorDebris(t, 100).map((c) => c.y));
            expect(height(0.5)).toBeLessThan(height(0.05));
            expect(height(0.5)).toBeLessThan(height(0.95));
        });

        test('debris and cracks are gone by the time he flies home', () => {
            expect(meteorDebris(1, 100).every((c) => c.alpha === 0)).toBe(true);
            expect(meteorCracks(1, 100).every((c) => c.alpha === 0)).toBe(true);
        });
    });

    test('ripple rings set off in sequence and expand outward', () => {
        const first = meteorRipple(0, 0.5, 100);
        const third = meteorRipple(2, 0.5, 100);
        expect(first.visible).toBe(true);
        expect(first.radius).toBeGreaterThan(third.radius);
        expect(meteorRipple(2, 0.05, 100).visible).toBe(false);
    });
});

describe('synth rifle', () => {
    // A rifle shot arrives; it does not travel visibly like a lobbed ball.
    test('reaches the target almost immediately', () => {
        expect(rifleSample(RIFLE.beamMs * 0.25).reach).toBeCloseTo(1);
    });

    test('thins and fades rather than snapping off', () => {
        const mid = rifleSample(RIFLE.beamMs * 0.6);
        expect(mid.width).toBeLessThan(1);
        expect(mid.width).toBeGreaterThan(0);
        expect(mid.alpha).toBeLessThan(1);
        expect(rifleSample(RIFLE.beamMs).done).toBe(true);
    });

    // Override Protocol fires one shot after another, not all at once.
    test('the volley is staggered', () => {
        expect(RIFLE.staggerMs).toBeGreaterThan(0);
    });
});
