/**
 * Top-level React shell screens.
 * Phase 2 keeps React as the shell (menu, HUD, modals) while Pixi owns the board,
 * so the match screen stays a single swappable branch.
 */

export const SCREENS = {
    MENU: 'menu',
    MATCH: 'match',
};

/**
 * How a match is being played.
 * PRACTICE is a sandbox: the human drives both sides, no AI acts, nothing is
 * dealt automatically, and any card can be put into either hand on demand.
 */
export const MATCH_MODE = {
    VERSUS_AI: 'vs-ai',
    PRACTICE: 'practice',
};

export function isPractice(mode) {
    return mode === MATCH_MODE.PRACTICE;
}

export default SCREENS;
