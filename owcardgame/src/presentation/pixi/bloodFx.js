import { Container, Graphics } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import { BLOOD, bloodDropSample } from './fxMath';
import { PALETTE } from './fxConfig';
import { cardRect } from './anchors';

const BLOOD_RED = PALETTE.blood;
const BLOOD_DARK = PALETTE.bloodDark;

/**
 * Bleed droplets, driven by fx:bleed.
 *
 * Beads form on the wounded card and run down it. Deliberately local to the
 * target: a wound is something happening to them, so nothing travels in from
 * whoever inflicted it.
 */
export function createBloodFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const g = new Graphics();
    root.addChild(g);

    /** @type {Array<{rect: object, elapsed: number}>} */
    let bleeds = [];

    const unsub = effectsBus.subscribe((ev) => {
        if (ev?.type !== 'fx:bleed') return;
        const rect = cardRect(app, ev.payload?.cardId);
        if (!rect) return;
        bleeds.push({ rect, elapsed: 0 });
    });

    function drawDrop(s) {
        if (s.radius <= 0) return;
        const halfH = s.radius * s.stretch;

        // Teardrop: a rounded bead with a tapered top, pointing back up the run.
        g.moveTo(s.x, s.y - halfH * 1.9);
        g.lineTo(s.x + s.radius, s.y);
        g.lineTo(s.x, s.y + halfH);
        g.lineTo(s.x - s.radius, s.y);
        g.closePath();
        g.fill({ color: BLOOD_RED, alpha: s.alpha * 0.95 });

        // Darker core so it does not read as a flat blob.
        g.ellipse(s.x, s.y, s.radius * 0.5, halfH * 0.5);
        g.fill({ color: BLOOD_DARK, alpha: s.alpha * 0.8 });
    }

    const tick = () => {
        if (!bleeds.length) return;
        const delta = app.ticker.deltaMS || 16;
        const finished = [];
        g.clear();

        for (const bleed of bleeds) {
            bleed.elapsed += delta;
            let allDone = true;

            for (let i = 0; i < BLOOD.count; i += 1) {
                const s = bloodDropSample(bleed.elapsed, i, bleed.rect);
                if (!s.done) allDone = false;
                if (s.visible) drawDrop(s);
            }

            if (allDone) finished.push(bleed);
        }

        if (finished.length) {
            bleeds = bleeds.filter((b) => !finished.includes(b));
            if (!bleeds.length) g.clear();
        }
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests. */
        activeBleeds: () => bleeds.length,
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            bleeds = [];
        },
    };
}

export default createBloodFx;
