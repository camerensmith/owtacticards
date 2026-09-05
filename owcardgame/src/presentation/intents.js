export function playCardIntent({ cardId, startRowId, finishRowId, slotIndex, playerNum }) {
    return {
        type: 'PlayCard',
        cardId,
        startRowId,
        finishRowId,
        slotIndex,
        playerNum,
    };
}
