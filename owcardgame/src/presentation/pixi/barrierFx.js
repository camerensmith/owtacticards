import { Container, Graphics } from 'pixi.js';
import { BARRIER, frontBarrierArc, frontEdge } from './fxMath';
import { PALETTE } from './fxConfig';
import { cardAnchor, facingVector, rowAnchor } from './anchors';

const SIGMA = PALETTE.violet;
const REIN = PALETTE.ice;
const ROWS = ['1f', '1m', '1b', '2f', '2m', '2b'];

function drawArc(g, points, color, alpha, width) {
    if (points.length < 2) return;
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) g.lineTo(points[i].x, points[i].y);
    g.stroke({ width, color, alpha, cap: 'round' });
}

/**
 * Persistent curved shields.
 *
 * Unlike the one-shot layers these are driven by game state, not events: they
 * are redrawn every frame from whatever barriers are currently active, so they
 * follow the board and vanish the moment the effect expires. No publisher
 * changes are needed in the hero modules.
 *
 * - Sigma's Experimental Barrier: an arc bowing off the protected row.
 * - Reinhardt's Barrier Field: a shield planted in front of his card.
 */
export function createBarrierFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const g = new Graphics();
    root.addChild(g);

    let elapsed = 0;

    function drawRowBarrier(rowId, token) {
        const rect = rowAnchor(app, rowId);
        if (!rect) return;

        const playerNum = parseInt(rowId[0], 10);
        // Across the front of the row, on whichever edge faces the enemy.
        const edge = frontEdge(rect, facingVector(app, playerNum));
        const points = frontBarrierArc(edge, edge.depth * BARRIER.rowBulge, BARRIER.rowOverhang);

        // Thins out as the barrier is worn down.
        const max = token.maxShields || 3;
        const strength = Math.max(0, (token.shields ?? max)) / max;
        const shimmer = 0.72 + 0.28 * Math.sin(elapsed / 420);

        // A quiet pane, not a sweeping arc: it sits there all round.
        drawArc(g, points, SIGMA, 0.10 * shimmer * (0.4 + 0.6 * strength), 7);
        drawArc(g, points, SIGMA, 0.45 * shimmer * (0.35 + 0.65 * strength), 2);
    }

    function drawHeroShield(cardId, effect) {
        const rect = cardAnchor(app, cardId);
        if (!rect) return;

        const playerNum = parseInt(cardId[0], 10);
        // Planted in front of Reinhardt, wider than he is.
        const facing = facingVector(app, playerNum);
        const edge = frontEdge(rect, facing);
        const points = frontBarrierArc(
            edge,
            BARRIER.shieldBulge,
            (BARRIER.shieldSpan - 1) / 2,
        );

        const max = effect.maxShields || 3;
        const left = Math.max(0, max - (effect.shieldsUsed || 0));
        const strength = left / max;
        // Brighter while actually absorbing, so the toggle is visible.
        const active = effect.absorbing ? 1 : 0.55;
        const shimmer = 0.7 + 0.3 * Math.sin(elapsed / 320);

        drawArc(g, points, REIN, 0.2 * active * shimmer * (0.4 + 0.6 * strength), 16);
        drawArc(g, points, REIN, 0.9 * active * shimmer * (0.35 + 0.65 * strength), 3);

        // Struts tying the shield back to the card, so it reads as held.
        for (const point of [points[0], points[points.length - 1]]) {
            g.moveTo(rect.x, rect.y);
            g.lineTo(point.x, point.y);
        }
        g.stroke({ width: 2, color: REIN, alpha: 0.45 * active });
    }

    const tick = () => {
        elapsed += app.ticker.deltaMS || 16;
        g.clear();

        const getRow = window.__ow_getRow;
        const getCard = window.__ow_getCard;
        if (typeof getRow !== 'function') return;

        for (const rowId of ROWS) {
            const row = getRow(rowId);
            if (!row) continue;

            const token = (row.allyEffects || []).find(
                (e) => e?.id === 'sigma-token' && (e.shields ?? 1) > 0
            );
            if (token) drawRowBarrier(rowId, token);

            if (typeof getCard !== 'function') continue;
            for (const cardId of row.cardIds || []) {
                const card = getCard(cardId);
                const shield = (card?.effects || []).find(
                    (e) => e?.id === 'barrier-field' && e?.type === 'barrier'
                );
                if (shield) drawHeroShield(cardId, shield);
            }
        }
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests. */
        segments: BARRIER.segments,
        destroy() {
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
        },
    };
}

export default createBarrierFx;
