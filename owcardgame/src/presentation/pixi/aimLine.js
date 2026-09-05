import { Container, Graphics } from 'pixi.js';
import aimLineBus from '../../abilities/engine/aimLineBus';
import { chevronSamples } from './fxMath';
import { AIM, PALETTE } from './fxConfig';
import { boxOf } from './anchors';

const LINE = PALETTE.amber;
const GLOW = PALETTE.amberPale;

/**
 * Targeting aim line, from the casting card to the cursor.
 *
 * Replaces the rotated-div version in TopBanner: that one measured the source
 * with getBoundingClientRect during render and only refreshed when the mouse
 * moved, so it went stale on scroll. This re-measures every frame.
 */
export function createAimLine(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const g = new Graphics();
    root.addChild(g);

    let sourceId = null;
    let pointer = { x: 0, y: 0 };
    let elapsed = 0;

    const unsub = aimLineBus.subscribe((id) => {
        sourceId = id || null;
        if (!sourceId) g.clear();
    });

    const onMove = (e) => {
        pointer = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', onMove);

    const tick = () => {
        if (!sourceId) return;
        const box = boxOf(sourceId);
        if (!box) {
            g.clear();
            return;
        }

        const canvas = app.canvas.getBoundingClientRect();
        const from = {
            x: box.left + box.width / 2 - canvas.left,
            y: box.top + box.height / 2 - canvas.top,
        };
        const to = { x: pointer.x - canvas.left, y: pointer.y - canvas.top };

        elapsed += app.ticker.deltaMS || 16;
        const pulse = 0.65 + 0.35 * Math.sin(elapsed / AIM.pulseMs);

        g.clear();

        g.moveTo(from.x, from.y);
        g.lineTo(to.x, to.y);
        g.stroke({ width: AIM.glowWidth, color: GLOW, alpha: 0.22 });

        g.moveTo(from.x, from.y);
        g.lineTo(to.x, to.y);
        g.stroke({ width: AIM.lineWidth, color: LINE, alpha: 0.95 });

        // Chevrons travelling the line give it a direction.
        for (const chevron of chevronSamples(from, to, AIM.chevrons)) {
            const size = AIM.chevronSize;
            const back = chevron.angle + Math.PI;
            g.moveTo(
                chevron.x + Math.cos(back + 0.5) * size,
                chevron.y + Math.sin(back + 0.5) * size
            );
            g.lineTo(chevron.x, chevron.y);
            g.lineTo(
                chevron.x + Math.cos(back - 0.5) * size,
                chevron.y + Math.sin(back - 0.5) * size
            );
        }
        g.stroke({ width: AIM.lineWidth, color: LINE, alpha: pulse });

        g.circle(from.x, from.y, AIM.originDot);
        g.fill({ color: LINE, alpha: 0.9 });
        g.circle(to.x, to.y, AIM.cursorRing * pulse);
        g.stroke({ width: AIM.lineWidth, color: LINE, alpha: pulse });
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests. */
        isAiming: () => sourceId !== null,
        destroy() {
            try { unsub(); } catch {}
            try { window.removeEventListener('mousemove', onMove); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            sourceId = null;
        },
    };
}

export default createAimLine;
