import { Container, Graphics } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import {
    PARTICLE_BEAM,
    ZARYA_ORB,
    particleBeamSample,
    particleBeamTotalMs,
    zaryaArcPoints,
    zaryaOrbSample,
} from './fxMath';
import { cardAnchor, cardRect } from './anchors';

const ZARYA_PINK = 0xff5ec4;
const ZARYA_VIOLET = 0x9d6bff;
const ZARYA_CORE = 0xffd6f2;

/**
 * Zarya.
 *
 *  - Projected Barrier: a crackling orb snaps around whoever holds the tokens.
 *  - Particle Cannon: an orb settles on every target, then each is blasted in
 *    turn, so the shot reads as gather-then-resolve rather than one flash.
 */
export function createZaryaFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const g = new Graphics();
    root.addChild(g);

    let orbs = [];
    let cannons = [];

    const unsub = effectsBus.subscribe((ev) => {
        const p = ev?.payload || {};
        if (ev?.type === 'fx:zaryaOrb') {
            if (p.cardId) orbs.push({ cardId: p.cardId, at: null, elapsed: 0 });
        } else if (ev?.type === 'fx:particleBeam') {
            const targets = (p.targetCardIds || []).map((cardId) => ({ cardId, at: null }));
            if (targets.length) {
                cannons.push({ fromCardId: p.fromCardId, targets, elapsed: 0 });
            }
        }
    });

    /** Pinned on first resolve: a blasted target may not survive the shot. */
    function pin(entry) {
        if (!entry.at) entry.at = cardAnchor(app, entry.cardId) || null;
        return entry.at;
    }

    function drawOrb(entry, delta) {
        entry.elapsed += delta;
        const s = zaryaOrbSample(entry.elapsed);
        if (s.done) return true;

        // The barrier sits on its holder, who may die under it — so fall back
        // to the pinned spot once the card is gone.
        const pinned = pin(entry);
        const rect = cardRect(app, entry.cardId);
        const at = rect || pinned;
        if (!at) return false;
        const radius = Math.max(rect?.width || 90, rect?.height || 120) * ZARYA_ORB.radius * s.scale;

        g.circle(at.x, at.y, radius);
        g.fill({ color: ZARYA_VIOLET, alpha: s.alpha * 0.22 });
        g.circle(at.x, at.y, radius);
        g.stroke({ width: 3, color: ZARYA_PINK, alpha: s.alpha * 0.85 });

        // Arcs snapping around the rim, re-rolled in steps rather than crawling.
        for (let i = 0; i < ZARYA_ORB.arcs; i += 1) {
            const points = zaryaArcPoints(at, radius, i, entry.elapsed);
            if (points.length < 2) continue;
            g.moveTo(points[0].x, points[0].y);
            for (let j = 1; j < points.length; j += 1) g.lineTo(points[j].x, points[j].y);
            g.stroke({ width: 2, color: ZARYA_CORE, alpha: s.alpha * s.flash });
        }
        return false;
    }

    function drawCannon(entry, delta) {
        entry.elapsed += delta;
        const count = entry.targets.length;
        // Zarya stays put, so her anchor can be read fresh each frame.
        const from = cardAnchor(app, entry.fromCardId);
        let allDone = true;

        entry.targets.forEach((target, i) => {
            const s = particleBeamSample(entry.elapsed, i, count);
            if (!s.done) allDone = false;
            const at = pin(target);
            if (!at) return;

            if (s.orbAlpha > 0) {
                g.circle(at.x, at.y, s.orbRadius);
                g.fill({ color: ZARYA_VIOLET, alpha: s.orbAlpha * 0.45 });
                g.circle(at.x, at.y, s.orbRadius);
                g.stroke({ width: 2, color: ZARYA_PINK, alpha: s.orbAlpha });
                g.circle(at.x, at.y, s.orbRadius * 0.4);
                g.fill({ color: ZARYA_CORE, alpha: s.orbAlpha * 0.9 });
            }

            if (!s.blasting || !from) return;

            // The beam wipes out from Zarya and bursts on the orb.
            const tip = {
                x: from.x + (at.x - from.x) * s.beamReach,
                y: from.y + (at.y - from.y) * s.beamReach,
            };
            g.moveTo(from.x, from.y);
            g.lineTo(tip.x, tip.y);
            g.stroke({ width: PARTICLE_BEAM.beamWidth, color: ZARYA_VIOLET, alpha: s.beamAlpha * 0.5 });
            g.moveTo(from.x, from.y);
            g.lineTo(tip.x, tip.y);
            g.stroke({ width: PARTICLE_BEAM.beamWidth * 0.4, color: ZARYA_CORE, alpha: s.beamAlpha });

            g.circle(at.x, at.y, s.orbRadius * (1 + s.blastT * 2.2));
            g.stroke({ width: 3, color: ZARYA_PINK, alpha: (1 - s.blastT) * 0.9 });
        });

        return allDone;
    }

    const tick = () => {
        const delta = app.ticker.deltaMS || 16;
        g.clear();

        const sweep = (list, draw) => {
            if (!list.length) return list;
            const done = list.filter((e) => draw(e, delta));
            return done.length ? list.filter((e) => !done.includes(e)) : list;
        };

        orbs = sweep(orbs, drawOrb);
        cannons = sweep(cannons, drawCannon);
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests. */
        activeOrbs: () => orbs.length,
        activeCannons: () => cannons.length,
        orbMs: ZARYA_ORB.ms,
        cannonMs: particleBeamTotalMs(3),
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            orbs = [];
            cannons = [];
        },
    };
}

export default createZaryaFx;
