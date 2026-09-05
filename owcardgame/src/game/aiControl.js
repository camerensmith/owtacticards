/**
 * Who owns the decision in front of us.
 *
 * This used to be answered by two transient flags. `__ow_aiTriggering` was set
 * around a single call and cleared on a 500ms timer; `__ow_isAITurn` was
 * cleared the moment the AI's main loop returned, which is 1.5 seconds before
 * the turn actually ends. Both went false while the AI's own work was still in
 * flight — an on-enter that resolves through the choice modal waits out a
 * "thinking" delay of up to a second first — so any ability reaching its
 * targeting step after that point stopped and asked the human to aim for the
 * AI.
 *
 * Ownership is a property of the turn, not of the call stack. If it is Player
 * 2's turn and Player 2 is not being played by hand, the AI decides — for the
 * whole turn, however many timers an ability hops through on the way there.
 *
 * Practice is the one exception: the human holds both seats, so nothing is
 * delegated.
 */
export function aiOwnsDecision({ playerTurn, practiceMode = false } = {}) {
    if (practiceMode) return false;
    return Number(playerTurn) === 2;
}

/** The same question, answered from the live bridge. */
export function aiOwnsCurrentDecision() {
    if (typeof window === 'undefined') return false;
    const getTurn = typeof window.__ow_getPlayerTurn === 'function'
        ? window.__ow_getPlayerTurn
        : null;
    return aiOwnsDecision({
        playerTurn: getTurn ? getTurn() : null,
        practiceMode: !!window.__ow_practiceMode,
    });
}
