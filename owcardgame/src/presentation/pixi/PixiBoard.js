import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Application } from 'pixi.js';
import { createCardFlyer, preloadCardTextures } from './fxOverlay';
import { createPreviewLayer } from './previewLayer';
import { createSeekerDrone } from './seekerDrone';
import { createLockOnReticle } from './lockOnReticle';
import { createChargeGlow } from './chargeGlow';
import { createBeamBlast } from './beamBlast';
import { createFloatingNumbers } from './floatingNumbers';
import { createPushSlide } from './pushSlide';
import { createHitFx } from './hitFx';
import { createAimLine } from './aimLine';
import { createAmbientFx } from './ambientFx';
import { createCrystalRain } from './crystalRain';
import { createRiptire } from './riptire';
import { createBarrierFx } from './barrierFx';
import { createFrostFx } from './frostFx';
import { createBulletFx } from './bulletFx';
import { createBastionFx } from './bastionFx';
import { createRocketFx } from './rocketFx';
import { createBloodFx } from './bloodFx';
import { createReaperFx } from './reaperFx';
import { createSoldierFx } from './soldierFx';
import { createGrenadeFx } from './grenadeFx';
import { createDeadeyeFx } from './deadeyeFx';
import { createNanoFx } from './nanoFx';
import { createRoadhogFx } from './roadhogFx';
import { createFluxFx } from './fluxFx';
import { createSparkleFx } from './sparkleFx';
import { createDoomfistFx } from './doomfistFx';
import { createPharahFx } from './pharahFx';
import { createRowAuraFx } from './rowAuraFx';
import { createZenyattaFx } from './zenyattaFx';
import { createTankFx } from './tankFx';
import { createLockjawFx } from './lockjawFx';
import { createSylvainFx } from './sylvainFx';
import { createAxiomFx } from './axiomFx';
import { createKitFx } from './kitFx';
import { createZaryaFx } from './zaryaFx';
import { createBallFx } from './ballFx';
import { createSymmetraFx } from './symmetraFx';
import { createHanzoFx } from './hanzoFx';
import { createStrikeFx } from './strikeFx';
import { createLucioFx } from './lucioFx';
import { createMercyFx } from './mercyFx';
import { createLifeweaverFx } from './lifeweaverFx';
import { createMaugaFx } from './maugaFx';
import { createHackFx } from './hackFx';
import { createCatnapFx } from './catnapFx';
import { createVegaFx } from './vegaFx';
import { createMantisFx } from './mantisFx';

/** Transparent fly/preview overlay. Not a second board. HTML PlayerHalf owns cards. */
const PixiBoard = forwardRef(function PixiBoard(_props, ref) {
    const hostRef = useRef(null);
    const flyerRef = useRef(null);
    const previewRef = useRef(null);
    const droneRef = useRef(null);
    const lockOnRef = useRef(null);
    const chargeRef = useRef(null);
    const beamRef = useRef(null);
    const floatsRef = useRef(null);
    const pushRef = useRef(null);
    const hitRef = useRef(null);
    const aimRef = useRef(null);
    const ambientRef = useRef(null);
    const rainRef = useRef(null);
    const tireRef = useRef(null);
    const barrierRef = useRef(null);
    const frostRef = useRef(null);
    const bulletRef = useRef(null);
    const bastionRef = useRef(null);
    const rocketRef = useRef(null);
    const bloodRef = useRef(null);
    const reaperRef = useRef(null);
    const soldierRef = useRef(null);
    const grenadeRef = useRef(null);
    const deadeyeRef = useRef(null);
    const nanoRef = useRef(null);
    const roadhogRef = useRef(null);
    const fluxRef = useRef(null);
    const sparkleRef = useRef(null);
    const doomfistRef = useRef(null);
    const pharahRef = useRef(null);
    const rowAuraRef = useRef(null);
    const zenyattaRef = useRef(null);
    const tankRef = useRef(null);
    const lockjawRef = useRef(null);
    const sylvainRef = useRef(null);
    const axiomRef = useRef(null);
    const kitRef = useRef(null);
    const zaryaRef = useRef(null);
    const ballRef = useRef(null);
    const symmetraRef = useRef(null);
    const hanzoRef = useRef(null);
    const strikeRef = useRef(null);
    const lucioRef = useRef(null);
    const mercyRef = useRef(null);
    const lifeweaverRef = useRef(null);
    const maugaRef = useRef(null);
    const hackRef = useRef(null);
    const catnapRef = useRef(null);
    const vegaRef = useRef(null);
    const mantisRef = useRef(null);
    const appRef = useRef(null);
    const [failed, setFailed] = useState(false);

    useImperativeHandle(ref, () => ({
        flyToSlot: (intent) => {
            if (!intent) return Promise.resolve();
            return flyerRef.current?.flyToSlot(intent) ?? Promise.resolve();
        },
        flyToDeck: (cardId) => {
            if (!cardId) return Promise.resolve();
            return flyerRef.current?.flyToDeck(cardId) ?? Promise.resolve();
        },
    }));

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return undefined;
        let cancelled = false;
        let app;

        (async () => {
            try {
                app = new Application();
                await app.init({
                    backgroundAlpha: 0,
                    resizeTo: host,
                    antialias: true,
                    autoDensity: true,
                    resolution: window.devicePixelRatio || 1,
                });
                if (cancelled) {
                    app.destroy(true);
                    return;
                }
                host.appendChild(app.canvas);
                // Not awaited: the layers below work without it, and the first
                // card play should not be the one that pays for the upload.
                preloadCardTextures();
                flyerRef.current = createCardFlyer(app);
                previewRef.current = createPreviewLayer(app);
                droneRef.current = createSeekerDrone(app);
                lockOnRef.current = createLockOnReticle(app);
                chargeRef.current = createChargeGlow(app);
                beamRef.current = createBeamBlast(app);
                floatsRef.current = createFloatingNumbers(app);
                pushRef.current = createPushSlide(app);
                hitRef.current = createHitFx(app);
                aimRef.current = createAimLine(app);
                ambientRef.current = createAmbientFx(app);
                rainRef.current = createCrystalRain(app);
                tireRef.current = createRiptire(app);
                barrierRef.current = createBarrierFx(app);
                frostRef.current = createFrostFx(app);
                bulletRef.current = createBulletFx(app);
                bastionRef.current = createBastionFx(app);
                rocketRef.current = createRocketFx(app);
                bloodRef.current = createBloodFx(app);
                reaperRef.current = createReaperFx(app);
                soldierRef.current = createSoldierFx(app);
                grenadeRef.current = createGrenadeFx(app);
                deadeyeRef.current = createDeadeyeFx(app);
                nanoRef.current = createNanoFx(app);
                roadhogRef.current = createRoadhogFx(app);
                fluxRef.current = createFluxFx(app);
                sparkleRef.current = createSparkleFx(app);
                doomfistRef.current = createDoomfistFx(app);
                pharahRef.current = createPharahFx(app);
                rowAuraRef.current = createRowAuraFx(app);
                zenyattaRef.current = createZenyattaFx(app);
                tankRef.current = createTankFx(app);
                lockjawRef.current = createLockjawFx(app);
                sylvainRef.current = createSylvainFx(app);
                axiomRef.current = createAxiomFx(app);
                kitRef.current = createKitFx(app);
                zaryaRef.current = createZaryaFx(app);
                ballRef.current = createBallFx(app);
                symmetraRef.current = createSymmetraFx(app);
                hanzoRef.current = createHanzoFx(app);
                strikeRef.current = createStrikeFx(app);
                lucioRef.current = createLucioFx(app);
                mercyRef.current = createMercyFx(app);
                lifeweaverRef.current = createLifeweaverFx(app);
                maugaRef.current = createMaugaFx(app);
                hackRef.current = createHackFx(app);
                catnapRef.current = createCatnapFx(app);
                vegaRef.current = createVegaFx(app);
                mantisRef.current = createMantisFx(app);
                appRef.current = app;
            } catch (err) {
                console.error('Pixi overlay failed to load', err);
                if (!cancelled) setFailed(true);
            }
        })();

        return () => {
            cancelled = true;
            try { hackRef.current?.destroy(); } catch {}
            hackRef.current = null;
            try { maugaRef.current?.destroy(); } catch {}
            maugaRef.current = null;
            try { catnapRef.current?.destroy(); } catch {}
            catnapRef.current = null;
            try { vegaRef.current?.destroy(); } catch {}
            vegaRef.current = null;
            try { mantisRef.current?.destroy(); } catch {}
            mantisRef.current = null;
            try { lifeweaverRef.current?.destroy(); } catch {}
            lifeweaverRef.current = null;
            try { mercyRef.current?.destroy(); } catch {}
            mercyRef.current = null;
            try { lucioRef.current?.destroy(); } catch {}
            lucioRef.current = null;
            try { strikeRef.current?.destroy(); } catch {}
            strikeRef.current = null;
            try { hanzoRef.current?.destroy(); } catch {}
            hanzoRef.current = null;
            try { symmetraRef.current?.destroy(); } catch {}
            symmetraRef.current = null;
            try { ballRef.current?.destroy(); } catch {}
            ballRef.current = null;
            try { zaryaRef.current?.destroy(); } catch {}
            zaryaRef.current = null;
            try { tankRef.current?.destroy(); } catch {}
            tankRef.current = null;
            try { zenyattaRef.current?.destroy(); } catch {}
            zenyattaRef.current = null;
            try { rowAuraRef.current?.destroy(); } catch {}
            rowAuraRef.current = null;
            try { pharahRef.current?.destroy(); } catch {}
            pharahRef.current = null;
            try { doomfistRef.current?.destroy(); } catch {}
            doomfistRef.current = null;
            try { sparkleRef.current?.destroy(); } catch {}
            sparkleRef.current = null;
            try { fluxRef.current?.destroy(); } catch {}
            fluxRef.current = null;
            try { roadhogRef.current?.destroy(); } catch {}
            roadhogRef.current = null;
            try { nanoRef.current?.destroy(); } catch {}
            nanoRef.current = null;
            try { deadeyeRef.current?.destroy(); } catch {}
            deadeyeRef.current = null;
            try { grenadeRef.current?.destroy(); } catch {}
            grenadeRef.current = null;
            try { soldierRef.current?.destroy(); } catch {}
            soldierRef.current = null;
            try { reaperRef.current?.destroy(); } catch {}
            reaperRef.current = null;
            try { kitRef.current?.destroy(); } catch {}
            kitRef.current = null;
            try { axiomRef.current?.destroy(); } catch {}
            axiomRef.current = null;
            try { sylvainRef.current?.destroy(); } catch {}
            sylvainRef.current = null;
            try { lockjawRef.current?.destroy(); } catch {}
            lockjawRef.current = null;
            try { bloodRef.current?.destroy(); } catch {}
            bloodRef.current = null;
            try { rocketRef.current?.destroy(); } catch {}
            rocketRef.current = null;
            try { bastionRef.current?.destroy(); } catch {}
            bastionRef.current = null;
            try { bulletRef.current?.destroy(); } catch {}
            bulletRef.current = null;
            try { frostRef.current?.destroy(); } catch {}
            frostRef.current = null;
            try { barrierRef.current?.destroy(); } catch {}
            barrierRef.current = null;
            try { tireRef.current?.destroy(); } catch {}
            tireRef.current = null;
            try { rainRef.current?.destroy(); } catch {}
            rainRef.current = null;
            try { ambientRef.current?.destroy(); } catch {}
            ambientRef.current = null;
            try { aimRef.current?.destroy(); } catch {}
            aimRef.current = null;
            try { hitRef.current?.destroy(); } catch {}
            hitRef.current = null;
            try { pushRef.current?.destroy(); } catch {}
            pushRef.current = null;
            try { floatsRef.current?.destroy(); } catch {}
            floatsRef.current = null;
            try { beamRef.current?.destroy(); } catch {}
            beamRef.current = null;
            try { chargeRef.current?.destroy(); } catch {}
            chargeRef.current = null;
            try { lockOnRef.current?.destroy(); } catch {}
            lockOnRef.current = null;
            try { droneRef.current?.destroy(); } catch {}
            droneRef.current = null;
            try { previewRef.current?.destroy(); } catch {}
            previewRef.current = null;
            flyerRef.current = null;
            if (appRef.current) {
                appRef.current.destroy(true);
                appRef.current = null;
            } else if (app) {
                app.destroy(true);
            }
        };
    }, []);

    if (failed) return null;
    return <div ref={hostRef} className="pixi-fx-overlay" />;
});

export default PixiBoard;
