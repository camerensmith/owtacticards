import { Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import mercyRezUrl from '../../assets/mercyrez.png';
import {
    BESTOW,
    REZ,
    bestowMotes,
    bestowSample,
    rezAuraRays,
    rezAuraSample,
    rezFlashSample,
    wingsSample,
} from './fxMath';
import { PALETTE } from './fxConfig';
import { cardRect } from './anchors';

export const HEAL_GOLD = 0xffd24a;
export const BOOST_BLUE = 0x1f4fd8;
const HALO = 0xfff4c2;

async function load(url) {
    try {
        return Assets.get(url) || (await Assets.load(url));
    } catch {
        return Texture.WHITE;
    }
}

/**
 * Mercy.
 *
 *  - Caduceus beam: light settling onto the target — gold to heal, deep blue
 *    to boost. One shape, two moods.
 *  - Resurrection: an ambient light holds around Mercy for as long as the
 *    choice takes, then the returned hero washes back in under a slow flash
 *    and both of them are given wings.
 */
export function createMercyFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const aura = new Graphics();
    const g = new Graphics();
    const wings = new Container();
    root.addChild(aura);
    root.addChild(g);
    root.addChild(wings);

    let elapsed = 0;
    let bestows = [];
    let flashes = [];
    /** cardId -> ms, for as long as its aura is held open. */
    const auras = new Map();
    let wingPairs = [];
    let wingTexture = null;

    async function addWings(cardIds) {
        if (!wingTexture) wingTexture = await load(mercyRezUrl);
        const ratio = wingTexture?.width ? wingTexture.height / wingTexture.width : 0.5;
        for (const cardId of cardIds) {
            if (!cardId) continue;
            const sprite = new Sprite(wingTexture);
            sprite.anchor.set(0.5);
            sprite.visible = false;
            wings.addChild(sprite);
            wingPairs.push({ cardId, sprite, ratio, at: null, size: 0, elapsed: 0 });
        }
    }

    const unsub = effectsBus.subscribe((ev) => {
        const p = ev?.payload || {};
        if (ev?.type === 'fx:bestow') {
            if (p.cardId) bestows.push({ cardId: p.cardId, color: p.color ?? HEAL_GOLD, elapsed: 0 });
        } else if (ev?.type === 'fx:rezAura') {
            if (!p.cardId) return;
            // Toggled, not timed: held open until the hero actually lands.
            if (p.on === false) auras.delete(p.cardId);
            else if (!auras.has(p.cardId)) auras.set(p.cardId, 0);
        } else if (ev?.type === 'fx:rezReturn') {
            if (p.cardId) flashes.push({ cardId: p.cardId, at: null, size: 0, elapsed: 0 });
            addWings([p.mercyCardId, p.cardId]);
        }
    });

    function drawBestow(entry, delta) {
        entry.elapsed += delta;
        const s = bestowSample(entry.elapsed);
        if (s.done) return true;

        // Re-resolved each frame: the target stays put, and if it leaves the
        // board the light simply stops.
        const rect = cardRect(app, entry.cardId);
        if (!rect) return false;
        const width = rect.width * BESTOW.columnWidth;

        if (s.columnAlpha > 0) {
            const top = rect.y - rect.height * s.columnHeight;
            // Tapered column, wide where it meets the card.
            g.poly([
                rect.x - width * 0.35, top,
                rect.x + width * 0.35, top,
                rect.x + width, rect.y,
                rect.x - width, rect.y,
            ]);
            g.fill({ color: entry.color, alpha: s.columnAlpha * 0.35 });
        }

        for (const mote of bestowMotes(entry.elapsed, rect.height)) {
            if (mote.alpha <= 0) continue;
            g.circle(rect.x + mote.x, rect.y + mote.y, mote.radius);
            g.fill({ color: HALO, alpha: mote.alpha });
        }

        if (s.glow > 0) {
            g.circle(rect.x, rect.y, Math.max(rect.width, rect.height) * 0.5);
            g.fill({ color: entry.color, alpha: s.glow * 0.22 });
        }
        if (s.ringAlpha > 0) {
            g.circle(rect.x, rect.y, Math.max(rect.width, rect.height) * s.ringReach);
            g.stroke({ width: 3, color: entry.color, alpha: s.ringAlpha });
        }
        return false;
    }

    /** Held open while a resurrection is being chosen. */
    function drawAuras(delta) {
        for (const [cardId, age] of auras) {
            auras.set(cardId, age + delta);
            const rect = cardRect(app, cardId);
            if (!rect) continue;

            const s = rezAuraSample(age + delta);
            const radius = Math.max(rect.width, rect.height) * s.reach;
            aura.circle(rect.x, rect.y, radius);
            aura.fill({ color: HEAL_GOLD, alpha: s.alpha * 0.16 });
            aura.circle(rect.x, rect.y, radius * 0.62);
            aura.fill({ color: HALO, alpha: s.alpha * 0.18 });

            for (const ray of rezAuraRays(s.spin)) {
                const inner = radius * 0.35;
                const outer = radius * ray.scale;
                aura.moveTo(
                    rect.x + Math.cos(ray.angle) * inner,
                    rect.y + Math.sin(ray.angle) * inner,
                );
                aura.lineTo(
                    rect.x + Math.cos(ray.angle) * outer,
                    rect.y + Math.sin(ray.angle) * outer,
                );
            }
            aura.stroke({ width: 3, color: HALO, alpha: s.alpha * 0.55 });
        }
    }

    function drawFlash(entry, delta) {
        entry.elapsed += delta;
        const s = rezFlashSample(entry.elapsed);
        if (s.done) return true;

        // Pinned: the card is being placed as this starts.
        const rect = cardRect(app, entry.cardId);
        if (rect) entry.at = rect;
        if (!entry.at) return false;
        const at = entry.at;

        g.roundRect(at.left, at.top, at.width, at.height, 8);
        g.fill({ color: HALO, alpha: s.alpha * 0.5 });

        // A band of light travelling down the card as they settle in.
        const bandHeight = at.height * 0.28;
        const bandTop = at.top + at.height * s.sweep - bandHeight / 2;
        const top = Math.max(at.top, bandTop);
        const bottom = Math.min(at.top + at.height, bandTop + bandHeight);
        if (bottom > top) {
            g.rect(at.left, top, at.width, bottom - top);
            g.fill({ color: PALETTE.white, alpha: s.alpha * 0.55 });
        }

        g.roundRect(at.left, at.top, at.width, at.height, 8);
        g.stroke({ width: 2, color: HEAL_GOLD, alpha: s.alpha });
        return false;
    }

    function drawWings(entry, delta) {
        entry.elapsed += delta;
        const s = wingsSample(entry.elapsed);
        if (s.done) return true;

        const rect = cardRect(app, entry.cardId);
        if (rect) {
            entry.at = { x: rect.x, y: rect.y };
            entry.size = rect.width;
        }
        if (!entry.at) return false;

        entry.sprite.visible = true;
        entry.sprite.alpha = s.alpha;
        entry.sprite.width = entry.size * s.scale;
        entry.sprite.height = entry.size * s.scale * entry.ratio;
        entry.sprite.position.set(entry.at.x, entry.at.y + s.lift);
        return false;
    }

    const tick = () => {
        const delta = app.ticker.deltaMS || 16;
        elapsed += delta;

        aura.clear();
        drawAuras(delta);

        g.clear();
        const sweep = (list, draw, cleanup) => {
            if (!list.length) return list;
            const done = list.filter((e) => draw(e, delta));
            if (!done.length) return list;
            if (cleanup) done.forEach(cleanup);
            return list.filter((e) => !done.includes(e));
        };

        bestows = sweep(bestows, drawBestow);
        flashes = sweep(flashes, drawFlash);
        wingPairs = sweep(wingPairs, drawWings, (e) => {
            if (!e.sprite.destroyed) e.sprite.destroy();
        });
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests. */
        activeBestows: () => bestows.length,
        activeAuras: () => auras.size,
        activeWings: () => wingPairs.length,
        bestowMs: BESTOW.ms,
        wingsMs: REZ.wingsMs,
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            bestows = [];
            flashes = [];
            wingPairs = [];
            auras.clear();
        },
    };
}

export default createMercyFx;
