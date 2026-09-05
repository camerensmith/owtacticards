/**
 * Where things are on screen.
 *
 * Every FX layer needs to turn a card or row id into canvas coordinates, and
 * each one used to carry its own copy of these helpers. That duplication hid a
 * bug: row effects were anchored to `#<rowId>-list`, the <ul> holding the cards,
 * which sizes to its contents — so an empty row collapsed and a row effect grew
 * as cards were added instead of covering the row.
 *
 * `rowRect` resolves the row's actual playing area instead, which keeps its size
 * whether the row is empty or full.
 */

export function boxOf(id) {
    const el = typeof id === 'string' ? document.getElementById(id) : id;
    if (!el || typeof el.getBoundingClientRect !== 'function') return null;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return null;
    return r;
}

/** Centre point plus size, for things drawn around a middle. */
export function toLocal(app, box) {
    if (!box || !app?.canvas) return null;
    const canvas = app.canvas.getBoundingClientRect();
    return {
        x: box.left + box.width / 2 - canvas.left,
        y: box.top + box.height / 2 - canvas.top,
        width: box.width,
        height: box.height,
    };
}

/** Corner plus size as well, for things drawn as a rectangle. */
export function toLocalRect(app, box) {
    if (!box || !app?.canvas) return null;
    const canvas = app.canvas.getBoundingClientRect();
    return {
        left: box.left - canvas.left,
        top: box.top - canvas.top,
        width: box.width,
        height: box.height,
        x: box.left + box.width / 2 - canvas.left,
        y: box.top + box.height / 2 - canvas.top,
    };
}

/**
 * A row's playing area.
 *
 * `-boardrow` is the row strip itself and holds its size when empty, so it is
 * tried first. The card list is only a fallback, and the bare row id last —
 * that one also contains the counters, so it is wider than the play area.
 */
export function rowBox(rowId) {
    return boxOf(`${rowId}-boardrow`)
        || boxOf(`${rowId}-carddisplay`)
        || boxOf(`${rowId}-list`)
        || boxOf(rowId);
}

export function rowRect(app, rowId) {
    return toLocalRect(app, rowBox(rowId));
}

/** Centre of a row, for things that travel to it. */
export function rowAnchor(app, rowId) {
    return toLocal(app, rowBox(rowId));
}

export function cardRect(app, cardId) {
    return toLocalRect(app, boxOf(cardId));
}

export function cardAnchor(app, cardId) {
    return toLocal(app, boxOf(cardId));
}

/** A whole player side: their half, else the union of their three rows. */
export function sideRect(app, playerNum) {
    const half = toLocalRect(app, boxOf(`player${playerNum}half`));
    if (half) return half;

    const rows = [`${playerNum}f`, `${playerNum}m`, `${playerNum}b`]
        .map((rowId) => rowBox(rowId))
        .filter(Boolean);
    if (!rows.length) return null;

    const left = Math.min(...rows.map((r) => r.left));
    const top = Math.min(...rows.map((r) => r.top));
    const right = Math.max(...rows.map((r) => r.left + r.width));
    const bottom = Math.max(...rows.map((r) => r.top + r.height));
    return toLocalRect(app, { left, top, width: right - left, height: bottom - top });
}

/** Both halves together, for effects that hang over the whole board. */
export function boardRect(app) {
    const halves = [1, 2].map((n) => boxOf(`player${n}half`)).filter(Boolean);
    if (halves.length === 2) {
        const left = Math.min(...halves.map((r) => r.left));
        const top = Math.min(...halves.map((r) => r.top));
        const right = Math.max(...halves.map((r) => r.left + r.width));
        const bottom = Math.max(...halves.map((r) => r.top + r.height));
        return toLocalRect(app, { left, top, width: right - left, height: bottom - top });
    }
    // One half measurable is better than none; the row union covers the rest.
    return sideRect(app, 1) || sideRect(app, 2);
}

/**
 * Which way is "toward the enemy" on screen, measured rather than assumed, so a
 * layout change cannot silently point every directional effect backwards.
 * Returns -1 for up, +1 for down.
 */
export function facingFor(app, playerNum) {
    const own = toLocal(app, boxOf(`player${playerNum}half`));
    const enemyNum = Number(playerNum) === 1 ? 2 : 1;
    const enemy = toLocal(app, boxOf(`player${enemyNum}half`));
    if (own && enemy) return enemy.y < own.y ? -1 : 1;
    // Fallback only if the halves are not measurable.
    return Number(playerNum) === 1 ? -1 : 1;
}

/**
 * Unit vector pointing from a player's half toward the enemy's.
 *
 * Measured on both axes: the board lays the halves out side by side, so a
 * y-only comparison reads as noise and points directional effects nowhere in
 * particular.
 */
export function facingVector(app, playerNum) {
    const own = toLocal(app, boxOf(`player${playerNum}half`));
    const enemyNum = Number(playerNum) === 1 ? 2 : 1;
    const enemy = toLocal(app, boxOf(`player${enemyNum}half`));
    if (!own || !enemy) return { x: Number(playerNum) === 1 ? 1 : -1, y: 0 };

    const dx = enemy.x - own.x;
    const dy = enemy.y - own.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
}

/** Centre of a group of cards, for effects that should aim at real targets. */
export function centroidOf(app, cardIds = []) {
    const points = cardIds.map((id) => cardAnchor(app, id)).filter(Boolean);
    if (!points.length) return null;
    return {
        x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
        y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
    };
}
