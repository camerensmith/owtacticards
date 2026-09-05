import { aiOwnsDecision, aiOwnsCurrentDecision } from './aiControl';

describe('who owns the decision', () => {
    test('the AI owns every decision on its own turn', () => {
        expect(aiOwnsDecision({ playerTurn: 2 })).toBe(true);
    });

    test('the human owns their own turn', () => {
        expect(aiOwnsDecision({ playerTurn: 1 })).toBe(false);
    });

    // Practice hands both seats to the human, so nothing is delegated.
    test('practice gives Player 2 back to the human', () => {
        expect(aiOwnsDecision({ playerTurn: 2, practiceMode: true })).toBe(false);
    });

    test('an unknown turn is not the AI\'s', () => {
        expect(aiOwnsDecision({})).toBe(false);
        expect(aiOwnsDecision()).toBe(false);
        expect(aiOwnsDecision({ playerTurn: null })).toBe(false);
    });
});

/*
 * The bug this replaces: ownership was read from two flags that the AI set and
 * cleared around its own calls. Both went false while the AI's turn was still
 * running — its main loop returns 1.5s before the turn ends, and an on-enter
 * resolved through the choice modal waits out a thinking delay of up to a
 * second first. Abilities reaching targeting after that asked the human to aim
 * for the AI. Ownership must not depend on those flags at all.
 */
describe('ownership read from the live bridge', () => {
    afterEach(() => {
        delete window.__ow_getPlayerTurn;
        delete window.__ow_practiceMode;
        delete window.__ow_isAITurn;
        delete window.__ow_aiTriggering;
    });

    test('holds for the whole AI turn, whatever the transient flags say', () => {
        window.__ow_getPlayerTurn = () => 2;
        window.__ow_isAITurn = false;
        window.__ow_aiTriggering = false;

        expect(aiOwnsCurrentDecision()).toBe(true);
    });

    test('does not leak into the human turn when the flags are left set', () => {
        window.__ow_getPlayerTurn = () => 1;
        window.__ow_isAITurn = true;
        window.__ow_aiTriggering = true;

        expect(aiOwnsCurrentDecision()).toBe(false);
    });

    test('stands down in practice', () => {
        window.__ow_getPlayerTurn = () => 2;
        window.__ow_practiceMode = true;

        expect(aiOwnsCurrentDecision()).toBe(false);
    });

    test('is false before the bridge is installed', () => {
        expect(aiOwnsCurrentDecision()).toBe(false);
    });
});
