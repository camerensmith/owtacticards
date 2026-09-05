/**
 * Pure helpers for the practice sandbox.
 * Kept side-effect free so the panel and its tests share one definition of
 * "what can be put on the table".
 */

/**
 * Everything placeable in practice, specials included.
 *
 * Normal play hides summon-only cards (BOB, MEKA, Nemesis, turrets) because they
 * are never drawn — but the whole point of a test field is being able to try
 * them, so they are listed here and flagged rather than filtered out.
 */
export function practiceRoster(heroes = {}) {
    return Object.values(heroes)
        .filter((hero) => hero && hero.id && hero.name)
        .map((hero) => ({
            id: hero.id,
            name: hero.name,
            role: hero.role || null,
            special: !!hero.special,
        }))
        .sort((a, b) => {
            // Drawable heroes first, then summon-only, each alphabetical.
            if (a.special !== b.special) return a.special ? 1 : -1;
            return a.name.localeCompare(b.name);
        });
}

export function practiceCardId(playerNum, heroId) {
    return `${playerNum}${heroId}`;
}

/** A side can hold only one copy of a hero, since the id encodes both. */
export function canAddToSide(cards = {}, playerNum, heroId) {
    if (!heroId) return false;
    return !cards[practiceCardId(playerNum, heroId)];
}

/** Player 2 is the AI's seat only outside practice; in practice the human holds both. */
export function isOpponentSeat(playerNum, practiceMode) {
    return Number(playerNum) === 2 && !practiceMode;
}

/**
 * Whether Rajah's decoy is shown as an illusion.
 *
 * Marked on your own side, so you know which Rajah is real and can play around
 * it. Left indistinguishable on the opponent's, where the whole point is that
 * it cannot be picked out — same art, same name, same health as the real one.
 * In practice you hold both seats, so both sides are marked.
 */
export function showsMirageTell(playerNum, practiceMode) {
    return !isOpponentSeat(playerNum, practiceMode);
}

/**
 * Whether a card shows its face.
 *
 * Only the opponent's hand is hidden, and it is hidden by being dealt face-down
 * — see `isOpponentSeat`. Your own hand is yours to read at all times.
 *
 * This used to also hide a hand whenever it was not that player's turn, on the
 * reasoning that a hot-seat match should keep its secrets. There is no hot-seat
 * match: the only modes are versus-AI and practice. All it did was blank your
 * own hand for the whole of the AI's turn, hiding it from the one person
 * entitled to see it.
 */
export function shouldShowFace({ faceDown = false } = {}) {
    return !faceDown;
}
