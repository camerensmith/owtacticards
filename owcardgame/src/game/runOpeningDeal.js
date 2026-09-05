/**
 * Plays opening-deal beats in order.
 * After each shuffle, ensurePainted must resolve before any draw for that seat,
 * so the shuffle overlay cannot lose a race with the first card commit.
 */
export async function runOpeningDealBeats(beats, {
    playAudio,
    wait,
    ensurePainted,
    onShuffle,
    onDraw,
    shouldAbort,
} = {}) {
    const list = Array.isArray(beats) ? beats : [];
    for (const beat of list) {
        if (shouldAbort?.()) return;
        if (beat.type === 'audio') {
            await playAudio?.(beat);
        } else if (beat.type === 'wait') {
            await wait?.(beat.ms);
        } else if (beat.type === 'shuffle') {
            onShuffle?.(beat.playerNum);
            await ensurePainted?.();
        } else if (beat.type === 'draw') {
            onDraw?.(beat.playerNum, beat.role);
        }
    }
}
