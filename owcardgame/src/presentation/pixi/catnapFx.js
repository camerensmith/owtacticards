import { Container, Text } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import { CATNAP, catnapZzzSample } from './fxMath';
import { PALETTE } from './fxConfig';
import { cardRect } from './anchors';

const ROWS = ['1f', '1m', '1b', '2f', '2m', '2b'];
const ZZZ_FILL = 0xb8e0ff;

function zStyle(size) {
    return {
        fontFamily: 'Big-Noodle-Titling, Arial Black, Arial, sans-serif',
        fontSize: size,
        fontWeight: '700',
        fill: ZZZ_FILL,
        stroke: { color: PALETTE.outline, width: 3, join: 'round' },
    };
}

/** Living cards currently carrying Fika's catnap-lock. */
function lockedCardIds() {
    const ids = [];
    const getRow = window.__ow_getRow;
    const getCard = window.__ow_getCard;
    if (typeof getRow !== 'function' || typeof getCard !== 'function') return ids;

    for (const rowId of ROWS) {
        for (const cardId of getRow(rowId)?.cardIds || []) {
            if (!cardId) continue;
            const effects = getCard(cardId)?.effects;
            if (!Array.isArray(effects)) continue;
            if (effects.some((e) => e?.id === 'catnap-lock')) ids.push(cardId);
        }
    }
    return ids;
}

/**
 * Catnap sleep FX: Z / z / Z rising off each locked card for as long as the
 * lock lasts. Also accepts fx:catnap for an immediate burst if the effect
 * is not yet readable from card state.
 */
export function createCatnapFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    /** @type {Map<string, Text>} */
    const glyphs = new Map();
    let elapsed = 0;
    /** One-shot bursts keyed by cardId → remaining life ms. */
    const bursts = new Map();

    function glyphKey(cardId, index) {
        return `${cardId}::${index}`;
    }

    function ensureGlyph(key, label) {
        let text = glyphs.get(key);
        if (!text) {
            text = new Text({ text: label, style: zStyle(CATNAP.fontSize) });
            text.anchor.set(0.5);
            root.addChild(text);
            glyphs.set(key, text);
        } else if (text.text !== label) {
            text.text = label;
        }
        return text;
    }

    function pruneGlyphs(activeKeys) {
        for (const [key, text] of glyphs) {
            if (activeKeys.has(key)) continue;
            try { text.destroy(); } catch {}
            glyphs.delete(key);
        }
    }

    const unsub = effectsBus.subscribe((ev) => {
        if (ev?.type !== 'fx:catnap') return;
        const cardId = ev.payload?.cardId;
        if (!cardId) return;
        // A short sleep burst even before the lock effect is queried.
        bursts.set(cardId, CATNAP.riseMs * 3);
    });

    const tick = () => {
        const delta = app.ticker.deltaMS || 16;
        elapsed += delta;

        for (const [cardId, left] of [...bursts.entries()]) {
            const next = left - delta;
            if (next <= 0) bursts.delete(cardId);
            else bursts.set(cardId, next);
        }

        const locked = new Set(lockedCardIds());
        for (const cardId of bursts.keys()) locked.add(cardId);

        const activeKeys = new Set();
        let cardIndex = 0;
        for (const cardId of locked) {
            const rect = cardRect(app, cardId);
            if (!rect) {
                cardIndex += 1;
                continue;
            }
            for (let i = 0; i < CATNAP.perCard; i += 1) {
                const seed = cardIndex * 17 + i;
                const s = catnapZzzSample(seed, elapsed, rect);
                const key = glyphKey(cardId, i);
                if (!s.visible) continue;
                activeKeys.add(key);
                const text = ensureGlyph(key, s.label);
                text.visible = true;
                text.alpha = s.alpha;
                text.scale.set(s.scale);
                text.position.set(s.x, s.y);
            }
            cardIndex += 1;
        }

        pruneGlyphs(activeKeys);
    };

    app.ticker.add(tick);

    return {
        lockedCount: () => lockedCardIds().length,
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            for (const text of glyphs.values()) {
                try { text.destroy(); } catch {}
            }
            glyphs.clear();
            try { root.destroy({ children: true }); } catch {}
        },
    };
}

export default createCatnapFx;
