import { Container, Graphics } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import {
    FREEZE,
    freezeSample,
    freezeShards,
    frostShimmer,
    frostSpikes,
    spiralPoints,
} from './fxMath';
import { PALETTE } from './fxConfig';
import { rowRect } from './anchors';
import { isBlizzardToken } from '../../game/blizzard';

const ICE = PALETTE.ice;
const ICE_PALE = PALETTE.icePale;
const ROWS = ['1f', '1m', '1b', '2f', '2m', '2b'];

/**
 * Mei's ice.
 *
 * Two halves that share a palette:
 *  - A persistent rime over any row holding a Blizzard token. State-driven like
 *    the barriers, so Mei's module needs no changes and the frost clears itself
 *    the moment the token is removed.
 *  - A one-shot spiral that closes around a target as it is frozen, fired by
 *    fx:freezeSpiral.
 */
export function createFrostFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const rime = new Graphics();
    const spiral = new Graphics();
    root.addChild(rime);
    root.addChild(spiral);

    let elapsed = 0;
    /** @type {Array<{at: object, elapsed: number}>} */
    let freezes = [];

    const unsub = effectsBus.subscribe((ev) => {
        if (ev?.type !== 'fx:freezeSpiral') return;
        // Cryo Freeze takes the row Blizzard marked, so the spiral closes over
        // the row rather than one card.
        const at = rowRect(app, ev.payload?.rowId);
        if (!at) return;
        freezes.push({ at, elapsed: 0 });
    });

    /**
     * `frozen` is Cryo Freeze: the same rime, laid on harder, so a doubled row
     * is distinguishable from one merely marked by Blizzard.
     */
    function drawRime(rect, frozen = false) {
        const alpha = frostShimmer(elapsed);
        const depth = frozen ? 2 : 1;

        // Cold wash over the row.
        rime.roundRect(rect.left, rect.top, rect.width, rect.height, 8);
        rime.fill({ color: ICE, alpha: alpha * 0.16 * depth });

        // Rime creeping in from the long edges.
        for (const facing of [1, -1]) {
            for (const spike of frostSpikes(rect, facing)) {
                rime.poly([
                    spike.baseLeft.x, spike.baseLeft.y,
                    spike.tip.x, spike.tip.y,
                    spike.baseRight.x, spike.baseRight.y,
                ]);
            }
        }
        rime.fill({ color: ICE_PALE, alpha: alpha * 0.4 * depth });

        rime.roundRect(rect.left, rect.top, rect.width, rect.height, 8);
        rime.stroke({ width: frozen ? 4 : 2, color: ICE_PALE, alpha: alpha * 0.7 });

        // A second frame set in from the first, so the row reads as sealed.
        if (!frozen) return;
        const inset = 6;
        rime.roundRect(
            rect.left + inset, rect.top + inset,
            rect.width - inset * 2, rect.height - inset * 2, 6,
        );
        rime.stroke({ width: 2, color: ICE, alpha: alpha * 0.8 });
    }

    function drawFreeze(freeze) {
        const s = freezeSample(freeze.elapsed);
        const radius = Math.max(34, Math.min(freeze.at.width, freeze.at.height) * 0.85);
        // Absolute coordinates: several targets can be freezing at once and they
        // all share this one Graphics, so it cannot be repositioned per freeze.
        const cx = freeze.at.x;
        const cy = freeze.at.y;

        const points = spiralPoints(radius, s.progress, s.spin);
        if (points.length > 1) {
            spiral.moveTo(cx + points[0].x, cy + points[0].y);
            for (let i = 1; i < points.length; i += 1) {
                spiral.lineTo(cx + points[i].x, cy + points[i].y);
            }
            spiral.stroke({ width: 3, color: ICE_PALE, alpha: s.alpha * 0.95 });
        }

        if (s.shardAlpha > 0) {
            for (const shard of freezeShards(radius, FREEZE.shardCount, s.spin)) {
                const nx = -Math.sin(shard.angle) * shard.width;
                const ny = Math.cos(shard.angle) * shard.width;
                spiral.poly([
                    cx + shard.base.x + nx, cy + shard.base.y + ny,
                    cx + shard.tip.x, cy + shard.tip.y,
                    cx + shard.base.x - nx, cy + shard.base.y - ny,
                ]);
            }
            spiral.fill({ color: ICE, alpha: s.shardAlpha * s.alpha * 0.85 });
        }

        return s.done;
    }

    const tick = () => {
        elapsed += app.ticker.deltaMS || 16;

        // --- persistent rime -------------------------------------------------
        rime.clear();
        const getRow = window.__ow_getRow;
        if (typeof getRow === 'function') {
            for (const rowId of ROWS) {
                const row = getRow(rowId);
                if (!row) continue;
                // The token lives in enemyEffects, but check both so a change in
                // where it is stored does not silently drop the visual.
                const token = [...(row.enemyEffects || []), ...(row.allyEffects || [])]
                    .find(isBlizzardToken);
                if (!token) continue;
                const rect = rowRect(app, rowId);
                if (rect) drawRime(rect, !!token.frozen);
            }
        }

        // --- one-shot spirals -------------------------------------------------
        spiral.clear();
        if (!freezes.length) return;
        const delta = app.ticker.deltaMS || 16;
        const finished = [];
        for (const freeze of freezes) {
            freeze.elapsed += delta;
            if (drawFreeze(freeze)) finished.push(freeze);
        }
        if (finished.length) {
            freezes = freezes.filter((f) => !finished.includes(f));
        }
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests. */
        activeFreezes: () => freezes.length,
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            freezes = [];
        },
    };
}

export default createFrostFx;
