/** D.Va Call Mech / eject consistency helpers. */

export function isSuitedUp(card) {
    return Array.isArray(card?.effects)
        && card.effects.some((effect) => effect?.id === 'suited-up');
}

/**
 * Suited-up D.Va must stay in hand while her MEKA exists (board or hand).
 * Once the MEKA is gone, the pilot lock should clear so she can be played.
 */
export function shouldKeepSuitedUpLock({ suitedUp, mekaOnBoard, mekaInHand } = {}) {
    if (!suitedUp) return false;
    return !!(mekaOnBoard || mekaInHand);
}

/**
 * AI may auto-play a hand D.Va only when she is not piloting a living MEKA.
 */
export function canAutoPlayHandDva({ suitedUp, mekaOnBoard, mekaInHand } = {}) {
    return !shouldKeepSuitedUpLock({ suitedUp, mekaOnBoard, mekaInHand });
}
