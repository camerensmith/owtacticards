import { Container, Graphics } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import { WARP, warpSample } from './fxMath';
import { PALETTE } from './fxConfig';
import { cardRect } from './anchors';

const RING = 0xb388ff;
const CORE = PALETTE.white;

/**
 * Vega warps: a small rift on Temporal Rift, and a big twin warp on
 * Chronoshift (caster then target).
 */
export function createVegaFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const g = new Graphics();
    root.addChild(g);

    /** @type {Array<{rect: object, elapsed: number, durationKey: string, big: boolean}>} */
    let warps = [];

    const unsub = effectsBus.subscribe((ev) => {
        if (ev?.type === 'fx:temporalRift') {
            const rect = cardRect(app, ev.payload?.cardId);
            if (rect) warps.push({ rect, elapsed: 0, durationKey: 'riftMs', big: false });
        } else if (ev?.type === 'fx:chronoshift') {
            const from = cardRect(app, ev.payload?.fromCardId);
            const to = cardRect(app, ev.payload?.toCardId);
            if (from) warps.push({ rect: from, elapsed: 0, durationKey: 'chronoMs', big: true });
            if (to) warps.push({ rect: to, elapsed: -180, durationKey: 'chronoMs', big: true });
        }
    });

    const tick = () => {
        if (!warps.length) return;
        const delta = app.ticker.deltaMS || 16;
        g.clear();
        const finished = [];

        for (const warp of warps) {
            warp.elapsed += delta;
            if (warp.elapsed < 0) continue;
            const s = warpSample(warp.elapsed, WARP, warp.durationKey);
            if (s.done) {
                finished.push(warp);
                continue;
            }
            const reach = Math.min(warp.rect.width, warp.rect.height) * WARP.reach * (warp.big ? 1.35 : 1);
            for (let i = 0; i < WARP.rings; i += 1) {
                const u = (i + 1) / WARP.rings;
                const radius = reach * s.open * u;
                g.circle(warp.rect.x, warp.rect.y, radius);
                g.stroke({
                    width: warp.big ? 3.5 : 2.2,
                    color: i % 2 === 0 ? RING : CORE,
                    alpha: s.alpha * (1 - u * 0.45),
                });
            }
            if (warp.big) {
                g.circle(warp.rect.x, warp.rect.y, 6 + 10 * s.open);
                g.fill({ color: RING, alpha: s.alpha * 0.35 });
            }
        }

        if (finished.length) {
            warps = warps.filter((w) => !finished.includes(w));
            if (!warps.length) g.clear();
        }
    };

    app.ticker.add(tick);

    return {
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
        },
    };
}

export default createVegaFx;
