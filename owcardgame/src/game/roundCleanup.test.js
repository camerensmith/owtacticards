import { handCardIdsToDiscard } from './roundCleanup';

test('round end sweeps every leftover hand card before the next deal', () => {
    expect(handCardIdsToDiscard(['1ana', '1reaper', null, '1mei'])).toEqual([
        '1ana',
        '1reaper',
        '1mei',
    ]);
    expect(handCardIdsToDiscard([])).toEqual([]);
    expect(handCardIdsToDiscard(undefined)).toEqual([]);
});
