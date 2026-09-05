import { Container, Graphics } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import { BIOTIC, bioticBubbles, bioticFlash, crosshairSample } from './fxMath';
import { CROSSHAIR, PALETTE } from './fxConfig';
import { cardRect, rowRect } from './anchors';

const BIOTIC_YELLOW = PALETTE.amber;
const BIOTIC_PALE = PALETTE.amberPale;
const SIGHT = PALETTE.amber;

/**
 * Soldier 76.
 *
 *  - Biotic Field: a yellow effervescent wash over the healed row, with bubbles
 *    rising through it.
 *  - Tactical Visor: a crosshair held on each target as it is picked, cleared
 *    when the volley fires.
 */
export function createSoldierFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const field = new Graphics();
    const sights = new Graphics();
    root.addChild(field);
    root.addChild(sights);

    /** @type {Array<{rowId: string, elapsed: number}>} */
    let fields = [];
    /** @type {Array<{cardId: string, elapsed: number, closing: boolean}>} */
    let crosshairs = [];

    const unsub = effectsBus.subscribe((ev) => {
        if (ev?.type === 'fx:bioticField') {
            if (ev.payload?.rowId) fields.push({ rowId: ev.payload.rowId, elapsed: 0 });
            return;
        }
        if (ev?.type === 'fx:crosshair') {
            const cardId = ev.payload?.cardId;
            if (!cardId) return;
            if (ev.payload?.on === false) {
                for (const c of crosshairs) {
                    if (c.cardId === cardId && !c.closing) {
                        c.closing = true;
                        c.elapsed = 0;
                    }
                }
                return;
            }
            if (!crosshairs.some((c) => c.cardId === cardId && !c.closing)) {
                crosshairs.push({ cardId, elapsed: 0, closing: false });
            }
            return;
        }
        if (ev?.type === 'fx:crosshairClear') {
            for (const c of crosshairs) {
                if (!c.closing) {
                    c.closing = true;
                    c.elapsed = 0;
                }
            }
        }
    });

    function drawField(entry) {
        const rect = rowRect(app, entry.rowId);
        if (!rect) return true;

        const alpha = bioticFlash(entry.elapsed);
        if (alpha > 0) {
            field.roundRect(rect.left, rect.top, rect.width, rect.height, 8);
            field.fill({ color: BIOTIC_YELLOW, alpha: alpha * 0.22 });
            field.roundRect(rect.left, rect.top, rect.width, rect.height, 8);
            field.stroke({ width: 2, color: BIOTIC_PALE, alpha: alpha * 0.8 });
        }

        for (const bubble of bioticBubbles(entry.elapsed, rect)) {
            field.circle(bubble.x, bubble.y, bubble.radius);
            field.fill({ color: BIOTIC_PALE, alpha: bubble.alpha * 0.55 });
            field.circle(bubble.x, bubble.y, bubble.radius);
            field.stroke({ width: 1, color: BIOTIC_YELLOW, alpha: bubble.alpha });
        }

        return entry.elapsed >= BIOTIC.durationMs;
    }

    function drawCrosshair(entry) {
        const rect = cardRect(app, entry.cardId);
        if (!rect) return entry.closing;

        const s = crosshairSample(entry.elapsed, entry.closing);
        if (s.gone) return true;

        const radius = Math.min(rect.width, rect.height) * CROSSHAIR.radius * s.scale;
        const tick = radius * CROSSHAIR.tick;

        sights.circle(rect.x, rect.y, radius);
        sights.stroke({ width: CROSSHAIR.thickness, color: SIGHT, alpha: s.alpha * 0.95 });

        // Four ticks, rotating slowly so a held lock still reads as tracking.
        for (let i = 0; i < 4; i += 1) {
            const angle = s.rotation + (i / 4) * Math.PI * 2;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            sights.moveTo(rect.x + cos * (radius - tick), rect.y + sin * (radius - tick));
            sights.lineTo(rect.x + cos * (radius + tick), rect.y + sin * (radius + tick));
        }
        sights.stroke({ width: CROSSHAIR.thickness, color: SIGHT, alpha: s.alpha });

        sights.circle(rect.x, rect.y, 2);
        sights.fill({ color: SIGHT, alpha: s.alpha });

        return false;
    }

    const tick = () => {
        const delta = app.ticker.deltaMS || 16;

        field.clear();
        if (fields.length) {
            const done = [];
            for (const entry of fields) {
                entry.elapsed += delta;
                if (drawField(entry)) done.push(entry);
            }
            if (done.length) fields = fields.filter((f) => !done.includes(f));
        }

        sights.clear();
        if (crosshairs.length) {
            const done = [];
            for (const entry of crosshairs) {
                entry.elapsed += delta;
                if (drawCrosshair(entry)) done.push(entry);
            }
            if (done.length) crosshairs = crosshairs.filter((c) => !done.includes(c));
        }
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests. */
        activeFields: () => fields.length,
        activeCrosshairs: () => crosshairs.length,
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            fields = [];
            crosshairs = [];
        },
    };
}

export default createSoldierFx;
