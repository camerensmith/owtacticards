import { Container, Graphics } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import {
    SPIKE_BURST,
    spikeBurstSample,
    spikeBurstLayout,
    spikeBurstTriangle,
} from './fxMath';
import { PALETTE } from './fxConfig';
import { cardRect } from './anchors';

const STONE = PALETTE.stone;
const STONE_DARK = PALETTE.stoneDark;
const CRYSTAL = PALETTE.spike;

/**
 * Hazard deploy: jagged rock/crystal spikes erupting from the card edges.
 */
export function createSpikeBurstFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    /** @type {Array<{ g: Graphics, rect: object, bases: object[], elapsed: number }>} */
    let bursts = [];

    function spawn(cardId) {
        const rect = cardRect(app, cardId);
        if (!rect) return;
        const g = new Graphics();
        root.addChild(g);
        bursts.push({
            g,
            rect,
            bases: spikeBurstLayout(rect, SPIKE_BURST.count),
            elapsed: 0,
        });
    }

    const unsub = effectsBus.subscribe((ev) => {
        if (ev?.type === 'fx:spikeBurst') spawn(ev.payload?.cardId);
    });

    const tick = () => {
        const dt = app.ticker.deltaMS;
        const next = [];
        for (const burst of bursts) {
            burst.elapsed += dt;
            const sample = spikeBurstSample(burst.elapsed);
            burst.g.clear();
            if (sample.done || sample.alpha <= 0) {
                burst.g.destroy();
                continue;
            }
            for (const base of burst.bases) {
                const tri = spikeBurstTriangle(base, sample.grow, burst.rect);
                burst.g.moveTo(tri.tip.x, tri.tip.y);
                burst.g.lineTo(tri.left.x, tri.left.y);
                burst.g.lineTo(tri.right.x, tri.right.y);
                burst.g.closePath();
                burst.g.fill({ color: STONE, alpha: sample.alpha * 0.92 });
                burst.g.stroke({ width: 1.5, color: CRYSTAL, alpha: sample.alpha });
                // Dark inner facet so it reads as stone, not flat fill.
                const midX = (tri.tip.x + tri.left.x + tri.right.x) / 3;
                const midY = (tri.tip.y + tri.left.y + tri.right.y) / 3;
                burst.g.moveTo(tri.tip.x, tri.tip.y);
                burst.g.lineTo(tri.left.x, tri.left.y);
                burst.g.lineTo(midX, midY);
                burst.g.closePath();
                burst.g.fill({ color: STONE_DARK, alpha: sample.alpha * 0.55 });
            }
            next.push(burst);
        }
        bursts = next;
    };

    app.ticker.add(tick);

    return {
        destroy() {
            unsub();
            try { app.ticker.remove(tick); } catch {}
            for (const burst of bursts) {
                try { burst.g.destroy(); } catch {}
            }
            bursts = [];
            try { root.destroy({ children: true }); } catch {}
        },
    };
}
