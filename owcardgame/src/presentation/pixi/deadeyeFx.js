import { Container, Graphics, Text } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import { deadeyeOrbSample } from './fxMath';
import { DEADEYE, PALETTE } from './fxConfig';
import { cardRect } from './anchors';

const ORB = PALETTE.red;
const ORB_CORE = PALETTE.white;

function labelStyle() {
    return {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: DEADEYE.labelSize,
        fontWeight: '900',
        fill: PALETTE.white,
        stroke: { color: PALETTE.outline, width: 4, join: 'round' },
    };
}

/**
 * Dead Eye's aim preview.
 *
 * Hovering an enemy row drops a red orb onto every living enemy in it, each
 * zeroing in from wide, with the damage it would take printed beneath — so the
 * spread is readable before committing.
 *
 * Rides the existing fx:preview event: the payload's `amounts` map is what
 * distinguishes a Dead Eye preview from any other hover.
 */
export function createDeadeyeFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const orbs = new Graphics();
    const labels = new Container();
    root.addChild(orbs);
    root.addChild(labels);

    /** @type {Record<string, number>} */
    let amounts = {};
    /** @type {Map<string, Text>} */
    const labelPool = new Map();
    let elapsed = 0;

    function clearAll() {
        amounts = {};
        orbs.clear();
        for (const label of labelPool.values()) label.visible = false;
    }

    const unsub = effectsBus.subscribe((ev) => {
        if (ev?.type === 'fx:previewClear') {
            clearAll();
            return;
        }
        if (ev?.type !== 'fx:preview') return;

        const next = ev.payload?.amounts || {};
        if (!Object.keys(next).length) {
            clearAll();
            return;
        }
        // Restart the settle whenever the hovered row changes.
        if (JSON.stringify(next) !== JSON.stringify(amounts)) elapsed = 0;
        amounts = next;
    });

    function labelFor(cardId) {
        let label = labelPool.get(cardId);
        if (!label) {
            label = new Text({ text: '', style: labelStyle() });
            label.anchor.set(0.5);
            labels.addChild(label);
            labelPool.set(cardId, label);
        }
        return label;
    }

    const tick = () => {
        const ids = Object.keys(amounts);
        if (!ids.length) return;
        elapsed += app.ticker.deltaMS || 16;

        const s = deadeyeOrbSample(elapsed);
        orbs.clear();
        for (const label of labelPool.values()) label.visible = false;

        for (const cardId of ids) {
            const rect = cardRect(app, cardId);
            if (!rect) continue;

            const radius = DEADEYE.orbRadius * s.spread * s.pulse;
            orbs.circle(rect.x, rect.y, radius);
            orbs.fill({ color: ORB, alpha: s.alpha * 0.35 });
            orbs.circle(rect.x, rect.y, radius);
            orbs.stroke({ width: 2, color: ORB, alpha: s.alpha });
            orbs.circle(rect.x, rect.y, radius * 0.28);
            orbs.fill({ color: ORB_CORE, alpha: s.alpha * 0.9 });

            const label = labelFor(cardId);
            label.text = `-${amounts[cardId]}`;
            label.visible = true;
            label.alpha = s.alpha;
            label.position.set(rect.x, rect.y + rect.height * 0.36);
        }
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests. */
        markedCount: () => Object.keys(amounts).length,
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            labelPool.clear();
            amounts = {};
        },
    };
}

export default createDeadeyeFx;
