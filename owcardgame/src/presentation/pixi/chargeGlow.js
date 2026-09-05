import { Container, Graphics } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import { chargeCoreSample, chargeRingSamples } from './fxMath';
import { PALETTE } from './fxConfig';
import { cardAnchor } from './anchors';

const DEFAULT_COLOR = PALETTE.iceDeep;
const CORE_HOT = PALETTE.icePale;

/**
 * Weapon spool-up on a card.
 *
 * Rings converge on the caster while power gathers in a pulsing core. Loops for
 * as long as targeting stays open, so the card reads as held at the ready.
 * Driven by fx:chargeStart / fx:chargeStop.
 */
export function createChargeGlow(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const rings = new Graphics();
    const core = new Graphics();
    root.addChild(rings);
    root.addChild(core);

    let target = null;
    let cardId = null;
    let color = DEFAULT_COLOR;
    let elapsed = 0;

    function clear() {
        rings.clear();
        core.clear();
    }

    function stop() {
        target = null;
        cardId = null;
        elapsed = 0;
        clear();
    }

    const unsub = effectsBus.subscribe((ev) => {
        if (ev?.type === 'fx:chargeStart') {
            const box = cardAnchor(app, ev.payload?.cardId);
            if (!box) return;
            target = box;
            cardId = ev.payload?.cardId || null;
            color = ev.payload?.color ?? DEFAULT_COLOR;
            elapsed = 0;
            return;
        }
        if (ev?.type === 'fx:chargeStop') {
            // A stop naming a different card must not cancel this one.
            const stopId = ev.payload?.cardId;
            if (!stopId || stopId === cardId) stop();
        }
    });

    const tick = () => {
        if (!target) return;
        elapsed += app.ticker.deltaMS || 16;

        // The card can move or leave while charging; follow it, drop if gone.
        const live = cardAnchor(app, cardId);
        if (live) target = live;

        const half = Math.max(target.width, target.height) / 2;

        rings.clear();
        rings.position.set(target.x, target.y);
        for (const ring of chargeRingSamples(elapsed)) {
            if (ring.alpha <= 0) continue;
            const w = target.width * ring.scale;
            const h = target.height * ring.scale;
            rings.roundRect(-w / 2, -h / 2, w, h, 6);
            rings.stroke({ width: 2, color, alpha: ring.alpha * 0.85 });
        }

        const c = chargeCoreSample(elapsed);
        core.clear();
        core.position.set(target.x, target.y);
        core.circle(0, 0, half * c.scale);
        core.fill({ color, alpha: c.alpha * 0.4 });
        core.circle(0, 0, half * c.scale * 0.45);
        core.fill({ color: CORE_HOT, alpha: c.alpha });
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests. */
        isCharging: () => target !== null,
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            target = null;
        },
    };
}

export default createChargeGlow;
