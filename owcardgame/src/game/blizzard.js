/**
 * Mei's Blizzard and Cryo Freeze.
 *
 * Blizzard marks an enemy row so ultimates cast from it cost +1 synergy. Cryo
 * Freeze upgrades that same mark, doubling the row's costs instead. Both states
 * live on one token, so there is only ever one thing to place, read, and clean
 * up when Mei dies.
 */

export const BLIZZARD_TOKEN_ID = 'mei-token';
/** Blizzard's flat surcharge, in synergy. */
export const BLIZZARD_SURCHARGE = 1;
/** What Cryo Freeze multiplies a marked row's costs by. */
export const CRYO_MULTIPLIER = 2;

export function isBlizzardToken(effect) {
    return effect?.id === BLIZZARD_TOKEN_ID;
}

export function blizzardToken({ sourceCardId, sourceRowId, frozen = false } = {}) {
    return {
        id: BLIZZARD_TOKEN_ID,
        hero: 'mei',
        type: 'ultimateCostModifier',
        /** Cryo Freeze has landed on this row. */
        frozen,
        value: frozen ? CRYO_MULTIPLIER : BLIZZARD_SURCHARGE,
        sourceCardId,
        sourceRowId,
        tooltip: frozen
            ? 'Cryo Freeze: Ultimates from this row cost double synergy'
            : 'Blizzard: Ultimates from this row cost +1 synergy',
        visual: 'mei-icon',
    };
}

/** The row Mei has already marked, if any. */
export function findBlizzardRow(getRow, rowIds = []) {
    return (rowIds || []).find(
        (rowId) => (getRow?.(rowId)?.enemyEffects || []).some(isBlizzardToken),
    ) || null;
}

/** Whether the token on this row has been frozen by Cryo Freeze. */
export function isRowFrozen(getRow, rowId) {
    return !!(getRow?.(rowId)?.enemyEffects || []).find(isBlizzardToken)?.frozen;
}

/**
 * Whether this caster has to lay the Blizzard as well as freeze it.
 *
 * Cryo Freeze upgrades a row Mei's own on-enter already marked, so for Mei it
 * needs that row to exist. Echo copying the ultimate has no on-enter behind it
 * and never will, so for her the Blizzard is a dependency of the freeze rather
 * than a prerequisite she failed to meet: she picks a row and gets both.
 */
export function castsBlizzardWithFreeze(casterCardId) {
    const heroId = String(casterCardId || '').replace(/^\d/, '');
    return heroId !== 'mei';
}

/**
 * What an ultimate cast from this row actually costs.
 *
 * Flat surcharges land first and Mei's mark last, so a frozen row doubles the
 * whole bill rather than only the printed cost.
 *
 * Surcharges are matched by anything that is not Mei's token. BOB writes his
 * under two different shapes — `ultCost` from the human path and
 * `ultimateCostModifier` from the AI one — and the old reader keyed on the
 * type alone, so an AI BOB was silently *doubling* costs through Mei's branch
 * while a human BOB added 2, which is what his tooltip actually promises.
 */
export function rowUltimateCost(baseCost, enemyEffects = []) {
    let cost = Math.max(0, Number(baseCost) || 0);
    const effects = enemyEffects || [];

    for (const effect of effects) {
        if (isBlizzardToken(effect)) continue;
        if (effect?.type !== 'ultCost' && effect?.type !== 'ultimateCostModifier') continue;
        cost += Number(effect.value) || 0;
    }

    const blizzard = effects.find(isBlizzardToken);
    if (blizzard) {
        cost = blizzard.frozen ? cost * CRYO_MULTIPLIER : cost + BLIZZARD_SURCHARGE;
    }
    return cost;
}
