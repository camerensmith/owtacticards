import { Container, Graphics } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import { BLAST, beamQuad, blastSample, emberOffsets, impactFlashSample } from './fxMath';
import { PALETTE } from './fxConfig';
import { cardAnchor } from './anchors';

const CORE = PALETTE.white;

/**
 * Generic energy beam between two cards, driven by fx:beam.
 *
 * A head races to the target, the column sustains at full width, then collapses
 * while the impact blooms at the far end. Colour and width come from the event,
 * so Hyperion Cannon can be enormous and blue while other abilities stay small.
 *
 * Concurrent beams are supported: each is an independent shot.
 */
export function createBeamBlast(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    /** @type {Array<{g: Graphics, from: object, to: object, color: number, width: number, scale: number, elapsed: number}>} */
    let shots = [];

    const unsub = effectsBus.subscribe((ev) => {
        if (ev?.type !== 'fx:beam') return;
        const from = cardAnchor(app, ev.payload?.fromCardId);
        const to = cardAnchor(app, ev.payload?.toCardId);
        if (!from || !to) return;

        const g = new Graphics();
        root.addChild(g);
        shots.push({
            g,
            from,
            to,
            color: ev.payload?.color ?? PALETTE.amber,
            width: ev.payload?.width ?? 10,
            // Longer requested durations stretch the whole timeline evenly.
            scale: (ev.payload?.durationMs || 320) / 320,
            elapsed: 0,
        });
    });

    function drawShot(shot, sample) {
        const { g, from, to, color } = shot;
        g.clear();

        const width = shot.width * sample.width;
        if (width > 0 && sample.alpha > 0) {
            const outer = beamQuad(from, to, width, sample.reach);
            g.poly(outer.points);
            g.fill({ color, alpha: sample.alpha * 0.55 });

            const core = beamQuad(from, to, width * BLAST.coreRatio, sample.reach);
            g.poly(core.points);
            g.fill({ color: CORE, alpha: sample.alpha * 0.9 });

            // Muzzle bloom at the barrel, so the shot has a source not just a line.
            g.circle(from.x, from.y, width * 0.55);
            g.fill({ color, alpha: sample.alpha * 0.4 });

            // Leading head while it is still travelling.
            if (sample.reach < 1) {
                g.circle(outer.head.x, outer.head.y, width * 0.6);
                g.fill({ color: CORE, alpha: sample.alpha * 0.75 });
            }
        }

        if (sample.impactT > 0 && sample.impactT < 1) {
            const radius = Math.max(40, Math.min(to.width, to.height) * 1.2);
            const s = impactFlashSample(sample.impactT, radius);
            for (const ember of emberOffsets(8, s.emberDistance)) {
                g.circle(to.x + ember.x, to.y + ember.y, s.emberRadius);
                g.fill({ color, alpha: s.emberAlpha });
            }
            g.circle(to.x, to.y, s.radius);
            g.stroke({ width: 4, color, alpha: s.alpha });
            g.circle(to.x, to.y, s.coreRadius);
            g.fill({ color: CORE, alpha: s.coreAlpha });
        }
    }

    const tick = () => {
        if (!shots.length) return;
        const delta = app.ticker.deltaMS || 16;
        const finished = [];

        for (const shot of shots) {
            shot.elapsed += delta;
            const sample = blastSample(shot.elapsed / shot.scale);
            if (sample.done) {
                finished.push(shot);
                continue;
            }
            drawShot(shot, sample);
        }

        if (finished.length) {
            for (const shot of finished) {
                if (!shot.g.destroyed) shot.g.destroy();
            }
            shots = shots.filter((s) => !finished.includes(s));
        }
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests. */
        activeShots: () => shots.length,
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            shots = [];
        },
    };
}

export default createBeamBlast;
