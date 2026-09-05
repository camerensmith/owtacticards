import { Container, Graphics } from 'pixi.js';
import { clampFieldSample, clampJaws, clampSparks, CLAMP } from './fxMath';
import { PALETTE } from './fxConfig';
import { rowRect } from './anchors';

const TEAL = PALETTE.teal;
const TEAL_PALE = PALETTE.tealPale;
const ROWS = ['1f', '1m', '1b', '2f', '2m', '2b'];

/**
 * Lockjaw Magnetic Clamp.
 *
 * Persistent jaws over any row holding a magnetic-clamp token. State-driven
 * like Bastion's sentry and Mei's rime, so it clears itself when the token
 * is removed. Crush Zone uses the shared push / wash / impact events.
 */
export function createLockjawFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const field = new Graphics();
    root.addChild(field);

    let elapsed = 0;

    function drawClamp(rect) {
        const { alpha, jaw } = clampFieldSample(elapsed);
        const jaws = clampJaws(rect, jaw);

        field.roundRect(rect.left, rect.top, rect.width, rect.height, 8);
        field.fill({ color: TEAL, alpha: alpha * 0.12 });

        field.rect(rect.left, jaws.top.y, rect.width, jaws.top.depth);
        field.fill({ color: TEAL, alpha: alpha * 0.38 });
        field.rect(rect.left, jaws.bottom.y - jaws.bottom.depth, rect.width, jaws.bottom.depth);
        field.fill({ color: TEAL, alpha: alpha * 0.38 });

        const teeth = CLAMP.toothCount;
        const gap = rect.width / teeth;
        for (let i = 0; i < teeth; i += 1) {
            const x = rect.left + (i + 0.5) * gap;
            const w = gap * 0.22;
            field.poly([
                x - w, jaws.top.y + jaws.top.depth,
                x + w, jaws.top.y + jaws.top.depth,
                x, jaws.top.y + jaws.top.depth + jaws.top.depth * 0.45,
            ]);
            field.poly([
                x - w, jaws.bottom.y - jaws.bottom.depth,
                x + w, jaws.bottom.y - jaws.bottom.depth,
                x, jaws.bottom.y - jaws.bottom.depth - jaws.bottom.depth * 0.45,
            ]);
        }
        field.fill({ color: TEAL_PALE, alpha: alpha * 0.7 });

        field.roundRect(rect.left, rect.top, rect.width, rect.height, 8);
        field.stroke({ width: 2, color: TEAL_PALE, alpha: alpha * 0.85 });

        for (const spark of clampSparks(rect, elapsed)) {
            field.circle(spark.x, spark.y, spark.r);
            field.fill({ color: TEAL_PALE, alpha: spark.alpha * alpha });
        }
    }

    const tick = () => {
        elapsed += app.ticker.deltaMS || 16;
        field.clear();
        const getRow = window.__ow_getRow;
        if (typeof getRow !== 'function') return;
        for (const rowId of ROWS) {
            const row = getRow(rowId);
            if (!row) continue;
            const clamped = [...(row.enemyEffects || []), ...(row.allyEffects || [])]
                .some((e) => e?.id === 'magnetic-clamp');
            if (!clamped) continue;
            const rect = rowRect(app, rowId);
            if (rect) drawClamp(rect);
        }
    };

    app.ticker.add(tick);

    return {
        destroy() {
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
        },
    };
}

export default createLockjawFx;
