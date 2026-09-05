import { Container, Graphics } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import {
    SHIELD_GEN,
    TELEPORT,
    shieldGenSample,
    shieldGenTotalMs,
    teleportSample,
} from './fxMath';
import { PALETTE } from './fxConfig';
import { boxOf, cardAnchor, cardRect, rowRect, toLocal } from './anchors';

const SYM_BLUE = 0x3fb6ff;
const SYM_PALE = 0xcdeeff;

/** Where a returned hero is drawn back to: their own hand. */
function handAnchor(app, playerNum) {
    const box = boxOf(`player${playerNum}hand-carddisplay`)
        || boxOf(`player${playerNum}hand-list`)
        || boxOf(`player${playerNum}area`);
    return toLocal(app, box);
}

/**
 * Symmetra.
 *
 *  - Shield Generator: a blue gradient washes over each allied row in turn.
 *  - Teleporter: the returned hero streaks off the board into the hand,
 *    trailing after-images.
 */
export function createSymmetraFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const g = new Graphics();
    root.addChild(g);

    let washes = [];
    let ports = [];

    const unsub = effectsBus.subscribe((ev) => {
        const p = ev?.payload || {};
        if (ev?.type === 'fx:shieldGenerator') {
            const playerNum = Number(p.playerNum);
            if (playerNum) washes.push({ playerNum, elapsed: 0 });
        } else if (ev?.type === 'fx:teleport') {
            if (!p.cardId) return;
            const playerNum = Number(p.playerNum) || parseInt(String(p.cardId)[0], 10);
            // Pinned at once: the card is pulled out of its row as this fires.
            const from = cardAnchor(app, p.cardId);
            const rect = cardRect(app, p.cardId);
            if (!from) return;
            ports.push({
                from,
                size: { width: rect?.width || 70, height: rect?.height || 96 },
                playerNum,
                to: null,
                elapsed: 0,
            });
        }
    });

    function drawWash(entry, delta) {
        entry.elapsed += delta;
        const rows = [`${entry.playerNum}f`, `${entry.playerNum}m`, `${entry.playerNum}b`];
        let allDone = true;

        rows.forEach((rowId, i) => {
            const s = shieldGenSample(entry.elapsed, i);
            if (!s.done) allDone = false;
            if (!s.started || s.alpha <= 0) return;
            const rect = rowRect(app, rowId);
            if (!rect) return;

            // A faint hold over the whole row, so it reads as lit rather than
            // only striped where the band happens to be.
            g.rect(rect.left, rect.top, rect.width, rect.height);
            g.fill({ color: SYM_BLUE, alpha: s.alpha * 0.14 });

            // Pixi has no gradient fill, so the band is stepped by hand.
            const depth = rect.height * SHIELD_GEN.bandDepth;
            const head = rect.top + rect.height * s.band;
            for (let step = 0; step < SHIELD_GEN.steps; step += 1) {
                const f = step / SHIELD_GEN.steps;
                const y = head + depth * f;
                if (y < rect.top - depth || y > rect.top + rect.height) continue;
                const top = Math.max(rect.top, y);
                const bottom = Math.min(rect.top + rect.height, y + depth / SHIELD_GEN.steps);
                if (bottom <= top) continue;
                g.rect(rect.left, top, rect.width, bottom - top);
                g.fill({ color: SYM_PALE, alpha: s.alpha * 0.5 * (1 - f) });
            }

            g.rect(rect.left, rect.top, rect.width, rect.height);
            g.stroke({ width: 2, color: SYM_BLUE, alpha: s.alpha * 0.7 });
        });

        return allDone;
    }

    function drawPort(entry, delta) {
        entry.elapsed += delta;
        const s = teleportSample(entry.elapsed, entry.from, entry.to || entry.from);
        if (s.done) return true;

        // The hand is where the card lands; resolve it once and keep it.
        if (!entry.to) entry.to = handAnchor(app, entry.playerNum) || entry.from;

        const w = entry.size.width * s.scale;
        const h = entry.size.height * s.scale;

        for (const ghost of s.ghosts) {
            if (ghost.alpha <= 0) continue;
            g.rect(ghost.x - w / 2, ghost.y - h / 2, w, h);
            g.fill({ color: SYM_BLUE, alpha: ghost.alpha * 0.35 });
        }

        g.rect(s.x - w / 2, s.y - h / 2, w, h);
        g.fill({ color: SYM_PALE, alpha: s.alpha * 0.4 });
        g.rect(s.x - w / 2, s.y - h / 2, w, h);
        g.stroke({ width: 2, color: SYM_BLUE, alpha: s.alpha });

        // A ring closing at the origin, where the hero left the board.
        if (s.t < 0.5) {
            const close = s.t / 0.5;
            g.circle(entry.from.x, entry.from.y, Math.max(0, entry.size.width * 0.6 * (1 - close)));
            g.stroke({ width: 3, color: PALETTE.white, alpha: 1 - close });
        }
        return false;
    }

    const tick = () => {
        const delta = app.ticker.deltaMS || 16;
        g.clear();

        const sweep = (list, draw) => {
            if (!list.length) return list;
            const done = list.filter((e) => draw(e, delta));
            return done.length ? list.filter((e) => !done.includes(e)) : list;
        };

        washes = sweep(washes, drawWash);
        ports = sweep(ports, drawPort);
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests. */
        activeWashes: () => washes.length,
        activePorts: () => ports.length,
        washMs: shieldGenTotalMs(3),
        portMs: TELEPORT.ms,
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            washes = [];
            ports = [];
        },
    };
}

export default createSymmetraFx;
