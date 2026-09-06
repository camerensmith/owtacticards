/**
 * Whether the AI controller should refuse to take actions this call.
 * Match turn cap only — never an internal "AI turns taken" counter.
 * That counter was bumping twice per real turn (extra tactical pass) and
 * permanently parked the AI mid-round while it still drew and ended turn.
 */
export function shouldSkipAiControllerTurn({
    currentTurn = null,
    maxTurns = 18,
} = {}) {
    if (typeof currentTurn === 'number' && currentTurn > Number(maxTurns || 18)) {
        return true;
    }
    return false;
}
