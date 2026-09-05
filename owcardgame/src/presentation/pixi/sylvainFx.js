import { Container, Graphics } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import { wireControlPoint, wirePoint, wireSample, wireSparks, zapBolt, ZAP } from './fxMath';
import { PALETTE } from './fxConfig';
import { rowAnchor, cardAnchor } from './anchors';

const NEON = PALETTE.ice;
const NEON_PALE = PALETTE.icePale;
const ROWS = ['1f', '1m', '1b', '2f', '2m', '2b'];

function tripwirePairs(getRow) {
    const pairs = [];
    const seen = new Set();
    for (const rowId of ROWS) {
        const row = getRow?.(rowId);
        if (!row) continue;
        const effects = [...(row.allyEffects || []), ...(row.enemyEffects || [])];
        for (const effect of effects) {
            if (effect?.id !== 'tripwire' || !effect.partnerRowId) continue;
            const key = [rowId, effect.partnerRowId].sort().join('|');
            if (seen.has(key)) continue;
            seen.add(key);
            pairs.push({ fromRowId: rowId, toRowId: effect.partnerRowId });
        }
    }
    return pairs;
}

/**
 * Sylvain: persistent tripwire cable, plus local Killswitch zaps.
 * Zaps live on the affected card. Nothing travels out of Sylvain.
 */
export function createSylvainFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const field = new Graphics();
    root.addChild(field);

    let elapsed = 0;
    /** @type {Array<{cardId: string, elapsed: number}>} */
    let zaps = [];

    const unsub = effectsBus.subscribe((ev) => {
        if (ev?.type !== 'fx:zap') return;
        const cardId = ev.payload?.cardId;
        if (!cardId) return;
        zaps.push({ cardId, elapsed: 0 });
    });

    function drawWire(from, to) {
        const { alpha } = wireSample(elapsed);
        const control = wireControlPoint(from, to);

        field.moveTo(from.x, from.y);
        field.quadraticCurveTo(control.x, control.y, to.x, to.y);
        field.stroke({ width: 10, color: NEON, alpha: alpha * 0.22 });

        field.moveTo(from.x, from.y);
        field.quadraticCurveTo(control.x, control.y, to.x, to.y);
        field.stroke({ width: 3.2, color: NEON, alpha: alpha * 0.85 });

        field.moveTo(from.x, from.y);
        field.quadraticCurveTo(control.x, control.y, to.x, to.y);
        field.stroke({ width: 1.2, color: NEON_PALE, alpha: Math.min(1, alpha + 0.15) });

        field.circle(from.x, from.y, 5);
        field.fill({ color: NEON_PALE, alpha });
        field.circle(to.x, to.y, 5);
        field.fill({ color: NEON_PALE, alpha });

        for (const spark of wireSparks(from, to, elapsed)) {
            field.circle(spark.x, spark.y, spark.r);
            field.fill({ color: PALETTE.white, alpha: spark.alpha * alpha });
        }

        const bead = wirePoint(from, to, (elapsed % 1600) / 1600);
        field.circle(bead.x, bead.y, 3);
        field.fill({ color: PALETTE.white, alpha: alpha });
    }

    function drawZap(zap) {
        const at = cardAnchor(app, zap.cardId);
        if (!at) return;
        for (let i = 0; i < ZAP.bolts; i += 1) {
            const bolt = zapBolt(at, zap.elapsed, i);
            if (bolt.gone || bolt.alpha <= 0 || bolt.points.length < 2) continue;
            const pts = bolt.points;
            field.moveTo(pts[0].x, pts[0].y);
            for (let p = 1; p < pts.length; p += 1) {
                field.lineTo(pts[p].x, pts[p].y);
            }
            field.stroke({ width: 5, color: NEON, alpha: bolt.alpha * 0.35 });
            field.moveTo(pts[0].x, pts[0].y);
            for (let p = 1; p < pts.length; p += 1) {
                field.lineTo(pts[p].x, pts[p].y);
            }
            field.stroke({ width: 1.7, color: NEON_PALE, alpha: bolt.alpha });
        }
    }

    const tick = () => {
        const delta = app.ticker.deltaMS || 16;
        elapsed += delta;
        field.clear();

        const getRow = window.__ow_getRow;
        if (typeof getRow === 'function') {
            for (const pair of tripwirePairs(getRow)) {
                const from = rowAnchor(app, pair.fromRowId);
                const to = rowAnchor(app, pair.toRowId);
                if (!from || !to) continue;
                drawWire(from, to);
            }
        }

        if (zaps.length) {
            const live = [];
            for (const zap of zaps) {
                zap.elapsed += delta;
                drawZap(zap);
                if (zap.elapsed < ZAP.ms) live.push(zap);
            }
            zaps = live;
        }
    };

    app.ticker.add(tick);

    return {
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            zaps = [];
        },
    };
}

export default createSylvainFx;
