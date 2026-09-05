/**
 * Mantis Cloak / Blade Dance pure helpers.
 */

export const MANTIS_CLOAK_ID = 'mantis-cloak';
export const BLADE_DANCE_COST = 2;
export const CLOAK_TRIP_DAMAGE = 2;

export function isMantisCard(cardOrId) {
    if (!cardOrId) return false;
    if (typeof cardOrId === 'string') return cardOrId.slice(1) === 'mantis' || cardOrId === 'mantis';
    return cardOrId.id === 'mantis' || cardOrId.heroId === 'mantis';
}

export function isCloakedMantis(card) {
    return isMantisCard(card)
        && Array.isArray(card?.effects)
        && card.effects.some((e) => e?.id === MANTIS_CLOAK_ID);
}

/** Enemy row 2f ↔ owner mirror 1f (same lane letter). */
export function oppositeRowId(rowId) {
    if (!rowId || rowId.length < 2) return null;
    const other = String(rowId[0]) === '1' ? '2' : '1';
    return `${other}${rowId[1]}`;
}

/** Synergy / power mirror while cloaked: owner's row with the same lane letter. */
export function cloakMirrorRowId(ownerPlayerNum, enemyRowId) {
    if (!enemyRowId || enemyRowId.length < 2) return null;
    return `${ownerPlayerNum}${enemyRowId[1]}`;
}

export function isEnemyBoardRow(ownerPlayerNum, rowId) {
    if (!rowId || rowId.startsWith('player')) return false;
    return String(rowId[0]) !== String(ownerPlayerNum);
}

/**
 * Mantis may only deploy onto an enemy board row; everyone else stays own-side.
 */
export function deployRowAllowed({ cardId, ownerPlayerNum, finishRowId } = {}) {
    if (!finishRowId || finishRowId.startsWith('player')) return false;
    const owner = String(ownerPlayerNum ?? String(cardId || '')[0]);
    if (isMantisCard(cardId)) return isEnemyBoardRow(owner, finishRowId);
    return String(finishRowId[0]) === owner;
}

/**
 * Cloaked Mantis on an enemy row does not count as an enemy for X / columns.
 * All other living board cards do — heroes, turrets, and summons.
 */
export function countsAsEnemyHero(cardId, card) {
    if (!cardId) return false;
    if (isCloakedMantis(card)) return false;
    return true;
}

/** Living enemy board card that adds to Blade Dance's X (heroes + summons). */
export function isBladeDanceCountable(cardId, card) {
    if (!card || (card.health || 0) <= 0) return false;
    return countsAsEnemyHero(cardId, card);
}

/**
 * Living enemy hero that can receive Blade Dance hits.
 * Summons / turrets / structures raise X but are not hit.
 */
export function isBladeDanceRecipient(cardId, card) {
    if (!isBladeDanceCountable(cardId, card)) return false;
    if (card.special || card.turret || card.structure) return false;
    const id = card.id || card.heroId || (typeof cardId === 'string' ? cardId.slice(1) : '');
    if (id === 'turret' || id === 'bob' || id === 'dvameka' || id === 'nemesis' || id === 'stoneguard') {
        return false;
    }
    return true;
}

/** @deprecated Use isBladeDanceCountable — kept for older call sites. */
export function isBladeDanceTarget(cardId, card) {
    return isBladeDanceCountable(cardId, card);
}

/**
 * Blade Dance: deal `hitCount` strikes of 1, each to a random recipient
 * (with replacement). Recipients are heroes only; hitCount may include summons.
 */
export function bladeDanceAssignments(hitCount, recipientIds = [], random = Math.random) {
    const pool = (recipientIds || []).filter(Boolean);
    const x = Math.max(0, Math.floor(Number(hitCount) || 0));
    if (!pool.length || x <= 0) return [];
    const hits = [];
    for (let i = 0; i < x; i += 1) {
        hits.push(pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]);
    }
    return hits;
}

export function createCloakEffect() {
    return {
        id: MANTIS_CLOAK_ID,
        hero: 'mantis',
        type: 'cloak',
        tooltip: 'Cloak: Power/Synergy to your opposite row. Next entrant takes 2; then Mantis returns home.',
    };
}
