/**
 * Threat Assessment System
 * Identifies dangerous enemies, prioritizes targets, and protects key allies
 */

/**
 * Assess all enemy threats and rank them by danger level
 * @param {Object} enemyBoard - Enemy board state {front: [], middle: [], back: []}
 * @param {Object} aiBoard - AI board state
 * @returns {Array} Sorted array of threats (highest threat first)
 */
export function assessThreats(enemyBoard, aiBoard) {
    const threats = [];

    // Analyze each enemy card
    ['front', 'middle', 'back'].forEach(row => {
        enemyBoard[row]?.forEach(card => {
            if (!card || card.health <= 0) return;

            const threat = {
                cardId: card.cardId || card.id,
                card: card,
                row: row,
                score: calculateThreatScore(card, row, enemyBoard, aiBoard)
            };

            threats.push(threat);
        });
    });

    // Sort by threat score (highest first)
    threats.sort((a, b) => b.score - a.score);

    console.log('Threat Assessment:', threats.map(t => `${t.card.name}: ${t.score.toFixed(1)}`));
    return threats;
}

/**
 * Calculate threat score for an enemy card
 */
function calculateThreatScore(card, row, enemyBoard, aiBoard) {
    let score = 0;

    // === ROLE-BASED THREAT ===
    // Supports are highest priority (healers enable everything)
    if (card.role === 'Support') {
        score += 100;
        console.log(`${card.name}: Support role (+100)`);
    }
    // Damage dealers are second priority
    else if (card.role === 'Damage' || card.role === 'Offense') {
        score += 70;
        console.log(`${card.name}: Damage role (+70)`);
    }
    // Tanks are lower priority (hard to kill, less immediate threat)
    else if (card.role === 'Tank') {
        score += 40;
        console.log(`${card.name}: Tank role (+40)`);
    }

    // === POWER THREAT ===
    const power = (card.front_power || 0) + (card.middle_power || 0) + (card.back_power || 0);
    score += power * 8;
    if (power >= 5) {
        console.log(`${card.name}: High power ${power} (+${power * 8})`);
    }

    // === SYNERGY SNOWBALL THREAT ===
    // Enemy building synergy is dangerous (close to ultimate)
    const cardRowId = `1${row[0]}`; // 1f, 1m, 1b
    const rowData = window.__ow_getRow?.(cardRowId);
    const rowSynergy = rowData?.synergy || 0;

    if (rowSynergy >= 4) {
        score += 50;
        console.log(`${card.name}: High synergy row (${rowSynergy}) - ultimate threat (+50)`);
    } else if (rowSynergy >= 2) {
        score += 25;
        console.log(`${card.name}: Medium synergy row (${rowSynergy}) (+25)`);
    }

    // === RESOURCE DENIAL: SYNERGY GENERATORS ===
    // Cards that generate lots of synergy are snowball threats - DENY THEM EARLY
    const cardSynergy = (card.synergy?.f || 0) + (card.synergy?.m || 0) + (card.synergy?.b || 0);
    if (cardSynergy >= 3) {
        score += 45; // Increased from 30 - HIGH priority to deny synergy engines
        console.log(`${card.name}: High synergy generation ${cardSynergy} (+45 - DENY ENGINE)`);
    } else if (cardSynergy >= 2) {
        score += 25;
        console.log(`${card.name}: Medium synergy generation ${cardSynergy} (+25)`);
    }

    // CRITICAL: Identify specific synergy engine heroes and prioritize killing them
    const synergyEngines = ['lucio', 'mercy', 'zenyatta', 'torbjorn', 'orisa', 'baptiste', 'brigitte'];
    if (synergyEngines.includes(card.id)) {
        // Check if enemy has damage dealers in same row that could combo
        const rowCards = enemyBoard[row] || [];
        const hasDamageDealers = rowCards.some(c =>
            c && c.role === 'Damage' && (c.front_power + c.middle_power + c.back_power) >= 4
        );

        if (hasDamageDealers) {
            score += 50; // CRITICAL - Kill synergy engine before combo activates
            console.log(`${card.name}: Synergy engine with damage dealers in row (+50 - DENY COMBO SETUP)`);
        } else {
            score += 30;
            console.log(`${card.name}: Synergy engine hero (+30 - RESOURCE DENIAL)`);
        }
    }

    // === HEALTH/SURVIVABILITY ===
    // Low health = easy kill (bonus priority)
    if (card.health === 1) {
        score += 40;
        console.log(`${card.name}: Critical health 1 HP (+40 - easy kill)`);
    } else if (card.health === 2) {
        score += 20;
        console.log(`${card.name}: Low health 2 HP (+20)`);
    }

    // High health = harder to kill (penalty)
    if (card.health >= 5) {
        score -= 15;
        console.log(`${card.name}: High health ${card.health} (-15 - tanky)`);
    }

    // === SPECIAL HERO THREATS ===
    const heroId = card.id;

    // Mercy - highest priority healer
    if (heroId === 'mercy') {
        score += 60;
        console.log(`${card.name}: Mercy - resurrection threat (+60)`);
    }

    // Ana - high value healer
    if (heroId === 'ana') {
        score += 45;
        console.log(`${card.name}: Ana - strong healer (+45)`);
    }

    // Pharah - ultimate devastation with synergy
    if (heroId === 'pharah' && rowSynergy >= 3) {
        score += 55;
        console.log(`${card.name}: Pharah with synergy - ultimate threat (+55)`);
    }

    // Hanzo - AOE column damage
    if (heroId === 'hanzo') {
        score += 40;
        console.log(`${card.name}: Hanzo - column wipe threat (+40)`);
    }

    // Reinhardt - protects backline, enables team
    if (heroId === 'reinhardt') {
        score += 35;
        console.log(`${card.name}: Reinhardt - shield enabler (+35)`);
    }

    // Symmetra - can teleport key targets
    if (heroId === 'symmetra') {
        score += 30;
        console.log(`${card.name}: Symmetra - teleport disruption (+30)`);
    }

    // === POSITIONING THREAT ===
    // Enemies in front row are more threatening (direct pressure)
    if (row === 'front') {
        score += 15;
    }

    // Backline threats (protected, hard to reach)
    if (row === 'back' && (card.role === 'Support' || card.role === 'Damage')) {
        score += 20;
        console.log(`${card.name}: Backline protected position (+20)`);
    }

    return score;
}

/**
 * Determine kill priority for targeting decisions
 * @param {Array} threats - Array of threat objects from assessThreats()
 * @returns {Object} Target recommendation {cardId, reason}
 */
export function getKillPriority(threats) {
    if (!threats || threats.length === 0) {
        return null;
    }

    // Get top 3 threats
    const topThreats = threats.slice(0, 3);

    console.log('Kill Priority Candidates:');
    topThreats.forEach((t, i) => {
        console.log(`  ${i + 1}. ${t.card.name} (${t.score.toFixed(1)} threat) - ${t.card.health} HP`);
    });

    // Return highest threat
    const target = topThreats[0];

    let reason = 'Highest threat';
    if (target.card.role === 'Support') reason = 'Priority: Kill healer';
    else if (target.card.health <= 2) reason = 'Easy kill opportunity';
    else if (target.score >= 150) reason = 'Critical threat';

    return {
        cardId: target.cardId,
        card: target.card,
        row: target.row,
        reason: reason,
        score: target.score
    };
}

/**
 * Assess which ally cards need protection
 * @param {Object} aiBoard - AI board state
 * @param {Object} enemyBoard - Enemy board state
 * @returns {Array} Allies that need protection, sorted by priority
 */
export function assessAllyProtection(aiBoard, enemyBoard) {
    const protectionNeeds = [];

    ['front', 'middle', 'back'].forEach(row => {
        aiBoard[row]?.forEach(card => {
            if (!card || card.health <= 0) return;

            const need = {
                cardId: card.cardId || card.id,
                card: card,
                row: row,
                score: calculateProtectionPriority(card, row, aiBoard, enemyBoard)
            };

            protectionNeeds.push(need);
        });
    });

    // Sort by protection priority (highest first)
    protectionNeeds.sort((a, b) => b.score - a.score);

    console.log('Protection Priorities:', protectionNeeds.slice(0, 3).map(p => `${p.card.name}: ${p.score.toFixed(1)}`));
    return protectionNeeds;
}

/**
 * Calculate how much protection/healing priority an ally needs
 */
function calculateProtectionPriority(card, row, aiBoard, enemyBoard) {
    let score = 0;

    // === ROLE-BASED PROTECTION ===
    // Supports are most valuable (keep them alive)
    if (card.role === 'Support') {
        score += 80;
    }
    // Damage dealers are valuable
    else if (card.role === 'Damage' || card.role === 'Offense') {
        score += 50;
    }
    // Tanks can take hits
    else if (card.role === 'Tank') {
        score += 20;
    }

    // === HEALTH STATUS ===
    const maxHealth = window.__ow_getMaxHealth?.(card.cardId) || card.health;
    const healthPercent = card.health / maxHealth;

    if (card.health === 1) {
        score += 100; // CRITICAL - about to die
    } else if (healthPercent <= 0.3) {
        score += 60; // Very wounded
    } else if (healthPercent <= 0.5) {
        score += 30; // Wounded
    }

    // === SYNERGY VALUE ===
    // High synergy generators are valuable
    const cardSynergy = (card.synergy?.f || 0) + (card.synergy?.m || 0) + (card.synergy?.b || 0);
    if (cardSynergy >= 3) {
        score += 25;
    }

    // === POSITIONING ===
    // Backline units are safer (lower priority)
    if (row === 'back') {
        score -= 20;
    }
    // Front line units are exposed (higher priority)
    if (row === 'front') {
        score += 15;
    }

    // === SPECIAL HEROES ===
    const heroId = card.id;

    // Mercy - keep her alive for resurrection
    if (heroId === 'mercy') {
        score += 50;
    }

    // Pharah - high value ultimate carrier
    if (heroId === 'pharah') {
        score += 30;
    }

    return score;
}

/**
 * Recommend defensive actions (healing, shielding, repositioning)
 * @param {Array} protectionNeeds - From assessAllyProtection()
 * @returns {Object} Defensive action recommendation
 */
export function recommendDefensiveAction(protectionNeeds) {
    if (!protectionNeeds || protectionNeeds.length === 0) {
        return null;
    }

    const mostVulnerable = protectionNeeds[0];

    // If someone is critical, recommend healing
    if (mostVulnerable.card.health <= 2) {
        return {
            action: 'heal',
            target: mostVulnerable.cardId,
            reason: `${mostVulnerable.card.name} critical (${mostVulnerable.card.health} HP)`,
            priority: 'URGENT'
        };
    }

    // If support is wounded, recommend healing
    if (mostVulnerable.card.role === 'Support' && mostVulnerable.card.health < 4) {
        return {
            action: 'heal',
            target: mostVulnerable.cardId,
            reason: `Protect ${mostVulnerable.card.name} (support)`,
            priority: 'HIGH'
        };
    }

    return null;
}

export default {
    assessThreats,
    getKillPriority,
    assessAllyProtection,
    recommendDefensiveAction
};
