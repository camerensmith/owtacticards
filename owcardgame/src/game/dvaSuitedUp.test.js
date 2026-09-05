import {
    isSuitedUp,
    shouldKeepSuitedUpLock,
    canAutoPlayHandDva,
} from './dvaSuitedUp';

test('isSuitedUp reads the pilot lock effect', () => {
    expect(isSuitedUp({ effects: [{ id: 'suited-up' }] })).toBe(true);
    expect(isSuitedUp({ effects: [] })).toBe(false);
});

test('suited-up lock stays while MEKA is on the board or in hand', () => {
    expect(shouldKeepSuitedUpLock({
        suitedUp: true, mekaOnBoard: true, mekaInHand: false,
    })).toBe(true);
    expect(shouldKeepSuitedUpLock({
        suitedUp: true, mekaOnBoard: false, mekaInHand: true,
    })).toBe(true);
});

test('suited-up lock clears when MEKA is gone', () => {
    expect(shouldKeepSuitedUpLock({
        suitedUp: true, mekaOnBoard: false, mekaInHand: false,
    })).toBe(false);
});

test('AI must not auto-play a piloting D.Va', () => {
    expect(canAutoPlayHandDva({
        suitedUp: true, mekaOnBoard: false, mekaInHand: true,
    })).toBe(false);
    expect(canAutoPlayHandDva({
        suitedUp: true, mekaOnBoard: true, mekaInHand: false,
    })).toBe(false);
});

test('AI may auto-play D.Va once she is no longer piloting', () => {
    expect(canAutoPlayHandDva({
        suitedUp: false, mekaOnBoard: false, mekaInHand: false,
    })).toBe(true);
    expect(canAutoPlayHandDva({
        suitedUp: true, mekaOnBoard: false, mekaInHand: false,
    })).toBe(true);
});
