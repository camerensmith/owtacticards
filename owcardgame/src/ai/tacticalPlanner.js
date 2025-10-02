/**
 * Tactical Planner - Hybrid "Plan → Search → Heuristic" System
 * Top-level decision making with shallow lookahead
 */

import { evaluateBoard } from './boardEvaluator';
import { generateCandidateActions } from './actionGenerator';

// Game plans
export const GAME_PLANS = {
    ROW_CRUSH: 'row_crush',           // Fill rows, create row threats
    COLUMN_CONTROL: 'column_control', // Align columns, use column AOE
    PROTECT_SCALE: 'protect_scale',   // Build safe board, scale synergy
    CHIP_FINISH: 'chip_finish'        // Chip damage, finish with precision
};

/**
 * Select best action using tactical planning
 */
export function selectBestAction(aiHand, aiBoard, enemyBoard, gameState, difficulty, rng = null) {
    console.log('=== TACTICAL PLANNER ENGAGED ===');

    // 1. Determine game plan for this turn
    const gameplan = selectGamePlan(aiHand, aiBoard, enemyBoard, gameState);
    console.log(`Game Plan: ${gameplan}`);

    // 2. Generate candidate actions
    const candidates = generateCandidateActions(aiHand, aiBoard, enemyBoard, gameState, gameplan);
    console.log(`Generated ${candidates.length} candidate actions`);

    if (candidates.length === 0) {
        return { type: 'pass', reasoning: 'No valid actions' };
    }

    // 3. Evaluate each candidate with shallow lookahead
    const evaluatedActions = candidates.map(action => {
        const score = evaluateActionWithLookahead(action, aiHand, aiBoard, enemyBoard, gameState, difficulty);
        return { ...action, score };
    });

    // 4. Sort by score
    evaluatedActions.sort((a, b) => b.score - a.score);

    // Log top 3
    console.log('Top 3 actions:');
    evaluatedActions.slice(0, 3).forEach((action, i) => {
        console.log(`  ${i + 1}. [${action.score.toFixed(2)}] ${action.description}`);
    });

    // 5. Select best action with safety fallback
    const bestAction = evaluatedActions[0];

    // Safety check: if action has very low score, pass instead
    if (bestAction.score < -5) {
        console.log('All actions negative - passing turn');
        return { type: 'pass', reasoning: 'All actions unfavorable' };
    }

    // Add difficulty-based randomness
    let selectedAction = bestAction;
    const random = rng ? rng.next() : Math.random();
    const randomIndex = rng ? () => Math.floor(rng.next() * evaluatedActions.length) : () => Math.floor(Math.random() * evaluatedActions.length);

    if (difficulty === 'medium') {
        // 70% best, 30% random from top 3
        if (random > 0.7 && evaluatedActions.length > 1) {
            const topThree = evaluatedActions.slice(0, Math.min(3, evaluatedActions.length));
            const idx = rng ? Math.floor(rng.next() * topThree.length) : Math.floor(Math.random() * topThree.length);
            selectedAction = topThree[idx];
            console.log('Medium AI: Chose alternative action');
        }
    } else if (difficulty === 'easy') {
        // 50% best, 50% random
        if (random > 0.5 && evaluatedActions.length > 1) {
            selectedAction = evaluatedActions[randomIndex()];
            console.log('Easy AI: Chose random action');
        }
    }

    console.log(`SELECTED: ${selectedAction.description} (score: ${selectedAction.score.toFixed(2)})`);

    return convertToLegacyAction(selectedAction);
}

/**
 * Select game plan based on current situation
 */
function selectGamePlan(aiHand, aiBoard, enemyBoard, gameState) {
    const scores = {
        [GAME_PLANS.ROW_CRUSH]: 0,
        [GAME_PLANS.COLUMN_CONTROL]: 0,
        [GAME_PLANS.PROTECT_SCALE]: 0,
        [GAME_PLANS.CHIP_FINISH]: 0
    };

    // Analyze composition
    const hasColumnAOE = hasColumnAOEHeroes(aiHand, aiBoard);
    const hasRowAOE = hasRowAOEHeroes(aiHand, aiBoard);
    const hasTanks = countRole(aiHand, aiBoard, 'Tank') >= 2;
    const hasSupports = countRole(aiHand, aiBoard, 'Support') >= 2;

    // Current board state
    const aiHP = countTotalHP(aiBoard);
    const enemyHP = countTotalHP(enemyBoard);
    const aiSynergy = countSynergy(aiBoard);
    const powerDiff = aiHP - enemyHP;

    // Scoring logic
    if (hasColumnAOE) scores[GAME_PLANS.COLUMN_CONTROL] += 3;
    if (hasRowAOE) scores[GAME_PLANS.ROW_CRUSH] += 3;
    if (hasTanks && hasSupports) scores[GAME_PLANS.PROTECT_SCALE] += 3;

    // Situational bonuses
    if (powerDiff < -5) {
        // Behind - need tempo
        scores[GAME_PLANS.CHIP_FINISH] += 2;
        scores[GAME_PLANS.COLUMN_CONTROL] += 1;
    } else if (powerDiff > 5) {
        // Ahead - can scale
        scores[GAME_PLANS.PROTECT_SCALE] += 2;
    }

    if (aiSynergy >= 3) {
        // High synergy - protect and scale
        scores[GAME_PLANS.PROTECT_SCALE] += 2;
    }

    // Pick highest scoring plan
    let bestPlan = GAME_PLANS.ROW_CRUSH;
    let highestScore = scores[GAME_PLANS.ROW_CRUSH];

    Object.entries(scores).forEach(([plan, score]) => {
        if (score > highestScore) {
            highestScore = score;
            bestPlan = plan;
        }
    });

    return bestPlan;
}

/**
 * Evaluate action with shallow lookahead
 */
function evaluateActionWithLookahead(action, aiHand, aiBoard, enemyBoard, gameState, difficulty) {
    // Simulate action
    const resultState = simulateAction(action, aiHand, aiBoard, enemyBoard);

    if (!resultState) {
        return -100; // Invalid action
    }

    // Base score from board evaluation
    let score = evaluateBoard(resultState.aiBoard, resultState.enemyBoard, gameState);

    // Hard difficulty: simulate opponent replies
    if (difficulty === 'hard') {
        // Sample 3 opponent replies
        const opponentReplies = generateOpponentReplies(resultState.aiBoard, resultState.enemyBoard, 3);

        let avgOpponentScore = 0;
        opponentReplies.forEach(reply => {
            const replyState = simulateAction(reply, resultState.enemyHand, resultState.enemyBoard, resultState.aiBoard);
            if (replyState) {
                // Evaluate from opponent's perspective (negative for us)
                const opponentScore = evaluateBoard(replyState.aiBoard, replyState.enemyBoard, gameState);
                avgOpponentScore += opponentScore;
            }
        });

        avgOpponentScore /= Math.max(1, opponentReplies.length);

        // Adjust score based on opponent's best replies
        score -= avgOpponentScore * 0.4; // Weight opponent replies at 40%
    }

    // Bonus for kill probability
    const killProb = estimateKillProbability(resultState.aiBoard, resultState.enemyBoard);
    score += killProb * 2.0;

    // Bonus for preserving ultimates (future equity)
    const ultsPreserved = countAvailableUltimates(resultState.aiBoard);
    score += ultsPreserved * 0.5;

    return score;
}

/**
 * Simulate an action and return resulting state
 */
function simulateAction(action, aiHand, aiBoard, enemyBoard) {
    // Clone boards
    const newAiBoard = cloneBoard(aiBoard);
    const newEnemyBoard = cloneBoard(enemyBoard);
    const newAiHand = [...(aiHand || [])];

    if (action.type === 'deploy') {
        // Remove from hand
        const cardIndex = newAiHand.findIndex(c => c.id === action.card.id);
        if (cardIndex !== -1) {
            newAiHand.splice(cardIndex, 1);
        }

        // Add to board
        if (!newAiBoard[action.row]) newAiBoard[action.row] = [];
        newAiBoard[action.row].push({ ...action.card });
    } else if (action.type === 'ultimate') {
        // Mark ultimate as used
        const card = findCardOnBoard(newAiBoard, action.card.id);
        if (card) {
            card.ultimateUsed = true;

            // Simulate ultimate effect (simplified)
            applyUltimateEffect(action.card.id, newAiBoard, newEnemyBoard);
        }
    } else if (action.type === 'pass') {
        // No change
    }

    return {
        aiBoard: newAiBoard,
        enemyBoard: newEnemyBoard,
        aiHand: newAiHand,
        enemyHand: [] // Don't track enemy hand
    };
}

/**
 * Generate sample opponent replies
 */
function generateOpponentReplies(aiBoard, enemyBoard, count) {
    // Simplified: generate plausible enemy actions
    const replies = [];

    // Opponent might deploy a hero
    replies.push({
        type: 'deploy',
        card: { id: 'generic', health: 4, front_power: 3 },
        row: 'front'
    });

    // Opponent might use an ultimate
    const enemyHeroesWithUlt = findHeroesWithUltimate(enemyBoard);
    if (enemyHeroesWithUlt.length > 0) {
        replies.push({
            type: 'ultimate',
            card: enemyHeroesWithUlt[0]
        });
    }

    // Opponent might pass
    replies.push({ type: 'pass' });

    return replies.slice(0, count);
}

/**
 * Apply simplified ultimate effect
 */
function applyUltimateEffect(heroId, aiBoard, enemyBoard) {
    // Simplified damage for simulation
    if (['pharah', 'junkrat', 'reaper'].includes(heroId)) {
        // Row AOE - remove ~2-3 HP from enemy row
        const targetRow = 'front';
        if (enemyBoard[targetRow]?.length > 0) {
            enemyBoard[targetRow].forEach(card => {
                card.health = Math.max(0, (card.health || 0) - 2);
            });
        }
    }
}

// ========== HELPER FUNCTIONS ==========

function hasColumnAOEHeroes(hand, board) {
    const columnHeroes = ['hanzo', 'reinhardt', 'sigma'];
    return checkHasHeroes(hand, board, columnHeroes);
}

function hasRowAOEHeroes(hand, board) {
    const rowHeroes = ['pharah', 'junkrat', 'reaper', 'mccree'];
    return checkHasHeroes(hand, board, rowHeroes);
}

function checkHasHeroes(hand, board, heroList) {
    const hasInHand = hand?.some(c => heroList.includes(c.id));
    const hasOnBoard = ['front', 'middle', 'back'].some(row =>
        board[row]?.some(c => heroList.includes(c.id))
    );
    return hasInHand || hasOnBoard;
}

function countRole(hand, board, role) {
    let count = 0;
    hand?.forEach(c => { if (c.role === role) count++; });
    ['front', 'middle', 'back'].forEach(row => {
        board[row]?.forEach(c => { if (c.role === role) count++; });
    });
    return count;
}

function countTotalHP(board) {
    let hp = 0;
    ['front', 'middle', 'back'].forEach(row => {
        board[row]?.forEach(c => { hp += c.health || 0; });
    });
    return hp;
}

function countSynergy(board) {
    let syn = 0;
    ['front', 'middle', 'back'].forEach(row => {
        board[row]?.forEach(c => { syn += c[`${row}_synergy`] || 0; });
    });
    return syn;
}

function cloneBoard(board) {
    const cloned = {};
    ['front', 'middle', 'back'].forEach(row => {
        cloned[row] = board[row] ? board[row].map(c => ({ ...c })) : [];
    });
    return cloned;
}

function findCardOnBoard(board, heroId) {
    for (const row of ['front', 'middle', 'back']) {
        const card = board[row]?.find(c => c.id === heroId);
        if (card) return card;
    }
    return null;
}

function findHeroesWithUltimate(board) {
    const heroes = [];
    ['front', 'middle', 'back'].forEach(row => {
        board[row]?.forEach(c => {
            if (c.ultimate && !c.ultimateUsed) heroes.push(c);
        });
    });
    return heroes;
}

function estimateKillProbability(aiBoard, enemyBoard) {
    let prob = 0;
    const aiDamage = countTotalHP(aiBoard) * 0.4; // Rough damage estimate

    ['front', 'middle', 'back'].forEach(row => {
        enemyBoard[row]?.forEach(card => {
            if ((card.health || 0) <= aiDamage * 0.5) {
                prob += 0.3; // Likely kill
            }
        });
    });

    return Math.min(prob, 1.0);
}

function countAvailableUltimates(board) {
    let count = 0;
    ['front', 'middle', 'back'].forEach(row => {
        board[row]?.forEach(c => {
            if (c.ultimate && !c.ultimateUsed) count++;
        });
    });
    return count;
}

function convertToLegacyAction(action) {
    if (action.type === 'deploy') {
        return {
            type: 'play_card',
            card: action.card,
            row: action.row,
            reasoning: action.description
        };
    } else if (action.type === 'ultimate') {
        return {
            type: 'use_ultimate',
            card: action.card,
            reasoning: action.description
        };
    } else {
        return {
            type: 'wait',
            reasoning: action.description || 'Tactical pass'
        };
    }
}

export default {
    selectBestAction,
    selectGamePlan,
    GAME_PLANS
};