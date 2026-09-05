import { Container, Graphics } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import {
    DRAGONSTRIKE,
    SONIC,
    dragonstrikeSample,
    dragonstrikeStrand,
    sonicArrowSample,
    sonicPulseArcs,
} from './fxMath';
import { PALETTE } from './fxConfig';
import { cardAnchor, rowAnchor, rowRect } from './anchors';

const SONAR_BLUE = 0x5ad1ff;
const DRAGON_JADE = 0x63e2b7;
const DRAGON_DEEP = 0x1f7a63;
const ROWS = ['1f', '1m', '1b', '2f', '2m', '2b'];

/**
 * Where the dragon leaves the board, having passed through the column.
 *
 * Aimed at the column's own occupants where there are any, so the helix threads
 * the cards it is about to hit; the row centres are only a fallback for an
 * empty column.
 */
function columnExit(app, from, enemyPlayerNum, column) {
    const getRow = window.__ow_getRow;
    const points = [];
    for (const suffix of ['f', 'm', 'b']) {
        const rowId = `${enemyPlayerNum}${suffix}`;
        const cardId = typeof getRow === 'function'
            ? getRow(rowId)?.cardIds?.[column]
            : null;
        const at = (cardId && cardAnchor(app, cardId)) || rowAnchor(app, rowId);
        if (at) points.push(at);
    }
    if (!points.length) return null;

    const far = points[points.length - 1];
    const dx = far.x - from.x;
    const dy = far.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    // Carry on well past the last card so the tail clears the screen.
    const overshoot = len * 0.6 + 240;
    return { x: far.x + (dx / len) * overshoot, y: far.y + (dy / len) * overshoot };
}

/**
 * Hanzo.
 *
 *  - Sonic Arrow: the shot flies to the row, then a slow sonar breathes across
 *    it for as long as the token sits there. The sonar is read from row state,
 *    so it stops the moment the token is removed.
 *  - Dragonstrike: a slow twin helix bores through the chosen column and off
 *    the far edge.
 */
export function createHanzoFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const sonar = new Graphics();
    const g = new Graphics();
    root.addChild(sonar);
    root.addChild(g);

    let elapsed = 0;
    let arrows = [];
    let dragons = [];

    const unsub = effectsBus.subscribe((ev) => {
        const p = ev?.payload || {};
        if (ev?.type === 'fx:sonicArrow') {
            const from = cardAnchor(app, p.fromCardId);
            const to = rowAnchor(app, p.toRowId);
            if (from && to) arrows.push({ from, to, elapsed: 0 });
        } else if (ev?.type === 'fx:dragonstrike') {
            const from = cardAnchor(app, p.fromCardId);
            if (!from) return;
            dragons.push({
                from,
                enemyPlayerNum: p.enemyPlayerNum,
                column: p.column,
                to: null,
                elapsed: 0,
            });
        }
    });

    /** Rows carrying a Sonic Arrow token. */
    function markedRows() {
        const getRow = window.__ow_getRow;
        if (typeof getRow !== 'function') return [];
        return ROWS.filter((rowId) => (getRow(rowId)?.enemyEffects || [])
            .some((effect) => effect?.hero === 'hanzo' && effect?.type === 'damage-reduction'));
    }

    /** A slow sonar breath rolling across each marked row. */
    function drawSonar() {
        for (const rowId of markedRows()) {
            const rect = rowRect(app, rowId);
            if (!rect) continue;
            // Arcs roll along the row's longer side.
            const vertical = rect.height >= rect.width;
            const depth = vertical ? rect.height : rect.width;
            const across = vertical ? rect.width : rect.height;
            const bow = across * SONIC.bow;

            for (const arc of sonicPulseArcs(elapsed)) {
                if (arc.alpha <= 0) continue;
                const along = (vertical ? rect.top : rect.left) + depth * arc.t;
                const a = vertical
                    ? { x: rect.left, y: along }
                    : { x: along, y: rect.top };
                const b = vertical
                    ? { x: rect.left + rect.width, y: along }
                    : { x: along, y: rect.top + rect.height };
                const mid = vertical
                    ? { x: rect.x + bow, y: along }
                    : { x: along, y: rect.y + bow };

                sonar.moveTo(a.x, a.y);
                sonar.quadraticCurveTo(mid.x, mid.y, b.x, b.y);
                sonar.stroke({ width: 2, color: SONAR_BLUE, alpha: arc.alpha });
            }
        }
    }

    function drawArrow(entry, delta) {
        entry.elapsed += delta;
        const s = sonicArrowSample(entry.elapsed, entry.from, entry.to);
        if (s.done) return true;

        const dx = Math.cos(s.angle) * SONIC.arrowLength;
        const dy = Math.sin(s.angle) * SONIC.arrowLength;
        g.moveTo(s.x - dx, s.y - dy);
        g.lineTo(s.x, s.y);
        g.stroke({ width: 3, color: SONAR_BLUE, alpha: s.alpha });
        g.circle(s.x, s.y, 4);
        g.fill({ color: PALETTE.white, alpha: s.alpha });

        // A ring opening where it lands.
        if (s.t > 0.75) {
            const land = (s.t - 0.75) / 0.25;
            g.circle(entry.to.x, entry.to.y, 10 + land * 46);
            g.stroke({ width: 2, color: SONAR_BLUE, alpha: 1 - land });
        }
        return false;
    }

    function drawDragon(entry, delta) {
        entry.elapsed += delta;
        const s = dragonstrikeSample(entry.elapsed);
        if (s.done) return true;

        // The path runs from Hanzo through the chosen column and off the far
        // edge. Anchored on the column's actual occupants where there are any,
        // so the helix threads the cards it is about to hit.
        if (!entry.to) {
            entry.to = columnExit(app, entry.from, entry.enemyPlayerNum, entry.column);
            if (!entry.to) return true;
        }

        for (const strand of [0, 1]) {
            const points = dragonstrikeStrand(s.head, entry.from, entry.to, strand);
            if (points.length < 2) continue;
            for (let i = 1; i < points.length; i += 1) {
                const pt = points[i];
                // Nearer half of the twist reads bright, the far half deep.
                const color = pt.depth > 0 ? DRAGON_JADE : DRAGON_DEEP;
                g.moveTo(points[i - 1].x, points[i - 1].y);
                g.lineTo(pt.x, pt.y);
                g.stroke({ width: pt.width, color, alpha: pt.alpha * s.alpha * 0.9 });
            }
            const head = points[0];
            if (head) {
                g.circle(head.x, head.y, 9);
                g.fill({ color: PALETTE.white, alpha: s.alpha * 0.8 });
                g.circle(head.x, head.y, 16);
                g.stroke({ width: 2, color: DRAGON_JADE, alpha: s.alpha * 0.6 });
            }
        }
        return false;
    }

    const tick = () => {
        const delta = app.ticker.deltaMS || 16;
        elapsed += delta;

        sonar.clear();
        drawSonar();

        g.clear();
        const sweep = (list, draw) => {
            if (!list.length) return list;
            const done = list.filter((e) => draw(e, delta));
            return done.length ? list.filter((e) => !done.includes(e)) : list;
        };
        arrows = sweep(arrows, drawArrow);
        dragons = sweep(dragons, drawDragon);
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests. */
        activeArrows: () => arrows.length,
        activeDragons: () => dragons.length,
        arrowMs: SONIC.arrowMs,
        dragonMs: DRAGONSTRIKE.ms,
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            arrows = [];
            dragons = [];
        },
    };
}

export default createHanzoFx;
