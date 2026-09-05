import { Container, Graphics } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import { SHATTER, WARD, shatterShard, wardSample } from './fxMath';
import { PALETTE } from './fxConfig';
import { cardAnchor } from './anchors';

const SHARD = PALETTE.amberPale;
const SHARD_CORE = PALETTE.white;
const WARD_COLOR = PALETTE.amberPale;

/**
 * Axiom Stoneguard death: the relic bursts, then gold rings land on nearby allies.
 * Damage beams still come from the dying card via the shared damage bus.
 */
export function createAxiomFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const field = new Graphics();
    root.addChild(field);

    /** @type {Array<{kind: string, cardId: string, at: object, elapsed: number}>} */
    let bursts = [];

    const unsub = effectsBus.subscribe((ev) => {
        if (ev?.type === 'fx:shatter') {
            const at = cardAnchor(app, ev.payload?.cardId);
            if (!at) return;
            bursts.push({ kind: 'shatter', cardId: ev.payload.cardId, at, elapsed: 0 });
        }
        if (ev?.type === 'fx:ward') {
            const at = cardAnchor(app, ev.payload?.cardId);
            if (!at) return;
            bursts.push({ kind: 'ward', cardId: ev.payload.cardId, at, elapsed: 0 });
        }
    });

    function drawShatter(burst) {
        for (let i = 0; i < SHATTER.shardCount; i += 1) {
            const s = shatterShard(burst.at, burst.elapsed, i);
            if (s.gone || s.alpha <= 0) continue;
            const hw = s.w / 2;
            const hh = s.h / 2;
            const cos = Math.cos(s.rot);
            const sin = Math.sin(s.rot);
            const corners = [
                [-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh],
            ].map(([x, y]) => ({
                x: s.x + x * cos - y * sin,
                y: s.y + x * sin + y * cos,
            }));
            field.poly(corners.flatMap((p) => [p.x, p.y]));
            field.fill({ color: SHARD, alpha: s.alpha * 0.9 });
            field.poly([
                corners[0].x, corners[0].y,
                corners[1].x, corners[1].y,
                corners[2].x, corners[2].y,
            ]);
            field.fill({ color: SHARD_CORE, alpha: s.alpha * 0.45 });
        }
    }

    function drawWard(burst) {
        const s = wardSample(burst.elapsed);
        if (s.gone || s.alpha <= 0) return;
        field.circle(burst.at.x, burst.at.y, s.radius);
        field.stroke({ width: 4, color: WARD_COLOR, alpha: s.alpha });
        field.circle(burst.at.x, burst.at.y, s.radius * 0.55);
        field.fill({ color: WARD_COLOR, alpha: s.alpha * 0.22 });
    }

    const tick = () => {
        if (!bursts.length) return;
        const delta = app.ticker.deltaMS || 16;
        field.clear();
        const live = [];
        for (const burst of bursts) {
            burst.elapsed += delta;
            if (burst.kind === 'shatter') drawShatter(burst);
            else drawWard(burst);
            const life = burst.kind === 'shatter' ? SHATTER.ms : WARD.ms;
            if (burst.elapsed < life) live.push(burst);
        }
        bursts = live;
        if (!bursts.length) field.clear();
    };

    app.ticker.add(tick);

    return {
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            bursts = [];
        },
    };
}

export default createAxiomFx;
