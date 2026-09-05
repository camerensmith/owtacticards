import { isStructureCard } from './abilityRules';

export function cageFightDamage(maugaHp, targetHp) {
    return Math.abs((Number(maugaHp) || 0) - (Number(targetHp) || 0));
}

export function cageFightTargetIds(entries = []) {
    return (entries || [])
        .filter((entry) => {
            const card = entry?.card;
            return card && (card.health || 0) > 0 && !isStructureCard(card);
        })
        .map((entry) => entry.cardId);
}

export function opposingRowId(rowId) {
    const id = String(rowId || '');
    if (id.length < 2) return '';
    const other = id[0] === '1' ? '2' : id[0] === '2' ? '1' : '';
    return other ? `${other}${id.slice(1)}` : '';
}

export function structureMayEnterLockedRow(card) {
    return isStructureCard(card);
}

export function heroBlockedByCage(card, destRow) {
    return !!(destRow && destRow.locked) && !isStructureCard(card);
}
