/** Orisa Supercharger: +1 Power to each living hero on the charged row. */

export const SUPERCHARGER_ROW_ID = 'orisa-supercharger';
export const SUPERCHARGER_BUFF_ID = 'orisa-supercharged';

export function createSuperchargerBuff() {
    return {
        id: SUPERCHARGER_BUFF_ID,
        hero: 'orisa',
        type: 'power',
        value: 1,
        tooltip: 'Supercharger: +1 Power',
    };
}

export function isSupercharged(card) {
    return Array.isArray(card?.effects)
        && card.effects.some((effect) => effect?.id === SUPERCHARGER_BUFF_ID);
}

export function rowHasSupercharger(row) {
    return Array.isArray(row?.allyEffects)
        && row.allyEffects.some((effect) => effect?.id === SUPERCHARGER_ROW_ID);
}

export function livingHeroIdsForSupercharger(row, getCard) {
    return (row?.cardIds || []).filter((cardId) => {
        const card = getCard?.(cardId);
        if (!card || !(card.health > 0)) return false;
        if (card.id === 'turret') return false;
        return true;
    });
}

export function superchargerPowerBonus(card) {
    return isSupercharged(card) ? 1 : 0;
}

/** Ally card entering its own row that already has the Supercharger token. */
export function shouldApplySuperchargerOnEnter({ cardId, rowId, getRow } = {}) {
    if (!cardId || !rowId || rowId[0] === 'p') return false;
    if (String(cardId[0]) !== String(rowId[0])) return false;
    return rowHasSupercharger(getRow?.(rowId));
}
