import { Container, Graphics } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import { LOCK_ON, lockOnCorners, lockOnSample } from './fxMath';
import { PALETTE } from './fxConfig';
import { cardAnchor } from './anchors';

// Bravo-X2 is a machine, and its sight reads as one: violet rather than the
// amber every other targeting cue uses, so a lock is never mistaken for the
// house targeting colour.
const SIGHT = PALETTE.violet;
const HOT = PALETTE.violetPale;

/**
 * Bravo-X2's Lock On reticle.
 *
 * Blue-violet corner brackets converge on the target card, snap tight with a
 * flash, then release. Driven by fx:lockOn from the ability's resolve, so the
 * human and AI paths both show it.
 */
export function createLockOnReticle(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const frame = new Graphics();
    root.addChild(frame);

    let target = null;
    let elapsed = 0;

    function draw(sample) {
        frame.clear();
        if (!target || sample.alpha <= 0) return;

        frame.position.set(target.x, target.y);
        frame.rotation = sample.spin;

        const w = target.width * sample.scale;
        const h = target.height * sample.scale;

        // Flash fill on contact, under the brackets.
        if (sample.flashAlpha > 0) {
            frame.rect(-w / 2, -h / 2, w, h);
            frame.fill({ color: HOT, alpha: sample.flashAlpha * 0.35 });
        }

        // Faint full square, so the brackets read as one sight rather than four marks.
        frame.rect(-w / 2, -h / 2, w, h);
        frame.stroke({ width: 1, color: SIGHT, alpha: sample.alpha * 0.35 });

        for (const corner of lockOnCorners(target, sample.scale)) {
            frame.moveTo(corner.x + corner.armX, corner.y);
            frame.lineTo(corner.x, corner.y);
            frame.lineTo(corner.x, corner.y + corner.armY);
        }
        frame.stroke({
            width: LOCK_ON.thickness,
            color: SIGHT,
            alpha: sample.alpha,
            cap: 'square',
        });
    }

    const unsub = effectsBus.subscribe((ev) => {
        if (ev?.type !== 'fx:lockOn') return;
        const box = cardAnchor(app, ev.payload?.cardId);
        if (!box) return;
        target = box;
        elapsed = 0; // a re-trigger restarts the sweep rather than stacking
    });

    const tick = () => {
        if (!target) return;
        elapsed += app.ticker.deltaMS || 16;
        const sample = lockOnSample(elapsed);
        if (sample.done) {
            target = null;
            frame.clear();
            return;
        }
        draw(sample);
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests. */
        isActive: () => target !== null,
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            target = null;
        },
    };
}

export default createLockOnReticle;
