import { Container, Graphics } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import {
    BLAST,
    BLAST_TOTAL_MS,
    DUPLICATE,
    LAVA,
    SMASH,
    STAFF,
    SUPPRESS,
    TIDE,
    beamQuad,
    blastSample,
    duplicateSample,
    lavaVein,
    smashSample,
    staffHop,
    suppressShot,
    tideCrest,
    tideFoam,
    tideSample,
} from './fxMath';
import { PALETTE } from './fxConfig';
import { cardAnchor, cardRect, rowRect, sideRect } from './anchors';

const ROWS = ['1f', '1m', '1b', '2f', '2m', '2b'];

function forgedIds() {
    const ids = [];
    const getRow = window.__ow_getRow;
    const getCard = window.__ow_getCard;
    if (typeof getRow !== 'function' || typeof getCard !== 'function') return ids;
    for (const rowId of ROWS) {
        for (const cardId of getRow(rowId)?.cardIds || []) {
            const card = getCard(cardId);
            if (Array.isArray(card?.effects) && card.effects.some((e) => e?.id === 'forge-hammer')) {
                ids.push(cardId);
            }
        }
    }
    return ids;
}

function drawBeam(g, from, to, elapsed, color, width) {
    const sample = blastSample(elapsed);
    if (sample.done || sample.alpha <= 0 || sample.width <= 0) return sample.done;
    const outer = beamQuad(from, to, width * sample.width, sample.reach);
    g.poly(outer.points);
    g.fill({ color, alpha: sample.alpha * 0.55 });
    const core = beamQuad(from, to, width * BLAST.coreRatio * sample.width, sample.reach);
    g.poly(core.points);
    g.fill({ color: PALETTE.white, alpha: sample.alpha * 0.9 });
    g.circle(from.x, from.y, width * 0.4);
    g.fill({ color, alpha: sample.alpha * 0.45 });
    if (sample.reach >= 1) {
        g.circle(to.x, to.y, 10 + 18 * sample.impactT);
        g.fill({ color, alpha: sample.alpha * 0.35 });
    }
    return false;
}

/**
 * Echo, Moira, Forge Hammer, BOB, and Wuyang presentation.
 * One overlay so PixiBoard does not grow another five refs.
 */
export function createKitFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);
    const g = new Graphics();
    root.addChild(g);

    let elapsed = 0;
    const beams = [];
    const dupes = [];
    const coalesces = [];
    const smashes = [];
    const bursts = [];
    const orbs = [];
    const tides = [];

    const unsub = effectsBus.subscribe((ev) => {
        const p = ev?.payload || {};
        if (ev?.type === 'fx:focusingBeam') {
            const from = cardAnchor(app, p.fromCardId);
            const to = cardAnchor(app, p.toCardId);
            if (from && to) beams.push({ kind: 'echo', from, to, elapsed: 0 });
        }
        if (ev?.type === 'fx:siphon') {
            const from = cardAnchor(app, p.fromCardId);
            const to = cardAnchor(app, p.toCardId);
            if (from && to) beams.push({ kind: 'purple', from, to, elapsed: 0 });
        }
        if (ev?.type === 'fx:bioticHeal') {
            const from = cardAnchor(app, p.fromCardId);
            const to = cardAnchor(app, p.toCardId);
            if (from && to) beams.push({ kind: 'yellow', from, to, elapsed: 0 });
        }
        if (ev?.type === 'fx:duplicate') {
            const at = cardRect(app, p.cardId);
            if (at) dupes.push({ at, elapsed: 0 });
        }
        if (ev?.type === 'fx:coalescence') {
            coalesces.push({
                yellow: (p.yellowIds || []).map((id) => cardRect(app, id)).filter(Boolean),
                purple: (p.purpleIds || []).map((id) => cardRect(app, id)).filter(Boolean),
                elapsed: 0,
            });
        }
        if (ev?.type === 'fx:suppressingFire') {
            const from = cardAnchor(app, p.fromCardId);
            const area = rowRect(app, p.rowId);
            if (from && area) bursts.push({ from, area, elapsed: 0 });
        }
        if (ev?.type === 'fx:smash') {
            (p.cardIds || []).forEach((id) => {
                const at = cardRect(app, id);
                if (at) smashes.push({ at, elapsed: 0 });
            });
        }
        if (ev?.type === 'fx:staffOrb') {
            const from = cardAnchor(app, p.fromCardId);
            const pts = [from, ...(p.targetCardIds || []).map((id) => cardAnchor(app, id))].filter(Boolean);
            if (pts.length > 1) orbs.push({ pts, elapsed: 0 });
        }
        if (ev?.type === 'fx:tideWave') {
            const from = cardAnchor(app, p.cardId);
            const playerNum = parseInt(String(p.cardId || '')[0], 10);
            const enemy = playerNum === 1 ? 2 : 1;
            const side = sideRect(app, enemy) || rowRect(app, `${enemy}b`);
            if (!from || !side) return;

            // Aim at the far edge of the enemy side, measured rather than
            // assumed: the halves sit side by side, so a hardcoded "upward"
            // sends the wave off at an angle across the board.
            const dx = side.x - from.x;
            const dy = side.y - from.y;
            const len = Math.hypot(dx, dy) || 1;
            const forward = { x: dx / len, y: dy / len };
            const reach = len + Math.max(side.width, side.height) * 0.5;
            const to = { x: from.x + forward.x * reach, y: from.y + forward.y * reach };
            // The crest spans the side across the direction of travel.
            const span = (Math.abs(forward.x) > Math.abs(forward.y) ? side.height : side.width)
                * TIDE.crestSpan;
            tides.push({ from, to, forward, span, elapsed: 0 });
        }
    });

    function drawEcho(beam) {
        drawBeam(g, beam.from, beam.to, beam.elapsed, PALETTE.echoMagenta, 18);
        drawBeam(g, beam.from, beam.to, beam.elapsed, PALETTE.echoCyan, 8);
    }

    function drawDupe(dupe) {
        const s = duplicateSample(dupe.elapsed);
        if (s.gone) return;
        g.circle(dupe.at.x, dupe.at.y, s.radius);
        g.stroke({ width: 3, color: PALETTE.echoCyan, alpha: s.alpha });
        g.circle(dupe.at.x, dupe.at.y, s.radius * 0.62);
        g.stroke({ width: 2, color: PALETTE.echoMagenta, alpha: s.alpha * 0.85 });
        const y = dupe.at.top + dupe.at.height * s.scan;
        g.rect(dupe.at.left, y - 2, dupe.at.width, 4);
        g.fill({ color: PALETTE.white, alpha: s.alpha * 0.55 });
    }

    function drawCoalesce(burst) {
        const t = burst.elapsed / 620;
        const alpha = Math.max(0, 1 - t);
        if (alpha <= 0) return;
        burst.yellow.forEach((at) => {
            g.circle(at.x, at.y, 22 + 18 * t);
            g.stroke({ width: 4, color: PALETTE.moiraYellow, alpha });
            g.circle(at.x, at.y, 10);
            g.fill({ color: PALETTE.moiraYellow, alpha: alpha * 0.28 });
        });
        burst.purple.forEach((at) => {
            g.circle(at.x, at.y, 22 + 18 * t);
            g.stroke({ width: 4, color: PALETTE.moiraPurple, alpha });
            g.circle(at.x, at.y, 10);
            g.fill({ color: PALETTE.moiraPurple, alpha: alpha * 0.28 });
        });
    }

    function drawLava(rect) {
        for (let i = 0; i < LAVA.veinCount; i += 1) {
            const vein = lavaVein(rect, elapsed, i);
            if (vein.points.length < 2) continue;
            g.moveTo(vein.points[0].x, vein.points[0].y);
            for (let p = 1; p < vein.points.length; p += 1) {
                g.lineTo(vein.points[p].x, vein.points[p].y);
            }
            g.stroke({ width: 4.5, color: PALETTE.lava, alpha: vein.alpha * 0.85 });
            g.moveTo(vein.points[0].x, vein.points[0].y);
            for (let p = 1; p < vein.points.length; p += 1) {
                g.lineTo(vein.points[p].x, vein.points[p].y);
            }
            g.stroke({ width: 1.8, color: PALETTE.lavaHot, alpha: vein.alpha });
        }
    }

    function drawSuppress(burst) {
        for (let i = 0; i < SUPPRESS.rounds; i += 1) {
            const shot = suppressShot(burst.elapsed, i, burst.from, burst.area);
            if (!shot.visible) continue;
            const body = beamQuad(burst.from, shot.head, SUPPRESS.width, 1);
            g.poly(body.points);
            g.fill({ color: PALETTE.hot, alpha: 0.9 });
        }
    }

    function drawSmash(smash) {
        const s = smashSample(smash.elapsed);
        if (s.gone) return;
        const y = smash.at.y + s.offsetY;
        g.roundRect(
            smash.at.left + 6,
            smash.at.top + smash.at.height * (1 - s.squash) + s.offsetY,
            smash.at.width - 12,
            smash.at.height * s.squash - 8,
            8,
        );
        g.fill({ color: PALETTE.smoke, alpha: 0.22 });
        g.ellipse(smash.at.x, smash.at.top + smash.at.height - 4, s.smokeR, s.smokeR * 0.38);
        g.fill({ color: PALETTE.smoke, alpha: 0.4 });
        g.circle(smash.at.x, y, 7);
        g.fill({ color: PALETTE.white, alpha: 0.55 });
    }

    function drawOrb(orb) {
        const hop = staffHop(orb.elapsed, orb.pts);
        if (hop.gone) return true;
        const trail = beamQuad(hop.trail, hop, 5, 1);
        g.poly(trail.points);
        g.fill({ color: PALETTE.water, alpha: 0.45 });
        g.circle(hop.x, hop.y, STAFF.radius);
        g.fill({ color: PALETTE.water, alpha: 0.9 });
        g.circle(hop.x, hop.y, STAFF.radius * 0.45);
        g.fill({ color: PALETTE.waterPale, alpha: 0.95 });
        return false;
    }

    /**
     * A wall of water crossing the enemy side.
     *
     * The first pass drew one thin quad sliding along, which read as a smear.
     * This draws an actual crest: a bowed front spanning the side, a wash
     * dragged behind it, foam on the lip and spray thrown out ahead.
     */
    function drawTide(tide) {
        const s = tideSample(tide.elapsed, tide.from, tide.to);
        if (s.gone) return true;

        const forward = tide.forward;
        const crest = tideCrest({ x: s.x, y: s.y }, forward, tide.span);
        if (crest.length < 2) return false;

        // The wash behind: the crest, walked back along the travel.
        const back = crest.map((pt) => ({
            x: pt.x - forward.x * TIDE.wash,
            y: pt.y - forward.y * TIDE.wash,
        }));
        const body = [];
        for (const pt of crest) body.push(pt.x, pt.y);
        for (let i = back.length - 1; i >= 0; i -= 1) body.push(back[i].x, back[i].y);
        g.poly(body);
        g.fill({ color: PALETTE.water, alpha: 0.34 });

        // The lip itself, brighter than the body it drags.
        const lip = [];
        for (const pt of crest) lip.push(pt.x, pt.y);
        for (let i = crest.length - 1; i >= 0; i -= 1) {
            lip.push(crest[i].x - forward.x * 16, crest[i].y - forward.y * 16);
        }
        g.poly(lip);
        g.fill({ color: PALETTE.waterPale, alpha: 0.72 });

        const { caps, spray } = tideFoam(tide.elapsed);
        const at = (f) => crest[Math.min(crest.length - 1, Math.round(f * (crest.length - 1)))];
        for (const cap of caps) {
            const pt = at(cap.f);
            g.circle(pt.x + forward.x * cap.lift, pt.y + forward.y * cap.lift, cap.radius);
            g.fill({ color: PALETTE.waterPale, alpha: cap.alpha * 0.85 });
        }
        for (const drop of spray) {
            const pt = at(drop.f);
            const nx = -forward.y;
            const ny = forward.x;
            g.circle(
                pt.x + forward.x * drop.ahead + nx * drop.side,
                pt.y + forward.y * drop.ahead + ny * drop.side,
                drop.radius,
            );
            g.fill({ color: PALETTE.waterPale, alpha: drop.alpha * (1 - s.t * 0.4) });
        }
        return false;
    }

    const tick = () => {
        const delta = app.ticker.deltaMS || 16;
        elapsed += delta;
        g.clear();

        forgedIds().forEach((id) => {
            const rect = cardRect(app, id);
            if (rect) drawLava(rect);
        });

        const liveBeams = [];
        for (const beam of beams) {
            beam.elapsed += delta;
            if (beam.kind === 'echo') drawEcho(beam);
            else if (beam.kind === 'purple') drawBeam(g, beam.from, beam.to, beam.elapsed, PALETTE.moiraPurple, 14);
            else drawBeam(g, beam.from, beam.to, beam.elapsed, PALETTE.moiraYellow, 14);
            if (beam.elapsed < BLAST_TOTAL_MS) liveBeams.push(beam);
        }
        beams.length = 0;
        beams.push(...liveBeams);

        const liveDupes = [];
        for (const dupe of dupes) {
            dupe.elapsed += delta;
            drawDupe(dupe);
            if (dupe.elapsed < DUPLICATE.ms) liveDupes.push(dupe);
        }
        dupes.length = 0;
        dupes.push(...liveDupes);

        const liveCoal = [];
        for (const burst of coalesces) {
            burst.elapsed += delta;
            drawCoalesce(burst);
            if (burst.elapsed < 620) liveCoal.push(burst);
        }
        coalesces.length = 0;
        coalesces.push(...liveCoal);

        const liveBurst = [];
        for (const burst of bursts) {
            burst.elapsed += delta;
            drawSuppress(burst);
            if (burst.elapsed < SUPPRESS.burstGapMs * SUPPRESS.rounds + SUPPRESS.travelMs) liveBurst.push(burst);
        }
        bursts.length = 0;
        bursts.push(...liveBurst);

        const liveSmash = [];
        for (const smash of smashes) {
            smash.elapsed += delta;
            drawSmash(smash);
            if (smash.elapsed < SMASH.ms) liveSmash.push(smash);
        }
        smashes.length = 0;
        smashes.push(...liveSmash);

        const liveOrbs = [];
        for (const orb of orbs) {
            orb.elapsed += delta;
            if (!drawOrb(orb)) liveOrbs.push(orb);
        }
        orbs.length = 0;
        orbs.push(...liveOrbs);

        const liveTides = [];
        for (const tide of tides) {
            tide.elapsed += delta;
            if (!drawTide(tide)) liveTides.push(tide);
        }
        tides.length = 0;
        tides.push(...liveTides);
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

export default createKitFx;
