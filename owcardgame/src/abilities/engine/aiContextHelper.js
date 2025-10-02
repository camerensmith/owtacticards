/**
 * AI Context Helper
 * Provides utilities to maintain AI context flags across async modal callbacks
 */

/**
 * Wraps a callback to restore AI context flags before execution
 * This is needed because modal delays can cause AI flags to be cleared before the callback executes
 *
 * @param {string} playerHeroId - The hero card ID (e.g., "2ashe")
 * @param {Function} callback - The async callback to wrap
 * @returns {Function} Wrapped callback that maintains AI context
 */
export function withAIContext(playerHeroId, callback) {
    return async function(...args) {
        const playerNum = parseInt(playerHeroId[0]);
        const isAIControlled = playerNum === 2; // Player 2 is AI

        // Restore AI context if this is AI-controlled
        if (isAIControlled) {
            window.__ow_aiTriggering = true;
            window.__ow_currentAICardId = playerHeroId;
            window.__ow_currentAIHero = playerHeroId.slice(1);
            window.__ow_currentAIAbility = 'onEnter';
        }

        try {
            return await callback(...args);
        } finally {
            // Clean up AI context after execution
            if (isAIControlled) {
                window.__ow_aiTriggering = false;
                window.__ow_currentAICardId = null;
                window.__ow_currentAIHero = null;
                window.__ow_currentAIAbility = null;
            }
        }
    };
}
