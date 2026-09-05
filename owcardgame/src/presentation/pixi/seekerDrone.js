import { Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import { playAudioByKey } from '../../assets/imageImports';
import droneUrl from '../../assets/drone.png';
import {
    DRONE,
    beaconAlpha,
    clamp01,
    droneLaunchSample,
    droneOrbitSample,
    emberOffsets,
    impactFlashSample,
} from './fxMath';
import { PALETTE } from './fxConfig';
import { boxOf, sideRect, toLocal } from './anchors';

const RED = PALETTE.red;
const EMBER = PALETTE.ember;
const CORE = PALETTE.hot;

async function loadDroneTexture() {
    try {
        return Assets.get(droneUrl) || (await Assets.load(droneUrl));
    } catch {
        return Texture.WHITE;
    }
}

/**
 * Warden's Seeker Drone.
 *
 * Launches from the Warden card as a speck, grows as it crosses into the enemy
 * half, then wanders there strobing a red warning light over the field until
 * something triggers it — at which point it dives and detonates.
 *
 * Driven entirely by effectsBus: fx:orbitStart launches, fx:orbitStop detonates.
 */
export function createSeekerDrone(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const fieldLight = new Graphics();
    const droneLight = new Graphics();
    const impact = new Graphics();
    root.addChild(fieldLight);
    root.addChild(droneLight);

    let sprite = null;
    let phase = 'idle'; // idle | launching | orbiting | impacting
    let elapsed = 0;
    let bounds = null;
    let launchFrom = null;
    let launchTo = null;
    let impactAt = null;
    let baseW = DRONE.width;
    let baseH = DRONE.width * 0.6;
    let destroyed = false;

    function clearVisuals() {
        fieldLight.clear();
        droneLight.clear();
        impact.clear();
        if (sprite && !sprite.destroyed) sprite.visible = false;
    }

    function stop() {
        phase = 'idle';
        elapsed = 0;
        clearVisuals();
        if (impact.parent) root.removeChild(impact);
    }

    async function start(payload) {
        const targetSide = payload?.sidePlayerNum;
        if (targetSide == null) return;

        bounds = sideRect(app, targetSide);
        if (!bounds) return;

        const source = payload?.sourceCardId ? toLocal(app, boxOf(payload.sourceCardId)) : null;
        // No Warden card on screen (already dead, or off-layout): drift in from
        // the edge of its own half rather than dropping the effect entirely.
        launchFrom = source || { x: bounds.x, y: bounds.y + bounds.height, width: 0, height: 0 };
        launchTo = droneOrbitSample(0, bounds);

        if (!sprite) {
            const tex = await loadDroneTexture();
            if (destroyed) return;
            sprite = new Sprite(tex);
            sprite.anchor.set(0.5);
            root.addChildAt(sprite, root.children.indexOf(droneLight));
        }

        const ratio = sprite.texture?.height && sprite.texture?.width
            ? sprite.texture.height / sprite.texture.width
            : 0.6;
        baseW = DRONE.width;
        baseH = DRONE.width * ratio;
        sprite.width = baseW * DRONE.startScale;
        sprite.height = baseH * DRONE.startScale;
        sprite.visible = true;
        sprite.alpha = 1;
        sprite.position.set(launchFrom.x, launchFrom.y);

        elapsed = 0;
        phase = 'launching';
    }

    function detonate(payload) {
        if (phase === 'idle') return;
        const target = payload?.targetCardId ? toLocal(app, boxOf(payload.targetCardId)) : null;
        impactAt = target
            || (sprite && !sprite.destroyed ? { x: sprite.x, y: sprite.y, width: 60, height: 60 } : null);
        if (!impactAt) {
            stop();
            return;
        }
        // Silent until the file exists; playAudioByKey no-ops on an unknown key.
        playAudioByKey('drone-impact');
        if (!impact.parent) root.addChild(impact);
        elapsed = 0;
        phase = 'impacting';
    }

    const unsub = effectsBus.subscribe((ev) => {
        if (!ev?.type) return;
        if (ev.type === 'fx:orbitStart' && (ev.payload?.token || 'seeker') === 'seeker') {
            start(ev.payload);
        }
        if (ev.type === 'fx:orbitStop' && (ev.payload?.token || 'seeker') === 'seeker') {
            detonate(ev.payload);
        }
    });

    function drawFieldLight(alpha) {
        fieldLight.clear();
        if (!bounds || alpha <= 0) return;
        // A red wash pinned to the enemy half, brightest under the drone.
        fieldLight.roundRect(
            bounds.x - bounds.width / 2,
            bounds.y - bounds.height / 2,
            bounds.width,
            bounds.height,
            10
        );
        fieldLight.fill({ color: RED, alpha: alpha * 0.16 });
        fieldLight.roundRect(
            bounds.x - bounds.width / 2,
            bounds.y - bounds.height / 2,
            bounds.width,
            bounds.height,
            10
        );
        fieldLight.stroke({ width: 2, color: RED, alpha: alpha * 0.75 });
    }

    function drawDroneLight(x, y, alpha) {
        droneLight.clear();
        droneLight.circle(x, y, 5);
        droneLight.fill({ color: RED, alpha: Math.min(1, alpha * 1.8) });
        droneLight.circle(x, y, 14);
        droneLight.fill({ color: RED, alpha: alpha * 0.3 });
    }

    function drawImpact(t) {
        const s = impactFlashSample(t, Math.max(28, Math.min(impactAt.width || 60, 70)));
        impact.clear();
        impact.position.set(impactAt.x, impactAt.y);

        for (const ember of emberOffsets(DRONE.emberCount, s.emberDistance)) {
            impact.circle(ember.x, ember.y, s.emberRadius);
            impact.fill({ color: EMBER, alpha: s.emberAlpha });
        }
        impact.circle(0, 0, s.radius);
        impact.stroke({ width: 3, color: EMBER, alpha: s.alpha });
        impact.circle(0, 0, s.coreRadius);
        impact.fill({ color: CORE, alpha: s.coreAlpha });
    }

    const tick = () => {
        if (phase === 'idle' || !sprite || sprite.destroyed) return;
        elapsed += app.ticker.deltaMS || 16;

        if (phase === 'launching') {
            const t = clamp01(elapsed / DRONE.launchMs);
            const s = droneLaunchSample(t, launchFrom, launchTo);
            sprite.position.set(s.x, s.y);
            sprite.width = baseW * s.scale;
            sprite.height = baseH * s.scale;
            drawDroneLight(s.x, s.y, beaconAlpha(elapsed));
            if (t >= 1) {
                phase = 'orbiting';
                elapsed = 0;
            }
            return;
        }

        if (phase === 'orbiting') {
            const s = droneOrbitSample(elapsed, bounds);
            sprite.position.set(s.x, s.y);
            sprite.width = baseW;
            sprite.height = baseH;
            sprite.rotation = s.angle * 0.25; // gentle bank, not a full spin
            const alpha = beaconAlpha(elapsed);
            drawFieldLight(alpha);
            drawDroneLight(s.x, s.y, alpha);
            return;
        }

        if (phase === 'impacting') {
            const dive = clamp01(elapsed / DRONE.diveMs);
            if (dive < 1) {
                // Home in on the target, easing out as it closes.
                sprite.position.set(
                    sprite.x + (impactAt.x - sprite.x) * 0.25,
                    sprite.y + (impactAt.y - sprite.y) * 0.25
                );
                sprite.alpha = 1 - dive;
                drawDroneLight(sprite.x, sprite.y, 1 - dive);
            } else if (sprite.visible) {
                sprite.visible = false;
                droneLight.clear();
            }

            const t = clamp01((elapsed - DRONE.diveMs) / DRONE.impactMs);
            if (elapsed >= DRONE.diveMs) drawImpact(t);
            drawFieldLight(Math.max(0, 1 - t) * DRONE.beaconMaxAlpha);

            if (elapsed >= DRONE.diveMs + DRONE.impactMs) stop();
        }
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests and for a future director beat. */
        getPhase: () => phase,
        destroy() {
            destroyed = true;
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            sprite = null;
        },
    };
}

export default createSeekerDrone;
