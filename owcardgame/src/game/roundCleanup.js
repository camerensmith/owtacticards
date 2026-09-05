/**
 * At round end every leftover hand card is swept before the next opening deal,
 * so round 2 starts at 4 / 5 again instead of stacking on whatever was held.
 */
export function handCardIdsToDiscard(handCardIds = []) {
    return (handCardIds || []).filter(Boolean);
}
