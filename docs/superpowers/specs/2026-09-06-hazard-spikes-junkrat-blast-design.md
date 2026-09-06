# Hazard spike burst + Junkrat death blast

**Date:** 2026-09-06  
**Status:** Approved for implementation  
**Product:** owtacticards (`owcardgame`)

## Goal

- **Hazard:** On deploy, a short Pixi burst of rock/crystal spikes erupting from the card edges.
- **Junkrat:** On death, a fiery card-centered shockwave (Total Mayhem visual), even when damage logic is suppressed.

## Locked decisions

| Topic | Choice |
|-------|--------|
| Approach | Extend existing FX bus + Pixi modules (recommended) |
| Hazard look | Rock/crystal spikes from card perimeter (`PALETTE.stone` / `spike` / `stoneDark`) |
| Junkrat look | Existing `fx:shockwave` card blast (not row-wide, not RIP-Tire reuse) |
| Hazard trigger | `hazard.onEnter` publishes new `fx:spikeBurst` |
| Junkrat trigger | Top of `junkrat.onDeath`, before Disoriented / no-killer early returns |
| Anchor timing | Junkrat FX publishes while card still on board (`onDeath` runs before bury) |

## Hazard — spike burst

### Event

- `Effects.spikeBurst(cardId)` → `{ type: 'fx:spikeBurst', payload: { cardId } }`

### Visual

- 8–12 jagged stone triangles around the card rect (edge midpoints + corners).
- Grow outward from the silhouette over ~450–600ms, then fade.
- Outer stone face + teal crystal edge (same language as Downpour shards).
- One-shot; no linger after fade.

### Wiring

1. Add creator on `effectsBus`.
2. New Pixi module (or thin sibling of crystal rain) subscribed in `PixiBoard`.
3. Pure sampler in `fxMath` / config knobs in `fxConfig` + unit tests for timeline.
4. `hazard.onEnter`: after enter SFX / spike-guard mark, `publish(Effects.spikeBurst(playerHeroId))`.

## Junkrat — death blast

### Event

- Reuse `Effects.shockwave(cardId)` (already drawn in `hitFx` as a large fiery impact).

### Wiring

1. At the start of `onDeath({ playerHeroId, ... })`, publish `Effects.shockwave(playerHeroId)`.
2. Then existing Disoriented check / Total Mayhem damage logic unchanged.
3. Blast still plays if Mayhem is suppressed (Disoriented or no tracked killer).

## Out of scope

- Changing Total Mayhem damage numbers or adjacency rules.
- Hazard Downpour / crystal rain changes.
- New audio clips (existing enter/death sounds stay).

## Test plan

- [ ] Deploy Hazard → spikes erupt from card edges, fade cleanly.
- [ ] Kill Junkrat with a tracked killer → shockwave on his card, then Mayhem damage FX.
- [ ] Kill Disoriented Junkrat → shockwave still plays; Mayhem still suppressed.
- [ ] Unit tests for spike burst timeline sampler (start grow → fade → done).
