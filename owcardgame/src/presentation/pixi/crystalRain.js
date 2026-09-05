import { Container, Graphics } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import { CRYSTAL, CRYSTAL_TOTAL_MS, crystalSample } from './fxMath';
import { PALETTE } from './fxConfig';
import { sideRect } from './anchors';

const SHARD = PALETTE.stone;
const SHARD_CORE = PALETTE.spike;
const SHARD_EDGE = PALETTE.stoneDark;

/**
 * Hazard's Downpour: jagged stone shards raining across the enemy side.
 *
 * Staggered release with per-shard lanes, so it reads as weather over the whole
 * side rather than one burst. Lanes are seeded deterministically from the shard
 * index, so a shard keeps its lane for its whole fall.
 */
export function createCrystalRain(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const g = new Graphics();
    root.addChild(g);

    let area = null;
    let elapsed = 0;

    const unsub = effectsBus.subscribe((ev) => {
        if (ev?.type !== 'fx:crystalRain') return;
        const rect = sideRect(app, ev.payload?.playerNum);
        if (!rect) return;
        area = rect;
        elapsed = 0;
    });

    function drawShard(s) {
        const len = CRYSTAL.length * s.scale;
        const wid = CRYSTAL.width * s.scale;
        const cx = s.x;
        const cy = s.y + len * 0.45;
        const cos = Math.cos(s.rot);
        const sin = Math.sin(s.rot);
        const local = [
            [0, -len / 2],
            [wid * 0.55, -len * 0.12],
            [wid * 0.28, len / 2],
            [-wid * 0.5, len * 0.18],
        ];
        const pts = local.map(([x, y]) => ([
            cx + x * cos - y * sin,
            cy + x * sin + y * cos,
        ]));
        const flat = pts.flat();
        g.poly(flat);
        g.fill({ color: SHARD, alpha: s.alpha * 0.92 });
        g.poly([
            pts[0][0], pts[0][1],
            pts[1][0], pts[1][1],
            pts[2][0], pts[2][1],
        ]);
        g.fill({ color: SHARD_CORE, alpha: s.alpha * 0.5 });
        g.poly(flat);
        g.stroke({ width: 1.6, color: SHARD_EDGE, alpha: s.alpha * 0.95 });
    }

    const tick = () => {
        if (!area) return;
        elapsed += app.ticker.deltaMS || 16;

        if (elapsed >= CRYSTAL_TOTAL_MS) {
            area = null;
            g.clear();
            return;
        }

        g.clear();
        for (let i = 0; i < CRYSTAL.count; i += 1) {
            const s = crystalSample(elapsed, i, area);
            if (!s.visible || s.alpha <= 0) continue;
            drawShard(s);
        }
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests. */
        isRaining: () => area !== null,
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            area = null;
        },
    };
}

export default createCrystalRain;
