import { normalizeHeroId } from './abilityRules';

/** Allies Chronoshift may replay — living, non-self, with an Enter module. */
export function chronoshiftEligibleAllies({
    vegaCardId,
    getRow,
    getCard,
    hasOnEnter,
} = {}) {
    const playerNum = parseInt(String(vegaCardId || '')[0], 10);
    if (!playerNum) return [];
    const rows = [`${playerNum}f`, `${playerNum}m`, `${playerNum}b`];
    const out = [];
    for (const rowId of rows) {
        for (const cardId of getRow?.(rowId)?.cardIds || []) {
            if (!cardId || cardId === vegaCardId) continue;
            const card = getCard?.(cardId);
            if (!card || (card.health || 0) <= 0) continue;
            if (card.special || card.structure) continue;
            const heroId = normalizeHeroId(cardId);
            if (!hasOnEnter?.(heroId)) continue;
            out.push({ cardId, rowId, heroId });
        }
    }
    return out;
}

/** Prefer high-priority Enter abilities at the front of the draw queue. */
export function orderUpcomingForAi(heroIds = [], priorityOf = () => 0) {
    return [...(heroIds || [])].sort((a, b) => (
        (Number(priorityOf(b)) || 0) - (Number(priorityOf(a)) || 0)
        || String(a).localeCompare(String(b))
    ));
}

/** Pick the ally whose Enter is most valuable to replay. */
export function pickBestChronoshiftAlly(eligible = [], priorityOf = () => 0) {
    if (!eligible?.length) return null;
    return [...eligible].sort((a, b) => (
        (Number(priorityOf(b.heroId)) || 0) - (Number(priorityOf(a.heroId)) || 0)
        || String(a.heroId).localeCompare(String(b.heroId))
    ))[0];
}
