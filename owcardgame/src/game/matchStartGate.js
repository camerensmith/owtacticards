/**
 * Until the opening deal finishes, AI turns and mid-deal draws must not run.
 * The map title used to leave these false, so an AI-first seat could take a
 * full turn (and force the human's turn-2 draw) before any shuffle.
 */
export function shouldBlockPreDealActions({
    openingDeal = false,
    theaterLocked = false,
    showMapTitle = false,
} = {}) {
    return !!(openingDeal || theaterLocked || showMapTitle);
}
