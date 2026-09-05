/**
 * Pure combat and round-resolution helpers.
 * Keep side-effect-free so App/damageBus can share one writer.
 */

import { heroBlockedByCage } from './cageFight';
import { deployRowAllowed, isMantisCard } from './mantis';

export function applyRowShieldDamage(shields, damage) {
    const amount = Number(damage) || 0;
    if (!Array.isArray(shields) || amount <= 0) {
        return {
            shields: Array.isArray(shields) ? shields.map((s) => ({ ...s })) : [],
            damageDone: 0,
            remaining: Math.max(0, amount),
        };
    }

    let remaining = amount;
    const next = shields.map((s) => ({ ...s }));
    for (let i = 0; i < next.length && remaining > 0; i++) {
        const value = Math.max(0, next[i].shieldValue || 0);
        const take = Math.min(value, remaining);
        next[i].shieldValue = value - take;
        remaining -= take;
    }

    return {
        shields: next.filter((s) => (s.shieldValue || 0) > 0),
        damageDone: amount - remaining,
        remaining,
    };
}

export function applyDefenderDamage({
    amount,
    ignoreShields = false,
    health = 0,
    armor = 0,
    cardShield = 0,
    rowShields = [],
} = {}) {
    let remaining = Math.max(0, Number(amount) || 0);
    let nextRowShields = Array.isArray(rowShields) ? rowShields.map((s) => ({ ...s })) : [];
    let nextCardShield = Math.max(0, cardShield || 0);
    let nextArmor = Math.max(0, armor || 0);
    let nextHealth = Math.max(0, health || 0);
    let rowShieldDamage = 0;

    // Shields and Armor are separate pools ahead of health. ignoreShields
    // pierces all three; Armor is not bonus HP.
    if (!ignoreShields && remaining > 0) {
        const rowResult = applyRowShieldDamage(nextRowShields, remaining);
        nextRowShields = rowResult.shields;
        rowShieldDamage = rowResult.damageDone;
        remaining = rowResult.remaining;

        const takeCard = Math.min(nextCardShield, remaining);
        nextCardShield -= takeCard;
        remaining -= takeCard;

        const takeArmor = Math.min(nextArmor, remaining);
        nextArmor -= takeArmor;
        remaining -= takeArmor;
    }

    const takeHealth = Math.min(nextHealth, remaining);
    nextHealth -= takeHealth;

    return {
        health: nextHealth,
        armor: nextArmor,
        cardShield: nextCardShield,
        rowShields: nextRowShields,
        rowShieldDamage,
        died: health > 0 && nextHealth <= 0,
    };
}

/** 1 = player 1, 2 = player 2, 3 = draw */
export function decideRoundWinner(power1, power2, synergy1 = 0, synergy2 = 0) {
    if (power1 > power2) return 1;
    if (power2 > power1) return 2;
    if (synergy1 > synergy2) return 1;
    if (synergy2 > synergy1) return 2;
    return 3;
}

export function totalRowSynergy(rows, playerNum) {
    const ids = [`${playerNum}f`, `${playerNum}m`, `${playerNum}b`];
    return ids.reduce((sum, id) => sum + (rows?.[id]?.synergy || 0), 0);
}

export function isDeployFromHand(startRowId) {
    return typeof startRowId === 'string' && startRowId.startsWith('player');
}

/**
 * Whether the dropped DOM card should skip the drag library's settle.
 *
 * A card deployed from the hand is carried to its slot by the Pixi flyer, so
 * letting the library also glide the DOM card back to its hand position would
 * put two copies of the same card in the air at once. Every other drop —
 * reordering the hand, moving a card between rows — keeps the settle, which is
 * what makes a drop look like it lands instead of teleporting.
 *
 * A drop outside any list (`toRowId` null) settles normally: nothing else is
 * animating it.
 */
export function skipsDropSettle(fromRowId, toRowId) {
    if (!toRowId) return false;
    return isDeployFromHand(fromRowId) && !isDeployFromHand(toRowId);
}

export function countsAsDeployHero(heroId) {
    return heroId !== 'turret' && heroId !== 'bob' && heroId !== 'stoneguard';
}

export function firstEmptySlot(cardIds, capacity = 4) {
    const ids = Array.isArray(cardIds) ? cardIds.filter(Boolean) : [];
    return ids.length < capacity ? ids.length : -1;
}

export function occupiedCount(cardIds) {
    return (cardIds || []).filter(Boolean).length;
}

export function resolveInsertSlot({ cardIds, requestedIndex, capacity = 4 } = {}) {
    const ids = Array.isArray(cardIds) ? cardIds.filter(Boolean) : [];
    const n = ids.length;
    if (n >= capacity) return { ok: false, reason: 'row-full' };
    const raw = Number(requestedIndex);
    const requested = Number.isFinite(raw) ? raw : n;
    const slotIndex = Math.max(0, Math.min(n, requested));
    return { ok: true, slotIndex };
}

export function applyWellDrop(cardIds, wellIndex, cardId, capacity = 4) {
    const ids = Array.isArray(cardIds) ? cardIds.filter(Boolean) : [];
    const resolved = resolveInsertSlot({ cardIds: ids, requestedIndex: wellIndex, capacity });
    if (!resolved.ok) return resolved;
    const next = [...ids];
    next.splice(resolved.slotIndex, 0, cardId);
    return { ok: true, cardIds: next, slotIndex: resolved.slotIndex };
}

export function previewShiftIndices(cardIds, insertIndex, incomingId) {
    const placed = applyWellDrop(cardIds, insertIndex, incomingId);
    if (!placed.ok) return {};
    const map = {};
    placed.cardIds.forEach((id, index) => {
        if (id) map[id] = index;
    });
    return map;
}

/**
 * Legality for a hand → board deploy. Pixi/director must not invent rules.
 * Row capacity (4) is the only board-size limit.
 * @returns {{ ok: true, slotIndex: number } | { ok: false, reason: string }}
 */
export function canDeployFromHand({
    playerTurn,
    turnCount,
    startRowId,
    finishRowId,
    cardId,
    rows,
    getCard,
    requestedIndex,
} = {}) {
    if (!isDeployFromHand(startRowId)) {
        return { ok: false, reason: 'not-from-hand' };
    }

    const expectedHand = `player${playerTurn}hand`;
    if (startRowId !== expectedHand) {
        return { ok: false, reason: 'not-from-hand' };
    }

    if (
        typeof finishRowId !== 'string' ||
        finishRowId.startsWith('player') ||
        !rows?.[finishRowId]
    ) {
        return { ok: false, reason: 'not-own-row' };
    }

    if (!deployRowAllowed({ cardId, ownerPlayerNum: playerTurn, finishRowId })) {
        return { ok: false, reason: isMantisCard(cardId) ? 'mantis-needs-enemy' : 'not-own-row' };
    }

    const dest = rows[finishRowId];
    if (heroBlockedByCage(getCard?.(cardId), dest)) {
        return { ok: false, reason: 'locked' };
    }

    const insert = resolveInsertSlot({
        cardIds: dest.cardIds,
        requestedIndex: requestedIndex === undefined ? dest.cardIds?.filter(Boolean).length ?? 0 : requestedIndex,
    });
    if (!insert.ok) {
        return { ok: false, reason: insert.reason };
    }

    if (isRedeployLocked(getCard?.(cardId), turnCount)) {
        return { ok: false, reason: 'returned-this-turn' };
    }

    return { ok: true, slotIndex: insert.slotIndex };
}

/**
 * Whether a hero pulled off the board is still sitting out.
 *
 * A returned hero is held until its owner's next turn, not for the rest of the
 * round. The round-long version was effectively permanent: the only thing that
 * lifted it was the round reset, which discards the board and deals fresh
 * hands, so the held card was gone before it ever became playable again.
 *
 * `redeployLockedUntilTurn` is the first turn the card may be played on. Turns
 * alternate, so the owner's next turn is two ticks away, but anything strictly
 * later than the turn it was returned on will do — a player can only deploy on
 * their own turn regardless.
 */
export function isRedeployLocked(card, turnCount) {
    const until = card?.redeployLockedUntilTurn;
    if (typeof until !== 'number') return false;
    return Number(turnCount) < until;
}

export function handLockVisual(locked) {
    if (!locked) return null;
    return { className: 'redeploy-locked', label: 'HELD' };
}

/** The marker Turbojack leaves on a card it threw back into the deck. */
export const TURBOJACK_MARK = 'turbojacked';

export function isTurbojacked(effects) {
    return Array.isArray(effects) && effects.some((e) => e?.id === TURBOJACK_MARK);
}

/**
 * Turbojack's banner.
 *
 * A hero thrown back into the deck is playable again, but arrives dazed: no
 * on-enter a second time. The banner is why, so the missing ability does not
 * look like a bug.
 */
export function turbojackVisual(effects) {
    if (!isTurbojacked(effects)) return null;
    return { className: 'turbojacked', label: 'TURBOJACK' };
}

export function healedHealth(health, amount, maxHealth) {
    const current = Number(health) || 0;
    if (current <= 0) return current;
    const add = Math.max(0, Number(amount) || 0);
    const max = Number(maxHealth);
    if (!Number.isFinite(max) || current >= max) return current;
    return Math.min(current + add, max);
}

/** Heal up to base HP; leftover becomes Armor (a shield-like pool, not bonus HP). */
export function repairPackApply({ health, maxHealth, armor = 0, amount = 2 } = {}) {
    const current = Number(health) || 0;
    const currentArmor = Math.max(0, Number(armor) || 0);
    const add = Math.max(0, Number(amount) || 0);
    if (current <= 0) {
        return { health: 0, armor: currentArmor, healed: 0, armorGained: 0 };
    }
    const nextHealth = healedHealth(current, add, maxHealth);
    const healed = Math.max(0, nextHealth - current);
    const leftover = Math.max(0, add - healed);
    return {
        health: nextHealth,
        armor: currentArmor + leftover,
        healed,
        armorGained: leftover,
    };
}

export function wouldDamageBeFatal({
    amount,
    health,
    armor = 0,
    cardShield = 0,
    rowShieldTotal = 0,
    ignoreShields = false,
}) {
    const remaining = ignoreShields
        ? Math.max(0, amount)
        : Math.max(
            0,
            amount
                - (rowShieldTotal || 0)
                - (cardShield || 0)
                - (Math.max(0, armor) || 0)
        );
    return (health || 0) > 0 && health - remaining <= 0;
}
