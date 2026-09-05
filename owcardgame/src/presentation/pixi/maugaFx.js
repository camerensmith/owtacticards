import { Container, Graphics } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import {
    BERSERK,
    CAGE,
    MAUGA_SMASH,
    berserkSample,
    cageBars,
    emberOffsets,
    maugaSmashSample,
} from './fxMath';
import { PALETTE } from './fxConfig';
import { cardAnchor, cardRect, rowRect } from './anchors';

const CAGE_STEEL = 0x8d949c;
const CAGE_HOT = 0xff7a3d;
const RAGE_RED = 0xe02a1f;
const ROWS = ['1f', '1m', '1b', '2f', '2m', '2b'];

/** Rows currently held in a cage. */
function cagedRows() {
    const getRow = window.__ow_getRow;
    if (typeof getRow !== 'function') return [];
    return ROWS.filter((rowId) => getRow(rowId)?.locked);
}

/**
 * Mauga.
 *
 *  - Cage Fight: bars across the locked row, drawn from the row's own lock so
 *    they stand for as long as the cage does and come down the moment Mauga
 *    dies and the lock is cleared. No timer to keep in step.
 *  - Berserker: a red pulse each time he takes on more health.
 *  - The slam he lands on each hero in the cage, one at a time.
 */
export function createMaugaFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const cage = new Graphics();
    const g = new Graphics();
    root.addChild(cage);
    root.addChild(g);

    let elapsed = 0;
    let pulses = [];
    let smashes = [];

    const unsub = effectsBus.subscribe((ev) => {
        const p = ev?.payload || {};
        if (ev?.type === 'fx:berserk') {
            if (p.cardId) pulses.push({ cardId: p.cardId, elapsed: 0 });
        } else if (ev?.type === 'fx:maugaSmash') {
            if (p.toCardId) {
                smashes.push({
                    fromCardId: p.fromCardId,
                    toCardId: p.toCardId,
                    at: null,
                    size: 0,
                    elapsed: 0,
                });
            }
        }
    });

    function drawCages() {
        for (const rowId of cagedRows()) {
            const rect = rowRect(app, rowId);
            if (!rect) continue;

            const { bars } = cageBars(rect, elapsed);
            for (const bar of bars) {
                cage.moveTo(bar.a.x, bar.a.y);
                cage.lineTo(bar.b.x, bar.b.y);
                cage.stroke({
                    width: CAGE.barWidth,
                    color: CAGE_STEEL,
                    alpha: CAGE.alpha * (0.55 + 0.45 * bar.glow),
                });
                // A hot core on the bar, brightest where the shimmer is.
                cage.moveTo(bar.a.x, bar.a.y);
                cage.lineTo(bar.b.x, bar.b.y);
                cage.stroke({
                    width: CAGE.barWidth * 0.3,
                    color: CAGE_HOT,
                    alpha: CAGE.alpha * bar.glow * 0.8,
                });
            }

            // Frame and corner brackets, so it reads as a built thing.
            cage.rect(rect.left, rect.top, rect.width, rect.height);
            cage.stroke({ width: 3, color: CAGE_STEEL, alpha: CAGE.alpha });

            const c = CAGE.corner;
            const corners = [
                [rect.left, rect.top, 1, 1],
                [rect.left + rect.width, rect.top, -1, 1],
                [rect.left, rect.top + rect.height, 1, -1],
                [rect.left + rect.width, rect.top + rect.height, -1, -1],
            ];
            for (const [x, y, sx, sy] of corners) {
                cage.moveTo(x + sx * c, y);
                cage.lineTo(x, y);
                cage.lineTo(x, y + sy * c);
            }
            cage.stroke({ width: 5, color: CAGE_HOT, alpha: CAGE.alpha });
        }
    }

    function drawPulse(entry, delta) {
        entry.elapsed += delta;
        const s = berserkSample(entry.elapsed);
        if (s.done) return true;

        // Re-resolved: Mauga is standing still, and if he leaves the pulse stops.
        const rect = cardRect(app, entry.cardId);
        if (!rect) return false;
        const size = Math.max(rect.width, rect.height);

        if (s.glow > 0) {
            g.circle(rect.x, rect.y, size * 0.5);
            g.fill({ color: RAGE_RED, alpha: s.glow * 0.35 });
        }

        for (const spike of s.spikes) {
            g.moveTo(
                rect.x + Math.cos(spike.angle) * size * spike.inner,
                rect.y + Math.sin(spike.angle) * size * spike.inner,
            );
            g.lineTo(
                rect.x + Math.cos(spike.angle) * size * spike.outer,
                rect.y + Math.sin(spike.angle) * size * spike.outer,
            );
        }
        g.stroke({ width: 3, color: RAGE_RED, alpha: s.spikeAlpha });

        for (const ring of s.rings) {
            if (ring.alpha <= 0) continue;
            g.circle(rect.x, rect.y, size * ring.reach);
            g.stroke({ width: 4, color: RAGE_RED, alpha: ring.alpha });
        }
        return false;
    }

    function drawSmash(entry, delta) {
        entry.elapsed += delta;
        const s = maugaSmashSample(entry.elapsed);
        if (s.done) return true;

        // Pinned: the slam can be what finishes them.
        const rect = cardRect(app, entry.toCardId);
        if (rect) {
            entry.at = { x: rect.x, y: rect.y };
            entry.size = Math.max(rect.width, rect.height);
        }
        if (!entry.at) return false;
        const { x, y } = entry.at;
        const size = entry.size || 90;

        // The lunge in: a heavy wedge from Mauga, overshooting into the target.
        const from = cardAnchor(app, entry.fromCardId);
        if (from && s.lungeAlpha > 0) {
            const dx = x - from.x;
            const dy = y - from.y;
            const len = Math.hypot(dx, dy) || 1;
            const ux = dx / len;
            const uy = dy / len;
            const nx = -uy;
            const ny = ux;
            const tip = s.closing * (1 + MAUGA_SMASH.lunge);
            const headX = from.x + dx * tip;
            const headY = from.y + dy * tip;
            const width = size * 0.22;
            g.poly([
                headX, headY,
                from.x + nx * width, from.y + ny * width,
                from.x - nx * width, from.y - ny * width,
            ]);
            g.fill({ color: RAGE_RED, alpha: s.lungeAlpha * 0.5 });
        }

        if (!s.connected) return false;

        for (const shard of emberOffsets(MAUGA_SMASH.shards, size * s.shardDistance)) {
            g.circle(x + shard.x, y + shard.y, 4);
            g.fill({ color: RAGE_RED, alpha: s.shardAlpha });
        }
        g.circle(x, y, size * s.reach);
        g.stroke({ width: 6, color: RAGE_RED, alpha: s.impactAlpha });
        g.circle(x, y, size * s.reach * 0.55);
        g.stroke({ width: 3, color: PALETTE.white, alpha: s.impactAlpha * 0.8 });
        return false;
    }

    const tick = () => {
        const delta = app.ticker.deltaMS || 16;
        elapsed += delta;

        cage.clear();
        drawCages();

        g.clear();
        const sweep = (list, draw) => {
            if (!list.length) return list;
            const done = list.filter((e) => draw(e, delta));
            return done.length ? list.filter((e) => !done.includes(e)) : list;
        };
        pulses = sweep(pulses, drawPulse);
        smashes = sweep(smashes, drawSmash);
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests. */
        cagedRowCount: () => cagedRows().length,
        activePulses: () => pulses.length,
        activeSmashes: () => smashes.length,
        pulseMs: BERSERK.ms,
        smashMs: MAUGA_SMASH.ms,
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            pulses = [];
            smashes = [];
        },
    };
}

export default createMaugaFx;
