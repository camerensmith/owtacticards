import { Container, Graphics } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import { NANO, nanoBolt, nanoBoltSample, nanoSample } from './fxMath';
import { PALETTE } from './fxConfig';
import { rowRect } from './anchors';

const ARC = PALETTE.icePale;
const ARC_HOT = PALETTE.white;
const GLOW = PALETTE.iceDeep;

/**
 * Nano Boost: arcs cracking across the boosted row for a couple of seconds,
 * each striking and decaying rather than glowing steadily, with a shockwave
 * ring spreading from every strike.
 */
export function createNanoFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const g = new Graphics();
    root.addChild(g);

    /** @type {Array<{rowId: string, elapsed: number}>} */
    let boosts = [];

    const unsub = effectsBus.subscribe((ev) => {
        if (ev?.type !== 'fx:nanoBoost') return;
        if (ev.payload?.rowId) boosts.push({ rowId: ev.payload.rowId, elapsed: 0 });
    });

    function draw(boost) {
        const rect = rowRect(app, boost.rowId);
        if (!rect) return true;

        const overall = nanoSample(boost.elapsed);
        if (overall.done) return true;

        // Charged wash under the arcs.
        g.roundRect(rect.left, rect.top, rect.width, rect.height, 8);
        g.fill({ color: GLOW, alpha: overall.alpha * 0.14 });

        for (let i = 0; i < NANO.boltCount; i += 1) {
            const s = nanoBoltSample(boost.elapsed, i);
            if (!s.visible) continue;

            const alpha = s.alpha * overall.alpha;
            const points = nanoBolt(i, rect);

            g.moveTo(points[0].x, points[0].y);
            for (let p = 1; p < points.length; p += 1) g.lineTo(points[p].x, points[p].y);
            g.stroke({ width: 6, color: GLOW, alpha: alpha * 0.35 });

            g.moveTo(points[0].x, points[0].y);
            for (let p = 1; p < points.length; p += 1) g.lineTo(points[p].x, points[p].y);
            g.stroke({ width: 2, color: ARC_HOT, alpha });

            // Shockwave ring spreading from the midpoint of the strike.
            const mid = points[Math.floor(points.length / 2)];
            g.circle(mid.x, mid.y, rect.height * 0.6 * s.ringRadius);
            g.stroke({ width: 2, color: ARC, alpha: alpha * 0.6 });
        }

        return false;
    }

    const tick = () => {
        if (!boosts.length) return;
        const delta = app.ticker.deltaMS || 16;
        const finished = [];
        g.clear();

        for (const boost of boosts) {
            boost.elapsed += delta;
            if (draw(boost)) finished.push(boost);
        }

        if (finished.length) {
            boosts = boosts.filter((b) => !finished.includes(b));
            if (!boosts.length) g.clear();
        }
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests. */
        activeBoosts: () => boosts.length,
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            boosts = [];
        },
    };
}

export default createNanoFx;
