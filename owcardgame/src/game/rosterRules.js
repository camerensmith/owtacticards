import data from '../data';
import { occupiedCount } from './rules';

/**
 * Where Torbjörn's turret goes: back first, so it sits out of reach, then
 * middle, then front. Null only when every row is genuinely full.
 *
 * Counts occupied slots rather than array length — rows can carry holes, and
 * length reads a gap as a body, which would call a row full while it still has
 * space and leave the turret stranded in hand.
 */
export function turretRowKey(getRow, playerNum = 2, capacity = 4) {
    const order = [['back', 'b'], ['middle', 'm'], ['front', 'f']];
    for (const [rowKey, suffix] of order) {
        const cardIds = getRow?.(`${playerNum}${suffix}`)?.cardIds;
        if (occupiedCount(cardIds) < capacity) return rowKey;
    }
    return null;
}

export function lockOnDamage(targetPowerOnRow) {
    return Math.max(0, Number(targetPowerOnRow) || 0);
}

export function unusedSynergy(front, middle, back) {
    return (Number(front) || 0) + (Number(middle) || 0) + (Number(back) || 0);
}

export function overkillAmount(damage, currentHp) {
    return Math.max(0, (Number(damage) || 0) - Math.max(0, Number(currentHp) || 0));
}

export function spreadOverkillRandom(overkill, otherIds, rng = Math.random) {
    const hits = {};
    const ids = Array.isArray(otherIds) ? otherIds.filter(Boolean) : [];
    const n = Math.max(0, Number(overkill) || 0);
    if (!ids.length || n === 0) return hits;
    for (let i = 0; i < n; i += 1) {
        const pick = ids[Math.floor(rng() * ids.length) % ids.length];
        hits[pick] = (hits[pick] || 0) + 1;
    }
    return hits;
}

export function randomIntInclusive(min, max, rng = Math.random) {
    const lo = Number(min) || 0;
    const hi = Number(max) || 0;
    if (hi < lo) return lo;
    return lo + Math.floor(rng() * (hi - lo + 1));
}

export function pickRandomIds(ids, count, rng = Math.random) {
    const pool = [...(ids || [])];
    const n = Math.min(Math.max(0, Number(count) || 0), pool.length);
    const out = [];
    for (let i = 0; i < n; i += 1) {
        const idx = Math.floor(rng() * pool.length) % pool.length;
        out.push(pool.splice(idx, 1)[0]);
    }
    return out;
}

export function alliesInFrontPositions(wuyangPos) {
    if (wuyangPos === 'b') return ['m', 'f'];
    if (wuyangPos === 'm') return ['f'];
    return [];
}

export function pushBackPosition(pos) {
    if (pos === 'f') return 'm';
    if (pos === 'm') return 'b';
    return 'b';
}

export function nearestOtherIds(cardIds, originIndex, n) {
    const ids = cardIds || [];
    const origin = Number(originIndex);
    const scored = ids
        .map((id, i) => ({ id, i, dist: Math.abs(i - origin) }))
        .filter((row) => row.i !== origin);
    scored.sort((a, b) => a.dist - b.dist || a.i - b.i);
    return scored.slice(0, Math.max(0, Number(n) || 0)).map((row) => row.id);
}

export function chainswordApplies({ attackerPlayerNum, defenderRowPlayerNum, sourceCardId }) {
    if (!sourceCardId || typeof sourceCardId !== 'string') return false;
    return Number(attackerPlayerNum) !== Number(defenderRowPlayerNum);
}

export function chainswordCycloId(cardIds) {
    return (cardIds || []).find((id) => typeof id === 'string' && id.slice(1) === 'cyclo') || null;
}

export function rowsWithSpace(rowStates, capacity = 4) {
    return (rowStates || [])
        .filter((row) => (row?.cardIds?.length || 0) < capacity)
        .map((row) => row.id);
}

export function listOpenBoardSlots(rowStates, capacity = 4) {
    const slots = [];
    (rowStates || []).forEach((row) => {
        if (!row?.id) return;
        const ids = row.cardIds || [];
        if (ids.length >= capacity) return;
        for (let i = 0; i <= ids.length; i += 1) {
            slots.push({ rowId: row.id, insertIndex: i });
        }
    });
    return slots;
}

export function pickRandomBoardSlot(rowStates, rng = Math.random, capacity = 4) {
    const slots = listOpenBoardSlots(rowStates, capacity);
    if (!slots.length) return null;
    return slots[Math.floor(rng() * slots.length) % slots.length];
}

export function placeCardOnRow(row, cardId, insertIndex, capacity = 4) {
    const cardIds = [...(row?.cardIds || [])];
    if (!cardId || cardIds.length >= capacity) return null;
    const max = cardIds.length;
    const raw = Number(insertIndex);
    const i = Number.isFinite(raw) ? Math.max(0, Math.min(raw, max)) : max;
    cardIds.splice(i, 0, cardId);
    return cardIds;
}

export function disguiseMirageForAi(card, asHero = null) {
    if (!card || (card.id !== 'mirage' && card.heroId !== 'mirage')) return card;
    const rajah = asHero || data.heroes.rajah || {};
    return {
        ...card,
        id: 'rajah',
        name: rajah.name || 'Rajah',
        health: rajah.health ?? 3,
        maxHealth: rajah.health ?? 3,
        power: rajah.power ? { ...rajah.power } : card.power,
        synergy: rajah.synergy ? { ...rajah.synergy } : { f: 2, m: 1, b: 2 },
        role: rajah.role || card.role || 'defense',
        special: false,
    };
}

export function getCardForAi(cardId, getCard, { viewerPlayerNum = 2 } = {}) {
    const card = getCard?.(cardId);
    if (!card) return null;
    const owner = parseInt(String(card.playerHeroId || cardId || '')[0], 10);
    const seen = owner !== Number(viewerPlayerNum) ? disguiseMirageForAi(card) : card;
    return { ...seen, cardId: card.cardId || card.playerHeroId || cardId };
}

export function seekerHitsEntering({ seekerOwnerNum, enteringPlayerNum }) {
    return Number(seekerOwnerNum) > 0 && Number(seekerOwnerNum) !== Number(enteringPlayerNum);
}

export function collectLivingOnRows(rowIds, getRow, getCard) {
    const out = [];
    (rowIds || []).forEach((rid) => {
        const row = getRow?.(rid);
        if (!row?.cardIds) return;
        row.cardIds.forEach((cid) => {
            const card = getCard?.(cid);
            if (card && card.health > 0) {
                out.push({ cardId: cid, rowId: rid, card });
            }
        });
    });
    return out;
}

export function enemyRowIds(playerNum) {
    const enemy = Number(playerNum) === 1 ? 2 : 1;
    return [`${enemy}f`, `${enemy}m`, `${enemy}b`];
}

export function allyRowIds(playerNum) {
    return [`${playerNum}f`, `${playerNum}m`, `${playerNum}b`];
}

export function findBoardRowId(cardId, getRow) {
    const rows = ['1f', '1m', '1b', '2f', '2m', '2b'];
    for (const rid of rows) {
        if ((getRow?.(rid)?.cardIds || []).includes(cardId)) return rid;
    }
    return null;
}

export function turbojackOutcome({
    sourceCardId,
    targetCardId,
    targetHealth,
    damage = 3,
    cycloRowId,
    frontRowId,
    frontHasSpace,
} = {}) {
    const sourceOwner = parseInt(String(sourceCardId || '')[0], 10);
    const targetOwner = parseInt(String(targetCardId || '')[0], 10);
    const resolved = !!targetCardId
        && sourceOwner !== targetOwner
        && targetCardId !== sourceCardId;
    const healthAfter = Math.max(0, (Number(targetHealth) || 0) - (Number(damage) || 0));
    return {
        resolved,
        playAudio: resolved,
        damage: resolved ? Number(damage) || 0 : 0,
        healthAfter,
        reshuffleTarget: resolved && healthAfter > 0,
        moveCycloToFront: resolved && !!frontHasSpace && cycloRowId !== frontRowId,
    };
}

/** Primal Rage: leap Winston, then shuffle 1-5 living enemies for 1 damage each. */
export function planPrimalRage({
    winstonRowId,
    friendlyRowIds = [],
    enemyRowIds = [],
    enemies = [],
    occupancy = {},
    capacity = 4,
    rng = Math.random,
} = {}) {
    const leapCandidates = (friendlyRowIds || []).filter((id) => {
        if (id === winstonRowId) return true;
        return (occupancy[id] || 0) < capacity;
    });
    const leapRowId = leapCandidates.length
        ? leapCandidates[Math.floor(rng() * leapCandidates.length) % leapCandidates.length]
        : winstonRowId;

    const occ = { ...occupancy };
    if (leapRowId !== winstonRowId) {
        occ[winstonRowId] = Math.max(0, (occ[winstonRowId] || 1) - 1);
        occ[leapRowId] = (occ[leapRowId] || 0) + 1;
    }

    const living = (enemies || []).filter((entry) => entry?.cardId && (entry.health || 0) > 0);
    const count = Math.min(randomIntInclusive(1, 5, rng), living.length);
    const picked = pickRandomIds(living.map((entry) => entry.cardId), count, rng);

    const shuffles = picked.map((cardId) => {
        const enemy = living.find((entry) => entry.cardId === cardId);
        const fromRowId = enemy.rowId;
        const dests = (enemyRowIds || []).filter((id) => id !== fromRowId && (occ[id] || 0) < capacity);
        const destRowId = dests.length
            ? dests[Math.floor(rng() * dests.length) % dests.length]
            : fromRowId;
        if (destRowId !== fromRowId) {
            occ[fromRowId] = Math.max(0, (occ[fromRowId] || 1) - 1);
            occ[destRowId] = (occ[destRowId] || 0) + 1;
        }
        return { cardId, fromRowId, destRowId, damage: 1 };
    });

    return { leapRowId, shuffles };
}
