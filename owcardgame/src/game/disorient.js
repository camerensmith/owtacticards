import { isStructureCard } from './abilityRules';
import { superchargerPowerBonus } from './orisaRules';

export function isMirage(card) {
    if (!card) return false;
    return card.id === 'mirage' || card.heroId === 'mirage';
}

export function isDisoriented(card) {
    return Array.isArray(card?.effects) && card.effects.some((effect) => effect?.id === 'disorient');
}

export function isExemptSource(sourceCard) {
    return isStructureCard(sourceCard);
}

function playerOf(cardId) {
    const n = parseInt(String(cardId || '')[0], 10);
    return Number.isFinite(n) ? n : null;
}

export function shouldDisorientSource({
    sourceCard,
    mirageCard,
    sourceCardId,
    mirageId,
} = {}) {
    if (!isMirage(mirageCard) && !isMirage({ id: String(mirageId || '').slice(1) })) return false;
    if (!sourceCardId && !sourceCard) return false;
    const srcPlayer = playerOf(sourceCardId);
    const mirPlayer = playerOf(mirageId);
    if (srcPlayer != null && mirPlayer != null && srcPlayer === mirPlayer) return false;
    if (isExemptSource(sourceCard) || isExemptSource({ id: String(sourceCardId || '').slice(1) })) return false;
    return true;
}

export function createDisorientEffect(victimPlayerNum) {
    return {
        id: 'disorient',
        hero: 'rajah',
        type: 'lock',
        tooltip: 'Disoriented: no ultimate, no death payoff, no power',
        victimPlayerNum: Number(victimPlayerNum),
        seenVictimNext: false,
    };
}

export function advanceDisorient(effect, { playerTurn } = {}) {
    if (!effect || effect.id !== 'disorient') return { keep: true, effect };
    const victim = Number(effect.victimPlayerNum);
    const turn = Number(playerTurn);
    if (!effect.seenVictimNext && turn === victim) {
        return { keep: true, effect: { ...effect, seenVictimNext: true } };
    }
    if (effect.seenVictimNext && turn !== victim) {
        return { keep: false, effect };
    }
    return { keep: true, effect };
}

export function cardPowerContribution(card, rowPosition) {
    if (!card || (card.health || 0) <= 0) return 0;
    if (isDisoriented(card)) return 0;
    return (card.power?.[rowPosition] || 0) + superchargerPowerBonus(card);
}

export function shouldPopMirageOnMove({ cardId, sourceCardId, getCard } = {}) {
    if (!cardId || !sourceCardId) return false;
    const mirageCard = getCard?.(cardId);
    if (!isMirage(mirageCard) || (mirageCard.health || 0) <= 0) return false;
    const sourceCard = getCard?.(sourceCardId);
    return shouldDisorientSource({
        sourceCard,
        mirageCard,
        sourceCardId,
        mirageId: cardId,
    });
}

export function tickDisorientOnCards(cardsById = {}, playerTurn) {
    const remove = [];
    const update = [];
    Object.entries(cardsById).forEach(([cardId, card]) => {
        const effects = Array.isArray(card?.effects) ? card.effects : [];
        effects.forEach((effect) => {
            if (effect?.id !== 'disorient') return;
            const result = advanceDisorient(effect, { playerTurn });
            if (!result.keep) {
                remove.push({ cardId });
                return;
            }
            if (result.effect.seenVictimNext !== effect.seenVictimNext) {
                update.push({ cardId, effect: result.effect });
            }
        });
    });
    return { remove, update };
}
