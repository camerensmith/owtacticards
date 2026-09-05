import { Container, Graphics } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import {
    LUCIO_TOKEN,
    SOUND_BARRIER,
    lucioRings,
    lucioSwirl,
    soundBarrierSample,
    soundBarrierTotalMs,
} from './fxMath';
import { PALETTE } from './fxConfig';
import { rowRect } from './anchors';

const HEAL_GREEN = 0x5ce68a;
const SHUFFLE_GOLD = 0xffc24d;
const BARRIER_BLUE = 0x7fd8ff;
const ROWS = ['1f', '1m', '1b', '2f', '2m', '2b'];

/** Rows carrying one of Lúcio's tokens, read fresh from state each frame. */
function tokenRows() {
    const getRow = window.__ow_getRow;
    if (typeof getRow !== 'function') return { healing: [], shuffle: [] };

    const healing = [];
    const shuffle = [];
    for (const rowId of ROWS) {
        const row = getRow(rowId);
        if ((row?.allyEffects || []).some((e) => e?.id === 'lucio-token')) healing.push(rowId);
        if ((row?.enemyEffects || []).some((e) => e?.id === 'lucio-shuffle-token')) shuffle.push(rowId);
    }
    return { healing, shuffle };
}

/**
 * Lúcio.
 *
 *  - Crossfade (Healing): soundwave rings breathing out of the row.
 *  - Crossfade (Shuffle): arcs chasing each other around it.
 *
 * Both are drawn from the row's own token, so they appear when it is placed and
 * clear the moment it is removed — including when Lúcio dies and takes them
 * with him.
 *
 *  - Sound Barrier: a ripple that runs the row, bounces off the end and comes
 *    back down it, losing energy each pass.
 */
export function createLucioFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const tokens = new Graphics();
    const g = new Graphics();
    root.addChild(tokens);
    root.addChild(g);

    let elapsed = 0;
    let barriers = [];

    const unsub = effectsBus.subscribe((ev) => {
        if (ev?.type !== 'fx:soundBarrier') return;
        const rowId = ev.payload?.rowId;
        if (rowId) barriers.push({ rowId, elapsed: 0 });
    });

    function drawHealing(rowId) {
        const rect = rowRect(app, rowId);
        if (!rect) return;
        const reach = Math.min(rect.width, rect.height);

        for (const ring of lucioRings(elapsed)) {
            const alpha = ring.alpha * LUCIO_TOKEN.healAlpha;
            if (alpha <= 0) continue;
            const grow = reach * ring.reach;
            tokens.roundRect(
                rect.left - grow / 2,
                rect.top - grow / 2,
                rect.width + grow,
                rect.height + grow,
                10,
            );
            tokens.stroke({ width: 2, color: HEAL_GREEN, alpha });
        }

        // A steady wash underneath, so an empty row still reads as tokened.
        tokens.roundRect(rect.left, rect.top, rect.width, rect.height, 8);
        tokens.fill({ color: HEAL_GREEN, alpha: LUCIO_TOKEN.healAlpha * 0.18 });
    }

    function drawShuffle(rowId) {
        const rect = rowRect(app, rowId);
        if (!rect) return;
        const radius = Math.min(rect.width, rect.height) * 0.42;

        for (const arm of lucioSwirl(elapsed)) {
            if (arm.alpha <= 0) continue;
            tokens.arc(rect.x, rect.y, radius, arm.start, arm.start + arm.sweep);
            tokens.stroke({ width: 3, color: SHUFFLE_GOLD, alpha: arm.alpha });
            tokens.arc(rect.x, rect.y, radius * 0.62, arm.start + Math.PI, arm.start + Math.PI + arm.sweep);
            tokens.stroke({ width: 2, color: SHUFFLE_GOLD, alpha: arm.alpha * 0.7 });
        }

        tokens.roundRect(rect.left, rect.top, rect.width, rect.height, 8);
        tokens.fill({ color: SHUFFLE_GOLD, alpha: LUCIO_TOKEN.shuffleAlpha * 0.14 });
    }

    function drawBarrier(entry, delta) {
        entry.elapsed += delta;
        const s = soundBarrierSample(entry.elapsed);
        if (s.done) return true;

        const rect = rowRect(app, entry.rowId);
        if (!rect) return false;

        // The ripple runs along the row's long side and bounces off both ends.
        const vertical = rect.height >= rect.width;
        const length = vertical ? rect.height : rect.width;
        const depth = length * s.depth;
        const head = (vertical ? rect.top : rect.left) + length * s.along;

        const band = (offset, alpha) => {
            if (alpha <= 0) return;
            const at = head + offset;
            if (vertical) {
                const top = Math.max(rect.top, at - depth / 2);
                const bottom = Math.min(rect.top + rect.height, at + depth / 2);
                if (bottom <= top) return;
                g.rect(rect.left, top, rect.width, bottom - top);
            } else {
                const left = Math.max(rect.left, at - depth / 2);
                const right = Math.min(rect.left + rect.width, at + depth / 2);
                if (right <= left) return;
                g.rect(left, rect.top, right - left, rect.height);
            }
            g.fill({ color: BARRIER_BLUE, alpha });
        };

        // Rings trailing the crest, back the way it came.
        const back = s.bounce % 2 === 0 ? -1 : 1;
        for (let i = SOUND_BARRIER.rings; i >= 1; i -= 1) {
            band(back * depth * i * 0.55, s.alpha * 0.18 * (1 - i / (SOUND_BARRIER.rings + 1)));
        }
        band(0, s.alpha * 0.55);

        // A bright lip on the crest itself.
        if (vertical) {
            g.rect(rect.left, head - 2, rect.width, 4);
        } else {
            g.rect(head - 2, rect.top, 4, rect.height);
        }
        g.fill({ color: PALETTE.white, alpha: s.alpha });

        // The row holds a faint shell for as long as the barrier is running.
        g.roundRect(rect.left, rect.top, rect.width, rect.height, 8);
        g.stroke({ width: 2, color: BARRIER_BLUE, alpha: s.alpha * 0.6 });
        return false;
    }

    const tick = () => {
        const delta = app.ticker.deltaMS || 16;
        elapsed += delta;

        tokens.clear();
        const { healing, shuffle } = tokenRows();
        for (const rowId of healing) drawHealing(rowId);
        for (const rowId of shuffle) drawShuffle(rowId);

        g.clear();
        if (barriers.length) {
            const done = barriers.filter((e) => drawBarrier(e, delta));
            if (done.length) barriers = barriers.filter((e) => !done.includes(e));
        }
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests. */
        activeBarriers: () => barriers.length,
        tokenRowCount: () => {
            const { healing, shuffle } = tokenRows();
            return healing.length + shuffle.length;
        },
        barrierMs: soundBarrierTotalMs(),
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            barriers = [];
        },
    };
}

export default createLucioFx;
