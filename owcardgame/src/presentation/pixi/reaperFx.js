import { Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import blossomUrl from '../../assets/deathblossom.png';
import { PELLET, blossomSample, pelletSample } from './fxMath';
import { BLOSSOM, PALETTE } from './fxConfig';
import { cardAnchor, rowRect } from './anchors';

const PELLET_COLOR = PALETTE.neutral;
const PELLET_HOT = PALETTE.white;

async function loadBlossom() {
    try {
        return Assets.get(blossomUrl) || (await Assets.load(blossomUrl));
    } catch {
        return Texture.WHITE;
    }
}

/**
 * Reaper.
 *
 *  - Shotgun sprays: a cone of pellets that widens with distance and lands
 *    scattered around the target, rather than one projectile.
 *  - Death Blossom: deathblossom.png spinning at the centre of the enemy's
 *    middle row while the ultimate ticks damage out beneath it.
 */
export function createReaperFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const pellets = new Graphics();
    root.addChild(pellets);

    /** @type {Array<{from: object, to: object, elapsed: number}>} */
    let sprays = [];
    let blossom = null; // { rowId, sprite, elapsed, closing }
    let texture = null;

    async function showBlossom(rowId) {
        if (!rowId) return;
        if (!texture) texture = await loadBlossom();

        if (blossom?.sprite && !blossom.sprite.destroyed) blossom.sprite.destroy();
        const sprite = new Sprite(texture);
        sprite.anchor.set(0.5);
        root.addChild(sprite);
        blossom = { rowId, sprite, elapsed: 0, closing: false };
    }

    function hideBlossom() {
        if (!blossom) return;
        blossom.closing = true;
        blossom.elapsed = 0;
    }

    const unsub = effectsBus.subscribe((ev) => {
        if (ev?.type === 'fx:pellets') {
            const from = cardAnchor(app, ev.payload?.fromCardId);
            const to = cardAnchor(app, ev.payload?.toCardId);
            if (from && to) sprays.push({ from, to, elapsed: 0 });
            return;
        }
        if (ev?.type === 'fx:deathBlossom') {
            if (ev.payload?.on === false) hideBlossom();
            else showBlossom(ev.payload?.rowId);
        }
    });

    const tick = () => {
        const delta = app.ticker.deltaMS || 16;

        // --- shotgun sprays ---------------------------------------------------
        if (sprays.length) {
            const finished = [];
            pellets.clear();

            for (const spray of sprays) {
                spray.elapsed += delta;
                let allDone = true;

                for (let i = 0; i < PELLET.count; i += 1) {
                    const s = pelletSample(spray.elapsed, i, spray.from, spray.to);
                    if (!s.done) allDone = false;
                    if (s.visible) {
                        pellets.circle(s.x, s.y, s.radius);
                        pellets.fill({ color: PELLET_COLOR, alpha: 0.9 });
                        pellets.circle(s.x, s.y, s.radius * 0.45);
                        pellets.fill({ color: PELLET_HOT, alpha: 0.95 });
                    } else if (s.sparkT > 0 && s.sparkT < 1) {
                        pellets.circle(s.x, s.y, 1.5 + 4 * s.sparkT);
                        pellets.stroke({ width: 1, color: PELLET_HOT, alpha: 1 - s.sparkT });
                    }
                }

                if (allDone) finished.push(spray);
            }

            if (finished.length) {
                sprays = sprays.filter((s) => !finished.includes(s));
                if (!sprays.length) pellets.clear();
            }
        }

        // --- death blossom ----------------------------------------------------
        if (!blossom?.sprite || blossom.sprite.destroyed) return;
        blossom.elapsed += delta;

        const rect = rowRect(app, blossom.rowId);
        if (!rect) {
            blossom.sprite.visible = false;
            return;
        }

        const s = blossomSample(blossom.elapsed, blossom.closing);
        if (s.gone) {
            blossom.sprite.destroy();
            blossom = null;
            return;
        }

        // Sized off the row's height so it reads as covering the centre.
        const size = rect.height * BLOSSOM.scale;
        const ratio = texture?.width ? texture.height / texture.width : 1;
        blossom.sprite.visible = true;
        blossom.sprite.width = size;
        blossom.sprite.height = size * ratio;
        blossom.sprite.position.set(rect.x, rect.y);
        blossom.sprite.rotation = s.rotation;
        blossom.sprite.alpha = s.alpha;
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests. */
        activeSprays: () => sprays.length,
        hasBlossom: () => blossom !== null,
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            sprays = [];
            blossom = null;
        },
    };
}

export default createReaperFx;
