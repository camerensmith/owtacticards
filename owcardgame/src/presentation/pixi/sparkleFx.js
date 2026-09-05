import { Container, Graphics } from 'pixi.js';
import { SPARKLE, sparkleSample } from './fxMath';
import { PALETTE } from './fxConfig';
import { cardRect } from './anchors';

const MOTE = PALETTE.amberPale;
const MOTE_CORE = PALETTE.white;
const ROWS = ['1f', '1m', '1b', '2f', '2m', '2b'];

/**
 * Immortality Field sparkle.
 *
 * State-driven from the board's invulnerable slots, so it lasts exactly as long
 * as the protection does — until the field is cleared at the start of the next
 * turn — with nothing to schedule or tear down.
 */
export function createSparkleFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const motes = new Graphics();
    root.addChild(motes);

    let elapsed = 0;

    /** Cards standing in a protected slot right now. */
    function protectedCardIds() {
        const ids = [];
        const getRow = window.__ow_getRow;
        const isProtected = window.__ow_isSlotInvulnerable;
        if (typeof getRow !== 'function' || typeof isProtected !== 'function') return ids;

        for (const rowId of ROWS) {
            const cardIds = getRow(rowId)?.cardIds || [];
            cardIds.forEach((cardId, index) => {
                if (cardId && isProtected(rowId, index)) ids.push(cardId);
            });
        }
        return ids;
    }

    const tick = () => {
        elapsed += app.ticker.deltaMS || 16;
        motes.clear();

        const ids = protectedCardIds();
        if (!ids.length) return;

        ids.forEach((cardId, cardIndex) => {
            const rect = cardRect(app, cardId);
            if (!rect) return;

            // Faint aura so the protected slot reads even between twinkles.
            motes.roundRect(
                rect.x - rect.width / 2,
                rect.y - rect.height / 2,
                rect.width,
                rect.height,
                6
            );
            motes.stroke({ width: 1.5, color: MOTE, alpha: 0.3 });

            for (let i = 0; i < SPARKLE.perCard; i += 1) {
                // Offset the seed per card so neighbours do not twinkle in step.
                const s = sparkleSample(cardIndex * 17 + i, elapsed, rect);
                motes.circle(s.x, s.y, s.radius);
                motes.fill({ color: MOTE, alpha: s.alpha });
                motes.circle(s.x, s.y, s.radius * 0.4);
                motes.fill({ color: MOTE_CORE, alpha: s.alpha });
            }
        });
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests. */
        protectedCount: () => protectedCardIds().length,
        destroy() {
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
        },
    };
}

export default createSparkleFx;
