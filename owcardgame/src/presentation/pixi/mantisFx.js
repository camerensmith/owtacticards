import { Container, Graphics } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import {
    MANTIS,
    mantisCloakBurstSample,
    mantisCloakCamoPuffs,
    mantisEnergySlashSample,
    mantisBladeDanceSample,
} from './fxMath';
import { cardRect } from './anchors';
import { MANTIS_CLOAK_ID } from '../../game/mantis';

const SMOKE = 0x7a8490;
const SMOKE_PALE = 0xb8c0c8;
const BLADE = 0xff8a3d;
const BLADE_CORE = 0xffe0a8;
const SHROUD = 0x1a222c;

const ROWS = ['1f', '1m', '1b', '2f', '2m', '2b'];

/** Living cards currently carrying Mantis Cloak. */
function cloakedCardIds() {
    const ids = [];
    const getRow = window.__ow_getRow;
    const getCard = window.__ow_getCard;
    if (typeof getRow !== 'function' || typeof getCard !== 'function') return ids;

    for (const rowId of ROWS) {
        for (const cardId of getRow(rowId)?.cardIds || []) {
            if (!cardId) continue;
            const effects = getCard(cardId)?.effects;
            if (!Array.isArray(effects)) continue;
            if (effects.some((e) => e?.id === MANTIS_CLOAK_ID)) ids.push(cardId);
        }
    }
    return ids;
}

/**
 * Mantis FX:
 *  - Persistent smoky camo on cloaked cards
 *  - Cloak burst on enter
 *  - Energy slash on ability1 resolve / trip
 *  - Blade Dance: shroud on Mantis + spinning dervish blades on hit targets
 */
export function createMantisFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const g = new Graphics();
    root.addChild(g);

    /** @type {Array<{cardId: string, elapsed: number}>} */
    let bursts = [];
    /** @type {Array<{cardId: string, elapsed: number}>} */
    let slashes = [];
    /** @type {Array<{casterId: string, targetIds: string[], elapsed: number}>} */
    let dances = [];
    let camoClock = 0;

    const unsub = effectsBus.subscribe((ev) => {
        const p = ev?.payload || {};
        if (ev?.type === 'fx:mantisCloak' && p.cardId) {
            bursts.push({ cardId: p.cardId, elapsed: 0 });
        } else if (ev?.type === 'fx:energySlash' && p.cardId) {
            slashes.push({ cardId: p.cardId, elapsed: 0 });
        } else if (ev?.type === 'fx:bladeDance') {
            const targetIds = [...new Set((p.targetCardIds || []).filter(Boolean))];
            if (p.casterId || targetIds.length) {
                dances.push({
                    casterId: p.casterId || null,
                    targetIds,
                    elapsed: 0,
                });
            }
        }
    });

    function drawCamo(rect, elapsed) {
        const veilW = rect.width * 0.92;
        const veilH = rect.height * 0.92;
        g.roundRect(rect.x - veilW / 2, rect.y - veilH / 2, veilW, veilH, 10);
        g.fill({ color: SHROUD, alpha: 0.28 });

        const { puffs } = mantisCloakCamoPuffs(elapsed);
        const reach = Math.max(rect.width, rect.height);
        for (const puff of puffs) {
            const x = rect.x + Math.cos(puff.angle) * reach * puff.radius * 0.5;
            const y = rect.y + Math.sin(puff.angle) * reach * puff.radius * 0.42;
            const r = reach * puff.puffR * 0.5;
            g.circle(x, y, r);
            g.fill({ color: SMOKE, alpha: puff.alpha });
            g.circle(x - r * 0.2, y - r * 0.15, r * 0.55);
            g.fill({ color: SMOKE_PALE, alpha: puff.alpha * 0.55 });
        }
    }

    function drawBurst(entry, delta) {
        entry.elapsed += delta;
        const s = mantisCloakBurstSample(entry.elapsed);
        if (s.done) return true;
        const rect = cardRect(app, entry.cardId);
        if (!rect) return false;
        const reach = Math.min(rect.width, rect.height) * MANTIS.cloakReach * s.open;
        for (let i = 0; i < 4; i += 1) {
            const u = (i + 1) / 4;
            g.circle(rect.x, rect.y, reach * u);
            g.stroke({
                width: 2.4,
                color: i % 2 === 0 ? SMOKE_PALE : SMOKE,
                alpha: s.alpha * (1 - u * 0.4),
            });
        }
        return false;
    }

    function drawSlash(entry, delta) {
        entry.elapsed += delta;
        const s = mantisEnergySlashSample(entry.elapsed);
        if (s.done) return true;
        const rect = cardRect(app, entry.cardId);
        if (!rect) return false;

        const half = Math.min(rect.width, rect.height) * MANTIS.slashReach * 0.5;
        const x0 = rect.x - half;
        const y0 = rect.y + half * 0.55;
        const x1 = rect.x - half + half * 2 * s.cut;
        const y1 = rect.y + half * 0.55 - half * 1.1 * s.cut;

        g.moveTo(x0, y0);
        g.lineTo(x1, y1);
        g.stroke({ width: MANTIS.slashWidth + 4, color: BLADE, alpha: s.alpha * 0.35 });
        g.moveTo(x0, y0);
        g.lineTo(x1, y1);
        g.stroke({ width: MANTIS.slashWidth, color: BLADE, alpha: s.alpha });
        g.moveTo(x0, y0);
        g.lineTo(x1, y1);
        g.stroke({ width: 3, color: BLADE_CORE, alpha: s.alpha });
        return false;
    }

    function drawDance(entry, delta) {
        entry.elapsed += delta;
        const s = mantisBladeDanceSample(entry.elapsed);
        if (s.done) return true;

        if (entry.casterId) {
            const rect = cardRect(app, entry.casterId);
            if (rect) {
                const veilW = rect.width * 0.95;
                const veilH = rect.height * 0.95;
                g.roundRect(rect.x - veilW / 2, rect.y - veilH / 2, veilW, veilH, 10);
                g.fill({ color: SHROUD, alpha: s.shroudAlpha });
                for (let i = 0; i < 5; i += 1) {
                    const a = s.blades[0]?.angle + i * 1.1 || i;
                    const rr = Math.max(rect.width, rect.height) * 0.28;
                    g.circle(
                        rect.x + Math.cos(a) * rr * 0.4,
                        rect.y + Math.sin(a) * rr * 0.35,
                        10 + (i % 3) * 4,
                    );
                    g.fill({ color: SMOKE, alpha: s.shroudAlpha * 0.55 });
                }
            }
        }

        for (const targetId of entry.targetIds) {
            const rect = cardRect(app, targetId);
            if (!rect) continue;
            const reach = Math.min(rect.width, rect.height) * MANTIS.danceReach * 0.5;
            for (const blade of s.blades) {
                const a0 = blade.angle;
                const a1 = a0 + 0.85;
                const x0 = rect.x + Math.cos(a0) * reach * 0.25;
                const y0 = rect.y + Math.sin(a0) * reach * 0.25;
                const x1 = rect.x + Math.cos(a1) * reach;
                const y1 = rect.y + Math.sin(a1) * reach;
                const xm = rect.x + Math.cos((a0 + a1) / 2) * reach * 0.7;
                const ym = rect.y + Math.sin((a0 + a1) / 2) * reach * 0.7;
                g.moveTo(x0, y0);
                g.quadraticCurveTo(xm, ym, x1, y1);
                g.stroke({ width: 5, color: BLADE, alpha: blade.alpha * 0.9 });
                g.moveTo(x0, y0);
                g.quadraticCurveTo(xm, ym, x1, y1);
                g.stroke({ width: 2, color: BLADE_CORE, alpha: blade.alpha });
            }
            g.circle(rect.x, rect.y, 5);
            g.fill({ color: BLADE, alpha: s.shroudAlpha * 0.8 });
        }
        return false;
    }

    const tick = () => {
        const delta = app.ticker.deltaMS || 16;
        camoClock += delta;
        g.clear();

        // Persistent cloak camo first (under bursts).
        for (const cardId of cloakedCardIds()) {
            const rect = cardRect(app, cardId);
            if (rect) drawCamo(rect, camoClock);
        }

        bursts = bursts.filter((entry) => !drawBurst(entry, delta));
        slashes = slashes.filter((entry) => !drawSlash(entry, delta));
        dances = dances.filter((entry) => !drawDance(entry, delta));
    };

    app.ticker.add(tick);

    return {
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
        },
    };
}

export default createMantisFx;
