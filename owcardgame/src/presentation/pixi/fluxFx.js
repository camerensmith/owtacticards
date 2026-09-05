import { Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import { heroCardImages } from '../../assets/imageImports';
import {
    ANNIHILATE,
    FLUX,
    annihilateSample,
    fizzSample,
    fluxBeamAlpha,
    fluxGravityRipples,
    fluxSample,
    synergySwirlSample,
} from './fxMath';
import { PALETTE } from './fxConfig';
import { cardAnchor, cardRect, rowRect } from './anchors';

const VOID = 0x1a1024;
const VOID_EDGE = 0x7a4fd0;
const SYNERGY = PALETTE.iceDeep;
const FIZZ = 0x9d7bd8;

async function textureFor(cardId) {
    const heroId = typeof cardId === 'string' ? cardId.slice(1) : '';
    const url = heroCardImages[heroId] || heroCardImages['card-back'];
    if (!url) return Texture.WHITE;
    try {
        return Assets.get(url) || (await Assets.load(url));
    } catch {
        return Texture.WHITE;
    }
}

/**
 * Sigma's Gravitic Flux and Nemesis's Annihilation.
 *
 *  - Flux: every card in the row is hauled off the board — a ghost rises while
 *    its shadow tightens beneath — held, then slammed down, with the row's
 *    synergy spiralling away afterwards. While airborne, purple/void tethers
 *    and gravity ripples link Sigma to each lifted card.
 *  - Annihilation: a black beam fizzing along the enemy row and column.
 */
export function createFluxFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const shadows = new Graphics();
    const ghosts = new Container();
    const tethers = new Graphics();
    const swirl = new Graphics();
    const beams = new Graphics();
    root.addChild(shadows);
    root.addChild(ghosts);
    root.addChild(tethers);
    root.addChild(swirl);
    root.addChild(beams);

    /** @type {Array<{cards: Array, origin: object, sourceCardId?: string, elapsed: number}>} */
    let fluxes = [];
    /** @type {Array<{lines: Array, elapsed: number, sparks: Array}>} */
    let annihilations = [];
    let nextSeed = 0;

    async function startFlux(payload) {
        const cardIds = payload?.cardIds || [];
        const origin = rowRect(app, payload?.rowId);
        if (!cardIds.length || !origin) return;

        const cards = [];
        for (const cardId of cardIds) {
            const rect = cardRect(app, cardId);
            if (!rect) continue;
            const sprite = new Sprite(await textureFor(cardId));
            sprite.anchor.set(0.5);
            sprite.width = rect.width;
            sprite.height = rect.height;
            sprite.position.set(rect.x, rect.y);
            ghosts.addChild(sprite);
            cards.push({ sprite, rect });
        }
        if (!cards.length) return;
        fluxes.push({
            cards,
            origin,
            sourceCardId: payload?.sourceCardId || null,
            elapsed: 0,
        });
    }

    const unsub = effectsBus.subscribe((ev) => {
        if (ev?.type === 'fx:graviticFlux') {
            startFlux(ev.payload);
            return;
        }
        if (ev?.type === 'fx:annihilation') {
            // Each line is a pair of endpoints: the row, and the column.
            const lines = (ev.payload?.lines || [])
                .map(([fromId, toId]) => {
                    const a = cardAnchor(app, fromId);
                    const b = cardAnchor(app, toId);
                    return a && b ? { a, b } : null;
                })
                .filter(Boolean);
            if (lines.length) annihilations.push({ lines, elapsed: 0, sparks: [] });
        }
    });

    function strokeTether(from, to, alpha) {
        if (!from || !to || alpha <= 0) return;
        const w = FLUX.beamWidth || 10;
        tethers.moveTo(from.x, from.y);
        tethers.lineTo(to.x, to.y);
        tethers.stroke({ width: w, color: VOID, alpha: alpha * 0.92 });
        tethers.moveTo(from.x, from.y);
        tethers.lineTo(to.x, to.y);
        tethers.stroke({ width: w * 0.35, color: VOID_EDGE, alpha: alpha * 0.7 });
    }

    function strokeRipples(cx, cy, rings) {
        for (const ring of rings) {
            if (ring.alpha <= 0 || ring.rx <= 0) continue;
            tethers.ellipse(cx, cy, ring.rx, ring.ry);
            tethers.stroke({ width: 2, color: VOID_EDGE, alpha: ring.alpha });
        }
    }

    function drawFlux(entry, delta) {
        entry.elapsed += delta;

        for (const card of entry.cards) {
            const s = fluxSample(entry.elapsed, card.rect.height);

            // Shadow stays on the board and tightens as the card climbs.
            const shadowW = card.rect.width * 0.7 * s.shadow;
            shadows.ellipse(card.rect.x, card.rect.y + card.rect.height * 0.42, shadowW, shadowW * 0.28);
            shadows.fill({ color: 0x000000, alpha: 0.42 * s.shadow });

            card.sprite.visible = !s.done;
            card.sprite.position.set(card.rect.x, card.rect.y - s.height);
            // A touch bigger while airborne, so height reads at a glance.
            const grow = 1 + (s.height / Math.max(1, card.rect.height)) * 0.12;
            card.sprite.width = card.rect.width * grow;
            card.sprite.height = card.rect.height * grow;

            if (s.phase === 'settle' && s.slamT < 0.4) {
                const ring = card.rect.width * (0.4 + s.slamT * 2.2);
                shadows.ellipse(card.rect.x, card.rect.y + card.rect.height * 0.42, ring, ring * 0.28);
                shadows.stroke({ width: 2, color: VOID_EDGE, alpha: (1 - s.slamT / 0.4) * 0.8 });
            }
        }

        const tetherA = fluxBeamAlpha(entry.elapsed);
        if (tetherA > 0) {
            const source = entry.sourceCardId ? cardAnchor(app, entry.sourceCardId) : null;
            if (source) {
                strokeRipples(source.x, source.y, fluxGravityRipples(entry.elapsed));
                for (let i = 0; i < entry.cards.length; i += 1) {
                    const card = entry.cards[i];
                    const to = { x: card.sprite.x, y: card.sprite.y };
                    strokeTether(source, to, tetherA);
                    strokeRipples(
                        to.x,
                        to.y,
                        fluxGravityRipples(entry.elapsed, {
                            scale: 0.65,
                            phaseOffset: (i * 0.17) % 1,
                        }),
                    );
                }
            } else {
                // No Sigma anchor: still ripple on the lifted cards.
                for (let i = 0; i < entry.cards.length; i += 1) {
                    const card = entry.cards[i];
                    strokeRipples(
                        card.sprite.x,
                        card.sprite.y,
                        fluxGravityRipples(entry.elapsed, {
                            scale: 0.65,
                            phaseOffset: (i * 0.17) % 1,
                        }),
                    );
                }
            }
        }

        // Synergy spirals off once the row has been slammed.
        const swirlAge = entry.elapsed - (FLUX.liftMs + FLUX.hangMs + FLUX.slamMs);
        if (swirlAge > 0) {
            for (let i = 0; i < FLUX.swirlCount; i += 1) {
                const s = synergySwirlSample(i, swirlAge, entry.origin);
                if (!s.visible) continue;
                swirl.circle(s.x, s.y, s.radius);
                swirl.fill({ color: SYNERGY, alpha: s.alpha });
            }
        }

        return fluxSample(entry.elapsed).done;
    }

    function drawAnnihilation(entry, delta) {
        entry.elapsed += delta;
        const s = annihilateSample(entry.elapsed);

        for (const line of entry.lines) {
            const hx = line.a.x + (line.b.x - line.a.x) * s.reach;
            const hy = line.a.y + (line.b.y - line.a.y) * s.reach;

            // Void core with a bright rim, so black still reads on a dark board.
            beams.moveTo(line.a.x, line.a.y);
            beams.lineTo(hx, hy);
            beams.stroke({ width: ANNIHILATE.width * s.width, color: VOID, alpha: s.alpha * 0.92 });
            beams.moveTo(line.a.x, line.a.y);
            beams.lineTo(hx, hy);
            beams.stroke({ width: ANNIHILATE.width * s.width * 0.35, color: VOID_EDGE, alpha: s.alpha * 0.55 });
        }

        if (!s.done) {
            const spawn = (ANNIHILATE.fizzPerSecond * delta) / 1000;
            const whole = Math.floor(spawn) + (Math.random() < spawn % 1 ? 1 : 0);
            for (let i = 0; i < whole; i += 1) {
                const line = entry.lines[Math.floor(Math.random() * entry.lines.length)];
                entry.sparks.push({ seed: nextSeed++, age: 0, line });
            }
        }

        const alive = [];
        for (const spark of entry.sparks) {
            spark.age += delta;
            const f = fizzSample(spark.seed, spark.age, spark.line.a, spark.line.b);
            if (!f.visible) continue;
            alive.push(spark);
            beams.circle(f.x, f.y, f.radius);
            beams.fill({ color: FIZZ, alpha: f.alpha });
        }
        entry.sparks = alive;

        return s.done && alive.length === 0;
    }

    const tick = () => {
        const delta = app.ticker.deltaMS || 16;

        shadows.clear();
        tethers.clear();
        swirl.clear();
        if (fluxes.length) {
            const finished = [];
            for (const entry of fluxes) {
                if (drawFlux(entry, delta)) finished.push(entry);
            }
            if (finished.length) {
                for (const entry of finished) {
                    for (const card of entry.cards) {
                        if (!card.sprite.destroyed) card.sprite.destroy();
                    }
                }
                fluxes = fluxes.filter((f) => !finished.includes(f));
            }
        }

        beams.clear();
        if (annihilations.length) {
            const finished = [];
            for (const entry of annihilations) {
                if (drawAnnihilation(entry, delta)) finished.push(entry);
            }
            if (finished.length) annihilations = annihilations.filter((a) => !finished.includes(a));
        }
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests. */
        activeFluxes: () => fluxes.length,
        activeBeams: () => annihilations.length,
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            fluxes = [];
            annihilations = [];
        },
    };
}

export default createFluxFx;
