import { Container, Graphics } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import {
    blipSample,
    clamp01,
    sandstormGusts,
    sandstormHaze,
    sandstormMotes,
    smokePuffs,
} from './fxMath';
import { BLIP, PALETTE } from './fxConfig';
import { boardRect, cardRect, rowRect, sideRect } from './anchors';

const WASH_MS = 520;
const PULSE_MS = 620;
const MARK_COLOR = PALETTE.fire;
const SAND = 0xc2b280;
const SAND_PALE = 0xe4d7b0;
const SMOKE_GREY = 0x6b6f76;
const SMOKE_PALE = 0xd8dade;

/**
 * Ambient board feedback: row and side washes, card pulses, and persistent
 * target marks. Individually minor, but together they are what makes an ability
 * read as affecting a *place* rather than just changing numbers.
 */
export function createAmbientFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const sand = new Graphics();
    const smoke = new Graphics();
    const marks = new Graphics();
    root.addChild(sand);
    root.addChild(smoke);
    root.addChild(marks);
    let puffs = [];

    /** @type {Array<{g: Graphics, rect: object, color: number, elapsed: number, kind: string}>} */
    let washes = [];
    /** Marks set by an explicit fx:mark, for callers with no backing effect. */
    let marked = new Set();
    let elapsed = 0;

    /**
     * Everything currently marked.
     *
     * Read from game state rather than from events alone, so a mark survives
     * anything that rebuilds the board and disappears the moment the effect is
     * removed — no bookkeeping to keep in step.
     */
    function markedCardIds() {
        const ids = new Set(marked);
        const getRow = window.__ow_getRow;
        const getCard = window.__ow_getCard;
        if (typeof getRow !== 'function' || typeof getCard !== 'function') return ids;

        for (const rowId of ['1f', '1m', '1b', '2f', '2m', '2b']) {
            for (const cardId of getRow(rowId)?.cardIds || []) {
                const effects = getCard(cardId)?.effects;
                if (Array.isArray(effects) && effects.some((e) => e?.type === 'mark')) {
                    ids.add(cardId);
                }
            }
        }
        return ids;
    }

    function addWash(rect, color, kind) {
        if (!rect) return;
        const g = new Graphics();
        root.addChildAt(g, 0); // washes sit under marks
        washes.push({ g, rect, color, elapsed: 0, kind });
    }

    const unsub = effectsBus.subscribe((ev) => {
        if (!ev?.type) return;

        if (ev.type === 'fx:rowWash') {
            const rowId = ev.payload?.rowId;
            addWash(
                rowRect(app, rowId),
                ev.payload?.color ?? PALETTE.amber,
                'row'
            );
        } else if (ev.type === 'fx:sideWash') {
            addWash(sideRect(app, ev.payload?.playerNum), ev.payload?.color ?? PALETTE.amber, 'side');
        } else if (ev.type === 'fx:rowBarrier') {
            const rowId = ev.payload?.rowId;
            addWash(
                rowRect(app, rowId),
                PALETTE.ice,
                'barrier'
            );
        } else if (ev.type === 'fx:pulse') {
            addWash(cardRect(app, ev.payload?.cardId), ev.payload?.color ?? PALETTE.amberPale, 'pulse');
        } else if (ev.type === 'fx:smoke') {
            // Every card in one event shares a clock, so a pair puffs as one.
            for (const cardId of ev.payload?.cardIds || []) {
                if (cardId) puffs.push({ cardId, at: null, size: 0, elapsed: 0 });
            }
        } else if (ev.type === 'fx:mark') {
            const cardId = ev.payload?.cardId;
            if (!cardId) return;
            if (ev.payload?.on === false) marked.delete(cardId);
            else marked.add(cardId);
        }
    });

    function drawWash(wash, t) {
        const { g, rect, color, kind } = wash;
        g.clear();
        if (kind === 'pulse') {
            // Expanding halo around a single card.
            const grow = 1 + 0.35 * t;
            const w = rect.width * grow;
            const h = rect.height * grow;
            g.roundRect(rect.x - w / 2, rect.y - h / 2, w, h, 6);
            g.stroke({ width: 3, color, alpha: 1 - t });
            return;
        }
        const alpha = Math.sin(clamp01(t) * Math.PI); // in and back out
        g.roundRect(rect.left, rect.top, rect.width, rect.height, 8);
        g.fill({ color, alpha: alpha * (kind === 'barrier' ? 0.22 : 0.16) });
        g.roundRect(rect.left, rect.top, rect.width, rect.height, 8);
        g.stroke({ width: 2, color, alpha: alpha * 0.8 });
    }

    /**
     * Grit hanging over the board while Sandstorm is up.
     *
     * Read from the storm's own state rather than timed from the cast, so it
     * lasts exactly as long as the targeting lockout does and clears itself on
     * the activator's next turn with nothing to tear down.
     */
    function drawSandstorm() {
        if (!window.__ow_isSandstormActive?.()) return;
        const rect = boardRect(app);
        if (!rect) return;

        const haze = sandstormHaze(elapsed);
        sand.rect(rect.left, rect.top, rect.width, rect.height);
        sand.fill({ color: SAND, alpha: haze.alpha });

        for (const gust of sandstormGusts(elapsed, rect)) {
            if (gust.alpha <= 0) continue;
            sand.moveTo(gust.tailX, gust.tailY);
            sand.lineTo(gust.x, gust.y);
            sand.stroke({ width: 2, color: SAND_PALE, alpha: gust.alpha });
        }

        for (const mote of sandstormMotes(elapsed, rect)) {
            if (mote.alpha <= 0) continue;
            sand.circle(mote.x, mote.y, mote.radius);
            sand.fill({ color: SAND_PALE, alpha: mote.alpha });
        }
    }

    /** Smoke over a card. Pinned, since a card can be swapped out under it. */
    function drawPuff(entry, delta) {
        entry.elapsed += delta;
        if (!entry.at) {
            const rect = cardRect(app, entry.cardId);
            if (rect) {
                entry.at = { x: rect.x, y: rect.y };
                entry.size = Math.max(rect.width, rect.height);
            }
        }
        const s = smokePuffs(entry.elapsed, entry.size || 90);
        if (s.done) return true;
        if (!entry.at) return false;

        for (const puff of s.puffs) {
            if (puff.alpha <= 0) continue;
            smoke.circle(entry.at.x + puff.x, entry.at.y + puff.y, puff.radius);
            smoke.fill({ color: SMOKE_GREY, alpha: puff.alpha * 0.55 });
            smoke.circle(entry.at.x + puff.x, entry.at.y + puff.y, puff.radius * 0.6);
            smoke.fill({ color: SMOKE_PALE, alpha: puff.alpha * 0.4 });
        }
        return false;
    }

    const tick = () => {
        const delta = app.ticker.deltaMS || 16;
        elapsed += delta;

        sand.clear();
        drawSandstorm();

        smoke.clear();
        if (puffs.length) {
            const done = puffs.filter((e) => drawPuff(e, delta));
            if (done.length) puffs = puffs.filter((e) => !done.includes(e));
        }

        if (washes.length) {
            const finished = [];
            for (const wash of washes) {
                wash.elapsed += delta;
                const life = wash.kind === 'pulse' ? PULSE_MS : WASH_MS;
                const t = clamp01(wash.elapsed / life);
                drawWash(wash, t);
                if (t >= 1) finished.push(wash);
            }
            if (finished.length) {
                for (const wash of finished) {
                    if (!wash.g.destroyed) wash.g.destroy();
                }
                washes = washes.filter((w) => !finished.includes(w));
            }
        }

        marks.clear();
        const ids = markedCardIds();
        if (!ids.size) return;

        const s = blipSample(elapsed);
        for (const cardId of ids) {
            const rect = cardRect(app, cardId);
            if (!rect) continue;

            // Centred on the card: permanent, and meant to be seen.
            const { x, y } = rect;

            marks.circle(x, y, s.ringRadius);
            marks.stroke({ width: 1.5, color: MARK_COLOR, alpha: s.ringAlpha });
            marks.circle(x, y, BLIP.dotRadius);
            marks.fill({ color: MARK_COLOR, alpha: s.dotAlpha });
        }
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests. */
        activeWashes: () => washes.length,
        markedCount: () => markedCardIds().size,
        activePuffs: () => puffs.length,
        sandstormActive: () => !!window.__ow_isSandstormActive?.(),
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            washes = [];
            puffs = [];
            marked = new Set();
        },
    };
}

export default createAmbientFx;
