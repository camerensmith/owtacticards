import { Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import discordUrl from '../../assets/discord.png';
import harmonyUrl from '../../assets/harmony.png';
import {
    ORB_TOKEN,
    orbJumpSample,
    orbRestPoint,
    transcendRays,
    transcendSample,
} from './fxMath';
import { PALETTE } from './fxConfig';
import { cardRect } from './anchors';

const GOLD = 0xffd873;
const GOLD_PALE = 0xfff3cf;
const ROWS = ['1f', '1m', '1b', '2f', '2m', '2b'];

async function load(url) {
    try {
        return Assets.get(url) || (await Assets.load(url));
    } catch {
        return Texture.WHITE;
    }
}

/**
 * Zenyatta.
 *
 *  - Harmony and Discord orbs hover over whoever currently holds them, and zoom
 *    across when the token jumps to a new host.
 *  - Transcendence: a radiant burst of rays, then a golden glow on Zenyatta for
 *    as long as his immunity lasts.
 *
 * Everything here is driven from card effects, so an orb vanishes the instant
 * its token is removed — whether the holder died or it had nowhere left to go.
 */
export function createZenyattaFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const glow = new Graphics();
    const orbs = new Container();
    root.addChild(glow);
    root.addChild(orbs);

    let elapsed = 0;
    /** type -> { sprite, holderId, from, jumpElapsed } */
    const tracked = new Map();
    /** cardId -> ms since the burst began. */
    const transcendent = new Map();
    const textures = {};

    async function spriteFor(type) {
        if (!textures[type]) {
            textures[type] = await load(type === 'discord' ? discordUrl : harmonyUrl);
        }
        const sprite = new Sprite(textures[type]);
        sprite.anchor.set(0.5);
        const tex = textures[type];
        const ratio = tex?.width ? tex.height / tex.width : 1;
        sprite.width = ORB_TOKEN.size;
        sprite.height = ORB_TOKEN.size * ratio;
        orbs.addChild(sprite);
        return sprite;
    }

    /** Who currently holds each orb, and who has Transcendence up. */
    function scanBoard() {
        const holders = {};
        const immune = new Set();
        const getRow = window.__ow_getRow;
        const getCard = window.__ow_getCard;
        if (typeof getRow !== 'function' || typeof getCard !== 'function') {
            return { holders, immune };
        }

        for (const rowId of ROWS) {
            for (const cardId of getRow(rowId)?.cardIds || []) {
                const effects = getCard(cardId)?.effects;
                if (!Array.isArray(effects)) continue;
                for (const effect of effects) {
                    if (effect?.hero !== 'zenyatta') continue;
                    if (effect.type === 'harmony') holders.harmony = cardId;
                    else if (effect.type === 'discord') holders.discord = cardId;
                    else if (effect.type === 'immunity') immune.add(cardId);
                }
            }
        }
        return { holders, immune };
    }

    async function ensureOrb(type, holderId) {
        let entry = tracked.get(type);
        if (!entry) {
            entry = { sprite: await spriteFor(type), holderId, from: null, jumpElapsed: 0 };
            tracked.set(type, entry);
            return;
        }
        if (entry.holderId === holderId) return;

        // New host: zoom across from wherever it was sitting.
        const previous = cardRect(app, entry.holderId);
        entry.from = previous ? orbRestPoint(previous, elapsed) : null;
        entry.holderId = holderId;
        entry.jumpElapsed = 0;
    }

    function drawOrb(entry, delta) {
        const rect = cardRect(app, entry.holderId);
        if (!rect) {
            entry.sprite.visible = false;
            return;
        }

        const rest = orbRestPoint(rect, elapsed);
        entry.sprite.visible = true;
        entry.sprite.rotation = rest.rotation;

        if (!entry.from) {
            entry.sprite.position.set(rest.x, rest.y);
            entry.sprite.scale.set(Math.abs(entry.sprite.scale.x));
            return;
        }

        entry.jumpElapsed += delta;
        const s = orbJumpSample(entry.jumpElapsed);
        entry.sprite.position.set(
            entry.from.x + (rest.x - entry.from.x) * s.t,
            entry.from.y + (rest.y - entry.from.y) * s.t - s.arc,
        );
        if (s.done) entry.from = null;
    }

    function drawTranscendence(cardId, age) {
        const rect = cardRect(app, cardId);
        if (!rect) return;

        const s = transcendSample(age);
        const radius = Math.max(rect.width, rect.height) * 0.6;

        // Golden glow that persists for as long as the immunity does.
        glow.circle(rect.x, rect.y, radius * 1.15);
        glow.fill({ color: GOLD, alpha: s.glow * 0.28 });
        glow.circle(rect.x, rect.y, radius);
        glow.stroke({ width: 3, color: GOLD, alpha: s.glow });

        if (!s.bursting) return;

        // One-off radiant burst as it is cast.
        for (const ray of transcendRays(age)) {
            const inner = radius * 0.7;
            const outer = inner + s.rayLength * ray.scale;
            glow.moveTo(rect.x + Math.cos(ray.angle) * inner, rect.y + Math.sin(ray.angle) * inner);
            glow.lineTo(rect.x + Math.cos(ray.angle) * outer, rect.y + Math.sin(ray.angle) * outer);
        }
        glow.stroke({ width: 3, color: GOLD_PALE, alpha: s.rayAlpha * 0.9 });

        glow.circle(rect.x, rect.y, radius * (0.6 + s.burstT * 1.4));
        glow.stroke({ width: 2, color: PALETTE.white, alpha: (1 - s.burstT) * 0.8 });
    }

    const tick = () => {
        const delta = app.ticker.deltaMS || 16;
        elapsed += delta;
        glow.clear();

        const { holders, immune } = scanBoard();

        // Orbs follow their token; drop the sprite the moment it is gone.
        for (const type of ['harmony', 'discord']) {
            const holderId = holders[type];
            if (!holderId) {
                const entry = tracked.get(type);
                if (entry) {
                    if (!entry.sprite.destroyed) entry.sprite.destroy();
                    tracked.delete(type);
                }
                continue;
            }
            ensureOrb(type, holderId);
            const entry = tracked.get(type);
            if (entry) drawOrb(entry, delta);
        }

        // Transcendence lasts the round; age each one from when it appeared.
        for (const cardId of transcendent.keys()) {
            if (!immune.has(cardId)) transcendent.delete(cardId);
        }
        for (const cardId of immune) {
            transcendent.set(cardId, (transcendent.get(cardId) || 0) + delta);
            drawTranscendence(cardId, transcendent.get(cardId));
        }
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests. */
        trackedOrbs: () => tracked.size,
        destroy() {
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            tracked.clear();
            transcendent.clear();
        },
    };
}

export default createZenyattaFx;
