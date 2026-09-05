import { Container, Graphics } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import { isMinefieldToken, minefieldCharges } from '../../game/minefield';
import {
    ADAPTIVE,
    MINE_BLAST,
    adaptiveSample,
    emberOffsets,
    mineBlastSample,
    minefieldBlink,
    minefieldPositions,
} from './fxMath';
import { PALETTE } from './fxConfig';
import { cardAnchor, cardRect, rowRect } from './anchors';

const MINE_ORANGE = 0xff8a3d;
const MINE_DARK = 0x3d2410;
const SHIELD_BLUE = 0x6fd3ff;
const ROWS = ['1f', '1m', '1b', '2f', '2m', '2b'];

/**
 * Wrecking Ball.
 *
 *  - Minefield: one mine drawn per remaining charge, scattered over the row.
 *    Read from row state each frame, so spending a charge takes a mine off the
 *    board and the field clears itself when the token is gone.
 *  - Adaptive Shield: a faint ring breathing around him while the shields hold,
 *    likewise read from state rather than timed.
 *  - A mine going off is the one thing here that is an event.
 */
export function createBallFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const field = new Graphics();
    const g = new Graphics();
    root.addChild(field);
    root.addChild(g);

    let elapsed = 0;
    let blasts = [];

    const unsub = effectsBus.subscribe((ev) => {
        if (ev?.type !== 'fx:mineBlast') return;
        const cardId = ev.payload?.cardId;
        if (cardId) blasts.push({ cardId, at: null, elapsed: 0 });
    });

    /** Rows carrying a minefield token, with the charges left on each. */
    function minedRows() {
        const getRow = window.__ow_getRow;
        if (typeof getRow !== 'function') return [];
        const found = [];
        for (const rowId of ROWS) {
            const token = (getRow(rowId)?.enemyEffects || []).find(isMinefieldToken);
            const charges = minefieldCharges(token);
            if (token && charges > 0) found.push({ rowId, charges });
        }
        return found;
    }

    function drawMinefield() {
        for (const { rowId, charges } of minedRows()) {
            const rect = rowRect(app, rowId);
            if (!rect) continue;
            for (const mine of minefieldPositions(rect, charges)) {
                const blink = minefieldBlink(elapsed, mine.seed);
                g.circle(mine.x, mine.y, blink.radius);
                g.fill({ color: MINE_DARK, alpha: 0.9 });
                g.circle(mine.x, mine.y, blink.radius);
                g.stroke({ width: 3, color: MINE_ORANGE, alpha: blink.alpha });
                for (let spike = 0; spike < 4; spike += 1) {
                    const a = (Math.PI / 2) * spike + 0.4;
                    g.moveTo(mine.x, mine.y);
                    g.lineTo(
                        mine.x + Math.cos(a) * blink.radius * 1.35,
                        mine.y + Math.sin(a) * blink.radius * 1.35,
                    );
                }
                g.stroke({ width: 2, color: MINE_ORANGE, alpha: blink.alpha });
                g.circle(mine.x, mine.y, blink.radius * 0.32);
                g.fill({ color: MINE_ORANGE, alpha: blink.alpha });
            }
        }
    }

    /** The shield ring, drawn from live shield state so it clears with it. */
    function drawShields() {
        const getRow = window.__ow_getRow;
        const getCard = window.__ow_getCard;
        if (typeof getRow !== 'function' || typeof getCard !== 'function') return;

        const s = adaptiveSample(elapsed);
        for (const rowId of ROWS) {
            for (const cardId of getRow(rowId)?.cardIds || []) {
                const card = getCard(cardId);
                if (card?.id !== 'wreckingball' || (card.shield || 0) <= 0) continue;
                const rect = cardRect(app, cardId);
                if (!rect) continue;

                const radius = Math.max(rect.width, rect.height) * ADAPTIVE.radius * s.scale;
                field.circle(rect.x, rect.y, radius);
                field.stroke({ width: 3, color: SHIELD_BLUE, alpha: s.alpha });
                field.circle(rect.x, rect.y, radius * 0.88);
                field.stroke({ width: 1, color: SHIELD_BLUE, alpha: s.alpha * 0.45 });
            }
        }
    }

    function drawBlast(entry, delta) {
        entry.elapsed += delta;
        const s = mineBlastSample(entry.elapsed);
        if (s.done) return true;

        // Pinned: a mine can finish off whoever stepped on it.
        if (!entry.at) entry.at = cardAnchor(app, entry.cardId) || null;
        if (!entry.at) return false;
        const { x, y } = entry.at;

        for (const shard of emberOffsets(MINE_BLAST.shards, s.shardDistance)) {
            g.circle(x + shard.x, y + shard.y, 3);
            g.fill({ color: MINE_ORANGE, alpha: s.shardAlpha });
        }
        g.circle(x, y, s.radius);
        g.stroke({ width: 4, color: MINE_ORANGE, alpha: s.alpha });
        g.circle(x, y, s.coreRadius);
        g.fill({ color: PALETTE.white, alpha: s.alpha });
        return false;
    }

    const tick = () => {
        const delta = app.ticker.deltaMS || 16;
        elapsed += delta;

        field.clear();
        drawShields();

        g.clear();
        drawMinefield();
        if (blasts.length) {
            const done = blasts.filter((e) => drawBlast(e, delta));
            if (done.length) blasts = blasts.filter((e) => !done.includes(e));
        }
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests. */
        activeBlasts: () => blasts.length,
        blastMs: MINE_BLAST.ms,
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            blasts = [];
        },
    };
}

export default createBallFx;
