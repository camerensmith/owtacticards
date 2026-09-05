import { Container, Text } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import { FLOAT, floatSample } from './fxMath';
import { PALETTE } from './fxConfig';
import { cardAnchor } from './anchors';

const DAMAGE = PALETTE.damage;
const HEAL = PALETTE.heal;
const DEATH = PALETTE.neutral;

function styleFor(color, size) {
    return {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: size,
        fontWeight: '900',
        fill: color,
        stroke: { color: PALETTE.outline, width: 4, join: 'round' },
    };
}

/**
 * Floating combat numbers.
 *
 * Consumes overlay:damage / overlay:heal / overlay:death — the most-published
 * events in the game — and draws them on the Pixi overlay instead of as DOM
 * nodes inside each card, so they are never clipped by the card that spawned
 * them and can rise above the board.
 */
export function createFloatingNumbers(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    /** @type {Array<{text: Text, origin: object, elapsed: number, seed: number}>} */
    let floats = [];

    function spawn(cardId, label, color, size = FLOAT.fontSize) {
        const origin = cardAnchor(app, cardId);
        if (!origin) return;

        const text = new Text({ text: label, style: styleFor(color, size) });
        text.anchor.set(0.5);
        text.position.set(origin.x, origin.y);
        root.addChild(text);

        floats.push({
            text,
            origin,
            elapsed: 0,
            // Spread simultaneous hits on one card so they do not stack exactly.
            seed: Math.random(),
        });
    }

    const unsub = effectsBus.subscribe((ev) => {
        if (!ev?.type) return;
        const cardId = ev.payload?.cardId;
        if (!cardId) return;

        if (ev.type === 'overlay:damage') {
            spawn(cardId, `-${ev.payload.amount ?? 1}`, DAMAGE);
        } else if (ev.type === 'overlay:heal') {
            spawn(cardId, `+${ev.payload.amount ?? 1}`, HEAL);
        } else if (ev.type === 'overlay:death') {
            spawn(cardId, 'DOWN', DEATH, FLOAT.deathFontSize);
        }
    });

    const tick = () => {
        if (!floats.length) return;
        const delta = app.ticker.deltaMS || 16;
        const finished = [];

        for (const float of floats) {
            float.elapsed += delta;
            const s = floatSample(float.elapsed, float.seed);
            if (s.done) {
                finished.push(float);
                continue;
            }
            float.text.position.set(float.origin.x + s.offsetX, float.origin.y + s.offsetY);
            float.text.alpha = s.alpha;
            float.text.scale.set(s.scale);
        }

        if (finished.length) {
            for (const float of finished) {
                if (!float.text.destroyed) float.text.destroy();
            }
            floats = floats.filter((f) => !finished.includes(f));
        }
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests. */
        activeFloats: () => floats.length,
        lifeMs: FLOAT.lifeMs,
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            floats = [];
        },
    };
}

export default createFloatingNumbers;
