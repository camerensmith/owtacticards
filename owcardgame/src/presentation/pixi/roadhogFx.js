import { Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import hookUrl from '../../assets/roadhodhook.png';
import { HOG, HOOK, chainLinkPoints, hogParticleSample, hookSample } from './fxMath';
import { PALETTE } from './fxConfig';
import { cardAnchor, centroidOf, facingVector } from './anchors';

const CHAIN = 0xb8b2ab;
const CHAIN_DARK = 0x6f6a65;
// Yellow, grey and soot, mixed so the spray reads as debris rather than smoke.
const SHRAPNEL = [PALETTE.amber, PALETTE.steel, PALETTE.soot];

async function loadHook() {
    try {
        return Assets.get(hookUrl) || (await Assets.load(hookUrl));
    } catch {
        return Texture.WHITE;
    }
}

/**
 * Roadhog.
 *
 *  - Chain Hook: the hook flies out on a sagging chain, bites, and reels back.
 *  - Whole Hog: a chaotic spray fanning out from him for the ultimate's length.
 */
export function createRoadhogFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const chain = new Graphics();
    const spray = new Graphics();
    root.addChild(spray);
    root.addChild(chain);

    /** @type {Array<{sprite: Sprite, from: object, to: object, elapsed: number, flip: number}>} */
    let hooks = [];
    /** @type {Array<{origin: object, aimAngle: number, elapsed: number, durationMs: number, particles: Array}>} */
    let hogs = [];
    let texture = null;
    let nextSeed = 0;

    async function throwHook(payload) {
        const from = cardAnchor(app, payload?.sourceCardId);
        const to = cardAnchor(app, payload?.targetCardId);
        if (!from || !to) return;

        if (!texture) texture = await loadHook();
        const sprite = new Sprite(texture);
        sprite.anchor.set(0.5);
        const ratio = texture?.width ? texture.height / texture.width : 1;
        sprite.width = HOOK.size;
        sprite.height = HOOK.size * ratio;
        root.addChild(sprite);

        // The art faces left, which already points the right way for player 2.
        // Player 1 throws from the other side, so mirror it.
        const flip = parseInt(String(payload.sourceCardId)[0], 10) === 2 ? 1 : -1;
        hooks.push({ sprite, from, to, elapsed: 0, flip });
    }

    const unsub = effectsBus.subscribe((ev) => {
        if (ev?.type === 'fx:chainHook') {
            throwHook(ev.payload);
            return;
        }
        if (ev?.type === 'fx:wholeHog') {
            const origin = cardAnchor(app, ev.payload?.cardId);
            if (!origin) return;
            // Aim at the actual victims where we know them; fall back to the
            // measured direction of the enemy half.
            const playerNum = parseInt(String(ev.payload.cardId)[0], 10);
            const aim = centroidOf(app, ev.payload?.targetCardIds || []);
            let aimAngle;
            if (aim) {
                aimAngle = Math.atan2(aim.y - origin.y, aim.x - origin.x);
            } else {
                const v = facingVector(app, playerNum);
                aimAngle = Math.atan2(v.y, v.x);
            }

            hogs.push({
                origin,
                aimAngle,
                elapsed: 0,
                durationMs: ev.payload?.durationMs || HOG.durationMs,
                particles: [],
            });
        }
    });

    function drawHook(entry, delta) {
        entry.elapsed += delta;
        const s = hookSample(entry.elapsed);
        if (s.done) return true;

        const points = chainLinkPoints(entry.from, entry.to, s.reach);
        const head = points[points.length - 1];

        // Chain: a dark backing line with links threaded along it.
        chain.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i += 1) chain.lineTo(points[i].x, points[i].y);
        chain.stroke({ width: 3, color: CHAIN_DARK, alpha: 0.9 });

        for (let i = 1; i < points.length; i += 1) {
            chain.circle(points[i].x, points[i].y, HOOK.linkRadius);
            chain.stroke({ width: 1.5, color: CHAIN, alpha: 0.95 });
        }

        entry.sprite.visible = true;
        entry.sprite.position.set(head.x, head.y);
        entry.sprite.scale.x = Math.abs(entry.sprite.scale.x) * entry.flip;
        // Point the hook along the chain it is trailing.
        const prev = points[points.length - 2] || points[0];
        entry.sprite.rotation = Math.atan2(head.y - prev.y, head.x - prev.x);
        return false;
    }

    function drawHog(entry, delta) {
        entry.elapsed += delta;

        // Keep spawning for the whole ultimate, then let the tail drain.
        if (entry.elapsed < entry.durationMs) {
            const spawn = (HOG.spawnPerSecond * delta) / 1000;
            const whole = Math.floor(spawn) + (Math.random() < spawn % 1 ? 1 : 0);
            for (let i = 0; i < whole; i += 1) {
                entry.particles.push({ seed: nextSeed++, age: 0 });
            }
        }

        const alive = [];
        for (const particle of entry.particles) {
            particle.age += delta;
            const s = hogParticleSample(particle.seed, particle.age, entry.origin, entry.aimAngle);
            if (s.done) continue;
            alive.push(particle);

            // A jagged chunk rather than a dot: a rotated wedge.
            const cos = Math.cos(s.rotation);
            const sin = Math.sin(s.rotation);
            const h = s.size;
            const w = s.size * 0.55;
            spray.poly([
                s.x + cos * h, s.y + sin * h,
                s.x - cos * w - sin * w, s.y - sin * w + cos * w,
                s.x - cos * w * 0.4 + sin * w, s.y - sin * w * 0.4 - cos * w,
            ]);
            spray.fill({ color: SHRAPNEL[s.kind] || SHRAPNEL[0], alpha: s.alpha });
        }
        entry.particles = alive;

        return entry.elapsed >= entry.durationMs && alive.length === 0;
    }

    const tick = () => {
        const delta = app.ticker.deltaMS || 16;

        chain.clear();
        if (hooks.length) {
            const finished = [];
            for (const entry of hooks) {
                if (drawHook(entry, delta)) finished.push(entry);
            }
            if (finished.length) {
                for (const entry of finished) {
                    if (!entry.sprite.destroyed) entry.sprite.destroy();
                }
                hooks = hooks.filter((h) => !finished.includes(h));
            }
        }

        spray.clear();
        if (hogs.length) {
            const finished = [];
            for (const entry of hogs) {
                if (drawHog(entry, delta)) finished.push(entry);
            }
            if (finished.length) hogs = hogs.filter((h) => !finished.includes(h));
        }
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests. */
        activeHooks: () => hooks.length,
        activeSprays: () => hogs.length,
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            hooks = [];
            hogs = [];
        },
    };
}

export default createRoadhogFx;
