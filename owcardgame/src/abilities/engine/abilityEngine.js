// Central engine for validating ability usage, playing audio, and running ability logic.

import { getAudioFile } from '../../assets/imageImports';

export function playAbilityAudio(audioFileKey) {
    if (!audioFileKey) return;
    const src = getAudioFile(audioFileKey);
    if (!src) return;
    const audio = new Audio(src);
    audio.play().catch(() => {});
}

// Validates that a card is not in hand (expects rowId like '1f','1m','1b').
export function assertNotInHand(rowId) {
    if (!rowId || rowId[0] === 'p') {
        throw new Error('Play cards before using abilities!');
    }
}

export function hasEnoughSynergy(currentSynergy, cost) {
    return (currentSynergy ?? 0) >= (cost ?? 0);
}

// Marks ability usage on a card via reducer
export function markAbilityUsed(dispatch, ACTIONS, playerTurn, playerHeroId, which) {
    const key = which === 1 ? 'ability1Used' : 'ability2Used';
    dispatch({
        type: ACTIONS.EDIT_CARD,
        payload: {
            playerNum: playerTurn,
            targetCardId: playerHeroId,
            editKeys: [key],
            editValues: [true],
        },
    });
}


