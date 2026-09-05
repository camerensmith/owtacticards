import {
    smashDamage,
    initialTurnsOnField,
    incrementTurnsOnField,
    turnsCounterEffect,
    readTurnsOnField,
    BOB_TURNS_COUNTER_ID,
} from './bobRules';

test('deploy turn counts as 1', () => {
    expect(initialTurnsOnField()).toBe(1);
    expect(smashDamage(initialTurnsOnField())).toBe(1);
});

test('each owner turn start adds 1', () => {
    expect(incrementTurnsOnField(1)).toBe(2);
    expect(incrementTurnsOnField(2)).toBe(3);
});

test('smash damage never goes negative', () => {
    expect(smashDamage(0)).toBe(0);
    expect(smashDamage(undefined)).toBe(0);
});

test('counter effect carries the smash value', () => {
    expect(turnsCounterEffect(3)).toEqual({
        id: BOB_TURNS_COUNTER_ID,
        hero: 'bob',
        type: 'counter',
        value: 3,
        amount: 3,
        tooltip: 'Smash: 3 damage (turns on field)',
    });
});

test('readTurnsOnField pulls the counter from card effects', () => {
    expect(readTurnsOnField({ effects: [turnsCounterEffect(4)] })).toBe(4);
    expect(readTurnsOnField({ effects: [] })).toBe(0);
});
