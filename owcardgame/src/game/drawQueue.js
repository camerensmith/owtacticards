/**
 * Ordered upcoming draws for Temporal Rift.
 * Queued ids are reserved ahead of reshuffle bag / random pool picks.
 */

export function sampleUpcomingHeroes(availableIds = [], count = 3, random = Math.random) {
    const pool = (availableIds || []).filter(Boolean);
    const n = Math.max(0, Number(count) || 0);
    const picked = [];
    while (picked.length < n && pool.length) {
        const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));
        picked.push(pool.splice(index, 1)[0]);
    }
    return picked;
}

/** New rift order is drawn first; leftover queue ids keep their relative order. */
export function mergeDrawQueue(existing = [], orderedIds = []) {
    const next = (orderedIds || []).filter(Boolean);
    const reserved = new Set(next);
    for (const id of existing || []) {
        if (id && !reserved.has(id)) next.push(id);
    }
    return next;
}

export function shiftDrawQueue(queue = []) {
    const list = (queue || []).filter(Boolean);
    if (!list.length) return { next: null, rest: [] };
    return { next: list[0], rest: list.slice(1) };
}

export function excludeQueuedFromPool(availableIds = [], queuedIds = []) {
    const blocked = new Set((queuedIds || []).filter(Boolean));
    return (availableIds || []).filter((id) => id && !blocked.has(id));
}
