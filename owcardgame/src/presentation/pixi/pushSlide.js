import { Assets, Container, Sprite, Texture } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import { heroCardImages } from '../../assets/imageImports';
import { PUSH, clamp01, pushSample } from './fxMath';
import { cardAnchor, rowAnchor } from './anchors';

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
 * Forced movement between rows (Cyclo, Fika, Wuyang).
 *
 * Without this the card simply appears in its new row, so the board changes with
 * no explanation. A ghost of the card arcs from the old row to the new one while
 * the reducer commits underneath.
 */
export function createPushSlide(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    /** @type {Array<{sprite: Sprite, from: object, to: object, elapsed: number, baseW: number, baseH: number}>} */
    let slides = [];

    async function start(payload) {
        const { cardId, fromRowId, toRowId } = payload || {};
        if (!cardId || !toRowId) return;

        // The card may already have been moved in state, so prefer its live
        // position and fall back to the row it came from.
        const from = cardAnchor(app, cardId) || rowAnchor(app, fromRowId);
        const to = rowAnchor(app, toRowId);
        if (!from || !to) return;

        const tex = await textureFor(cardId);
        const sprite = new Sprite(tex);
        sprite.anchor.set(0.5);
        const baseW = from.width || 64;
        const baseH = from.height || 90;
        sprite.width = baseW;
        sprite.height = baseH;
        sprite.position.set(from.x, from.y);
        root.addChild(sprite);

        slides.push({ sprite, from, to, elapsed: 0, baseW, baseH });
    }

    const unsub = effectsBus.subscribe((ev) => {
        if (ev?.type === 'fx:push') start(ev.payload);
    });

    const tick = () => {
        if (!slides.length) return;
        const delta = app.ticker.deltaMS || 16;
        const finished = [];

        for (const slide of slides) {
            slide.elapsed += delta;
            const t = clamp01(slide.elapsed / PUSH.travelMs);
            const s = pushSample(t, slide.from, slide.to);
            slide.sprite.position.set(s.x, s.y);
            slide.sprite.width = slide.baseW * s.scale;
            slide.sprite.height = slide.baseH * s.scale;
            // Hand off to the real card as it lands.
            slide.sprite.alpha = t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1;
            if (t >= 1) finished.push(slide);
        }

        if (finished.length) {
            for (const slide of finished) {
                if (!slide.sprite.destroyed) slide.sprite.destroy();
            }
            slides = slides.filter((s) => !finished.includes(s));
        }
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests. */
        activeSlides: () => slides.length,
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            slides = [];
        },
    };
}

export default createPushSlide;
