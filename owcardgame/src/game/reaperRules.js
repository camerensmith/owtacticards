/**
 * Pure targeting rules for Reaper's Death Blossom.
 * Side-effect free so the ability, the AI gate and the tests agree.
 */

/** Death Blossom lands centre-row-centre, so it catches the two middle columns. */
export const BLOSSOM_COLUMNS = [1, 2];
export const BLOSSOM_DAMAGE_PER_TARGET = 3;

/**
 * Everyone caught in the blast: the centre columns across all three enemy rows.
 * Slot order in `cardIds` is the column order, so an index is a column.
 */
export function deathBlossomTargets(enemyNum, getRow, getCard) {
    const targets = [];
    for (const pos of ['f', 'm', 'b']) {
        const rowId = `${enemyNum}${pos}`;
        const cardIds = getRow?.(rowId)?.cardIds || [];
        for (const column of BLOSSOM_COLUMNS) {
            const cardId = cardIds[column];
            if (!cardId) continue;
            const card = getCard?.(cardId);
            if (!card || (card.health || 0) <= 0) continue;
            targets.push({ cardId, rowId, column });
        }
    }
    return targets;
}

/**
 * The blast lands one point at a time in a random order, but every target must
 * still end up taking the full amount — the randomness is pacing, not damage.
 */
export function buildBlossomTicks(
    targets = [],
    perTarget = BLOSSOM_DAMAGE_PER_TARGET,
    rand = Math.random,
) {
    const count = Math.max(0, Number(perTarget) || 0);
    const ticks = [];
    for (const target of targets) {
        for (let i = 0; i < count; i += 1) ticks.push(target);
    }
    // Fisher-Yates: shuffles the order without changing how many each target gets.
    for (let i = ticks.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rand() * (i + 1));
        [ticks[i], ticks[j]] = [ticks[j], ticks[i]];
    }
    return ticks;
}
