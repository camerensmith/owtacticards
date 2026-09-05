import { Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import { playAudioByKey } from '../../assets/imageImports';
import riptireUrl from '../../assets/riptire.png';
import { RIPTIRE, emberOffsets, impactFlashSample, riptireSample } from './fxMath';
import { PALETTE } from './fxConfig';
import { cardAnchor, rowAnchor } from './anchors';

const FIRE = PALETTE.fire;
const CORE = PALETTE.hot;

async function loadTexture() {
    try {
        return Assets.get(riptireUrl) || (await Assets.load(riptireUrl));
    } catch {
        return Texture.WHITE;
    }
}

/**
 * Junkrat's RIP-Tire.
 *
 * Rolls from Junkrat to the target row, spinning and hopping, then detonates.
 * Same shape as the Seeker Drone: a sprite driven by pure timeline maths, with
 * the blast drawn from the shared impact sampler.
 */
export function createRiptire(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const blast = new Graphics();
    root.addChild(blast);

    let sprite = null;
    let from = null;
    let to = null;
    let elapsed = 0;
    let active = false;
    let destroyed = false;
    let travelSfxPlayed = false;

    async function start(payload) {
        const origin = cardAnchor(app, payload?.fromCardId);
        const target = payload?.toRowId
            ? rowAnchor(app, payload.toRowId)
            : cardAnchor(app, payload?.toCardId);
        if (!origin || !target) return;

        from = origin;
        to = target;
        elapsed = 0;
        active = true;
        travelSfxPlayed = false;

        if (!sprite) {
            const tex = await loadTexture();
            if (destroyed) return;
            sprite = new Sprite(tex);
            sprite.anchor.set(0.5);
            root.addChildAt(sprite, 0);
        }

        const ratio = sprite.texture?.width
            ? sprite.texture.height / sprite.texture.width
            : 1;
        sprite.width = RIPTIRE.size;
        sprite.height = RIPTIRE.size * ratio;
        sprite.position.set(from.x, from.y);
        sprite.visible = false;
        sprite.alpha = 0;
    }

    const unsub = effectsBus.subscribe((ev) => {
        if (ev?.type === 'fx:riptire') start(ev.payload);
    });

    const tick = () => {
        if (!active || !from || !to) return;
        elapsed += app.ticker.deltaMS || 16;
        const s = riptireSample(elapsed, from, to);

        if (s.done) {
            active = false;
            blast.clear();
            if (sprite) sprite.visible = false;
            return;
        }

        if (!sprite || sprite.destroyed) return;

        if (s.windup) {
            sprite.visible = false;
            return;
        }

        if (s.travelling) {
            if (!travelSfxPlayed) {
                playAudioByKey('junkrat-riptire-travel');
                travelSfxPlayed = true;
            }
            sprite.position.set(s.x, s.y);
            sprite.rotation = s.rotation;
            sprite.visible = true;
            sprite.alpha = 1;
            return;
        }

        // Landed: hide the tyre and blow the row.
        sprite.visible = false;
        const radius = Math.max(50, Math.min(to.width, to.height) * 0.9);
        const flash = impactFlashSample(s.explodeT, radius);
        blast.clear();
        blast.position.set(to.x, to.y);
        for (const ember of emberOffsets(10, flash.emberDistance)) {
            blast.circle(ember.x, ember.y, flash.emberRadius);
            blast.fill({ color: FIRE, alpha: flash.emberAlpha });
        }
        blast.circle(0, 0, flash.radius);
        blast.stroke({ width: 5, color: FIRE, alpha: flash.alpha });
        blast.circle(0, 0, flash.coreRadius);
        blast.fill({ color: CORE, alpha: flash.coreAlpha });
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests. */
        isRolling: () => active,
        destroy() {
            destroyed = true;
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            sprite = null;
        },
    };
}

export default createRiptire;
