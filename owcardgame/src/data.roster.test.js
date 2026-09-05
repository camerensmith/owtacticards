import data from './data';

test('Tracer is 2 HP and Sylvain is 3 HP', () => {
    expect(data.heroes.tracer.health).toBe(2);
    expect(data.heroes.sylvain.health).toBe(3);
});

test('Doomfist printed contributions are 3/1, 2/3, 2/2', () => {
    expect(data.heroes.doomfist.power).toEqual({ f: 3, m: 2, b: 2 });
    expect(data.heroes.doomfist.synergy).toEqual({ f: 1, m: 3, b: 2 });
});

test('Guardian Tide costs 3', () => {
    expect(data.heroes.wuyang.ultimate).toMatch(/Guardian Tide \(3\)/);
});

test('Primal Rage leaps to a random friendly row and shuffles 1-5 enemies', () => {
    expect(data.heroes.winston.ultimate).toMatch(/Primal Rage \(3\)/);
    expect(data.heroes.winston.ultimate).toMatch(/random friendly row/i);
    expect(data.heroes.winston.ultimate).toMatch(/1-5 enemies/);
    expect(data.heroes.winston.ultimate).toMatch(/1 damage/);
});

test('new roster printed stats', () => {
    expect(data.heroes.bravox2.role).toBe('offense');
    expect(data.heroes.bravox2.power).toEqual({ f: 2, m: 1, b: 2 });
    expect(data.heroes.cyclo.health).toBe(4);
    expect(data.heroes.cyclo.power).toEqual({ f: 3, m: 2, b: 1 });
    expect(data.heroes.emre.synergy).toEqual({ f: 1, m: 2, b: 1 });
    expect(data.heroes.fika.health).toBe(2);
    expect(data.heroes.rajah.role).toBe('defense');
    expect(data.heroes.mirage.special).toBe(true);
    // The mirage must present as Rajah down to the health counter on its card,
    // or the opponent picks the illusion out at a glance. It still pops the
    // moment an enemy targets it directly, so this is not extra staying power
    // against the thing it is meant to bait.
    expect(data.heroes.mirage.health).toBe(data.heroes.rajah.health);
    expect(data.heroes.mirage.name).toBe(data.heroes.rajah.name);
    expect(data.heroes.mirage.image).toBe(data.heroes.rajah.image);
    expect(data.heroes.warden.power.m).toBe(3);
    expect(data.heroes.wuyang.synergy.f).toBe(3);
    expect(data.heroes.bravox2.ultimate).toMatch(/\(4\)/);
});

test('Vega is support with Chronoshift at 3', () => {
    expect(data.heroes.vega.role).toBe('support');
    expect(data.heroes.vega.health).toBe(3);
    expect(data.heroes.vega.power).toEqual({ f: 1, m: 2, b: 3 });
    expect(data.heroes.vega.synergy).toEqual({ f: 2, m: 2, b: 2 });
    expect(data.heroes.vega.ultimate).toMatch(/Chronoshift \(3\)/);
});

test('playable roster includes new heroes and excludes mirage', () => {
    const ids = Object.values(data.heroes)
        .filter((hero) => hero && !hero.special)
        .map((hero) => hero.id);
    expect(ids).toEqual(expect.arrayContaining([
        'bravox2', 'cyclo', 'emre', 'fika', 'rajah', 'warden', 'wuyang', 'vega', 'mantis',
    ]));
    expect(ids).not.toContain('mirage');
});
