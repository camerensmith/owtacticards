# Redeploy Economy: Synergy, Power, and On-Enter

**Date:** 2026-09-03  
**Status:** Implemented  
**Product:** owtacticards (`owcardgame`)

## Goal

Lock one clear rule for any hero that **leaves the board for hand** and is **played again** later (Symmetra Teleporter, D.Va Call Mech / pilot cycle, Tracer **Recall**, and future bounce effects):

| On redeploy from hand | Rule |
|----------------------|------|
| **Power** | Yes — printed power applies while the card is on the board |
| **Synergy** | No — synergy is spent on that card instance’s **first** play from hand |
| **On-Enter** | No by default — **Tracer Recall is the only exception** |

## Locked decisions

| Topic | Choice |
|-------|--------|
| Synergy on first play from hand | Add the card’s printed synergy for the destination row, then **zero** the card’s synergy blob |
| Synergy on return to hand | **Do not** restore printed synergy from `data.heroes` |
| Synergy on redeploy | Add **0** (blob already spent). Row keeps whatever was banked earlier |
| Power on board | Always use the card’s current power while present (including after eject / redeploy) |
| Power vs synergy asymmetry | Intentional: bodies fight again; ultimate fuel is not farmed by bouncing |
| On-Enter on normal first play | Fires as today |
| On-Enter on Symmetra Teleporter redeploy | **Does not** fire again |
| On-Enter on D.Va pilot eject (MEKA → pilot in-slot) | **Does not** fire (not a hand deploy). No synergy either |
| On-Enter on D.Va Call Mech → later MEKA play | MEKA is a **different** card; its **first** play pays MEKA synergy and runs MEKA Enter |
| Tracer Recall trigger | Automatic **when she dies** (HP hits 0 / death resolves), cost **2** synergy on the row she died in |
| Tracer Recall if synergy &lt; 2 | She **stays dead** (graveyard / normal death). No hand return |
| Tracer Recall if synergy ≥ 2 | **Spend 2** from that row, play **ultimate sound**, animate return to **hand** (not stay on board) |
| Tracer after Recall lands in hand | Playable on a later turn per redeploy lock (same one-turn lock as Teleporter); **On-Enter yes**, **synergy no**, **ultimate spent** |
| Tracer ultimate after Recall | Marked used — **no second Recall** this round/match |

## Rules

### Synergy is instance-spent

1. When a card is deployed from hand onto a row, the row gains `card.synergy[rowLetter]` (if any).
2. That card’s `synergy` is then set to `{ f: 0, m: 0, b: 0 }`.
3. Any path that returns the card to hand (**must not** copy printed synergy back onto the card).
4. A later deploy from hand therefore contributes **0** synergy.
5. Round / match resets that create a **fresh** card instance (new deal) restore printed synergy as usual.

Row synergy already gained is **not** clawed back when a card leaves the board (same spirit as the legacy Symmetra Teleporter note: the row keeps what it banked).

### Power is presence

Printed (or modified) power counts whenever the hero occupies a row slot. Leaving and returning does not “spend” power.

### On-Enter is once per board life — except Tracer Recall

- **Default:** returning to hand and redeploying does **not** re-run On-Enter. Teleporter is a reposition / hand tool, not a free second Enter.
- **Tracer Recall:** when she dies with ≥2 row synergy, she pays and returns to hand. Redeploy runs On-Enter again. Synergy still does not. Ultimate does not refresh.

D.Va pilot **eject** (MEKA destroyed or Self Destruct) places D.Va in-slot without a normal hand-deploy: no synergy, no On-Enter. Call Mech’s MEKA drop is a separate first play of `dvameka`.

## Cases

### Symmetra Teleporter

- Ally returns to hand; effects/tokens cleared per Teleporter.
- Redeploy later: **power yes**, **synergy no**, **On-Enter no**.

### D.Va

- First pilot play: power + synergy (once).
- Call Mech: pilot to hand (synergy stays spent); MEKA enters hand as its own card.
- MEKA play: MEKA synergy + Defense Matrix Enter.
- Eject: pilot replaces MEKA in-slot — **power yes**, **synergy no**, **On-Enter no**.

### Tracer Recall (exception)

**Printed intent (update copy to match):**

> **Recall (2):** When Tracer dies, if her row has at least 2 synergy, spend it and return her to your hand. Redeploy later to fire Pulse Pistols again. Cannot Recall twice.

**Sequence when Tracer dies:**

1. **Death happens** — HP is at 0; she is treated as dying on her row (death hooks that must not double-fire should no-op if Recall succeeds).
2. **Can pay?** That row’s synergy ≥ 2 **and** Recall not already used. If not → she remains dead (normal death / graveyard).
3. **Pay:** Spend **2** synergy from that row. Mark ultimate used.
4. **Sound + FX:** Play the **ultimate / Recall** sound. Animate board → hand (return-to-hand presentation).
5. **Hand:** Remove from row / undo graveyard placement as needed; put Tracer in hand (`isPlayed: false`), clear board tokens/effects, apply **redeploy lock** (same one-turn lock as Symmetra Teleporter).
6. **Redeploy:** Power yes, synergy **0**, On-Enter **yes**, ultimate already used (**no** second Recall).

**Not Recall:** restoring HP and staying on the board (“AVOIDED!”). That path is removed.

## Current implementation notes (gap check)

These are observations for implementers; they do not override Locked decisions above.

| Path | Synergy today | On-Enter today |
|------|---------------|----------------|
| Deploy from hand | Adds then zeroes card synergy | Fires `checkOnEnterAbilities` |
| `RETURN_HERO_TO_HAND` (Symmetra) | Does not restore synergy (good) | Redeploy still fires On-Enter — **needs suppress flag** for non-Tracer |
| `RETURN_DVA_TO_HAND` (Call Mech) | Does not restore synergy (good) | Pilot has no Enter; MEKA Enter on MEKA play (OK) |
| `REPLACE_WITH_DVA` (eject) | No synergy update (good) | No Enter (good) |
| Modern Tracer Recall | Pre-death interrupt: spends 2, restores HP, **stays on board**, marks ult used | No hand return |
| Legacy Tracer `ability2` | Manual hand return (`tracer-imback`) | Redeploy would fire Enter |

**Tracer implementation work:** move Recall to **on-death**: if synergy ≥ 2 and ult unused → spend 2, ult sound, animate to hand, redeploy lock, allow On-Enter on next play, mark ult used; else stay dead.

**Redeploy On-Enter control:** add an explicit per-card flag (e.g. `suppressEnterOnRedeploy` default true on Symmetra return; Tracer Recall sets `allowEnterOnRedeploy` / clears suppress) so deploy does not rely on hero-id special cases scattered in App.

## Out of scope

- Changing printed D.Va power/synergy numbers.
- Chronoshift / other “replay Enter while still on board” (not hand redeploys).
- Graveyard resurrect / reshuffle bag instance rules.

## Acceptance

- [ ] Spec reviewed and approved.
- [ ] Audit: no return-to-hand path restores printed synergy.
- [ ] Symmetra redeploy does not run On-Enter.
- [ ] D.Va eject does not add synergy or On-Enter.
- [ ] Tracer Recall on death: spend 2 if able + ult sound + hand FX → hand; else stay dead.
- [ ] Tracer redeploy: On-Enter yes, synergy no, ultimate unavailable.
- [ ] `data.js` / card text updated to the Recall wording above.
- [ ] Short rules note in abilities README or home/rules copy if desired.
