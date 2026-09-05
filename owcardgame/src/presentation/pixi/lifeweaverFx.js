import { Container, Graphics } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import { lifeGripSample, treeOfLifeSample } from './fxMath';
import { cardAnchor, cardRect } from './anchors';

const PETAL = 0xff8fb8;
const LEAF = 0x5ce68a;
const HALO = 0xfff4c2;

/**
 * Lifeweaver.
 *
 *  - Life Grip: a petal ribbon from the wounded ally into him, then the
 *    shared push slide carries the card.
 *  - Tree of Life: a blossom opening on each hero the tree touches.
 */
export function createLifeweaverFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const g = new Graphics();
    root.addChild(g);

    let grips = [];
    let trees = [];

    const unsub = effectsBus.subscribe((ev) => {
        const p = ev?.payload || {};
        if (ev?.type === 'fx:lifeGrip') {
            const from = cardAnchor(app, p.fromCardId);
            const to = cardAnchor(app, p.toCardId);
            if (from && to) grips.push({ from, to, elapsed: 0 });
        } else if (ev?.type === 'fx:treeOfLife') {
            for (const cardId of p.cardIds || []) {
                if (cardId) trees.push({ cardId, elapsed: 0 });
            }
        }
    });

    function drawGrip(entry, delta) {
        entry.elapsed += delta;
        const s = lifeGripSample(entry.elapsed, entry.from, entry.to);
        if (s.done) return true;

        g.moveTo(s.from.x, s.from.y);
        g.quadraticCurveTo(
            (s.from.x + s.head.x) / 2 + (s.head.y - s.from.y) * 0.12,
            (s.from.y + s.head.y) / 2 - (s.head.x - s.from.x) * 0.12,
            s.head.x,
            s.head.y,
        );
        g.stroke({ width: s.width, color: PETAL, alpha: s.alpha * 0.7 });
        g.moveTo(s.from.x, s.from.y);
        g.quadraticCurveTo(
            (s.from.x + s.head.x) / 2 + (s.head.y - s.from.y) * 0.12,
            (s.from.y + s.head.y) / 2 - (s.head.x - s.from.x) * 0.12,
            s.head.x,
            s.head.y,
        );
        g.stroke({ width: s.width * 0.4, color: HALO, alpha: s.alpha });

        for (const petal of s.petals) {
            g.circle(petal.x, petal.y, petal.radius);
            g.fill({ color: PETAL, alpha: petal.alpha });
        }
        g.circle(s.head.x, s.head.y, 6);
        g.fill({ color: HALO, alpha: s.alpha });
        return false;
    }

    function drawTree(entry, delta) {
        entry.elapsed += delta;
        const s = treeOfLifeSample(entry.elapsed);
        if (s.done) return true;
        const rect = cardRect(app, entry.cardId);
        if (!rect) return false;
        const radius = Math.max(rect.width, rect.height) * s.open;

        g.circle(rect.x, rect.y, radius * 0.55);
        g.fill({ color: LEAF, alpha: s.alpha * 0.22 });

        for (const petal of s.petals) {
            const x = rect.x + Math.cos(petal.angle) * radius * petal.reach;
            const y = rect.y + Math.sin(petal.angle) * radius * petal.reach;
            g.ellipse(x, y, 7 * s.open, 12 * s.open);
            g.fill({ color: PETAL, alpha: petal.alpha });
        }

        g.circle(rect.x, rect.y, 8 * s.open);
        g.fill({ color: HALO, alpha: s.alpha * 0.9 });
        g.moveTo(rect.x, rect.y + radius * s.trunk);
        g.lineTo(rect.x, rect.y);
        g.stroke({ width: 3, color: 0x6b3a22, alpha: s.alpha * 0.8 });
        return false;
    }

    const tick = () => {
        if (!grips.length && !trees.length) return;
        const delta = app.ticker.deltaMS || 16;
        g.clear();
        if (grips.length) {
            const done = grips.filter((e) => drawGrip(e, delta));
            if (done.length) grips = grips.filter((e) => !done.includes(e));
        }
        if (trees.length) {
            const done = trees.filter((e) => drawTree(e, delta));
            if (done.length) trees = trees.filter((e) => !done.includes(e));
        }
        if (!grips.length && !trees.length) g.clear();
    };

    app.ticker.add(tick);

    return {
        activeGrips: () => grips.length,
        activeTrees: () => trees.length,
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            grips = [];
            trees = [];
        },
    };
}

export default createLifeweaverFx;
