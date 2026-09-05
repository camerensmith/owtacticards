import { Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import { heroCardImages } from '../../assets/imageImports';
import {
    METEOR,
    PUNCH,
    RIFLE,
    beamQuad,
    meteorCracks,
    meteorDebris,
    meteorRipple,
    meteorSample,
    punchSample,
    punchTotalMs,
    rifleSample,
} from './fxMath';
import { PALETTE } from './fxConfig';
import { cardAnchor, cardRect } from './anchors';

const FIST = PALETTE.fire;
const FIST_HOT = PALETTE.hot;
const SHOCK = PALETTE.amberPale;
const CRACK_DARK = 0x3a2a1c;
const RIFLE_RED = 0xff3b30;

async function textureFor(cardId) {
    const heroId = typeof cardId === 'string' ? cardId.slice(1) : '';
    const url = heroCardImages[heroId] || heroCardImages['card-back'];
    if (!url) return Texture.WHITE;
    try {
        return Assets.get(url) || (await Assets.load(url));
    } catch {
        return Texture.WHITE;
    }
}

/**
 * Doomfist and Emre.
 *
 *  - Rocket Punch: a heavy streak that snaps out, connects, and withdraws.
 *  - Meteor Strike: Doomfist climbs off the board, drops onto the target with a
 *    ripple, then flies back to his slot.
 *  - Synth Rifle / Override Protocol: thin red shots.
 */
export function createDoomfistFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const g = new Graphics();
    const ghosts = new Container();
    root.addChild(g);
    root.addChild(ghosts);

    /** @type {Array<{fromId: string, toId: string, elapsed: number}>} */
    let punches = [];
    /** @type {Array<{sprite: Sprite, from: object, to: object, elapsed: number}>} */
    let meteors = [];
    /** @type {Array<{fromId: string, toId: string, elapsed: number, delay: number}>} */
    let shots = [];

    async function startMeteor(payload) {
        const from = cardRect(app, payload?.cardId);
        const to = cardRect(app, payload?.targetCardId);
        if (!from || !to) return;

        const sprite = new Sprite(await textureFor(payload.cardId));
        sprite.anchor.set(0.5);
        sprite.width = from.width;
        sprite.height = from.height;
        sprite.position.set(from.x, from.y);
        ghosts.addChild(sprite);
        meteors.push({ sprite, from, to, elapsed: 0 });
    }

    const unsub = effectsBus.subscribe((ev) => {
        if (ev?.type === 'fx:punch') {
            punches.push({
                fromId: ev.payload?.fromCardId,
                toId: ev.payload?.toCardId,
                elapsed: 0,
            });
            return;
        }
        if (ev?.type === 'fx:meteor') {
            startMeteor(ev.payload);
            return;
        }
        if (ev?.type === 'fx:rifle') {
            shots.push({
                fromId: ev.payload?.fromCardId,
                toId: ev.payload?.toCardId,
                elapsed: 0,
                delay: ev.payload?.delayMs || 0,
            });
        }
    });

    function drawPunch(entry, delta) {
        entry.elapsed += delta;
        const s = punchSample(entry.elapsed);
        if (s.done) return true;

        const from = cardAnchor(app, entry.fromId);
        const to = cardAnchor(app, entry.toId);
        if (!from || !to) return false;
        const head = { x: from.x + (to.x - from.x) * s.reach, y: from.y + (to.y - from.y) * s.reach };
        const tail = { x: from.x + (to.x - from.x) * s.tail, y: from.y + (to.y - from.y) * s.tail };

        const shaft = beamQuad(tail, head, PUNCH.thickness, 1);
        g.poly(shaft.points);
        g.fill({ color: FIST, alpha: s.alpha * 0.85 });

        // Arrow head at the leading end: the "punch" reads as directional.
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const size = PUNCH.headSize;
        g.poly([
            head.x + Math.cos(angle) * size, head.y + Math.sin(angle) * size,
            head.x + Math.cos(angle + 2.4) * size, head.y + Math.sin(angle + 2.4) * size,
            head.x + Math.cos(angle - 2.4) * size, head.y + Math.sin(angle - 2.4) * size,
        ]);
        g.fill({ color: FIST_HOT, alpha: s.alpha });
        return false;
    }

    function drawMeteor(entry, delta) {
        entry.elapsed += delta;
        const s = meteorSample(entry.elapsed);
        const { sprite, from, to } = entry;

        if (s.done) return true;

        const radius = Math.max(to.width, to.height);

        // The shadow gathering under him: the impact is only as strong as the
        // warning that precedes it.
        if (s.shadow > 0 && (s.phase === 'hang' || s.phase === 'slam')) {
            const r = radius * 0.55 * s.shadow;
            g.ellipse(to.x, to.y, r, r * 0.45);
            g.fill({ color: 0x000000, alpha: 0.34 * s.shadow });
            g.ellipse(to.x, to.y, r, r * 0.45);
            g.stroke({ width: 2, color: SHOCK, alpha: 0.5 * s.hangT });
        }

        if (s.phase === 'launch') {
            sprite.visible = true;
            sprite.alpha = s.alpha;
            sprite.position.set(from.x, from.y - from.height * s.climb);
        } else if (s.phase === 'hang') {
            sprite.visible = false;
        } else if (s.phase === 'slam') {
            sprite.visible = true;
            sprite.alpha = 1;
            const y = to.y - to.height * s.climb;
            sprite.position.set(to.x, y);
            // A streak behind him, so the drop reads as speed rather than a slide.
            g.poly([
                to.x - to.width * 0.18, y,
                to.x + to.width * 0.18, y,
                to.x + to.width * 0.06, y - to.height * 1.6 * s.slamT,
                to.x - to.width * 0.06, y - to.height * 1.6 * s.slamT,
            ]);
            g.fill({ color: PALETTE.white, alpha: 0.28 * s.slamT });
        } else if (s.phase === 'ripple') {
            sprite.visible = true;
            sprite.position.set(to.x, to.y);

            // Cracks torn through the ground under the crater.
            for (const crack of meteorCracks(s.rippleT, radius)) {
                if (crack.alpha <= 0 || crack.points.length < 2) continue;
                g.moveTo(to.x + crack.points[0].x, to.y + crack.points[0].y);
                for (let i = 1; i < crack.points.length; i += 1) {
                    g.lineTo(to.x + crack.points[i].x, to.y + crack.points[i].y);
                }
                g.stroke({ width: 3, color: CRACK_DARK, alpha: crack.alpha });
            }

            for (let i = 0; i < METEOR.rippleRings; i += 1) {
                const ring = meteorRipple(i, s.rippleT, radius);
                if (!ring.visible) continue;
                g.circle(to.x, to.y, ring.radius);
                g.stroke({ width: 6 - i, color: SHOCK, alpha: ring.alpha });
            }

            // Chunks thrown up and falling back.
            for (const chunk of meteorDebris(s.rippleT, radius)) {
                if (chunk.alpha <= 0) continue;
                g.rect(
                    to.x + chunk.x - chunk.size / 2,
                    to.y + chunk.y - chunk.size / 2,
                    chunk.size,
                    chunk.size,
                );
                g.fill({ color: CRACK_DARK, alpha: chunk.alpha });
            }

            // The white-out at contact.
            if (s.flash > 0) {
                g.circle(to.x, to.y, radius * (0.5 + 1.4 * (1 - s.flash)));
                g.fill({ color: PALETTE.white, alpha: s.flash * 0.75 });
            }
        } else {
            // Flies home along a lifted arc.
            sprite.visible = true;
            const t = s.progress;
            sprite.position.set(
                to.x + (from.x - to.x) * t,
                to.y + (from.y - to.y) * t - Math.sin(t * Math.PI) * from.height,
            );
        }
        return false;
    }

    function drawShot(entry, delta) {
        entry.elapsed += delta;
        if (entry.elapsed < entry.delay) return false;

        const s = rifleSample(entry.elapsed - entry.delay);
        if (s.done) return true;

        const width = RIFLE.width * s.width;
        if (width <= 0 || s.alpha <= 0) return false;

        // Resolved now, not at publish time: the caster may still have been in
        // the hand when the ability fired.
        const from = cardAnchor(app, entry.fromId);
        const to = cardAnchor(app, entry.toId);
        if (!from || !to) return false;

        const shot = beamQuad(from, to, width, s.reach);
        g.poly(shot.points);
        g.fill({ color: RIFLE_RED, alpha: s.alpha * 0.9 });
        g.poly(beamQuad(from, to, width * 0.35, s.reach).points);
        g.fill({ color: PALETTE.white, alpha: s.alpha * 0.8 });
        return false;
    }

    const tick = () => {
        const delta = app.ticker.deltaMS || 16;
        g.clear();

        if (punches.length) {
            const done = punches.filter((e) => drawPunch(e, delta));
            if (done.length) punches = punches.filter((p) => !done.includes(p));
        }

        if (meteors.length) {
            const done = meteors.filter((e) => drawMeteor(e, delta));
            if (done.length) {
                for (const entry of done) {
                    if (!entry.sprite.destroyed) entry.sprite.destroy();
                }
                meteors = meteors.filter((m) => !done.includes(m));
            }
        }

        if (shots.length) {
            const done = shots.filter((e) => drawShot(e, delta));
            if (done.length) shots = shots.filter((s) => !done.includes(s));
        }
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests. */
        activePunches: () => punches.length,
        activeMeteors: () => meteors.length,
        activeShots: () => shots.length,
        punchMs: punchTotalMs(),
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            punches = [];
            meteors = [];
            shots = [];
        },
    };
}

export default createDoomfistFx;
