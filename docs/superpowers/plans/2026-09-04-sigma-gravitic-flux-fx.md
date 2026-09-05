# Sigma Gravitic Flux FX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gravitic Flux shows purple/void beams and gravity ripples during lift+hang, with damage and synergy strip on slam; no default damage-bus beams.

**Architecture:** Extend `fx:graviticFlux` / `fluxFx` with `sourceCardId`. Pure timing helpers in `fxMath` + `FLUX` knobs. `sigma.js` awaits slam, then damages with `skipProjectileFx`.

**Tech Stack:** React card game, Pixi FX overlay, Jest, effectsBus.

**Spec:** `docs/superpowers/specs/2026-09-04-sigma-gravitic-flux-fx-design.md`

## Global Constraints

- Beams/ripples only during lift+hang; clear on slam
- Damage + synergy strip at `liftMs + hangMs`
- Void/purple palette (`VOID` / `VOID_EDGE` in fluxFx)
- Do not change Experimental Barrier or Flux rules (1 dmg + strip synergy)
- No git commits unless the user asks

---

### Task 1: Flux tether / ripple math

**Files:**
- Modify: `owcardgame/src/presentation/pixi/fxConfig.js` (`FLUX`)
- Modify: `owcardgame/src/presentation/pixi/fxMath.js`
- Modify: `owcardgame/src/presentation/pixi/fluxMath.test.js`

**Interfaces:**
- Produces: `fluxSlamAtMs(cfg?) → number`
- Produces: `fluxBeamAlpha(elapsedMs, cfg?) → number` (1 during lift/hang after short fade-in; 0 from slam on)
- Produces: `fluxGravityRipples(elapsedMs, { scale, phaseOffset }?, cfg?) → Array<{ rx, ry, alpha }>`

- [ ] **Step 1: Write failing tests** in `fluxMath.test.js` for slam-at, beam alpha window, and ripples expanding then gone after slam
- [ ] **Step 2: Run tests — expect FAIL**
- [ ] **Step 3: Add `FLUX` knobs + implement the three helpers**
- [ ] **Step 4: Run tests — expect PASS**

---

### Task 2: Wire payload + draw beams/ripples in fluxFx

**Files:**
- Modify: `owcardgame/src/abilities/engine/effectsBus.js` (`Effects.graviticFlux`)
- Modify: `owcardgame/src/presentation/pixi/fluxFx.js`

**Interfaces:**
- Consumes: Task 1 helpers; `cardAnchor` for Sigma
- Produces: `Effects.graviticFlux(rowId, cardIds, sourceCardId)` payload `{ rowId, cardIds, sourceCardId }`

- [ ] **Step 1: Extend `graviticFlux` factory with `sourceCardId`**
- [ ] **Step 2: In `startFlux`, store `sourceCardId`; in `drawFlux`, while beam alpha > 0, stroke Sigma→each ghost and draw ripples at Sigma + each ghost (enemy scale smaller + phaseOffset)**
- [ ] **Step 3: Smoke — fluxMath tests still pass**

---

### Task 3: Delay damage / synergy in sigma.js

**Files:**
- Modify: `owcardgame/src/abilities/heroes/sigma.js`
- Create: `owcardgame/src/abilities/heroes/sigma.test.js`

**Interfaces:**
- Consumes: `Effects.graviticFlux(rowId, ids, playerHeroId)`, `fluxSlamAtMs` / `FLUX`, `dealDamage` with `skipProjectileFx`

- [ ] **Step 1: Write failing test** — publishes source id; after ult, damage uses skipProjectileFx; synergy update after slam delay (fake timers)
- [ ] **Step 2: Implement await slam then damage + synergy strip**
- [ ] **Step 3: Run sigma + fluxMath tests — expect PASS**

---

## Spec coverage

| Spec item | Task |
|-----------|------|
| sourceCardId on event | 2, 3 |
| Beams lift+hang | 1, 2 |
| Ripples Sigma + lifted | 1, 2 |
| No default beams | 3 |
| Damage + synergy on slam | 3 |
| Keep lift/slam/swirl | 2 (no removal) |
| Unit tests | 1, 3 |
