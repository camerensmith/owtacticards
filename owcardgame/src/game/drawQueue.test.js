import {
    sampleUpcomingHeroes,
    mergeDrawQueue,
    shiftDrawQueue,
    excludeQueuedFromPool,
} from './drawQueue';

test('sampleUpcomingHeroes picks up to N without duplicates', () => {
    const picked = sampleUpcomingHeroes(['ana', 'reaper', 'mei', 'genji'], 3, () => 0);
    expect(picked).toEqual(['ana', 'reaper', 'mei']);
    expect(new Set(picked).size).toBe(3);
});

test('sampleUpcomingHeroes tolerates a thin pool', () => {
    expect(sampleUpcomingHeroes(['ana'], 3, () => 0)).toEqual(['ana']);
    expect(sampleUpcomingHeroes([], 3)).toEqual([]);
});

test('mergeDrawQueue puts the rift order ahead of any leftover queue', () => {
    expect(mergeDrawQueue(['bob'], ['mei', 'ana', 'reaper'])).toEqual([
        'mei', 'ana', 'reaper', 'bob',
    ]);
});

test('shiftDrawQueue pops the front', () => {
    expect(shiftDrawQueue(['mei', 'ana'])).toEqual({ next: 'mei', rest: ['ana'] });
    expect(shiftDrawQueue([])).toEqual({ next: null, rest: [] });
});

test('excludeQueuedFromPool keeps random draws off the reserved ids', () => {
    expect(excludeQueuedFromPool(['ana', 'mei', 'reaper'], ['mei'])).toEqual(['ana', 'reaper']);
});
