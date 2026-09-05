# Sigma Gravitic Flux — beams + gravity ripples

**Date:** 2026-09-04  
**Status:** Approved for implementation  
**Product:** owtacticards (`owcardgame`)

## Goal

Upgrade Sigma’s ultimate presentation so Gravitic Flux reads as a gravity well: purple/void tethers from Sigma to lifted enemies, expanding ripples at Sigma and at each airborne card, with damage landing on slam (not at cast). Suppress the default damage-bus beams.

## Locked decisions

| Topic | Choice |
|-------|--------|
| Approach | Extend existing `fluxFx` / `fx:graviticFlux` (not separate bus events) |
| Default damage beams | **Off** — `dealDamage(..., { skipProjectileFx: true })` |
| Gravitic beams | Sigma → each lifted card; void core + purple rim; thinner than Nemesis annihilation |
| Beam / ripple window | **Lift + hang only**; clear when slam starts |
| Damage timing | **On slam** (`liftMs + hangMs` after FX publish) |
| Synergy strip | **On slam**, with damage (board update matches impact) |
| Ripples | 2–3 expanding ellipses at Sigma; matching (smaller / slightly delayed) at each lifted enemy |
| Existing FX | Keep lift ghosts, board shadows, slam impact rings, synergy swirl |

## Visuals

### Beams

- Origin: Sigma card anchor (`sourceCardId`).
- End: each lifted card’s airborne position (ghost center while lifted).
- Look: dark void stroke + purple rim (`VOID` / `VOID_EDGE` already used in `fluxFx`).
- Visible only while flux sample phase is `lift` or `hang`; alpha fades out as slam begins.

### Gravity ripples

- **Sigma:** 2–3 concentric ellipses pulsing/expanding under or around his card (source well).
- **Lifted enemies:** same motif centered on each airborne ghost (not the ground shadow), smaller and lightly staggered so a full row does not merge into one blob.
- Same color language as beams; lifetime matches lift+hang.

### Unchanged

- Card ghosts rise / hang / slam.
- Ground shadows tighten while airborne.
- Slam settle rings.
- Synergy particles spiral off after slam.

## Mechanics / wiring

1. **`Effects.graviticFlux(rowId, cardIds, sourceCardId)`**  
   Payload: `{ rowId, cardIds, sourceCardId }`.

2. **`sigma.js` `onUltimate`**  
   - Resolve target row as today.  
   - Publish `graviticFlux` with living enemies + Sigma id.  
   - Await slam delay (`FLUX.liftMs + FLUX.hangMs`).  
   - For each still-living enemy in that row: `dealDamage(..., 1, ..., { skipProjectileFx: true })` + `showDamage`.  
   - Strip row synergy (`__ow_updateSynergy` large negative) at the same moment.  
   - Toast after resolve.

3. **`fluxFx`**  
   - Read `sourceCardId` from payload; if missing, skip beams/ripples at Sigma (lift still works).  
   - Draw beams + ripples in the lift/hang window only.

4. **Math / config**  
   - Pure helpers (e.g. beam alpha by phase, ripple ring samples) in `fxMath` + `FLUX` config knobs so unit tests cover timing without Pixi.

## Out of scope

- Experimental Barrier (on-enter) FX changes.
- Changing Gravitic Flux rules (still 1 damage to living enemies in the row + remove synergy).
- Nemesis Annihilation visuals.

## Acceptance

- [x] Ult publishes `sourceCardId` on `fx:graviticFlux`
- [x] Purple/void beams Sigma → lifted cards during lift+hang only
- [x] Gravity ripples around Sigma and each lifted enemy during lift+hang only
- [x] No default damage-bus beams
- [x] Damage numbers + synergy strip occur at slam
- [x] Unit tests for timing helpers / slam delay
- [x] Existing lift / slam / synergy swirl still play

## Files (expected)

- `owcardgame/src/abilities/heroes/sigma.js`
- `owcardgame/src/abilities/engine/effectsBus.js`
- `owcardgame/src/presentation/pixi/fluxFx.js`
- `owcardgame/src/presentation/pixi/fxConfig.js` (`FLUX` knobs)
- `owcardgame/src/presentation/pixi/fxMath.js` (+ tests)
- Optional: `owcardgame/src/abilities/heroes/sigma.test.js` for delay / skipProjectileFx
