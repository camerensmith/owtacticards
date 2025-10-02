/**
 * Strategic Analysis System for AI
 * Deep understanding of game mechanics, positioning, and win conditions
 */

// Win condition strategies
export const WIN_CONDITIONS = {
    POWER_DOMINANCE: 'power_dominance',      // Win by raw power in all rows
    SYNERGY_BURST: 'synergy_burst',          // Build synergy for devastating ultimates
    TEMPO_CONTROL: 'tempo_control',          // Control board through removal
    ATTRITION: 'attrition',                  // Win through card advantage and staying power
    COMBO_SETUP: 'combo_setup'               // Set up specific card combos
};

/**
 * Analyze the current game state and determine best win condition to pursue
 */
export function determineWinCondition(gameState, aiBoard, enemyBoard, aiHand) {
    const scores = {
        [WIN_CONDITIONS.POWER_DOMINANCE]: 0,
        [WIN_CONDITIONS.SYNERGY_BURST]: 0,
        [WIN_CONDITIONS.TEMPO_CONTROL]: 0,
        [WIN_CONDITIONS.ATTRITION]: 0,
        [WIN_CONDITIONS.COMBO_SETUP]: 0
    };

    // Analyze hand composition
    const handAnalysis = analyzeHandComposition(aiHand);

    // Power dominance: High power cards, tanks
    if (handAnalysis.avgPower > 4) scores[WIN_CONDITIONS.POWER_DOMINANCE] += 30;
    if (handAnalysis.tankCount > 1) scores[WIN_CONDITIONS.POWER_DOMINANCE] += 20;

    // Synergy burst: High synergy cards, damage dealers for ultimates
    if (handAnalysis.avgSynergy > 1.5) scores[WIN_CONDITIONS.SYNERGY_BURST] += 30;
    if (handAnalysis.ultimateDamageDealer) scores[WIN_CONDITIONS.SYNERGY_BURST] += 25;

    // Tempo control: Removal abilities, damage dealers
    if (handAnalysis.removalCount > 1) scores[WIN_CONDITIONS.TEMPO_CONTROL] += 30;
    if (handAnalysis.damageAbilityCount > 2) scores[WIN_CONDITIONS.TEMPO_CONTROL] += 20;

    // Attrition: Healers, shields, card draw
    if (handAnalysis.healerCount > 0) scores[WIN_CONDITIONS.ATTRITION] += 25;
    if (handAnalysis.shieldProviderCount > 1) scores[WIN_CONDITIONS.ATTRITION] += 20;

    // Combo setup: Specific powerful combinations
    if (handAnalysis.hasCombo) scores[WIN_CONDITIONS.COMBO_SETUP] += 40;

    // Analyze board state
    const boardAnalysis = analyzeBoardState(aiBoard, enemyBoard);

    // Adjust based on current board
    if (boardAnalysis.powerDeficit > 10) {
        // Losing on power - need tempo or synergy burst
        scores[WIN_CONDITIONS.TEMPO_CONTROL] += 20;
        scores[WIN_CONDITIONS.SYNERGY_BURST] += 15;
    }

    if (boardAnalysis.hasStrongFrontline) {
        // Good frontline - can build synergy safely
        scores[WIN_CONDITIONS.SYNERGY_BURST] += 15;
    }

    if (boardAnalysis.enemyThreatLevel > 7) {
        // Enemy threats high - need removal
        scores[WIN_CONDITIONS.TEMPO_CONTROL] += 25;
    }

    // Find highest scoring win condition
    let bestCondition = WIN_CONDITIONS.POWER_DOMINANCE;
    let highestScore = 0;

    for (const [condition, score] of Object.entries(scores)) {
        console.log(`Win condition ${condition}: ${score} points`);
        if (score > highestScore) {
            highestScore = score;
            bestCondition = condition;
        }
    }

    console.log(`AI determined win condition: ${bestCondition} (${highestScore} points)`);
    return { condition: bestCondition, score: highestScore };
}

/**
 * Analyze hand composition for strategic planning
 */
function analyzeHandComposition(hand) {
    const analysis = {
        avgPower: 0,
        avgSynergy: 0,
        tankCount: 0,
        damageCount: 0,
        supportCount: 0,
        healerCount: 0,
        shieldProviderCount: 0,
        removalCount: 0,
        damageAbilityCount: 0,
        ultimateDamageDealer: false,
        hasCombo: false
    };

    if (!hand || hand.length === 0) return analysis;

    let totalPower = 0;
    let totalSynergy = 0;

    hand.forEach(card => {
        // Calculate averages
        const cardPower = (card.front_power || 0) + (card.middle_power || 0) + (card.back_power || 0);
        const cardSynergy = (card.synergy?.f || 0) + (card.synergy?.m || 0) + (card.synergy?.b || 0);

        totalPower += cardPower;
        totalSynergy += cardSynergy;

        // Role classification
        const role = card.role;
        if (role === 'Tank') analysis.tankCount++;
        if (role === 'Damage') analysis.damageCount++;
        if (role === 'Support') analysis.supportCount++;

        // Specific capabilities
        if (isHealer(card.id)) analysis.healerCount++;
        if (providesShields(card.id)) analysis.shieldProviderCount++;
        if (hasRemovalAbility(card.id)) analysis.removalCount++;
        if (hasDamageAbility(card.id)) analysis.damageAbilityCount++;
        if (hasHighDamageUltimate(card.id)) analysis.ultimateDamageDealer = true;

        // Combo detection
        if (detectCombos(hand)) analysis.hasCombo = true;
    });

    analysis.avgPower = totalPower / hand.length;
    analysis.avgSynergy = totalSynergy / hand.length;

    return analysis;
}

/**
 * Analyze current board state
 */
function analyzeBoardState(aiBoard, enemyBoard) {
    const analysis = {
        powerDeficit: 0,
        hasStrongFrontline: false,
        enemyThreatLevel: 0,
        vulnerableAllies: 0,
        synergy: { front: 0, middle: 0, back: 0 }
    };

    // Calculate power differential
    const aiPower = calculateBoardPower(aiBoard);
    const enemyPower = calculateBoardPower(enemyBoard);
    analysis.powerDeficit = enemyPower - aiPower;

    // Check for strong frontline
    if (aiBoard.front.length > 0) {
        const frontHealth = aiBoard.front.reduce((sum, card) => sum + (card.health || 0), 0);
        if (frontHealth > 8) analysis.hasStrongFrontline = true;
    }

    // Assess enemy threats
    analysis.enemyThreatLevel = assessThreatLevel(enemyBoard);

    // Count vulnerable allies (low health, high value)
    aiBoard.front.concat(aiBoard.middle, aiBoard.back).forEach(card => {
        if (card.health && card.health < 3) {
            analysis.vulnerableAllies++;
        }
    });

    return analysis;
}

function calculateBoardPower(board) {
    let total = 0;
    ['front', 'middle', 'back'].forEach(row => {
        board[row].forEach(card => {
            total += (card[`${row}_power`] || 0);
        });
    });
    return total;
}

function assessThreatLevel(enemyBoard) {
    let threat = 0;
    ['front', 'middle', 'back'].forEach(row => {
        enemyBoard[row].forEach(card => {
            // High power = threat
            threat += (card[`${row}_power`] || 0) * 0.5;
            // High health = threat
            threat += (card.health || 0) * 0.3;
            // Has ultimate ready = threat
            if (card.ultimate) threat += 2;
        });
    });
    return threat;
}

// Helper functions for card capabilities
function isHealer(heroId) {
    return ['mercy', 'ana', 'moira', 'baptiste', 'lucio', 'zenyatta', 'lifeweaver', 'brigitte'].includes(heroId);
}

function providesShields(heroId) {
    return ['reinhardt', 'zarya', 'sigma', 'symmetra', 'brigitte', 'lucio', 'ramattra'].includes(heroId);
}

function hasRemovalAbility(heroId) {
    return ['roadhog', 'widowmaker', 'hanzo', 'mccree', 'ashe', 'reaper', 'soldier', 'pharah', 'junkrat'].includes(heroId);
}

function hasDamageAbility(heroId) {
    return ['roadhog', 'genji', 'reaper', 'hanzo', 'widowmaker', 'ashe', 'mccree', 'soldier',
            'junkrat', 'pharah', 'tracer', 'sombra', 'echo', 'mei', 'bastion', 'doomfist'].includes(heroId);
}

function hasHighDamageUltimate(heroId) {
    return ['pharah', 'hanzo', 'junkrat', 'reaper', 'mccree', 'genji', 'tracer', 'bastion', 'roadhog'].includes(heroId);
}

function detectCombos(hand) {
    const heroIds = hand.map(c => c.id);

    // Pharah + synergy builders = devastating ultimate
    if (heroIds.includes('pharah')) {
        const hasSynergyBuilders = heroIds.some(id =>
            ['torbjorn', 'bob', 'lucio', 'mercy', 'zenyatta', 'orisa', 'baptiste'].includes(id)
        );
        if (hasSynergyBuilders) return true;
    }

    // Reinhardt + backline damage dealers = protected damage
    if (heroIds.includes('reinhardt')) {
        const hasBacklineDamage = heroIds.some(id =>
            ['widowmaker', 'hanzo', 'ana', 'soldier', 'ashe', 'bastion'].includes(id)
        );
        if (hasBacklineDamage) return true;
    }

    // Zarya + AOE damage = combo ultimate
    if (heroIds.includes('zarya')) {
        const hasAOEDamage = heroIds.some(id =>
            ['pharah', 'hanzo', 'junkrat', 'reaper', 'dva', 'tracer'].includes(id)
        );
        if (hasAOEDamage) return true;
    }

    // Orisa + damage dealers = supercharger synergy
    if (heroIds.includes('orisa')) {
        const hasDamageDealers = heroIds.filter(id =>
            ['soldier', 'bastion', 'ashe', 'mccree', 'hanzo', 'widowmaker'].includes(id)
        ).length >= 2;
        if (hasDamageDealers) return true;
    }

    // Symmetra + high value card = reuse
    if (heroIds.includes('symmetra') && hand.some(c => c.on_enter1 || c.on_enter2)) {
        return true;
    }

    // Ana + high power target = nano boost combo
    if (heroIds.includes('ana')) {
        const hasHighPowerTarget = hand.some(c => (c.power || 0) >= 4);
        if (hasHighPowerTarget) return true;
    }

    // Mercy + damage dealers = damage boost combo
    if (heroIds.includes('mercy')) {
        const hasDamageDealers = heroIds.filter(id =>
            hasDamageAbility(id)
        ).length >= 2;
        if (hasDamageDealers) return true;
    }

    return false;
}

/**
 * Determine if AI should play multiple cards or hold back
 * Returns a more dynamic count based on situation, hand quality, and board state
 */
export function determineCardPlayCount(hand, board, winCondition) {
    const handSize = hand.length;
    const boardSize = board.front.length + board.middle.length + board.back.length;
    
    // Always play if hand is full (tempo pressure)
    if (handSize >= 6) return Math.min(4, handSize);

    // Early game - establish board presence
    if (boardSize < 2) {
        return Math.min(2, handSize);
    }

    // Calculate hand quality score
    const handQuality = calculateHandQuality(hand);
    
    // If hand is very poor quality, consider playing 0 cards
    if (handQuality < 0.2 && handSize <= 3) {
        return 0;
    }
    
    // If board is already strong and hand is small, consider holding
    if (boardSize >= 6 && handSize <= 2 && handQuality < 0.5) {
        return 0;
    }
    
    // Calculate board pressure (how much we need to play)
    const boardPressure = calculateBoardPressure(board, handSize);
    
    // Calculate enemy threat level
    const enemyThreat = calculateEnemyThreat(board);
    
    // Base play count from win condition
    let basePlays = 1;
    switch (winCondition) {
        case WIN_CONDITIONS.POWER_DOMINANCE:
            basePlays = 3;
            break;
        case WIN_CONDITIONS.SYNERGY_BURST:
            basePlays = 2; // Moderate plays for synergy building
            break;
        case WIN_CONDITIONS.TEMPO_CONTROL:
            basePlays = 2;
            break;
        case WIN_CONDITIONS.ATTRITION:
            basePlays = 1; // Conservative
            break;
        case WIN_CONDITIONS.COMBO_SETUP:
            basePlays = 2; // Setup cards
            break;
        default:
            basePlays = 2;
    }

    // Adjust based on hand quality (better cards = play more)
    if (handQuality > 0.7) basePlays += 1;
    else if (handQuality < 0.3) basePlays = Math.max(0, basePlays - 1);

    // Adjust based on board pressure (need space = play more)
    if (boardPressure > 0.7) basePlays += 1;
    else if (boardPressure < 0.3) basePlays = Math.max(0, basePlays - 1);

    // Adjust based on enemy threat (high threat = play more to respond)
    if (enemyThreat > 0.7) basePlays += 1;

    // Late game considerations
    if (boardSize >= 8) {
        // Board is getting full, be more selective
        basePlays = Math.min(basePlays, 2);
    }

    // Ensure we don't exceed hand size or play too many (cap at 3)
    return Math.max(0, Math.min(3, Math.min(basePlays, handSize)));
}

/**
 * Calculate hand quality (0-1) based on card power, synergy, and strategic value
 */
function calculateHandQuality(hand) {
    if (hand.length === 0) return 0;
    
    let totalScore = 0;
    for (const card of hand) {
        let score = 0;
        
        // Power value
        const power = (card.front_power || 0) + (card.middle_power || 0) + (card.back_power || 0);
        score += power * 0.1;
        
        // Synergy value
        const synergy = (card.synergy?.f || 0) + (card.synergy?.m || 0) + (card.synergy?.b || 0);
        score += synergy * 0.15;
        
        // Health value
        score += (card.health || 4) * 0.05;
        
        // Role value (offense > support > defense > tank for tempo)
        if (card.role === 'Offense' || card.role === 'Damage') score += 0.3;
        else if (card.role === 'Support') score += 0.2;
        else if (card.role === 'Defense') score += 0.15;
        else if (card.role === 'Tank') score += 0.1;
        
        // Ultimate value
        if (card.ultimate && card.ultimate.includes('(')) {
            const costMatch = card.ultimate.match(/\((\d+)\)/);
            if (costMatch) {
                const cost = parseInt(costMatch[1]);
                // Lower cost ultimates are more valuable for tempo
                score += (6 - cost) * 0.05;
            }
        }
        
        // Special card value (BOB, MEKA, etc.)
        if (['bob', 'meka', 'turret'].includes(card.id)) score += 0.4;
        
        totalScore += Math.min(1, score); // Cap individual card score at 1
    }
    
    return totalScore / hand.length;
}

/**
 * Calculate board pressure (0-1) - how much we need to play cards
 */
function calculateBoardPressure(board, handSize) {
    const maxSlots = 12; // 4 per row × 3 rows
    const currentSlots = board.front.length + board.middle.length + board.back.length;
    const availableSlots = maxSlots - currentSlots;
    
    // High pressure if we have many cards but few board slots
    const slotPressure = handSize / Math.max(1, availableSlots);
    
    // Also consider if we have high-value cards that need to be played
    const hasHighValueCards = board.front.some(c => c.health > 5) || 
                             board.middle.some(c => c.health > 5) || 
                             board.back.some(c => c.health > 5);
    
    return Math.min(1, slotPressure + (hasHighValueCards ? 0.3 : 0));
}

/**
 * Calculate enemy threat level (0-1) based on enemy board power
 */
function calculateEnemyThreat(board) {
    // This would need enemy board data - for now return moderate threat
    // In a real implementation, you'd analyze enemy board power, synergy, etc.
    return 0.5;
}

/**
 * Should this specific card be played NOW or held for later?
 */
// Track how long cards have been held (to prevent infinite holding)
const cardHoldTracker = new Map(); // cardId -> turns held

export function shouldHoldCard(card, aiBoard, enemyBoard, aiHand, winCondition, turnNumber = 0) {
    const heroId = card.id;
    const cardKey = `${heroId}_${card.power}_${card.synergy}`;

    // Initialize hold tracker
    if (!cardHoldTracker.has(cardKey)) {
        cardHoldTracker.set(cardKey, 0);
    }

    // NEVER hold if hand is full (tempo pressure)
    if (aiHand.length >= 6) {
        cardHoldTracker.delete(cardKey);
        return false;
    }

    // Release holds after 3 turns (prevent paralysis)
    const turnsHeld = cardHoldTracker.get(cardKey);
    if (turnsHeld >= 3) {
        console.log(`Releasing ${card.name} - held for ${turnsHeld} turns (timeout)`);
        cardHoldTracker.delete(cardKey);
        return false;
    }

    const boardSize = aiBoard.front.length + aiBoard.middle.length + aiBoard.back.length;
    const handIds = aiHand.map(c => c.id);

    // Hold support cards if no board to support
    if (boardSize === 0) {
        if (['ana', 'mercy', 'brigitte', 'ramattra', 'zenyatta', 'lifeweaver'].includes(heroId)) {
            console.log(`Holding ${card.name} - needs allies on board`);
            cardHoldTracker.set(cardKey, turnsHeld + 1);
            return true;
        }
    }

    // Hold Symmetra if no good return targets
    if (heroId === 'symmetra') {
        const hasGoodTarget = boardSize > 0;
        if (!hasGoodTarget) {
            console.log(`Holding Symmetra - no good teleport targets`);
            cardHoldTracker.set(cardKey, turnsHeld + 1);
            return true;
        }
    }

    // COMBO PLANNING: Hold high-value cards for synergy setups
    if (winCondition === WIN_CONDITIONS.SYNERGY_BURST || winCondition === WIN_CONDITIONS.COMBO_SETUP) {
        // Hold Pharah if we have/will have synergy builders
        if (heroId === 'pharah') {
            const hasSynergyBuilders = handIds.some(id =>
                ['torbjorn', 'bob', 'lucio', 'mercy', 'zenyatta', 'orisa', 'baptiste'].includes(id)
            );
            const currentSynergy = (aiBoard.front[0]?.synergy?.f || 0) +
                                 (aiBoard.middle[0]?.synergy?.m || 0) +
                                 (aiBoard.back[0]?.synergy?.b || 0);

            // Hold if we have synergy builders in hand OR synergy is building up
            if (hasSynergyBuilders || (currentSynergy >= 2 && currentSynergy < 5)) {
                console.log(`Holding Pharah - waiting for synergy setup (current: ${currentSynergy}, builders in hand: ${hasSynergyBuilders})`);
                cardHoldTracker.set(cardKey, turnsHeld + 1);
                return true;
            }
        }

        // Hold AOE ultimates for Zarya combo
        if (['hanzo', 'junkrat', 'reaper', 'dva', 'tracer'].includes(heroId)) {
            const hasZarya = handIds.includes('zarya') || aiBoard.front.some(c => c.id === 'zarya') ||
                           aiBoard.middle.some(c => c.id === 'zarya') || aiBoard.back.some(c => c.id === 'zarya');
            if (hasZarya) {
                console.log(`Holding ${card.name} - saving for Zarya combo`);
                cardHoldTracker.set(cardKey, turnsHeld + 1);
                return true;
            }
        }

        // Hold damage dealers for Orisa supercharger
        if (['soldier', 'bastion', 'ashe', 'mccree'].includes(heroId) && boardSize < 4) {
            const hasOrisa = handIds.includes('orisa') || aiBoard.front.some(c => c.id === 'orisa') ||
                           aiBoard.middle.some(c => c.id === 'orisa') || aiBoard.back.some(c => c.id === 'orisa');
            const orisaInHand = handIds.includes('orisa');

            // Hold if Orisa is in hand and we want to play her first
            if (orisaInHand && boardSize >= 1) {
                console.log(`Holding ${card.name} - waiting for Orisa supercharger`);
                cardHoldTracker.set(cardKey, turnsHeld + 1);
                return true;
            }
        }

        // Hold high-power targets for Ana nano boost
        if ((card.power || 0) >= 4 && boardSize < 5) {
            const hasAna = handIds.includes('ana') || aiBoard.front.some(c => c.id === 'ana') ||
                         aiBoard.middle.some(c => c.id === 'ana') || aiBoard.back.some(c => c.id === 'ana');
            const anaInHand = handIds.includes('ana');

            if (anaInHand && boardSize >= 1) {
                console.log(`Holding ${card.name} - saving for Ana nano boost`);
                cardHoldTracker.set(cardKey, turnsHeld + 1);
                return true;
            }
        }

        // Hold ultimate damage dealers if synergy isn't ready
        if (['pharah', 'hanzo', 'junkrat', 'reaper', 'mccree', 'genji'].includes(heroId)) {
            const currentSynergy = (aiBoard.front[0]?.synergy?.f || 0) +
                                 (aiBoard.middle[0]?.synergy?.m || 0) +
                                 (aiBoard.back[0]?.synergy?.b || 0);

            // Hold ultimate card if synergy isn't high enough yet
            if (currentSynergy < 4 && boardSize > 1 && boardSize < 5) {
                console.log(`Holding ${card.name} ultimate - waiting for more synergy (current: ${currentSynergy})`);
                cardHoldTracker.set(cardKey, turnsHeld + 1);
                return true;
            }
        }
    }

    // Hold Reinhardt if we have backline damage to deploy with him
    if (heroId === 'reinhardt' && boardSize === 0) {
        const hasBacklineDamage = handIds.some(id =>
            ['widowmaker', 'hanzo', 'ana', 'soldier', 'ashe', 'bastion'].includes(id)
        );
        if (hasBacklineDamage) {
            console.log(`Holding Reinhardt - want to deploy with backline damage`);
            cardHoldTracker.set(cardKey, turnsHeld + 1);
            return true;
        }
    }

    // Hold backline damage if we have Reinhardt
    if (['widowmaker', 'hanzo', 'ana', 'bastion'].includes(heroId) && boardSize === 0) {
        const hasReinhardt = handIds.includes('reinhardt');
        if (hasReinhardt) {
            console.log(`Holding ${card.name} - want to play after Reinhardt`);
            cardHoldTracker.set(cardKey, turnsHeld + 1);
            return true;
        }
    }

    // Card will be played - reset hold counter
    cardHoldTracker.delete(cardKey);
    return false;
}

// Export function to reset hold tracker (for testing or turn resets)
export function resetHoldTracker() {
    cardHoldTracker.clear();
}

export default {
    determineWinCondition,
    determineCardPlayCount,
    shouldHoldCard,
    resetHoldTracker,
    WIN_CONDITIONS
};