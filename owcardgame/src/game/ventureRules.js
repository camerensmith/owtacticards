/**
 * Pure targeting rules for Venture's Tectonic Shock.
 *
 * The old implementation read `rowId[1]` — Venture's own row letter — and used
 * it to pick the *opposing row*, while calling it a column throughout. The
 * column is now chosen by the player and is a real slot index.
 */

/** Structures are shaken about but are not heroes to be shuffled or struck. */
const NON_HERO = ['turret', 'bob', 'nemesis'];

export function isShufflableHero(card) {
    return !!card && (card.health || 0) > 0 && !NON_HERO.includes(card.id);
}

export function enemyRowIdsFor(enemyNum) {
    return [`${enemyNum}f`, `${enemyNum}m`, `${enemyNum}b`];
}

/** Every enemy hero that the quake picks up and redistributes. */
export function collectShufflable(enemyNum, getRow, getCard) {
    const found = [];
    for (const rowId of enemyRowIdsFor(enemyNum)) {
        for (const cardId of getRow?.(rowId)?.cardIds || []) {
            if (isShufflableHero(getCard?.(cardId))) found.push({ cardId, rowId });
        }
    }
    return found;
}

/**
 * Redistribute heroes across the enemy rows.
 *
 * Dealt round-robin so the rows stay as even as they were, rather than piling
 * everyone into one row.
 */
export function shuffledRowStates(enemyNum, heroes = [], rand = Math.random) {
    const order = heroes.map((h) => h.cardId ?? h);
    for (let i = order.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rand() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
    }

    const rowIds = enemyRowIdsFor(enemyNum);
    const states = {};
    for (const rowId of rowIds) states[rowId] = [];
    order.forEach((cardId, index) => {
        states[rowIds[index % rowIds.length]].push(cardId);
    });
    return states;
}

/** How many slots deep the enemy side currently goes. */
export function enemyColumnCount(enemyNum, getRow) {
    return enemyRowIdsFor(enemyNum).reduce(
        (widest, rowId) => Math.max(widest, (getRow?.(rowId)?.cardIds || []).length),
        0,
    );
}

/**
 * Everyone standing in a given column, across all three enemy rows.
 * Read *after* the shuffle: the column is a place, not a set of victims.
 */
export function columnTargets(enemyNum, column, getRow, getCard) {
    if (!Number.isInteger(column) || column < 0) return [];
    const targets = [];
    for (const rowId of enemyRowIdsFor(enemyNum)) {
        const cardId = getRow?.(rowId)?.cardIds?.[column];
        if (!cardId) continue;
        if (isShufflableHero(getCard?.(cardId))) targets.push({ cardId, rowId });
    }
    return targets;
}

/** The column the AI should strike: whichever is most crowded. */
export function bestColumn(enemyNum, getRow, getCard) {
    const width = enemyColumnCount(enemyNum, getRow);
    let best = 0;
    let mostTargets = -1;
    for (let column = 0; column < width; column += 1) {
        const count = columnTargets(enemyNum, column, getRow, getCard).length;
        if (count > mostTargets) {
            mostTargets = count;
            best = column;
        }
    }
    return width > 0 ? best : null;
}
