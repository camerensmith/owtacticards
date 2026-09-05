export const OPENING_ROLES = ['offense', 'tank', 'support', 'defense'];

export const OPENING_TIMING = {
    initiatingFallbackMs: 2600,
    shuffleMs: 800,
    drawGapMs: 340,
};

export function roundAnnouncerKey(round) {
    if (Number(round) === 2) return 'announcer-round2';
    if (Number(round) === 3) return 'announcer-round3';
    return 'announcer-round1';
}

/** Player 1 is the human in versus-AI. Draws and practice skip this. */
export function matchResultAnnouncerKey(winner, humanPlayer = 1) {
    if (winner !== 1 && winner !== 2) return null;
    return winner === humanPlayer ? 'announcer-victory' : 'announcer-defeat';
}

/** Both seats open on 4. The second player's +1 comes on their draw step. */
export function openingHandSize() {
    return 4;
}

/**
 * Start-of-turn draws.
 * turn 1 = first player's open — they skip the draw (already have 4, go first)
 * turn 2+ = normal +1 draw (second player gets theirs here; first gets theirs next)
 */
export function shouldDrawOnTurnStart(turnCount) {
    return Number(turnCount) > 1;
}

/** Round winner opens the next round; a draw randomizes. */
export function nextRoundFirstPlayer(winningPlayer, random = Math.random) {
    if (winningPlayer === 1 || winningPlayer === 2) return winningPlayer;
    return random() < 0.5 ? 1 : 2;
}

/**
 * Opening deal order: both players draw the same four roles.
 * Going first is the advantage; the second player draws on their first turn.
 */
export function openingDealBeats({
    round = 1,
    includeInitiating = true,
    firstPlayer = 1,
    timing = OPENING_TIMING,
} = {}) {
    const first = Number(firstPlayer) === 2 ? 2 : 1;
    const second = first === 1 ? 2 : 1;
    const beats = [];
    if (includeInitiating) {
        beats.push({ type: 'audio', key: 'announcer-initiatingmatch', awaitEnd: true, fallbackMs: timing.initiatingFallbackMs });
    }
    beats.push({ type: 'audio', key: roundAnnouncerKey(round) });

    const dealPlayer = (playerNum, roles) => {
        beats.push({ type: 'shuffle', playerNum });
        beats.push({ type: 'wait', ms: timing.shuffleMs });
        roles.forEach((role) => {
            beats.push({ type: 'draw', playerNum, role });
            beats.push({ type: 'audio', key: 'drawcard' });
            beats.push({ type: 'wait', ms: timing.drawGapMs });
        });
    };

    dealPlayer(first, OPENING_ROLES);
    dealPlayer(second, OPENING_ROLES);
    return beats;
}

export function pickHeroFromRole(role, drawnHeroes, heroesByRole, allHeroIds) {
    const drawn = Array.isArray(drawnHeroes) ? drawnHeroes : [];
    if (role && role !== 'bonus') {
        const pool = (heroesByRole[role] || []).filter((id) => !drawn.includes(id));
        if (pool.length) return pool[Math.floor(Math.random() * pool.length)];
    }
    const fallback = (allHeroIds || []).filter((id) => !drawn.includes(id));
    if (!fallback.length) return null;
    return fallback[Math.floor(Math.random() * fallback.length)];
}
