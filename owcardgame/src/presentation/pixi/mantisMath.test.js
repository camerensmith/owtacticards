import {
    MANTIS,
    mantisCloakBurstSample,
    mantisCloakCamoPuffs,
    mantisEnergySlashSample,
    mantisBladeDanceSample,
} from './fxMath';

test('cloak burst opens then closes', () => {
    expect(mantisCloakBurstSample(0).open).toBeCloseTo(0);
    expect(mantisCloakBurstSample(MANTIS.cloakBurstMs / 2).open).toBeGreaterThan(0.5);
    expect(mantisCloakBurstSample(MANTIS.cloakBurstMs).done).toBe(true);
});

test('camo puffs keep drifting', () => {
    const a = mantisCloakCamoPuffs(0).puffs;
    const b = mantisCloakCamoPuffs(400).puffs;
    expect(a).toHaveLength(MANTIS.cloakPuffs);
    expect(b[0].angle).not.toBeCloseTo(a[0].angle);
});

test('energy slash cuts then fades', () => {
    expect(mantisEnergySlashSample(0).cut).toBeCloseTo(0);
    expect(mantisEnergySlashSample(MANTIS.slashMs * 0.5).cut).toBeCloseTo(1);
    expect(mantisEnergySlashSample(MANTIS.slashMs).done).toBe(true);
});

test('blade dance spins multiple blades', () => {
    const s = mantisBladeDanceSample(200);
    expect(s.blades).toHaveLength(MANTIS.danceBlades);
    expect(s.shroudAlpha).toBeGreaterThan(0);
    expect(mantisBladeDanceSample(MANTIS.danceMs).done).toBe(true);
});
