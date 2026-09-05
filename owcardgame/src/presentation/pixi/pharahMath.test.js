import {
    BARRAGE,
    CONCUSSIVE,
    SHURIKEN,
    SLICE,
    barrageImpactMs,
    barrageLiftSample,
    barrageRocketSample,
    barrageTotalMs,
    concussiveSample,
    concussiveTotalMs,
    shurikenSample,
    sliceSample,
} from './fxMath';

describe('concussive blast', () => {
    // "Lands in front of the target": it must stop short, then expand.
    test('stops short of the target rather than reaching it', () => {
        expect(CONCUSSIVE.standoff).toBeLessThan(1);
        expect(concussiveSample(CONCUSSIVE.travelMs).reach).toBeCloseTo(CONCUSSIVE.standoff);
    });

    test('flies small, then expands from where it landed', () => {
        const flying = concussiveSample(CONCUSSIVE.travelMs / 2);
        expect(flying.flying).toBe(true);
        expect(flying.radius).toBeCloseTo(CONCUSSIVE.startRadius);

        const late = concussiveSample(CONCUSSIVE.travelMs + CONCUSSIVE.expandMs * 0.9);
        expect(late.flying).toBe(false);
        expect(late.radius).toBeGreaterThan(CONCUSSIVE.startRadius * 3);
        expect(late.reach).toBeCloseTo(CONCUSSIVE.standoff);
    });

    test('fades as it expands, then finishes', () => {
        expect(concussiveSample(CONCUSSIVE.travelMs).alpha).toBeCloseTo(1);
        expect(concussiveSample(concussiveTotalMs()).done).toBe(true);
    });
});

describe('rocket barrage', () => {
    test('Pharah climbs before firing and lands after the last impact', () => {
        expect(barrageLiftSample(0, 3).lift).toBeCloseTo(0);
        expect(barrageLiftSample(BARRAGE.liftMs, 3).lift).toBeCloseTo(BARRAGE.lift);
        expect(barrageLiftSample(barrageTotalMs(3), 3).lift).toBeCloseTo(0);
        expect(barrageLiftSample(barrageTotalMs(3), 3).done).toBe(true);
    });

    test('locks on before the tubes open', () => {
        const lock = barrageRocketSample(BARRAGE.liftMs + BARRAGE.lockMs / 2, 0);
        expect(lock.phase).toBe('lock');
        expect(lock.lockT).toBeGreaterThan(0);
        expect(lock.reach).toBe(0);
    });

    test('rockets leave in sequence, not together', () => {
        const t = BARRAGE.liftMs + BARRAGE.lockMs + 10;
        expect(barrageRocketSample(t, 0).phase).toBe('fly');
        expect(barrageRocketSample(t, 2).phase).toBe('lock');
        expect(barrageImpactMs(2)).toBeGreaterThan(barrageImpactMs(0));
    });

    // The point of the change: damage lands with the rocket, not on launch.
    test('impact time matches when the rocket arrives', () => {
        const impact = barrageImpactMs(1);
        expect(barrageRocketSample(impact - 5, 1).phase).toBe('fly');
        expect(barrageRocketSample(impact + 5, 1).phase).toBe('burst');
    });
});

describe('shuriken', () => {
    test('takes one hop per target and then stops', () => {
        expect(shurikenSample(0, 3).index).toBe(0);
        expect(shurikenSample(SHURIKEN.hopMs * 1.5, 3).index).toBe(1);
        expect(shurikenSample(SHURIKEN.hopMs * 3, 3).done).toBe(true);
    });

    // It bounces between targets rather than sliding along a line.
    test('arcs between targets and lands flat on each', () => {
        expect(shurikenSample(0, 2).hop).toBeCloseTo(0);
        expect(shurikenSample(SHURIKEN.hopMs / 2, 2).hop).toBeCloseTo(SHURIKEN.hop);
        expect(shurikenSample(SHURIKEN.hopMs, 2).hop).toBeCloseTo(0);
    });

    test('spins the whole way', () => {
        expect(shurikenSample(300, 3).rotation).toBeGreaterThan(0);
    });

    test('never indexes past the last target', () => {
        expect(shurikenSample(SHURIKEN.hopMs * 99, 2).index).toBe(1);
    });
});

describe('dragon blade', () => {
    test('winds up, cuts fast, then fades', () => {
        expect(sliceSample(0).phase).toBe('windup');
        expect(sliceSample(SLICE.windupMs + 1).phase).toBe('cut');
        expect(sliceSample(SLICE.windupMs + SLICE.cutMs + 1).phase).toBe('fade');
        expect(sliceSample(SLICE.windupMs + SLICE.cutMs + SLICE.fadeMs).done).toBe(true);
    });

    // A slow cut reads as a beam; the speed is what makes it a slice.
    test('the cut is the shortest phase', () => {
        expect(SLICE.cutMs).toBeLessThan(SLICE.windupMs);
        expect(SLICE.cutMs).toBeLessThan(SLICE.fadeMs);
    });

    test('the stroke completes and holds while it fades', () => {
        expect(sliceSample(0).cut).toBe(0);
        expect(sliceSample(SLICE.windupMs + SLICE.cutMs).cut).toBeCloseTo(1);
        expect(sliceSample(SLICE.windupMs + SLICE.cutMs + SLICE.fadeMs / 2).cut).toBe(1);
    });
});
