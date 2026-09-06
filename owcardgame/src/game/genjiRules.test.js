import {
    isDamagedForDragonBlade,
    shouldAiUseGenjiDragonBlade,
    pickGenjiDragonBladeTarget,
} from './genjiRules';

test('isDamagedForDragonBlade is health below max', () => {
    expect(isDamagedForDragonBlade({ health: 2 }, 3)).toBe(true);
    expect(isDamagedForDragonBlade({ health: 3 }, 3)).toBe(false);
    expect(isDamagedForDragonBlade({ health: 3, maxHealth: 4 }, null)).toBe(true);
    expect(isDamagedForDragonBlade(null, 3)).toBe(false);
});

test('AI must not use Dragon Blade when nobody is damaged', () => {
    expect(shouldAiUseGenjiDragonBlade([
        { health: 3, maxHealth: 3 },
        { health: 5, maxHealth: 5 },
        { health: 2, maxHealth: 2 },
    ])).toBe(false);
});

test('AI may use Dragon Blade when at least one enemy is damaged', () => {
    expect(shouldAiUseGenjiDragonBlade([
        { health: 3, maxHealth: 3 },
        { health: 4, maxHealth: 5 },
    ])).toBe(true);
});

test('pickGenjiDragonBladeTarget only returns damaged enemies', () => {
    const targets = [
        { cardId: '1reaper', rowId: '1f' },
        { cardId: '1ana', rowId: '1b' },
        { cardId: '1winston', rowId: '1m' },
    ];
    const cards = {
        '1reaper': { health: 5, maxHealth: 5 },
        '1ana': { health: 1, maxHealth: 3 },
        '1winston': { health: 8, maxHealth: 8 },
    };
    const picked = pickGenjiDragonBladeTarget(targets, (id) => cards[id]);
    expect(picked?.cardId).toBe('1ana');
});

test('pickGenjiDragonBladeTarget returns null when none are damaged', () => {
    const targets = [
        { cardId: '1reaper', rowId: '1f' },
        { cardId: '1ana', rowId: '1b' },
    ];
    const cards = {
        '1reaper': { health: 5, maxHealth: 5 },
        '1ana': { health: 3, maxHealth: 3 },
    };
    expect(pickGenjiDragonBladeTarget(targets, (id) => cards[id])).toBeNull();
});
