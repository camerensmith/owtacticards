import { applyDefenderDamage } from '../game/rules';
import { cardPowerContribution } from '../game/disorient';
import data from '../data';

// Project the board-wide blast without mutating live cards or shared row shields.
export function shouldSelfDestruct({ cardId, getRow, getCard, isSlotInvulnerable }) {
    const owner = Number(cardId[0]);
    const before = { 1: 0, 2: 0 };
    const after = { 1: 0, 2: 0 };
    let foundCaster = false;
    for (const player of [1, 2]) {
        for (const pos of ['f', 'm', 'b']) {
            const rowId = `${player}${pos}`;
            const row = getRow?.(rowId);
            let shields = row?.shield || [];
            // Reactive tokens can redirect damage or change death outcomes. Hold
            // rather than treating an uncertain blast as a favorable power wipe.
            if (row?.allyEffects?.length || row?.enemyEffects?.length) return false;
            for (const [index, id] of (row?.cardIds || []).entries()) {
                const card = getCard?.(id);
                if (!card || !(card.health > 0)) continue;
                if (card.effects?.some(effect => effect?.id !== 'disorient')) return false;
                before[player] += cardPowerContribution(card, pos);
                const result = applyDefenderDamage({
                    amount: isSlotInvulnerable?.(rowId, index) ? 0 : 4,
                    health: card.health,
                    armor: card.armor,
                    cardShield: card.shield,
                    rowShields: shields,
                });
                shields = result.rowShields;
                if (id === cardId || (card.id === 'dvameka' && result.died)) {
                    foundCaster ||= id === cardId;
                    after[player] += cardPowerContribution(data.heroes.dva, pos);
                } else {
                    after[player] += cardPowerContribution({ ...card, health: result.health }, pos);
                }
            }
        }
    }
    const enemy = owner === 1 ? 2 : 1;
    const marginBefore = before[owner] - before[enemy];
    const marginAfter = after[owner] - after[enemy];
    return foundCaster && marginAfter > 0 && marginAfter > marginBefore;
}

export function rankWidowmakerTargets(targetIds, getCard, hasUsedUltimate) {
    return [...targetIds].sort((a, b) => {
        const usedA = !!hasUsedUltimate?.(Number(a[0]), a.slice(1));
        const usedB = !!hasUsedUltimate?.(Number(b[0]), b.slice(1));
        return Number(usedA) - Number(usedB) ||
            (getCard?.(b)?.health || 0) - (getCard?.(a)?.health || 0);
    });
}
