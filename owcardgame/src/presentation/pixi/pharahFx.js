import { Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import { heroCardImages } from '../../assets/imageImports';
import shurikenUrl from '../../assets/shuriken.png';
import {
    BARRAGE,
    SHURIKEN,
    SLICE,
    barrageLiftSample,
    barrageRocketSample,
    barrageTotalMs,
    beamQuad,
    concussiveSample,
    emberOffsets,
    impactFlashSample,
    shurikenSample,
    sliceSample,
} from './fxMath';
import { PALETTE } from './fxConfig';
import { cardAnchor, cardRect } from './anchors';

const RING = 0x6fc9ff;
const ROCKET_BODY = PALETTE.neutral;
const FLAME = PALETTE.fire;
const SMOKE = PALETTE.steel;
const LOCK = PALETTE.red;
const BLADE = 0x8ef2c4;

async function load(url) {
    try {
        return Assets.get(url) || (await Assets.load(url));
    } catch {
        return Texture.WHITE;
    }
}

async function cardTexture(cardId) {
    const heroId = typeof cardId === 'string' ? cardId.slice(1) : '';
    return load(heroCardImages[heroId] || heroCardImages['card-back']);
}

/**
 * Cache a target's position the first time it resolves.
 *
 * Effects aimed AT a card must not re-resolve every frame: a lethal hit removes
 * the card from the board, and the effect would then draw nothing for the rest
 * of its life. Effects originating FROM the caster do the opposite — they
 * re-resolve, because the caster may still be sliding into its row.
 */
function pinned(entry, key, resolve) {
    if (!entry[key]) entry[key] = resolve() || null;
    return entry[key];
}

/**
 * Pharah and Genji.
 *
 *  - Concussive Blast: a blue ring that lands short of the target and shoves.
 *  - Rocket Barrage: Pharah climbs, locks on, and salvos; each rocket trails
 *    smoke and bursts on arrival.
 *  - Shuriken: bounces down the column, striking each target in turn.
 *  - Dragon Blade: a single fast slice across the target.
 */
export function createPharahFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const g = new Graphics();
    const sprites = new Container();
    root.addChild(g);
    root.addChild(sprites);

    let rings = [];
    let barrages = [];
    let stars = [];
    let slices = [];
    let shurikenTex = null;

    async function startBarrage(payload) {
        const from = cardRect(app, payload?.cardId);
        if (!from || !(payload?.targetCardIds || []).length) return;
        const sprite = new Sprite(await cardTexture(payload.cardId));
        sprite.anchor.set(0.5);
        sprite.width = from.width;
        sprite.height = from.height;
        sprites.addChild(sprite);
        barrages.push({
            sprite,
            cardId: payload.cardId,
            targets: payload.targetCardIds,
            elapsed: 0,
        });
    }

    async function startShuriken(payload) {
        if (!(payload?.targetCardIds || []).length) return;
        if (!shurikenTex) shurikenTex = await load(shurikenUrl);
        const sprite = new Sprite(shurikenTex);
        sprite.anchor.set(0.5);
        const ratio = shurikenTex?.width ? shurikenTex.height / shurikenTex.width : 1;
        sprite.width = SHURIKEN.size;
        sprite.height = SHURIKEN.size * ratio;
        sprites.addChild(sprite);
        stars.push({
            sprite,
            fromId: payload.fromCardId,
            targets: payload.targetCardIds,
            elapsed: 0,
        });
    }

    const unsub = effectsBus.subscribe((ev) => {
        if (ev?.type === 'fx:concussive') {
            rings.push({ fromId: ev.payload?.fromCardId, toId: ev.payload?.toCardId, elapsed: 0 });
        } else if (ev?.type === 'fx:barrage') {
            startBarrage(ev.payload);
        } else if (ev?.type === 'fx:shuriken') {
            startShuriken(ev.payload);
        } else if (ev?.type === 'fx:slice') {
            slices.push({ cardId: ev.payload?.cardId, elapsed: 0 });
        }
    });

    function drawRing(entry, delta) {
        entry.elapsed += delta;
        const s = concussiveSample(entry.elapsed);
        if (s.done) return true;

        const from = cardAnchor(app, entry.fromId);
        const to = cardAnchor(app, entry.toId);
        if (!from || !to) return false;

        const x = from.x + (to.x - from.x) * s.reach;
        const y = from.y + (to.y - from.y) * s.reach;

        g.circle(x, y, s.radius);
        g.stroke({ width: s.flying ? 3 : 4, color: RING, alpha: s.alpha });
        if (s.flying) {
            g.circle(x, y, s.radius * 0.4);
            g.fill({ color: RING, alpha: 0.8 });
        }
        return false;
    }

    function drawBarrage(entry, delta) {
        entry.elapsed += delta;
        const origin = cardRect(app, entry.cardId);
        if (!origin) return true;

        const lift = barrageLiftSample(entry.elapsed, entry.targets.length);
        entry.sprite.visible = true;
        entry.sprite.position.set(origin.x, origin.y - origin.height * lift.lift);

        const launch = { x: origin.x, y: origin.y - origin.height * lift.lift };

        entry.pins = entry.pins || {};
        entry.targets.forEach((targetId, i) => {
            // Pinned: an earlier rocket may already have killed this one.
            if (!entry.pins[targetId]) entry.pins[targetId] = cardAnchor(app, targetId) || null;
            const target = entry.pins[targetId];
            if (!target) return;
            const s = barrageRocketSample(entry.elapsed, i);

            if (s.phase === 'lock') {
                // Reticle tightening onto the mark before the tubes open.
                const r = 26 - 14 * s.lockT;
                g.circle(target.x, target.y, r);
                g.stroke({ width: 2, color: LOCK, alpha: s.lockT });
                return;
            }
            if (s.phase === 'fly') {
                const hx = launch.x + (target.x - launch.x) * s.reach;
                const hy = launch.y + (target.y - launch.y) * s.reach;
                const angle = Math.atan2(target.y - launch.y, target.x - launch.x);

                for (let p = 1; p <= BARRAGE.smokeCount; p += 1) {
                    const q = s.reach - p * BARRAGE.smokeSpacing;
                    if (q <= 0) break;
                    const px = launch.x + (target.x - launch.x) * q;
                    const py = launch.y + (target.y - launch.y) * q;
                    const age = p / BARRAGE.smokeCount;
                    g.circle(px, py, 2 + age * 6);
                    g.fill({ color: SMOKE, alpha: (1 - age) * 0.4 });
                }

                const tail = {
                    x: hx - Math.cos(angle) * BARRAGE.length,
                    y: hy - Math.sin(angle) * BARRAGE.length,
                };
                g.poly(beamQuad(tail, { x: hx, y: hy }, BARRAGE.width, 1).points);
                g.fill({ color: ROCKET_BODY, alpha: 0.95 });
                g.circle(tail.x, tail.y, BARRAGE.width * 0.7);
                g.fill({ color: FLAME, alpha: 0.9 });
                return;
            }
            if (s.phase === 'burst' && s.burstT < 1) {
                const flash = impactFlashSample(s.burstT, 42);
                for (const ember of emberOffsets(6, flash.emberDistance)) {
                    g.circle(target.x + ember.x, target.y + ember.y, flash.emberRadius);
                    g.fill({ color: FLAME, alpha: flash.emberAlpha });
                }
                g.circle(target.x, target.y, flash.radius);
                g.stroke({ width: 3, color: FLAME, alpha: flash.alpha });
            }
        });

        return entry.elapsed >= barrageTotalMs(entry.targets.length);
    }

    function drawShuriken(entry, delta) {
        entry.elapsed += delta;
        const s = shurikenSample(entry.elapsed, entry.targets.length);

        // Pinned: targets struck earlier in the volley may already be gone.
        const stops = pinned(entry, 'stops', () => {
            const resolved = [cardAnchor(app, entry.fromId), ...entry.targets.map((id) => cardAnchor(app, id))]
                .filter(Boolean);
            return resolved.length >= 2 ? resolved : null;
        });
        if (!stops) return true;

        const from = stops[Math.min(s.index, stops.length - 2)];
        const to = stops[Math.min(s.index + 1, stops.length - 1)];

        entry.sprite.visible = !s.done;
        entry.sprite.rotation = s.rotation;
        entry.sprite.position.set(
            from.x + (to.x - from.x) * s.t,
            from.y + (to.y - from.y) * s.t - s.hop,
        );
        return s.done;
    }

    function drawSlice(entry, delta) {
        entry.elapsed += delta;
        const s = sliceSample(entry.elapsed);
        if (s.done) return true;

        // Pinned: Dragon Blade is lethal, so the card is gone within a frame.
        const rect = pinned(entry, 'rect', () => cardRect(app, entry.cardId));
        if (!rect) return false;

        const reach = Math.hypot(rect.width, rect.height) * SLICE.reach * 0.5;
        // A single diagonal stroke, drawn as far as the cut has travelled.
        const angle = -Math.PI / 4;
        const ax = rect.x - Math.cos(angle) * reach;
        const ay = rect.y - Math.sin(angle) * reach;
        const bx = ax + Math.cos(angle) * reach * 2 * s.cut;
        const by = ay + Math.sin(angle) * reach * 2 * s.cut;

        if (s.cut > 0) {
            g.moveTo(ax, ay);
            g.lineTo(bx, by);
            g.stroke({ width: SLICE.thickness, color: BLADE, alpha: s.alpha * 0.5 });
            g.moveTo(ax, ay);
            g.lineTo(bx, by);
            g.stroke({ width: SLICE.thickness * 0.35, color: PALETTE.white, alpha: s.alpha });
        } else {
            // Wind-up: the blade glints before it moves.
            g.circle(rect.x, rect.y, rect.width * 0.5);
            g.stroke({ width: 2, color: BLADE, alpha: s.alpha });
        }
        return false;
    }

    const tick = () => {
        const delta = app.ticker.deltaMS || 16;
        g.clear();

        const sweep = (list, draw, cleanup) => {
            if (!list.length) return list;
            const done = list.filter((e) => draw(e, delta));
            if (!done.length) return list;
            if (cleanup) done.forEach(cleanup);
            return list.filter((e) => !done.includes(e));
        };

        rings = sweep(rings, drawRing);
        slices = sweep(slices, drawSlice);
        barrages = sweep(barrages, drawBarrage, (e) => {
            if (!e.sprite.destroyed) e.sprite.destroy();
        });
        stars = sweep(stars, drawShuriken, (e) => {
            if (!e.sprite.destroyed) e.sprite.destroy();
        });
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests. */
        activeRings: () => rings.length,
        activeBarrages: () => barrages.length,
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            rings = [];
            barrages = [];
            stars = [];
            slices = [];
        },
    };
}

export default createPharahFx;
