import { Container, Graphics } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import { BULLET, beamQuad, bulletSample } from './fxMath';
import { PALETTE } from './fxConfig';
import { cardAnchor } from './anchors';

const TRACER = PALETTE.icePale;
const CORE = PALETTE.white;

/**
 * Pulse pistol rounds (Tracer).
 *
 * Small, elongated, bluish-white rounds that cross to the target at constant
 * speed with a faint streak behind them, then spark on the hit. A burst is
 * staggered and lightly scattered so several rounds read as automatic fire
 * rather than one thick line.
 *
 * Driven by fx:bullet, so both Pulse Pistols options use the same layer.
 */
export function createBulletFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const g = new Graphics();
    root.addChild(g);

    /** @type {Array<{from: object, to: object, rounds: number, elapsed: number}>} */
    let bursts = [];

    const unsub = effectsBus.subscribe((ev) => {
        if (ev?.type !== 'fx:bullet') return;
        const from = cardAnchor(app, ev.payload?.fromCardId);
        const to = cardAnchor(app, ev.payload?.toCardId);
        if (!from || !to) return;
        bursts.push({
            from,
            to,
            rounds: Math.max(1, Number(ev.payload?.rounds) || 1),
            // A caller can slow or tighten its own burst; pistols use the default.
            cfg: ev.payload?.cfg || BULLET,
            elapsed: 0,
        });
    });

    function drawRound(sample, cfg) {
        // Faint streak behind the round.
        const streak = beamQuad(sample.trail, sample.head, cfg.width * 0.7, 1);
        g.poly(streak.points);
        g.fill({ color: TRACER, alpha: 0.28 });

        // The round itself: a short bright capsule along the line of travel.
        const body = beamQuad(sample.tail, sample.head, cfg.width, 1);
        g.poly(body.points);
        g.fill({ color: TRACER, alpha: 0.95 });

        const core = beamQuad(sample.tail, sample.head, cfg.width * 0.45, 1);
        g.poly(core.points);
        g.fill({ color: CORE, alpha: 0.9 });
    }

    function drawSpark(to, sparkT) {
        const alpha = 1 - sparkT;
        g.circle(to.x, to.y, 3 + 9 * sparkT);
        g.stroke({ width: 2, color: TRACER, alpha: alpha * 0.9 });
        g.circle(to.x, to.y, 2.5 * (1 - sparkT));
        g.fill({ color: CORE, alpha });
    }

    const tick = () => {
        if (!bursts.length) return;
        const delta = app.ticker.deltaMS || 16;
        const finished = [];
        g.clear();

        for (const burst of bursts) {
            burst.elapsed += delta;
            let allDone = true;

            for (let i = 0; i < burst.rounds; i += 1) {
                const s = bulletSample(burst.elapsed, i, burst.from, burst.to, burst.cfg);
                if (!s.done) allDone = false;
                if (s.visible) drawRound(s, burst.cfg);
                else if (s.sparkT > 0 && s.sparkT < 1) drawSpark(burst.to, s.sparkT);
            }

            if (allDone) finished.push(burst);
        }

        if (finished.length) {
            bursts = bursts.filter((b) => !finished.includes(b));
            if (!bursts.length) g.clear();
        }
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests. */
        activeBursts: () => bursts.length,
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            bursts = [];
        },
    };
}

export default createBulletFx;
