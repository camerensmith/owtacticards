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

/** First player opens on 4; second opens on 5. */
export function openingHandSize(playerNum, firstPlayer) {
    const first = Number(firstPlayer) === 2 ? 2 : 1;
    return Number(playerNum) === first ? 4 : 5;
}

/**
 * Start-of-turn draws begin after each player has had their opening turn.
 * turn 1 = first player's open (already dealt 4)
 * turn 2 = second player's open (already dealt 5)
 * turn 3+ = normal +1 draw
 */
export function shouldDrawOnTurnStart(turnCount) {
    return Number(turnCount) > 2;
}

/** Round winner opens the next round; a draw randomizes. */
export function nextRoundFirstPlayer(winningPlayer, random = Math.random) {
    if (winningPlayer === 1 || winningPlayer === 2) return winningPlayer;
    return random() < 0.5 ? 1 : 2;
}

/**
 * Opening deal order: whoever goes first draws four roles, then the second
 * player draws the same four plus one bonus card of any role.
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
    dealPlayer(second, [...OPENING_ROLES, 'bonus']);
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
