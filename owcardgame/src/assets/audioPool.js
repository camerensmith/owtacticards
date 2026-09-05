/**
 * A small pool of reusable <audio> elements, keyed by source.
 *
 * `new Audio(src)` starts an element with nothing buffered, so its first play
 * waits on a fetch and a decode. In a card game that means the click and its
 * sound drift apart — placement, draw and shuffle are heard late. A reused
 * element keeps its decoded buffer, so replaying it starts on the next tick.
 *
 * The pool is per-source and small: enough copies for a clip to overlap itself
 * (four turret rounds, a row of hits) without letting a spammed key grow
 * without bound.
 */

export const POOL_LIMIT = 4;

const pools = new Map();

function canPlayAudio() {
    return typeof Audio === 'function';
}

function poolFor(src) {
    let pool = pools.get(src);
    if (!pool) {
        pool = [];
        pools.set(src, pool);
    }
    return pool;
}

function create(src) {
    const el = new Audio(src);
    try { el.preload = 'auto'; } catch {}
    return el;
}

/**
 * An element for `src` that is free to play, growing the pool up to
 * POOL_LIMIT. Past that the copy furthest through its clip is cut short —
 * better than a silent play or an unbounded pool.
 */
export function acquireAudio(src) {
    if (!src || !canPlayAudio()) return null;
    const pool = poolFor(src);

    const idle = pool.find((el) => el.paused || el.ended);
    if (idle) return idle;

    if (pool.length < POOL_LIMIT) {
        const el = create(src);
        pool.push(el);
        return el;
    }

    return pool.reduce(
        (furthest, el) => ((el.currentTime || 0) > (furthest.currentTime || 0) ? el : furthest),
        pool[0]
    );
}

/**
 * Plays `src` from the pool. `startAtMs` skips into the clip, for files with a
 * run-up before the part that should land with the effect.
 *
 * Returns the element so callers can listen for `ended`; null when there is no
 * source or no Audio support.
 */
export function playSrc(src, { startAtMs = 0 } = {}) {
    const el = acquireAudio(src);
    if (!el) return null;

    const start = () => {
        try { el.currentTime = startAtMs / 1000; } catch {}
        try {
            const played = el.play();
            if (played && typeof played.catch === 'function') played.catch(() => {});
        } catch {}
    };

    // Seeking before the duration is known does nothing, so a clip that starts
    // partway in waits for metadata rather than blipping its own opening.
    if (startAtMs && (el.readyState || 0) < 1 && typeof el.addEventListener === 'function') {
        el.addEventListener('loadedmetadata', start, { once: true });
    } else {
        start();
    }
    return el;
}

/**
 * Buffers clips ahead of the moment they are needed. Called once when a match
 * opens for the handful of sounds that play constantly, so the first draw or
 * placement of the match sounds like every one after it.
 */
export function warmAudio(sources) {
    if (!canPlayAudio()) return 0;
    let warmed = 0;
    for (const src of sources || []) {
        if (!src || pools.has(src)) continue;
        const el = create(src);
        try { el.load(); } catch {}
        poolFor(src).push(el);
        warmed += 1;
    }
    return warmed;
}

/** Test seam: drops every pooled element. */
export function resetAudioPool() {
    pools.clear();
}

/** Test seam: how many elements are held for a source. */
export function pooledCount(src) {
    return (pools.get(src) || []).length;
}
