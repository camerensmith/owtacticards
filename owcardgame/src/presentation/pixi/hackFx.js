import { Container, Graphics } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import { HACK, hackColumnAlpha, hackGlyphIsOne, hackSample } from './fxMath';
import { PALETTE } from './fxConfig';
import { boardRect, cardRect } from './anchors';

/*
 * Sombra's intrusion reads in the same violet as Moira's decay rather than
 * adding a fourth purple to the palette.
 */
const HACK_VIOLET = PALETTE.moiraPurple;

/**
 * Sombra's intrusion: a wall of binary swept left to right.
 *
 * E.M.P. sweeps the whole board, which is what it does to the board. Hack runs
 * the same wall over the one card it hit, so the two read as the same weapon at
 * different scale instead of the ability being indistinguishable from the
 * ultimate. Either way the effect has already resolved — the sweep is what
 * sells it as an intrusion rather than another number floating off a card.
 */
export function createHackFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const g = new Graphics();
    root.addChild(g);

    let sweeps = [];

    const unsub = effectsBus.subscribe((ev) => {
        if (ev?.type !== 'fx:hack') return;
        sweeps.push({ elapsed: 0, cardId: ev.payload?.cardId || null });
    });

    /**
     * Where this sweep runs.
     *
     * Resolved every frame rather than pinned: the board can reflow while the
     * sweep is crossing it, and a card sweep whose target has just been
     * removed should stop rather than draw over empty space.
     */
    function sweepRect(entry) {
        if (!entry.cardId) return boardRect(app);
        const card = cardRect(app, entry.cardId);
        if (!card) return null;
        // A little proud of the card, so the binary is not clipped to its edge.
        const pad = card.width * 0.25;
        return {
            left: card.left - pad,
            top: card.top - pad,
            width: card.width + pad * 2,
            height: card.height + pad * 2,
        };
    }

    /**
     * The glyph grid, sized to the area being swept.
     *
     * A card is a fraction of the board's width; drawing the board's column
     * count into it would pack the glyphs into a solid block. Density stays
     * roughly constant instead, and a card sweep runs quicker for its size.
     */
    function gridFor(rect, scoped) {
        return {
            ...HACK,
            columns: Math.max(6, Math.min(HACK.columns, Math.round(rect.width / 22))),
            rows: Math.max(4, Math.min(HACK.rows, Math.round(rect.height / 20))),
            sweepMs: scoped ? Math.round(HACK.sweepMs * 0.55) : HACK.sweepMs,
        };
    }

    /** One column of glyphs, lit to `alpha`. */
    function drawColumn(rect, cfg, columnIndex, alpha, elapsed) {
        const columnWidth = rect.width / cfg.columns;
        const x = rect.left + columnIndex * columnWidth + columnWidth / 2;
        const rowHeight = rect.height / cfg.rows;

        for (let r = 0; r < cfg.rows; r += 1) {
            const y = rect.top + r * rowHeight + rowHeight / 2;
            if (hackGlyphIsOne(columnIndex, r, elapsed, cfg)) {
                // A 1 is a solid bar.
                g.rect(
                    x - HACK.glyphWidth / 4,
                    y - HACK.glyphHeight / 2,
                    HACK.glyphWidth / 2,
                    HACK.glyphHeight,
                );
                g.fill({ color: HACK_VIOLET, alpha });
            } else {
                // A 0 is a hollow box.
                g.rect(
                    x - HACK.glyphWidth / 2,
                    y - HACK.glyphHeight / 2,
                    HACK.glyphWidth,
                    HACK.glyphHeight,
                );
                g.stroke({ width: 1, color: HACK_VIOLET, alpha: alpha * 0.9 });
            }
        }
    }

    function drawSweep(entry, delta) {
        entry.elapsed += delta;
        const rect = sweepRect(entry);
        if (!rect) return true;

        const cfg = gridFor(rect, !!entry.cardId);
        const s = hackSample(entry.elapsed, cfg);
        for (let c = 0; c < cfg.columns; c += 1) {
            const alpha = hackColumnAlpha(c, s.front, cfg);
            if (alpha <= 0.01) continue;
            drawColumn(rect, cfg, c, alpha, entry.elapsed);
        }

        // The bright edge riding the front, so the direction is unmistakable.
        if (!s.done) {
            const x = rect.left + rect.width * s.front;
            g.rect(x - HACK.frontWidth / 2, rect.top, HACK.frontWidth, rect.height);
            g.fill({ color: PALETTE.white, alpha: 0.55 * (1 - s.t * 0.4) });
        }

        return s.done;
    }

    const tick = () => {
        g.clear();
        if (!sweeps.length) return;
        const delta = app.ticker.deltaMS || 16;
        const done = sweeps.filter((entry) => drawSweep(entry, delta));
        if (done.length) sweeps = sweeps.filter((entry) => !done.includes(entry));
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests. */
        activeSweeps: () => sweeps.length,
        sweepMs: HACK.sweepMs,
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            sweeps = [];
        },
    };
}

export default createHackFx;
