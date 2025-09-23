// Thin adapter helpers around dispatch/gameState access so hero modules
// can stay UI-agnostic.

export function getRow(gameState, rowId) {
    return gameState.rows[rowId];
}

export function getCard(gameState, playerNum, cardId) {
    return gameState.playerCards[`player${playerNum}cards`].cards[cardId];
}


