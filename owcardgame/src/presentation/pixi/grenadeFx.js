import { Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import grenadeUrl from '../../assets/grenade.png';
import { GRENADE, ORB, PACK, emberOffsets, grenadeSample, impactFlashSample } from './fxMath';
import { PALETTE } from './fxConfig';
import { cardAnchor, rowAnchor } from './anchors';

async function loadGrenade() {
    try {
        return Assets.get(grenadeUrl) || (await Assets.load(grenadeUrl));
    } catch {
        return Texture.WHITE;
    }
}

/**
 * Thrown grenades, driven by fx:grenade.
 *
 * Shared by Ana's biotic grenade and McCree's flashbang — same sprite and spin,
 * different burst colour and optional throw config (flashbang is a snap, not a
 * lob). Several can be in the air at once, so each throw owns its own sprite.
 */
export function createGrenadeFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const bursts = new Graphics();
    root.addChild(bursts);

    /** @type {Array<{sprite: Sprite, from: object, to: object, color: number, elapsed: number, cfg: object}>} */
    let throws = [];
    let texture = null;

    async function start(payload, kind = 'grenade') {
        const from = cardAnchor(app, payload?.fromCardId);
        const to = payload?.toRowId
            ? rowAnchor(app, payload.toRowId)
            : cardAnchor(app, payload?.toCardId);
        if (!from || !to) return;

        // An orb is drawn, not a sprite, so it skips the texture entirely.
        if (kind === 'orb' || kind === 'pack') {
            throws.push({
                sprite: null, kind, from, to,
                color: payload?.color ?? PALETTE.amber, elapsed: 0,
                cfg: payload?.cfg || GRENADE,
            });
            return;
        }

        if (!texture) texture = await loadGrenade();
        const sprite = new Sprite(texture);
        sprite.anchor.set(0.5);
        const ratio = texture?.width ? texture.height / texture.width : 1;
        sprite.width = GRENADE.size;
        sprite.height = GRENADE.size * ratio;
        sprite.position.set(from.x, from.y);
        root.addChildAt(sprite, 0);

        throws.push({
            sprite,
            kind,
            from,
            to,
            color: payload?.color ?? PALETTE.amber,
            elapsed: 0,
            cfg: payload?.cfg || GRENADE,
        });
    }

    const unsub = effectsBus.subscribe((ev) => {
        if (ev?.type === 'fx:grenade') start(ev.payload, 'grenade');
        if (ev?.type === 'fx:orb') start(ev.payload, 'orb');
        if (ev?.type === 'fx:pack') start(ev.payload, 'pack');
    });

    const tick = () => {
        if (!throws.length) return;
        const delta = app.ticker.deltaMS || 16;
        const finished = [];
        bursts.clear();

        for (const shot of throws) {
            shot.elapsed += delta;
            const cfg = shot.cfg || GRENADE;
            const s = grenadeSample(shot.elapsed, shot.from, shot.to, cfg);

            if (s.done) {
                finished.push(shot);
                continue;
            }

            if (s.flying) {
                if (shot.kind === 'pack') {
                    // A tumbling canister: square, with a cross like a med-pack.
                    const half = PACK.size / 2;
                    const spin = shot.elapsed * PACK.spinRate;
                    const cos = Math.cos(spin);
                    const sin = Math.sin(spin);
                    const corner = (dx, dy) => [
                        s.x + dx * cos - dy * sin,
                        s.y + dx * sin + dy * cos,
                    ];
                    bursts.poly([
                        ...corner(-half, -half), ...corner(half, -half),
                        ...corner(half, half), ...corner(-half, half),
                    ]);
                    bursts.fill({ color: shot.color, alpha: 0.95 });
                    bursts.poly([
                        ...corner(-half * 0.55, -half * 0.18), ...corner(half * 0.55, -half * 0.18),
                        ...corner(half * 0.55, half * 0.18), ...corner(-half * 0.55, half * 0.18),
                    ]);
                    bursts.fill({ color: PALETTE.white, alpha: 0.9 });
                    bursts.poly([
                        ...corner(-half * 0.18, -half * 0.55), ...corner(half * 0.18, -half * 0.55),
                        ...corner(half * 0.18, half * 0.55), ...corner(-half * 0.18, half * 0.55),
                    ]);
                    bursts.fill({ color: PALETTE.white, alpha: 0.9 });
                } else if (shot.kind === 'orb') {
                    // Glowing ball with a short comet tail behind it.
                    bursts.circle(s.x, s.y, ORB.radius * 1.8);
                    bursts.fill({ color: shot.color, alpha: 0.22 });
                    bursts.circle(s.x, s.y, ORB.radius);
                    bursts.fill({ color: shot.color, alpha: 0.9 });
                    bursts.circle(s.x, s.y, ORB.radius * 0.45);
                    bursts.fill({ color: PALETTE.white, alpha: 0.85 });
                } else {
                    shot.sprite.visible = true;
                    shot.sprite.position.set(s.x, s.y);
                    shot.sprite.rotation = s.rotation;
                }
                continue;
            }

            if (shot.sprite) shot.sprite.visible = false;
            const scale = shot.kind === 'grenade' ? cfg.burstScale : ORB.burstScale;
            const radius = Math.max(28, Math.min(shot.to.width, shot.to.height) * scale);
            const flash = impactFlashSample(s.burstT, radius);
            for (const ember of emberOffsets(9, flash.emberDistance)) {
                bursts.circle(shot.to.x + ember.x, shot.to.y + ember.y, flash.emberRadius);
                bursts.fill({ color: shot.color, alpha: flash.emberAlpha });
            }
            bursts.circle(shot.to.x, shot.to.y, flash.radius);
            bursts.stroke({ width: 4, color: shot.color, alpha: flash.alpha });
            bursts.circle(shot.to.x, shot.to.y, flash.coreRadius);
            bursts.fill({ color: PALETTE.white, alpha: flash.coreAlpha });
        }

        if (finished.length) {
            for (const shot of finished) {
                if (shot.sprite && !shot.sprite.destroyed) shot.sprite.destroy();
            }
            throws = throws.filter((s) => !finished.includes(s));
            if (!throws.length) bursts.clear();
        }
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests. */
        activeThrows: () => throws.length,
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            throws = [];
        },
    };
}

export default createGrenadeFx;
