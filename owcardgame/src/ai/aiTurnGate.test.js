import { shouldSkipAiControllerTurn } from './aiTurnGate';

test('does not skip just because internal AI turn counter is high', () => {
    expect(shouldSkipAiControllerTurn({
        aiTurnsTaken: 12,
        currentTurn: 16,
        maxTurns: 18,
    })).toBe(false);
});

test('still skips when the match turn cap is exceeded', () => {
    expect(shouldSkipAiControllerTurn({
        aiTurnsTaken: 3,
        currentTurn: 19,
        maxTurns: 18,
    })).toBe(true);
});

test('allows play on late turns within the match cap', () => {
    expect(shouldSkipAiControllerTurn({
        aiTurnsTaken: 9,
        currentTurn: 17,
        maxTurns: 18,
    })).toBe(false);
});
