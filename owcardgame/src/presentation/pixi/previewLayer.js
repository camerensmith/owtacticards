import { Container, Graphics } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import { emptyPreview } from '../../game/targetPreview';
import { PREVIEW, cardPulseAlpha, chevronSamples, stripeOffset } from './fxMath';

function boxOf(id) {
    const el = typeof id === 'string' ? document.getElementById(id) : id;
    if (!el || typeof el.getBoundingClientRect !== 'function') return null;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return null;
    return r;
}

function toLocalBox(app, box) {
    if (!box) return null;
    const canvas = app.canvas.getBoundingClientRect();
    return {
        left: box.left - canvas.left,
        top: box.top - canvas.top,
        width: box.width,
        height: box.height,
        x: box.left + box.width / 2 - canvas.left,
        y: box.top + box.height / 2 - canvas.top,
    };
}

function slotBox(app, rowId, index) {
    const list = document.getElementById(`${rowId}-list`);
    const items = list?.querySelectorAll(':scope > li');
    if (items?.[index]) return toLocalBox(app, items[index].getBoundingClientRect());
    return toLocalBox(app, boxOf(`${rowId}-list`));
}

function columnUnion(app, column) {
    if (!column) return null;
    const boxes = [`${column.playerNum}f`, `${column.playerNum}m`, `${column.playerNum}b`]
        .map((rid) => slotBox(app, rid, column.index))
        .filter(Boolean);
    if (!boxes.length) return null;
    const left = Math.min(...boxes.map((b) => b.left));
    const top = Math.min(...boxes.map((b) => b.top));
    const right = Math.max(...boxes.map((b) => b.left + b.width));
    const bottom = Math.max(...boxes.map((b) => b.top + b.height));
    return { left, top, width: right - left, height: bottom - top };
}

function drawStripes(g, box, elapsed, alphaScale) {
    const w = PREVIEW.stripeWidth;
    const shift = stripeOffset(elapsed) * w * 2;
    const { left, top, width, height } = box;
    let i = 0;
    for (let x = -height - w * 2 + shift; x < width + height + w; x += w) {
        const color = i % 2 === 0 ? PREVIEW.navy : PREVIEW.grey;
        g.poly([
            left + x, top,
            left + x + height, top + height,
            left + x + height + w, top + height,
            left + x + w, top,
        ], true);
        g.fill({ color, alpha: (i % 2 === 0 ? 0.2 : 0.1) * alphaScale });
        i += 1;
    }
}

function drawChevron(g, sample, size, alpha) {
    const back = sample.angle + Math.PI;
    const spread = Math.PI * 0.28;
    g.moveTo(
        sample.x + Math.cos(back - spread) * size,
        sample.y + Math.sin(back - spread) * size,
    );
    g.lineTo(sample.x, sample.y);
    g.lineTo(
        sample.x + Math.cos(back + spread) * size,
        sample.y + Math.sin(back + spread) * size,
    );
    g.stroke({ width: 2, color: PREVIEW.grey, alpha });
}

function redraw(app, g, stripeG, clip, state, elapsed) {
    g.clear();
    stripeG.clear();
    clip.clear();

    const hasContent = (state.cardIds?.length || state.rowIds?.length || state.column || state.possibles?.length);
    if (!hasContent) return;

    (state.rowIds || []).forEach((rowId) => {
        const box = toLocalBox(app, boxOf(`${rowId}-boardrow`) || boxOf(`${rowId}-list`) || boxOf(rowId));
        if (!box) return;
        g.roundRect(box.left, box.top, box.width, box.height, 10);
        g.fill({ color: PREVIEW.navy, alpha: 0.08 });
    });

    if (state.column) {
        const union = columnUnion(app, state.column);
        if (union) {
            clip.rect(union.left, union.top, union.width, union.height);
            clip.fill({ color: 0xffffff, alpha: 1 });
            drawStripes(stripeG, union, elapsed, 1);
        }
    } else {
        const pulseIds = [
            ...(state.cardIds || []).map((id) => [id, false]),
            ...(state.possibles || []).map((id) => [id, true]),
        ];
        pulseIds.forEach(([id, isPossible]) => {
            const box = toLocalBox(app, boxOf(id));
            if (!box) return;
            g.roundRect(box.left, box.top, box.width, box.height, 6);
            g.stroke({
                width: 2,
                color: PREVIEW.navy,
                alpha: cardPulseAlpha(elapsed, isPossible),
            });
        });
    }

    const from = toLocalBox(app, boxOf(state.fromCardId));
    if (from && (state.rowIds || []).length) {
        const certain = new Set(state.cardIds || []);
        [...(state.cardIds || []), ...(state.possibles || [])].forEach((id) => {
            const dest = toLocalBox(app, boxOf(id));
            if (!dest) return;
            const dim = certain.has(id) ? 0.55 : 0.28;
            chevronSamples({ x: from.x, y: from.y }, { x: dest.x, y: dest.y }, 3).forEach((sample) => {
                drawChevron(g, sample, 8, dim);
            });
        });
    }
}

export function createPreviewLayer(app) {
    const root = new Container();
    const g = new Graphics();
    const clip = new Graphics();
    const stripeG = new Graphics();
    stripeG.mask = clip;
    root.addChild(g);
    root.addChild(clip);
    root.addChild(stripeG);
    app.stage.addChild(root);

    let state = emptyPreview();
    let elapsed = 0;
    const unsub = effectsBus.subscribe((ev) => {
        if (ev?.type === 'fx:preview') {
            state = { ...emptyPreview(), ...(ev.payload || {}) };
        }
        if (ev?.type === 'fx:previewClear') {
            state = emptyPreview();
        }
    });
    const tick = () => {
        elapsed += app.ticker.deltaMS || 16;
        redraw(app, g, stripeG, clip, state, elapsed);
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
