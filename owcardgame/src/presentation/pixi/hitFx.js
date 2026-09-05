import { Container, Graphics } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import { clamp01, emberOffsets, impactFlashSample } from './fxMath';
import { HIT, MEKA, PALETTE } from './fxConfig';
import { cardAnchor } from './anchors';

const IMPACT_COLOR = PALETTE.amberPale;
const MUZZLE_COLOR = PALETTE.hot;

/**
 * Small one-shot hits: fx:impact where a blow lands, fx:muzzleFlash where a shot
 * is fired. Deliberately brief — these punctuate the damage floats rather than
 * competing with them.
 */
export function createHitFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    /** @type {Array<{g: Graphics, at: object, elapsed: number, kind: string}>} */
    let hits = [];

    function spawn(cardId, kind) {
        const at = cardAnchor(app, cardId);
        if (!at) return;
        const g = new Graphics();
        root.addChild(g);
        hits.push({ g, at, elapsed: 0, kind });
    }

    const unsub = effectsBus.subscribe((ev) => {
        if (ev?.type === 'fx:impact') spawn(ev.payload?.cardId, 'impact');
        if (ev?.type === 'fx:muzzleFlash') spawn(ev.payload?.cardId, 'muzzle');
        if (ev?.type === 'fx:shockwave') spawn(ev.payload?.cardId, 'shockwave');
    });

    function drawImpact(hit, t) {
        const radius = Math.max(22, Math.min(hit.at.width, hit.at.height) * 0.55);
        const s = impactFlashSample(t, radius);
        hit.g.clear();
        for (const ember of emberOffsets(5, s.emberDistance)) {
            hit.g.circle(hit.at.x + ember.x, hit.at.y + ember.y, s.emberRadius);
            hit.g.fill({ color: IMPACT_COLOR, alpha: s.emberAlpha });
        }
        hit.g.circle(hit.at.x, hit.at.y, s.radius);
        hit.g.stroke({ width: 3, color: IMPACT_COLOR, alpha: s.alpha });
    }

    /** Board-scale blast: the same sampler, just far larger. */
    function drawShockwave(hit, t) {
        const radius = Math.max(hit.at.width, hit.at.height) * MEKA.blastScale;
        const s = impactFlashSample(t, radius);
        hit.g.clear();
        for (const ember of emberOffsets(14, s.emberDistance)) {
            hit.g.circle(hit.at.x + ember.x, hit.at.y + ember.y, s.emberRadius * 1.6);
            hit.g.fill({ color: IMPACT_COLOR, alpha: s.emberAlpha });
        }
        hit.g.circle(hit.at.x, hit.at.y, s.radius);
        hit.g.stroke({ width: 6, color: IMPACT_COLOR, alpha: s.alpha });
        hit.g.circle(hit.at.x, hit.at.y, s.coreRadius);
        hit.g.fill({ color: MUZZLE_COLOR, alpha: s.coreAlpha });
    }

    function drawMuzzle(hit, t) {
        // A quick star: bright immediately, gone almost at once.
        const size = Math.max(14, Math.min(hit.at.width, hit.at.height) * 0.4);
        const alpha = 1 - t;
        const reach = size * (0.6 + 0.8 * t);
        hit.g.clear();
        hit.g.circle(hit.at.x, hit.at.y, size * 0.35 * (1 - t * 0.5));
        hit.g.fill({ color: MUZZLE_COLOR, alpha });
        for (let i = 0; i < 4; i += 1) {
            const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
            hit.g.moveTo(hit.at.x, hit.at.y);
            hit.g.lineTo(hit.at.x + Math.cos(angle) * reach, hit.at.y + Math.sin(angle) * reach);
        }
        hit.g.stroke({ width: 2, color: MUZZLE_COLOR, alpha: alpha * 0.8 });
    }

    const tick = () => {
        if (!hits.length) return;
        const delta = app.ticker.deltaMS || 16;
        const finished = [];

        for (const hit of hits) {
            hit.elapsed += delta;
            let life = HIT.impactMs;
            if (hit.kind === 'muzzle') life = HIT.muzzleMs;
            else if (hit.kind === 'shockwave') life = MEKA.blastMs;

            const t = clamp01(hit.elapsed / life);
            if (hit.kind === 'muzzle') drawMuzzle(hit, t);
            else if (hit.kind === 'shockwave') drawShockwave(hit, t);
            else drawImpact(hit, t);
            if (t >= 1) finished.push(hit);
        }

        if (finished.length) {
            for (const hit of finished) {
                if (!hit.g.destroyed) hit.g.destroy();
            }
            hits = hits.filter((h) => !finished.includes(h));
        }
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests. */
        activeHits: () => hits.length,
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            hits = [];
        },
    };
}

export default createHitFx;
