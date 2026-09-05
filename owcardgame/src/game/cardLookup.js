export function ownerNumOf(cardId) {
    if (typeof cardId !== 'string' || cardId.length < 2) return null;
    const n = parseInt(cardId[0], 10);
    return n === 1 || n === 2 ? n : null;
}

export function playerCardsKey(cardId) {
    const n = ownerNumOf(cardId);
    return n ? `player${n}cards` : '';
}

export function getCardFromState(gameState, cardId) {
    const key = playerCardsKey(cardId);
    return gameState?.playerCards?.[key]?.cards?.[cardId];
}
