import { Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import effectsBus from '../../abilities/engine/effectsBus';
import tankFormUrl from '../../assets/tankform.png';
import { SENTRY, sentrySweep, tankFormSample, bulletSample } from './fxMath';
import { PALETTE, TANK_FORM } from './fxConfig';
import { cardAnchor, cardRect, rowRect } from './anchors';

const SCAN = PALETTE.red;
const ROWS = ['1f', '1m', '1b', '2f', '2m', '2b'];

async function loadTankForm() {
    try {
        return Assets.get(tankFormUrl) || (await Assets.load(tankFormUrl));
    } catch {
        return Texture.WHITE;
    }
}

/**
 * Bastion.
 *
 *  - Sentry token: a scanner sweeping back and forth across the watched row.
 *    State-driven from the row's bastion-token, so it needs no publisher and
 *    clears itself when the token goes.
 *  - Tank form: tankform.png laid over his card while the ultimate is up,
 *    toggled by fx:tankForm.
 */
export function createBastionFx(app) {
    const root = new Container();
    root.eventMode = 'none';
    app.stage.addChild(root);

    const scan = new Graphics();
    const g = new Graphics();
    root.addChild(scan);
    root.addChild(g);

    let elapsed = 0;
    let tank = null; // { cardId, sprite, elapsed, closing }
    let texture = null;
    let shots = [];

    /*
     * Bumped by every show and every hide.
     *
     * The first show has to await its texture, and an AI Bastion runs its whole
     * ultimate inside one tick — so the stand-down arrives while `tank` is
     * still null, finds nothing to close, and then the awaited show installs a
     * tank form that never goes away. The token lets a show notice it was
     * cancelled while it was loading.
     */
    let formToken = 0;

    async function showTank(cardId) {
        if (!cardId) return;
        const token = ++formToken;
        if (!texture) texture = await loadTankForm();
        if (token !== formToken) return;

        if (tank?.sprite && !tank.sprite.destroyed) tank.sprite.destroy();
        const sprite = new Sprite(texture);
        sprite.anchor.set(0.5);
        root.addChild(sprite);
        tank = { cardId, sprite, elapsed: 0, closing: false };
    }

    function hideTank() {
        formToken += 1;
        if (!tank) return;
        tank.closing = true;
        tank.elapsed = 0;
    }

    const unsub = effectsBus.subscribe((ev) => {
        if (ev?.type === 'fx:tankForm') {
            if (ev.payload?.on === false) hideTank();
            else showTank(ev.payload?.cardId);
            return;
        }
        if (ev?.type !== 'fx:sentryShot') return;
        const rect = rowRect(app, ev.payload?.rowId);
        if (!rect || !ev.payload?.cardId) return;
        const { u } = sentrySweep(elapsed);
        shots.push({
            from: { x: rect.left + rect.width * u, y: rect.y },
            toCardId: ev.payload.cardId,
            to: null,
            elapsed: 0,
        });
    });

    function drawScan(rect) {
        const { u, alpha } = sentrySweep(elapsed);
        const x = rect.left + rect.width * u;
        const top = rect.top;
        const bottom = rect.top + rect.height;

        // Soft glow either side of the beam.
        scan.rect(x - SENTRY.glowWidth / 2, top, SENTRY.glowWidth, rect.height);
        scan.fill({ color: SCAN, alpha: alpha * 0.18 });

        scan.moveTo(x, top);
        scan.lineTo(x, bottom);
        scan.stroke({ width: SENTRY.beamWidth, color: SCAN, alpha });

        // Small heads at the rails, so it reads as a scan head on a track.
        for (const y of [top, bottom]) {
            scan.circle(x, y, 3);
            scan.fill({ color: SCAN, alpha: Math.min(1, alpha * 2) });
        }
    }

    const tick = () => {
        elapsed += app.ticker.deltaMS || 16;

        // --- sentry scan ------------------------------------------------------
        scan.clear();
        const getRow = window.__ow_getRow;
        if (typeof getRow === 'function') {
            for (const rowId of ROWS) {
                const row = getRow(rowId);
                if (!row) continue;
                const watched = [...(row.enemyEffects || []), ...(row.allyEffects || [])]
                    .some((e) => e?.id === 'bastion-token');
                if (!watched) continue;
                const rect = rowRect(app, rowId);
                if (rect) drawScan(rect);
            }
        }

        g.clear();
        if (shots.length) {
            const delta = app.ticker.deltaMS || 16;
            const done = [];
            for (const shot of shots) {
                if (!shot.to) shot.to = cardAnchor(app, shot.toCardId);
                if (!shot.to) continue;
                shot.elapsed += delta;
                let allDone = true;
                for (let i = 0; i < 3; i += 1) {
                    const sample = bulletSample(shot.elapsed, i, shot.from, shot.to);
                    if (!sample.done) allDone = false;
                    if (sample.visible) {
                        g.moveTo(sample.tail.x, sample.tail.y);
                        g.lineTo(sample.head.x, sample.head.y);
                        g.stroke({ width: 3, color: SCAN, alpha: 0.95 });
                    }
                    if (sample.sparkT > 0) {
                        g.circle(shot.to.x, shot.to.y, 4 + 10 * sample.sparkT);
                        g.stroke({ width: 2, color: SCAN, alpha: 1 - sample.sparkT });
                    }
                }
                if (allDone) done.push(shot);
            }
            if (done.length) shots = shots.filter((s) => !done.includes(s));
        }

        // --- tank form --------------------------------------------------------
        if (!tank?.sprite || tank.sprite.destroyed) return;
        tank.elapsed += app.ticker.deltaMS || 16;

        const rect = cardRect(app, tank.cardId);
        if (!rect) {
            tank.sprite.visible = false;
            return;
        }

        const s = tankFormSample(tank.elapsed, tank.closing);
        if (s.gone) {
            tank.sprite.destroy();
            tank = null;
            return;
        }

        const width = rect.width * TANK_FORM.scale;
        const ratio = texture?.width ? texture.height / texture.width : 0.7;
        tank.sprite.visible = true;
        tank.sprite.width = width;
        tank.sprite.height = width * ratio;
        // The art faces left, which already points the right way for player 2.
        // Player 1 sits on the other side, so mirror it.
        const facesLeft = parseInt(tank.cardId[0], 10) === 2;
        tank.sprite.scale.x = Math.abs(tank.sprite.scale.x) * (facesLeft ? 1 : -1);
        tank.sprite.position.set(rect.x, rect.y + s.offsetY);
        tank.sprite.alpha = s.alpha;
    };

    app.ticker.add(tick);

    return {
        /** Exposed for tests. */
        hasTankForm: () => tank !== null,
        destroy() {
            try { unsub(); } catch {}
            try { app.ticker.remove(tick); } catch {}
            try { root.destroy({ children: true }); } catch {}
            tank = null;
            shots = [];
        },
    };
}

export default createBastionFx;
