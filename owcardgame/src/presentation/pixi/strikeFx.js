import { Container, Graphics } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import {
    BASH,
    TURBOJACK,
    bashSample,
    cycloneSample,
    swirlArms,
    turbojackTotalMs,
} from './fxMath';
import { PALETTE } from './fxConfig';
import { cardAnchor, cardRect } from './anchors';

const BASH_STEEL = 0xffe08a;
const FUNNEL_GREY = 0xb9c3cc;
const FUNNEL_DARK = 0x5a6670;
const VOID_BLACK = 0x120d16;
const VOID_EDGE = 0x6b3fa0;

/**
 * Close-quarters strikes.
 *
 *  - Shield Bash: a hard, short spark where the shield lands.
 *  - Turbojack: the cyclone crosses to the target, then a black swirl turns on
 *    the card. The fling to the deck is the shared `flyToDeck` overlay, which
 *    Cyclo awaits, so it is not driven from here.
 */
export function createStrikeFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const g = new Graphics();
    root.addChild(g);

    let bashes = [];
    let jacks = [];

    const unsub = effectsBus.subscribe((ev) => {
        const p = ev?.payload || {};
        if (ev?.type === 'fx:bash') {
            if (p.cardId) bashes.push({ cardId: p.cardId, at: null, elapsed: 0 });
        } else if (ev?.type === 'fx:turbojack') {
            if (p.toCardId) {
                jacks.push({ fromCardId: p.fromCardId, toCardId: p.toCardId, at: null, elapsed: 0 });
            }
        }
    });

    /** Pinned: both of these can be the blow that kills the card. */
    function pin(entry) {
        if (!entry.at) entry.at = cardAnchor(app, entry.toCardId || entry.cardId) || null;
        return entry.at;
    }

    function drawBash(entry, delta) {
        entry.elapsed += delta;
        const s = bashSample(entry.elapsed);
        if (s.done) return true;
        const at = pin(entry);
        if (!at) return false;

        for (const spike of s.spikes) {
            g.moveTo(at.x + Math.cos(spike.angle) * spike.inner, at.y + Math.sin(spike.angle) * spike.inner);
            g.lineTo(at.x + Math.cos(spike.angle) * spike.outer, at.y + Math.sin(spike.angle) * spike.outer);
        }
        g.stroke({ width: 3, color: BASH_STEEL, alpha: s.alpha });

        g.circle(at.x, at.y, s.ringRadius);
        g.stroke({ width: 2, color: PALETTE.white, alpha: s.alpha * 0.8 });
        g.circle(at.x, at.y, BASH.radius * 0.3 * (1 - s.t));
        g.fill({ color: PALETTE.white, alpha: s.alpha });
        return false;
    }

    function drawJack(entry, delta) {
        entry.elapsed += delta;
        if (entry.elapsed >= turbojackTotalMs()) return true;

        const at = pin(entry);
        if (!at) return false;

        if (entry.elapsed < TURBOJACK.cycloneMs) {
            // Cyclo stays put while the funnel crosses, so read him fresh.
            const from = cardAnchor(app, entry.fromCardId);
            if (!from) return false;
            const s = cycloneSample(entry.elapsed, from, at);
            for (const rib of s.ribs) {
                if (rib.alpha <= 0) continue;
                g.ellipse(rib.x, rib.y, rib.width, rib.width * 0.4);
                g.stroke({ width: 2, color: FUNNEL_GREY, alpha: rib.alpha * 0.9 });
                g.ellipse(rib.x, rib.y, rib.width * 0.55, rib.width * 0.22);
                g.stroke({ width: 1, color: FUNNEL_DARK, alpha: rib.alpha * 0.7 });
            }
            return false;
        }

        // The swirl left turning on the target once the funnel lands.
        const s = swirlArms(entry.elapsed - TURBOJACK.cycloneMs, swirlRadius(entry));
        if (s.done) return true;

        g.circle(at.x, at.y, swirlRadius(entry) * 0.45 * (1 - s.t * 0.4));
        g.fill({ color: VOID_BLACK, alpha: s.alpha * 0.8 });

        for (const arm of s.arms) {
            if (arm.length < 2) continue;
            g.moveTo(at.x + arm[0].x, at.y + arm[0].y);
            for (let i = 1; i < arm.length; i += 1) {
                g.lineTo(at.x + arm[i].x, at.y + arm[i].y);
            }
            g.stroke({ width: 4, color: VOID_BLACK, alpha: s.alpha });
            g.moveTo(at.x + arm[0].x, at.y + arm[0].y);
            for (let i = 1; i < arm.length; i += 1) {
                g.lineTo(at.x + arm[i].x, at.y + arm[i].y);
            }
            g.stroke({ width: 1, color: VOID_EDGE, alpha: s.alpha * 0.8 });
        }
        return false;
    }

    /** Sized to the card while it is still there, else to the last known size. */
    function swirlRadius(entry) {
        const rect = cardRect(app, entry.toCardId);
        if (rect) entry.radius = Math.max(rect.width, rect.height) * 0.5;
        return entry.radius || 46;
    }

    const tick = () => {
        const delta = app.ticker.deltaMS || 16;
        g.clear();

        const sweep = (list, draw) => {
            if (!list.length) return list;
            const done = list.filter((e) => draw(e, delta));
            return done.length ? list.filter((e) => !done.includes(e)) : list;
        };

        bashes = sweep(bashes, drawBash);
        jacks = sweep(jacks, drawJack);
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests. */
        activeBashes: () => bashes.length,
        activeJacks: () => jacks.length,
        bashMs: BASH.ms,
        jackMs: turbojackTotalMs(),
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            bashes = [];
            jacks = [];
        },
    };
}

export default createStrikeFx;
