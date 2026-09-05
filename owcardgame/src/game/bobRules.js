/**
 * B.O.B. Smash: cost 2, X damage to one enemy in the opposite row,
 * where X is turns B.O.B. has been on the field (deploy turn = 1).
 */

export const BOB_TURNS_COUNTER_ID = 'bob-turns-on-field';

export function smashDamage(turnsOnField) {
    return Math.max(0, Number(turnsOnField) || 0);
}

export function initialTurnsOnField() {
    return 1;
}

export function incrementTurnsOnField(current) {
    return Math.max(0, Number(current) || 0) + 1;
}

export function turnsCounterEffect(turns) {
    const value = smashDamage(turns);
    return {
        id: BOB_TURNS_COUNTER_ID,
        hero: 'bob',
        type: 'counter',
        value,
        amount: value,
        tooltip: `Smash: ${value} damage (turns on field)`,
    };
}

export function readTurnsOnField(card) {
    if (!Array.isArray(card?.effects)) return 0;
    const counter = card.effects.find((effect) => effect?.id === BOB_TURNS_COUNTER_ID);
    if (!counter) return 0;
    if (typeof counter.value === 'number') return counter.value;
    if (typeof counter.amount === 'number') return counter.amount;
    return 0;
}
