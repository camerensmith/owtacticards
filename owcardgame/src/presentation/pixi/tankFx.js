import { Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import { heroCardImages } from '../../assets/imageImports';
import {
    BUBBLE,
    MATRIX,
    TECTONIC,
    bubbleSample,
    burrowMounds,
    burrowSample,
    burrowTotalMs,
    emberOffsets,
    impactFlashSample,
    matrixPanels,
    matrixSample,
    primalSample,
    primalTotalMs,
    tectonicSample,
} from './fxMath';
import { PALETTE } from './fxConfig';
import { cardAnchor, cardRect, facingVector, rowRect } from './anchors';

const MATRIX_BLUE = 0x5ec8ff;
const BUBBLE_BLUE = 0x4da3ff;
const RAGE_RED = 0xd7301f;
const EARTH = 0x7a5230;
const EARTH_DARK = 0x4d3520;
const ROWS = ['1f', '1m', '1b', '2f', '2m', '2b'];

/** Pinned once resolved, for effects whose target may be removed mid-flight. */
function pinned(entry, key, resolve) {
    if (!entry[key]) entry[key] = resolve() || null;
    return entry[key];
}

async function cardTexture(cardId) {
    const heroId = typeof cardId === 'string' ? cardId.slice(1) : '';
    const url = heroCardImages[heroId] || heroCardImages['card-back'];
    try {
        return Assets.get(url) || (await Assets.load(url));
    } catch {
        return Texture.WHITE;
    }
}

/**
 * D.Va, Winston and Venture.
 *
 *  - Defense Matrix: panels unfolding out from the card.
 *  - Barrier Protector: a bubble around Winston for as long as shields hold —
 *    read from state, so it clears the moment they are gone.
 *  - Primal Rage: Winston swells red and hammers the row he moves to.
 *  - Drill Dash: a mound tunnels to the target and erupts.
 *  - Tectonic Shock: caught cards shake hard and tumble.
 */
export function createTankFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const bubbles = new Graphics();
    const g = new Graphics();
    const ghosts = new Container();
    root.addChild(bubbles);
    root.addChild(g);
    root.addChild(ghosts);

    let elapsed = 0;
    let matrices = [];
    let rages = [];
    let burrows = [];
    let quakes = [];

    async function startRage(payload) {
        if (!payload?.cardId) return;
        const sprite = new Sprite(await cardTexture(payload.cardId));
        sprite.anchor.set(0.5);
        sprite.tint = RAGE_RED;
        sprite.visible = false;
        ghosts.addChild(sprite);
        // No rect is taken here: Winston leaps to another row as this fires, so
        // his card may not be measurable yet. `drawRage` resolves it per frame.
        rages.push({ sprite, cardId: payload.cardId, rowId: payload.rowId, base: null, elapsed: 0 });
    }

    async function startQuake(payload) {
        const ids = payload?.cardIds || [];
        const entries = [];
        for (const cardId of ids) {
            const rect = cardRect(app, cardId);
            if (!rect) continue;
            const sprite = new Sprite(await cardTexture(cardId));
            sprite.anchor.set(0.5);
            sprite.width = rect.width;
            sprite.height = rect.height;
            ghosts.addChild(sprite);
            entries.push({ sprite, rect });
        }
        if (entries.length) quakes.push({ entries, elapsed: 0 });
    }

    const unsub = effectsBus.subscribe((ev) => {
        if (ev?.type === 'fx:matrix') {
            matrices.push({ cardId: ev.payload?.cardId, elapsed: 0 });
        } else if (ev?.type === 'fx:primalRage') {
            startRage(ev.payload);
        } else if (ev?.type === 'fx:burrow') {
            burrows.push({ fromId: ev.payload?.fromCardId, toId: ev.payload?.toCardId, elapsed: 0 });
        } else if (ev?.type === 'fx:tectonic') {
            startQuake(ev.payload);
        }
    });

    /** Winston's bubble, drawn from live shield state rather than an event. */
    function drawBubbles() {
        const getRow = window.__ow_getRow;
        const getCard = window.__ow_getCard;
        if (typeof getRow !== 'function' || typeof getCard !== 'function') return;

        const s = bubbleSample(elapsed);
        for (const rowId of ROWS) {
            for (const cardId of getRow(rowId)?.cardIds || []) {
                const card = getCard(cardId);
                if (card?.id !== 'winston' || (card.shield || 0) <= 0) continue;
                const rect = cardRect(app, cardId);
                if (!rect) continue;

                const radius = Math.max(rect.width, rect.height) * BUBBLE.radius * s.scale;
                bubbles.circle(rect.x, rect.y, radius);
                bubbles.fill({ color: BUBBLE_BLUE, alpha: s.coreAlpha });
                bubbles.circle(rect.x, rect.y, radius);
                bubbles.stroke({ width: 3, color: MATRIX_BLUE, alpha: s.rimAlpha });
            }
        }
    }

    function drawMatrix(entry, delta) {
        entry.elapsed += delta;
        const s = matrixSample(entry.elapsed);
        if (s.done) return true;

        const rect = cardRect(app, entry.cardId);
        if (!rect) return false;

        const facing = facingVector(app, parseInt(String(entry.cardId)[0], 10));
        for (const panel of matrixPanels(rect, s.deploy, facing)) {
            const half = panel.size / 2;
            g.rect(panel.x - half, panel.y - half, panel.size, panel.size);
            g.fill({ color: MATRIX_BLUE, alpha: s.alpha * panel.alpha * 0.3 });
            g.rect(panel.x - half, panel.y - half, panel.size, panel.size);
            g.stroke({ width: 2, color: MATRIX_BLUE, alpha: s.alpha * panel.alpha });
        }
        return false;
    }

    function drawRage(entry, delta) {
        entry.elapsed += delta;
        const s = primalSample(entry.elapsed);
        if (s.done) return true;

        const rect = cardRect(app, entry.cardId) || entry.base;
        if (!rect) return false;
        entry.base = entry.base || rect;

        entry.sprite.visible = true;
        entry.sprite.width = entry.base.width * s.scale;
        entry.sprite.height = entry.base.height * s.scale;
        entry.sprite.alpha = 0.8;
        entry.sprite.position.set(rect.x, rect.y - s.pound * 22);

        // Each pound lands on the row he moved into. The flash ages on the
        // pound's own progress: driving it from the rebound put the ring at
        // radius zero exactly when it was brightest, so it never showed.
        if (s.phase === 'pound') {
            const row = rowRect(app, entry.rowId);
            if (row) {
                const reach = Math.min(row.width, row.height) * 0.9;
                const flash = impactFlashSample(s.poundT, reach);

                // The whole row jolts red under the hammering.
                g.rect(row.left, row.top, row.width, row.height);
                g.fill({ color: RAGE_RED, alpha: 0.16 * flash.alpha });

                for (const ember of emberOffsets(12, flash.emberDistance)) {
                    g.circle(row.x + ember.x, row.y + ember.y, flash.emberRadius * 1.5);
                    g.fill({ color: RAGE_RED, alpha: flash.emberAlpha });
                }
                g.circle(row.x, row.y, flash.radius);
                g.stroke({ width: 6, color: RAGE_RED, alpha: flash.alpha });
                g.circle(row.x, row.y, flash.radius * 0.6);
                g.stroke({ width: 3, color: PALETTE.white, alpha: flash.alpha * 0.7 });
                g.circle(row.x, row.y, flash.coreRadius);
                g.fill({ color: PALETTE.white, alpha: flash.coreAlpha * 0.8 });
            }
        }
        return false;
    }

    function drawBurrow(entry, delta) {
        entry.elapsed += delta;
        const s = burrowSample(entry.elapsed);
        if (s.done) return true;

        const from = cardAnchor(app, entry.fromId);
        // Pinned: Drill Dash can finish off whatever it tunnels into.
        const to = pinned(entry, 'to', () => cardAnchor(app, entry.toId));
        if (!from || !to) return false;

        for (const mound of burrowMounds(from, to, s.reach)) {
            g.ellipse(mound.x, mound.y, mound.size, mound.size * 0.6);
            g.fill({ color: EARTH, alpha: mound.alpha * 0.9 });
            g.ellipse(mound.x, mound.y + mound.size * 0.2, mound.size * 0.6, mound.size * 0.3);
            g.fill({ color: EARTH_DARK, alpha: mound.alpha * 0.7 });
        }

        if (!s.digging && s.eruptT < 1) {
            const flash = impactFlashSample(s.eruptT, 46);
            for (const clod of emberOffsets(9, flash.emberDistance)) {
                g.circle(to.x + clod.x, to.y + clod.y, flash.emberRadius * 1.4);
                g.fill({ color: EARTH, alpha: flash.emberAlpha });
            }
        }
        return false;
    }

    function drawQuake(entry, delta) {
        entry.elapsed += delta;
        let allDone = true;
        entry.entries.forEach((card, i) => {
            const s = tectonicSample(entry.elapsed, i);
            if (!s.done) allDone = false;
            card.sprite.visible = !s.done;
            card.sprite.position.set(card.rect.x + s.offsetX, card.rect.y + s.offsetY);
            card.sprite.rotation = s.rotation;
        });
        return allDone;
    }

    const tick = () => {
        const delta = app.ticker.deltaMS || 16;
        elapsed += delta;

        bubbles.clear();
        drawBubbles();

        g.clear();
        const sweep = (list, draw, cleanup) => {
            if (!list.length) return list;
            const done = list.filter((e) => draw(e, delta));
            if (!done.length) return list;
            if (cleanup) done.forEach(cleanup);
            return list.filter((e) => !done.includes(e));
        };

        matrices = sweep(matrices, drawMatrix);
        burrows = sweep(burrows, drawBurrow);
        rages = sweep(rages, drawRage, (e) => {
            if (!e.sprite.destroyed) e.sprite.destroy();
        });
        quakes = sweep(quakes, drawQuake, (e) => {
            for (const card of e.entries) {
                if (!card.sprite.destroyed) card.sprite.destroy();
            }
        });
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests. */
        activeMatrices: () => matrices.length,
        activeQuakes: () => quakes.length,
        primalMs: primalTotalMs(),
        burrowMs: burrowTotalMs(),
        quakeMs: TECTONIC.durationMs,
        matrixPanelCount: MATRIX.panels,
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            matrices = [];
            rages = [];
            burrows = [];
            quakes = [];
        },
    };
}

export default createTankFx;
