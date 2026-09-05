import { cancelTargeting, selectCardTarget, selectRowTarget } from './targeting';

// jQuery is left real: it works under jsdom, and some of these tests take the
// human path on purpose to prove the AI never does.
jest.mock('./soundController', () => ({ playWithOverlay: jest.fn() }));

/**
 * The player must never be asked to aim the AI's abilities.
 *
 * Both of the flags the AI sets around its own work expire while that work is
 * still in flight: `aiTriggering` is cleared on a 500ms timer, and `isAITurn`
 * used to be cleared the moment the AI's loop returned — 1.5s before the turn
 * actually ends. An onEnter that waits out the choice modal's thinking delay
 * reaches targeting after both are gone, and the prompt fell through to the
 * human click-capture. Delegation is decided by whose turn it is instead.
 */
describe('the AI aims its own abilities', () => {
    let cardDelegate;
    let rowDelegate;

    beforeEach(() => {
        cardDelegate = jest.fn(() => Promise.resolve({ cardId: '1ana', rowId: '1f' }));
        rowDelegate = jest.fn(() => Promise.resolve({ rowId: '1m' }));
        window.__ow_selectCardTarget = cardDelegate;
        window.__ow_selectRowTarget = rowDelegate;
        window.__ow_getPlayerTurn = () => 2;
        window.__ow_isAITurn = false;
        window.__ow_aiTriggering = false;
        window.__ow_practiceMode = false;
        window.__ow_isSandstormActive = () => false;
        window.__ow_aiUltimateTarget = null;
    });

    afterEach(() => {
        // The human path parks on a click that never comes; let it go.
        cancelTargeting();
        window.__ow_isAITurn = false;
        window.__ow_aiTriggering = false;
        window.__ow_practiceMode = false;
    });

    // The case that was reaching the human: Tracer's onEnter resolves through
    // the choice modal, and by the time it asks for a target both flags have
    // been cleared by their timers. It is still the AI's turn.
    test('delegates on the AI turn with both flags already cleared', async () => {
        expect(window.__ow_isAITurn).toBe(false);
        expect(window.__ow_aiTriggering).toBe(false);

        await expect(selectCardTarget()).resolves.toEqual({ cardId: '1ana', rowId: '1f' });
        await expect(selectRowTarget()).resolves.toEqual({ rowId: '1m' });
        expect(cardDelegate).toHaveBeenCalled();
        expect(rowDelegate).toHaveBeenCalled();
    });

    test('delegates on the AI turn even after the triggering flag has cleared', async () => {
        window.__ow_isAITurn = true;

        await expect(selectCardTarget()).resolves.toEqual({ cardId: '1ana', rowId: '1f' });
        await expect(selectRowTarget()).resolves.toEqual({ rowId: '1m' });
        expect(cardDelegate).toHaveBeenCalled();
        expect(rowDelegate).toHaveBeenCalled();
    });

    test('still delegates while the triggering flag is set', async () => {
        window.__ow_aiTriggering = true;

        await selectCardTarget();
        await selectRowTarget();
        expect(cardDelegate).toHaveBeenCalled();
        expect(rowDelegate).toHaveBeenCalled();
    });

    test('passes the ability options through to the AI', async () => {
        window.__ow_isAITurn = true;

        await selectCardTarget({ isDamage: true, fromCardId: '2mei' });
        expect(cardDelegate).toHaveBeenCalledWith({ isDamage: true, fromCardId: '2mei' });
    });

    // Losing the delegate must not mean "ask the human to play for the AI".
    test('skips the ability rather than prompting when no delegate is installed', async () => {
        window.__ow_isAITurn = true;
        window.__ow_selectCardTarget = undefined;
        window.__ow_selectRowTarget = undefined;

        await expect(selectCardTarget()).resolves.toBeNull();
        await expect(selectRowTarget()).resolves.toBeNull();
    });

    test('never delegates on the human turn', () => {
        window.__ow_isAITurn = true;
        window.__ow_getPlayerTurn = () => 1;

        selectCardTarget();
        selectRowTarget();
        expect(cardDelegate).not.toHaveBeenCalled();
        expect(rowDelegate).not.toHaveBeenCalled();
    });

    // In practice mode the human holds both seats, so player 2 is still a person.
    test('never delegates in practice mode', () => {
        window.__ow_isAITurn = true;
        window.__ow_practiceMode = true;

        selectCardTarget();
        selectRowTarget();
        expect(cardDelegate).not.toHaveBeenCalled();
        expect(rowDelegate).not.toHaveBeenCalled();
    });

    test('a pre-selected ultimate target still wins', async () => {
        window.__ow_isAITurn = true;
        window.__ow_aiUltimateTarget = { cardId: '1reaper', rowId: '1b' };

        await expect(selectCardTarget()).resolves.toEqual({ cardId: '1reaper', rowId: '1b' });
        expect(cardDelegate).not.toHaveBeenCalled();
    });

    test('sandstorm still blocks targeting outright', async () => {
        window.__ow_isAITurn = true;
        window.__ow_isSandstormActive = () => true;

        await expect(selectCardTarget()).resolves.toBeNull();
        expect(cardDelegate).not.toHaveBeenCalled();
    });
});
