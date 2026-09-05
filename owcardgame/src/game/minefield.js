export function isMinefieldToken(effect) {
    if (!effect || effect.hero !== 'wreckingball') return false;
    return effect.type === 'minefield'
        || effect.id === 'minefield'
        || effect.visual === 'minefield';
}

export function minefieldCharges(effect) {
    return Math.max(0, Math.floor(Number(effect?.charges ?? effect?.damage) || 0));
}

export function minefieldToken({
    charges,
    sourceCardId,
    sourceRowId,
    now = Date.now(),
} = {}) {
    const n = minefieldCharges({ charges });
    return {
        id: `wreckingball-minefield-${now}`,
        hero: 'wreckingball',
        type: 'minefield',
        charges: n,
        sourceCardId,
        sourceRowId,
        tooltip: `Minefield: Deals 2 damage when enemies move into or out of this row (${n} charges)`,
        visual: 'minefield',
    };
}
