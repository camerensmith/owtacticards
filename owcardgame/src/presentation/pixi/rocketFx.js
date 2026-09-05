import { Container, Graphics } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import { ROCKET, beamQuad, emberOffsets, impactFlashSample, rocketSample } from './fxMath';
import { PALETTE } from './fxConfig';
import { cardAnchor } from './anchors';

const BODY = PALETTE.neutral;
const FLAME = PALETTE.fire;
const SMOKE = PALETTE.neutral;
const CORE = PALETTE.hot;

/**
 * Small rockets, driven by fx:rocket.
 *
 * Each salvo bows its rockets alternately left and right so they fan out rather
 * than stacking on one line, trails smoke along the path already flown, and
 * bursts on arrival using the shared impact sampler.
 */
export function createRocketFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const g = new Graphics();
    root.addChild(g);

    /** @type {Array<{from: object, to: object, count: number, elapsed: number}>} */
    let salvos = [];

    const unsub = effectsBus.subscribe((ev) => {
        if (ev?.type !== 'fx:rocket') return;
        const from = cardAnchor(app, ev.payload?.fromCardId);
        const to = cardAnchor(app, ev.payload?.toCardId);
        if (!from || !to) return;
        salvos.push({
            from,
            to,
            count: Math.max(1, Number(ev.payload?.count) || 1),
            elapsed: 0,
        });
    });

    function drawRocket(s) {
        for (const puff of s.smoke) {
            g.circle(puff.x, puff.y, puff.radius);
            g.fill({ color: SMOKE, alpha: puff.alpha * 0.45 });
        }

        const body = beamQuad(s.tail, s.head, ROCKET.width, 1);
        g.poly(body.points);
        g.fill({ color: BODY, alpha: 0.95 });

        // Exhaust flare off the back.
        g.circle(s.tail.x, s.tail.y, ROCKET.width * 0.75);
        g.fill({ color: FLAME, alpha: 0.85 });
        g.circle(s.head.x, s.head.y, ROCKET.width * 0.4);
        g.fill({ color: CORE, alpha: 0.9 });
    }

    function drawBurst(to, t) {
        const flash = impactFlashSample(t, Math.max(26, Math.min(to.width, to.height) * 0.55));
        for (const ember of emberOffsets(6, flash.emberDistance)) {
            g.circle(to.x + ember.x, to.y + ember.y, flash.emberRadius);
            g.fill({ color: FLAME, alpha: flash.emberAlpha });
        }
        g.circle(to.x, to.y, flash.radius);
        g.stroke({ width: 3, color: FLAME, alpha: flash.alpha });
        g.circle(to.x, to.y, flash.coreRadius);
        g.fill({ color: CORE, alpha: flash.coreAlpha });
    }

    const tick = () => {
        if (!salvos.length) return;
        const delta = app.ticker.deltaMS || 16;
        const finished = [];
        g.clear();

        for (const salvo of salvos) {
            salvo.elapsed += delta;
            let allDone = true;

            for (let i = 0; i < salvo.count; i += 1) {
                const s = rocketSample(salvo.elapsed, i, salvo.from, salvo.to);
                if (!s.done) allDone = false;
                if (s.visible) drawRocket(s);
                else if (s.explodeT > 0 && s.explodeT < 1) drawBurst(salvo.to, s.explodeT);
            }

            if (allDone) finished.push(salvo);
        }

        if (finished.length) {
            salvos = salvos.filter((s) => !finished.includes(s));
            if (!salvos.length) g.clear();
        }
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests. */
        activeSalvos: () => salvos.length,
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            salvos = [];
        },
    };
}

export default createRocketFx;
