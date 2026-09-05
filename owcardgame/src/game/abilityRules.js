/**
 * Pure helpers for card-text mechanics.
 * Keep side-effect-free so hero modules and tests share one source of truth.
 */

export function spreadDamageEvenly(total, targetCount) {
    const count = Number(targetCount) || 0;
    const amount = Math.max(0, Number(total) || 0);
    if (count <= 0) return [];
    const base = Math.floor(amount / count);
    const remainder = amount % count;
    return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

export function countNanoBoostHeroes(cards = []) {
    return cards.filter((card) => {
        const alive = (card?.health ?? 0) > 0;
        const countsAsHero = !card?.isSpecial || card?.heroId === 'nemesis';
        return alive && countsAsHero;
    }).length;
}

export function nanoBoostSynergyDelta(previousContribution, newCount) {
    return (Number(newCount) || 0) - (Number(previousContribution) || 0);
}

export function parseUltimateCost(ultimateText, { heroId, currentSynergy } = {}) {
    if (heroId === 'wreckingball') return Number(currentSynergy) || 0;
    if (heroId === 'bob') return 1;
    const match = typeof ultimateText === 'string' && ultimateText.match(/\((\d+)\)/);
    return match ? parseInt(match[1], 10) : 3;
}

export function getTreeOfLifeTargetIds({ playerHeroId, rowId, getRowCardIds }) {
    const ids = [];
    if (!playerHeroId || !rowId) return ids;
    const playerNum = playerHeroId[0];
    const pos = rowId[1];
    const currentIds = getRowCardIds?.(rowId) || [];
    const index = currentIds.indexOf(playerHeroId);
    if (index < 0) return [playerHeroId];

    ids.push(playerHeroId);
    if (index > 0 && currentIds[index - 1]) ids.push(currentIds[index - 1]);
    if (index < currentIds.length - 1 && currentIds[index + 1]) ids.push(currentIds[index + 1]);

    const adjacentRows = [];
    if (pos === 'm') adjacentRows.push(`${playerNum}f`, `${playerNum}b`);
    else if (pos === 'f') adjacentRows.push(`${playerNum}m`);
    else if (pos === 'b') adjacentRows.push(`${playerNum}m`);

    for (const adjacentRowId of adjacentRows) {
        const adjacentIds = getRowCardIds?.(adjacentRowId) || [];
        if (adjacentIds[index]) ids.push(adjacentIds[index]);
    }
    return ids;
}

/**
 * Ultimates that put a new unit on the board or change the caster into another
 * hero. Echo cannot copy these.
 *
 * Every one of them is keyed to the hero who cast it: a summoned unit's id is
 * `<player><hero>`, so a second copy collides with the one already in play
 * rather than joining it. Copying D.Va's Self-Destruct is what despawned a MEKA
 * that was already on the board. Ramattra's ultimate ends by transforming him
 * into Nemesis, so Echo copying it transforms Echo.
 */
const SUMMONS_OR_TRANSFORMS = ['ashe', 'dva', 'axiom', 'ramattra'];

/**
 * The summoned units themselves. Their ultimates belong to a token that Echo
 * has no counterpart for.
 */
const SUMMONED_UNITS = ['bob', 'dvameka', 'nemesis', 'turret', 'stoneguard'];

/**
 * Not activatable ultimates at all: Tracer's fires by itself to survive lethal
 * damage, and Echo cannot copy her own.
 */
const NOT_COPYABLE = ['tracer', 'echo'];

export function normalizeHeroId(heroId) {
    if (typeof heroId !== 'string' || heroId.length === 0) return '';
    return /^\d/.test(heroId) ? heroId.slice(1) : heroId;
}

/**
 * Whether Echo may copy the last ultimate used.
 *
 * Matched exactly, never as a substring. `'dva'.includes('dvameka')` is false,
 * so blocking the MEKA never blocked the D.Va ultimate that summons it — which
 * is how a copied Self-Destruct reached the board and replaced the MEKA already
 * standing on it.
 *
 * `reason` separates the two ways this fails, because they read differently to
 * the player: `none` is "there is nothing to copy yet", `summon` is "Echo
 * cannot do that at all". Neither spends synergy.
 */
export function canDuplicateUltimate(lastUltimate) {
    if (!lastUltimate) return { ok: false, reason: 'none' };
    const heroId = normalizeHeroId(lastUltimate.heroId);
    if (!heroId) return { ok: false, reason: 'none' };
    if (SUMMONS_OR_TRANSFORMS.includes(heroId) || SUMMONED_UNITS.includes(heroId)) {
        return { ok: false, reason: 'summon' };
    }
    if (NOT_COPYABLE.includes(heroId)) {
        return { ok: false, reason: 'blocked' };
    }
    return { ok: true };
}

/** Living heroes on both sides of the board. Self Destruct hits all of them. */
export function selfDestructTargets(getRow, getCard) {
    const out = [];
    for (const playerNum of [1, 2]) {
        for (const pos of ['f', 'm', 'b']) {
            const rowId = `${playerNum}${pos}`;
            for (const cardId of getRow?.(rowId)?.cardIds || []) {
                const card = getCard?.(cardId);
                if (card && (card.health || 0) > 0) {
                    out.push({ cardId, rowId });
                }
            }
        }
    }
    return out;
}

export function isStructureCard(card) {
    if (!card) return false;
    const id = card.id || card.heroId;
    return card.turret === true || card.structure === true || id === 'turret' || id === 'stoneguard';
}

const ROW_RANK = { f: 0, m: 1, b: 2 };

export function rowDistance(fromRowId, toRowId) {
    const from = ROW_RANK[String(fromRowId || '')[1]];
    const to = ROW_RANK[String(toRowId || '')[1]];
    if (from == null || to == null) return 0;
    return Math.abs(from - to);
}

/**
 * Crush Zone: drag the whole enemy side toward one row.
 *
 * Everything that can move, moves — not just the handful that fit in the
 * chosen row. Once the destination is full the pull keeps going into the next
 * row along, so a back-row hero still ends up one row closer even when the
 * front is packed. Nine enemies against a full front row means one is dragged
 * into the front and the rest close up behind it.
 *
 * Lowest health first, because the destination is the most dangerous place to
 * be: the pull damages by the distance travelled, so the weakest are the ones
 * given the longest, deadliest trip. A hero can die on arrival.
 *
 * `cards` is every card on the enemy side, dead and structural included — they
 * take up room even though they cannot be pulled.
 */
export function crushZoneMoves({
    cards = [],
    destRowId,
    capacity = 4,
} = {}) {
    if (!destRowId) return [];

    const side = String(destRowId)[0];
    // Destination first, then outward: the nearest row with room wins.
    const rows = ['f', 'm', 'b']
        .map((pos) => `${side}${pos}`)
        .sort((a, b) => rowDistance(a, destRowId) - rowDistance(b, destRowId));

    const occupancy = new Map(rows.map((rowId) => [rowId, 0]));
    for (const entry of cards) {
        if (occupancy.has(entry?.rowId)) {
            occupancy.set(entry.rowId, occupancy.get(entry.rowId) + 1);
        }
    }

    const movable = cards
        .filter((entry) => entry?.cardId
            && entry.rowId !== destRowId
            && (entry.card?.health || 0) > 0
            && !isStructureCard(entry.card))
        .sort((a, b) => (a.card?.health || 0) - (b.card?.health || 0));

    const moves = [];
    for (const entry of movable) {
        const fromIndex = rows.indexOf(entry.rowId);
        if (fromIndex <= 0) continue;

        // Only ever forward: a row further from the destination is no pull.
        for (let i = 0; i < fromIndex; i += 1) {
            const toRowId = rows[i];
            if (occupancy.get(toRowId) >= capacity) continue;
            occupancy.set(toRowId, occupancy.get(toRowId) + 1);
            occupancy.set(entry.rowId, occupancy.get(entry.rowId) - 1);
            moves.push({
                cardId: entry.cardId,
                fromRowId: entry.rowId,
                toRowId,
                damage: rowDistance(entry.rowId, toRowId),
            });
            break;
        }
    }
    return moves;
}

export function clampBlocksMovement(row) {
    if (!row) return false;
    const effects = [...(row.allyEffects || []), ...(row.enemyEffects || [])];
    return effects.some((effect) => effect?.id === 'magnetic-clamp');
}

export function rowsAreAdjacent(a, b) {
    if (!a || !b || a === b) return false;
    if (String(a)[0] !== String(b)[0]) return false;
    return rowDistance(a, b) === 1;
}

export function killswitchRowCleanup(entries = []) {
    const destroyIds = [];
    const stripArmorIds = [];
    for (const entry of entries) {
        const card = entry?.card;
        if (!card || !entry.cardId) continue;
        if (isStructureCard(card) && (card.health || 0) > 0) {
            destroyIds.push(entry.cardId);
        }
        if ((card.armor || 0) > 0) {
            stripArmorIds.push(entry.cardId);
        }
    }
    return { destroyIds, stripArmorIds };
}

export function electrifiedTargets(entries = []) {
    return (entries || []).filter((entry) => {
        const card = entry?.card;
        if (!card || (card.health || 0) <= 0) return false;
        return Array.isArray(card.effects) && card.effects.some((effect) => effect?.id === 'electrified');
    });
}

export function findCardRowId(playerHeroId, getRowCardIds) {
    if (!playerHeroId) return null;
    const playerNum = playerHeroId[0];
    for (const pos of ['f', 'm', 'b']) {
        const rowId = `${playerNum}${pos}`;
        const ids = getRowCardIds?.(rowId) || [];
        if (ids.includes(playerHeroId)) return rowId;
    }
    return null;
}
