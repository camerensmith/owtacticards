import { Container, Graphics } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import {
    INFRA,
    SPRAY,
    bloodSprayDrops,
    bloodSpraySample,
    creviceSample,
    creviceTotalMs,
    creviceWedge,
    infraSheenSample,
    superchargeWave,
} from './fxMath';
import { PALETTE } from './fxConfig';
import { cardAnchor, cardRect, rowRect } from './anchors';

const CHARGE_LINE = 0xcfe9ff;
const CHARGE_CORE = PALETTE.white;
const INFRA_RED = 0xff2d2d;
const EARTH = 0x6b4423;
const MAGMA = 0xd93a1f;
const BLOOD = PALETTE.blood;
const BLOOD_DARK = PALETTE.bloodDark;
const ROWS = ['1f', '1m', '1b', '2f', '2m', '2b'];

/** Pinned once resolved: a kill shot removes the card it landed on. */
function pinned(entry, key, resolve) {
    if (!entry[key]) entry[key] = resolve() || null;
    return entry[key];
}

/**
 * Row auras and heavy hits.
 *
 *  - Supercharger: a charged line wobbling across every hero in Orisa's row.
 *  - Infra-Sight: a red sheen that periodically sweeps the marked row.
 *  - Earthshatter: a crevice torn down the struck column.
 *  - Widowmaker's kill shot: splatter that stains the board, then fades.
 *
 * The two auras are state-driven, so they last exactly as long as their tokens.
 */
export function createRowAuraFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const auras = new Graphics();
    const hits = new Graphics();
    root.addChild(auras);
    root.addChild(hits);

    let elapsed = 0;
    let crevices = [];
    let sprays = [];

    const unsub = effectsBus.subscribe((ev) => {
        if (ev?.type === 'fx:crevice') {
            crevices.push({
                fromId: ev.payload?.fromCardId,
                toId: ev.payload?.toCardId,
                elapsed: 0,
            });
        } else if (ev?.type === 'fx:bloodSpray') {
            sprays.push({ cardId: ev.payload?.cardId, elapsed: 0 });
        }
    });

    function rowHasEffect(row, id) {
        return [...(row?.allyEffects || []), ...(row?.enemyEffects || [])]
            .some((e) => e?.id === id);
    }

    function drawAuras() {
        const getRow = window.__ow_getRow;
        if (typeof getRow !== 'function') return;

        for (const rowId of ROWS) {
            const row = getRow(rowId);
            if (!row) continue;

            // --- Supercharger: a line over each hero in the row ---------------
            if (rowHasEffect(row, 'orisa-supercharger')) {
                for (const cardId of row.cardIds || []) {
                    const rect = cardRect(app, cardId);
                    if (!rect) continue;
                    const points = superchargeWave(rect, elapsed);
                    auras.moveTo(points[0].x, points[0].y);
                    for (let i = 1; i < points.length; i += 1) auras.lineTo(points[i].x, points[i].y);
                    auras.stroke({ width: 3, color: CHARGE_LINE, alpha: 0.35 });
                    auras.moveTo(points[0].x, points[0].y);
                    for (let i = 1; i < points.length; i += 1) auras.lineTo(points[i].x, points[i].y);
                    auras.stroke({ width: 1, color: CHARGE_CORE, alpha: 0.75 });
                }
            }

            // --- Infra-Sight: a sheen crossing the row -----------------------
            if (rowHasEffect(row, 'widowmaker-token')) {
                const s = infraSheenSample(elapsed);
                if (!s.active) continue;
                const rect = rowRect(app, rowId);
                if (!rect) continue;

                // Rows run tall here, so the sheen sweeps down the long axis.
                const vertical = rect.height >= rect.width;
                const span = vertical ? rect.height : rect.width;
                const band = span * INFRA.bandWidth;
                const head = -band + (span + band * 2) * s.u;

                // Stacked bands of falling alpha stand in for a gradient.
                for (let i = 0; i < INFRA.bands; i += 1) {
                    const frac = i / INFRA.bands;
                    const offset = head - band * frac;
                    const thickness = band / INFRA.bands;
                    const alpha = s.alpha * (1 - frac);
                    if (vertical) {
                        auras.rect(rect.left, rect.top + offset, rect.width, thickness);
                    } else {
                        auras.rect(rect.left + offset, rect.top, thickness, rect.height);
                    }
                    auras.fill({ color: INFRA_RED, alpha });
                }
            }
        }
    }

    function drawCrevice(entry, delta) {
        entry.elapsed += delta;
        const s = creviceSample(entry.elapsed);
        if (s.done) return true;

        // Pinned: the column it splits may be wiped out by the same hit.
        const from = pinned(entry, 'from', () => cardAnchor(app, entry.fromId));
        const to = pinned(entry, 'to', () => cardAnchor(app, entry.toId));
        if (!from || !to) return false;

        const wedge = creviceWedge(from, to, s.open);
        const flat = [];
        for (const point of wedge) flat.push(point.x, point.y);

        // Dark earth split open, with magma glowing in the gap.
        hits.poly(flat);
        hits.fill({ color: EARTH, alpha: s.alpha * 0.95 });

        const inner = creviceWedge(from, to, s.open * 0.45);
        const innerFlat = [];
        for (const point of inner) innerFlat.push(point.x, point.y);
        hits.poly(innerFlat);
        hits.fill({ color: MAGMA, alpha: s.alpha * 0.85 });

        hits.poly(flat);
        hits.stroke({ width: 2, color: MAGMA, alpha: s.alpha * 0.6 });
        return false;
    }

    function drawSpray(entry, delta) {
        entry.elapsed += delta;
        const s = bloodSpraySample(entry.elapsed);
        if (s.done) return true;

        // Pinned: this shot kills, so the card is gone almost immediately.
        const rect = pinned(entry, 'rect', () => cardRect(app, entry.cardId));
        if (!rect) return false;

        for (const drop of bloodSprayDrops(rect)) {
            const x = rect.x + drop.dx * s.spread;
            const y = rect.y + drop.dy * s.spread;
            hits.circle(x, y, drop.radius);
            hits.fill({ color: BLOOD, alpha: s.alpha * 0.85 });
            hits.circle(x, y, drop.radius * 0.45);
            hits.fill({ color: BLOOD_DARK, alpha: s.alpha * 0.9 });
        }
        return false;
    }

    const tick = () => {
        const delta = app.ticker.deltaMS || 16;
        elapsed += delta;

        auras.clear();
        drawAuras();

        hits.clear();
        if (crevices.length) {
            const done = crevices.filter((e) => drawCrevice(e, delta));
            if (done.length) crevices = crevices.filter((c) => !done.includes(c));
        }
        if (sprays.length) {
            const done = sprays.filter((e) => drawSpray(e, delta));
            if (done.length) sprays = sprays.filter((s) => !done.includes(s));
        }
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests. */
        activeCrevices: () => crevices.length,
        activeSprays: () => sprays.length,
        creviceMs: creviceTotalMs(),
        sprayMs: SPRAY.lifeMs,
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            crevices = [];
            sprays = [];
        },
    };
}

export default createRowAuraFx;
