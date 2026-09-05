import { Assets, Graphics, Sprite, Texture } from 'pixi.js';
import { heroCardImages } from '../../assets/imageImports';
import { cardFlightSample, flingSample, landBurstSample } from './fxMath';
import { PALETTE } from './fxConfig';

export { landBurstSample };
export const LAND_BURST_MS = 280;

function heroIdOf(cardId) {
    return typeof cardId === 'string' ? cardId.slice(1) : '';
}

function boxOf(el) {
    if (!el || typeof el.getBoundingClientRect !== 'function') return null;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return null;
    return r;
}

function startBox(cardId, startRowId) {
    return boxOf(document.getElementById(cardId))
        || boxOf(document.getElementById(`${startRowId}-list`))
        || boxOf(document.getElementById(startRowId === 'player2hand' ? 'player2area' : 'player1area'));
}

function destBox(finishRowId, slotIndex, fallback) {
    const list = document.getElementById(`${finishRowId}-list`);
    if (!list) return boxOf(document.getElementById(finishRowId)) || fallback;
    const items = list.querySelectorAll(':scope > li');
    if (items[slotIndex]) return items[slotIndex].getBoundingClientRect();
    const listRect = list.getBoundingClientRect();
    const h = fallback?.height || 90;
    const w = fallback?.width || 64;
    const vertical = listRect.height >= listRect.width;
    if (vertical) {
        return {
            left: listRect.left + (listRect.width - w) / 2,
            top: listRect.top + 8 + slotIndex * (h * 0.72),
            width: w,
            height: h,
        };
    }
    return {
        left: listRect.left + 8 + slotIndex * (w * 0.72),
        top: listRect.top + (listRect.height - h) / 2,
        width: w,
        height: h,
    };
}

function toLocal(app, box) {
    const canvas = app.canvas.getBoundingClientRect();
    return {
        x: box.left + box.width / 2 - canvas.left,
        y: box.top + box.height / 2 - canvas.top,
        width: box.width,
        height: box.height,
    };
}

/** Carries the sprite from its hand position to the slot it was dropped on. */
function flyCard(app, sprite, start, end) {
    const startW = sprite.width;
    const startH = sprite.height;
    return new Promise((resolve) => {
        let elapsed = 0;
        const tick = () => {
            if (!sprite || sprite.destroyed) {
                app.ticker.remove(tick);
                resolve();
                return;
            }
            elapsed += app.ticker.deltaMS || app.ticker.deltaTime * (1000 / 60);
            const s = cardFlightSample(elapsed, start, end);
            sprite.position.set(s.x, s.y);
            sprite.width = startW * s.scale;
            sprite.height = startH * s.scale;
            if (s.done) {
                app.ticker.remove(tick);
                resolve();
            }
        };
        app.ticker.add(tick);
    });
}

/**
 * A card thrown clear of the board rather than tidily tweened off it.
 *
 * Turbojack flings its target back to the deck, so this bows hard off the
 * straight line and spins, where `tween` only arcs and shrinks.
 */
function fling(app, sprite, start, end) {
    const startW = sprite.width;
    const startH = sprite.height;
    return new Promise((resolve) => {
        let elapsed = 0;
        const tick = () => {
            if (!sprite || sprite.destroyed) {
                app.ticker.remove(tick);
                resolve();
                return;
            }
            elapsed += app.ticker.deltaMS || app.ticker.deltaTime * (1000 / 60);
            const s = flingSample(elapsed, start, end);
            sprite.position.set(s.x, s.y);
            sprite.rotation = s.rotation;
            sprite.width = startW * s.scale;
            sprite.height = startH * s.scale;
            sprite.alpha = s.alpha;
            if (s.done) {
                app.ticker.remove(tick);
                resolve();
            }
        };
        app.ticker.add(tick);
    });
}

function playLandBurst(app, x, y, size) {
    const radius = Math.max(18, Math.min(size, 56));
    const burst = new Graphics();
    burst.position.set(x, y);
    app.stage.addChild(burst);
    return new Promise((resolve) => {
        let elapsed = 0;
        const tick = () => {
            elapsed += app.ticker.deltaMS || app.ticker.deltaTime * (1000 / 60);
            const t = Math.min(1, elapsed / LAND_BURST_MS);
            const sample = landBurstSample(t, radius);
            burst.clear();
            burst.circle(0, 0, sample.radius * 0.35);
            burst.fill({ color: PALETTE.white, alpha: sample.innerAlpha * 0.55 });
            burst.circle(0, 0, sample.radius);
            burst.stroke({ width: Math.max(2, radius * 0.12), color: PALETTE.amber, alpha: sample.alpha });
            if (t >= 1) {
                app.ticker.remove(tick);
                burst.destroy();
                resolve();
            }
        };
        app.ticker.add(tick);
    });
}

/**
 * Uploads every card face to the GPU in the background, once, when the overlay
 * comes up.
 *
 * Without this the first play of each hero waits on `Assets.load` before its
 * flight can even start — a stall the player reads as the game hanging on the
 * drop. The browser already has the files from the DOM `<img>` tags, so this
 * costs a decode and an upload, not a download.
 */
export function preloadCardTextures() {
    const urls = Object.values(heroCardImages).filter(Boolean);
    return Assets.load(urls).catch(() => {});
}

/** The card's own face, falling back to the back and then to a blank. */
function cardTexture(cardId) {
    const url = heroCardImages[heroIdOf(cardId)] || heroCardImages['card-back'];
    if (!url) return Texture.WHITE;
    return Assets.get(url) || Assets.load(url).catch(() => Texture.WHITE);
}

export function createCardFlyer(app) {
    async function flyToSlot(intent) {
        if (!intent?.cardId || !app) return;
        const from = startBox(intent.cardId, intent.startRowId);
        if (!from) return;
        const to = destBox(intent.finishRowId, intent.slotIndex || 0, from);
        if (!to) return;

        const startEl = document.getElementById(intent.cardId);
        if (startEl) startEl.style.opacity = '0';

        const tex = await cardTexture(intent.cardId);
        const sprite = new Sprite(tex || Texture.WHITE);
        sprite.anchor.set(0.5);
        const localStart = toLocal(app, from);
        const localEnd = toLocal(app, to);
        sprite.width = localStart.width;
        sprite.height = localStart.height;
        sprite.position.set(localStart.x, localStart.y);
        app.stage.addChild(sprite);
        try {
            await flyCard(app, sprite, localStart, localEnd);
        } finally {
            if (!sprite.destroyed) sprite.destroy();
            if (startEl) startEl.style.opacity = '';
        }

        // The burst is decoration and is deliberately not awaited: the board is
        // locked and the card is absent from its row until this call returns, so
        // waiting on it would charge the player 280ms of input lag for a splash.
        playLandBurst(app, localEnd.x, localEnd.y, Math.min(localEnd.width, localEnd.height));
    }

    async function flyToDeck(cardId) {
        if (!cardId || !app) return;
        const owner = parseInt(String(cardId)[0], 10);
        const from = boxOf(document.getElementById(cardId));
        if (!from) return;
        const destEl = document.getElementById(`player${owner}area`)
            || document.getElementById(`player${owner}hand`)
            || document.getElementById(`player${owner}half`);
        const to = boxOf(destEl) || from;

        const startEl = document.getElementById(cardId);
        if (startEl) startEl.style.opacity = '0';

        const tex = await cardTexture(cardId);
        const sprite = new Sprite(tex || Texture.WHITE);
        sprite.anchor.set(0.5);
        const localStart = toLocal(app, from);
        const localEnd = toLocal(app, to);
        sprite.width = localStart.width;
        sprite.height = localStart.height;
        sprite.position.set(localStart.x, localStart.y);
        app.stage.addChild(sprite);
        try {
            await fling(app, sprite, localStart, localEnd);
        } finally {
            if (!sprite.destroyed) sprite.destroy();
        }
    }

    return { flyToSlot, flyToDeck };
}
