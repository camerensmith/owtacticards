Abilities, Sounds, and Effects Architecture
==========================================

Modules
-------

- engine/targeting.js
  - selectCardTarget(), selectRowTarget(), selectRowTargetWithSound(heroId, cardId)

- engine/abilityEngine.js
  - playAbilityAudio(key), assertNotInHand(rowId), hasEnoughSynergy(), markAbilityUsed(...)

- engine/soundController.js
  - SoundEvents: onDraw, onPlacement, onUltimate, onDamaged, onHealed, onDeath, onRez, onFlavor, onAcquaintance, onEnemy, onRowTarget
  - registerHeroSounds(heroId, mapping)
  - playHeroEventSound(heroId, eventName)
  - playWithOverlay(heroId, cardId, eventName)
  - setOverlayListener(listener)

- engine/effectsBus.js
  - subscribe(listener), publish(event)
  - Effects helpers: overlay:damage/heal/death, fx:muzzleFlash, fx:rowBarrier

- engine/overlayController.js
  - subscribe(listener) for UI
  - showDamage(cardId, amount), showHeal(cardId, amount), showDeath(cardId), hideDeath(cardId)
  - muzzleFlash(cardId), rowBarrier(rowId, durationMs)

Hero modules (proposed)
-----------------------

- heroes/<heroId>/index.ts exports:
  - sounds: event → [audio keys]
  - abilities: { ability1, ability2 } with run(ctx)
  - optional visuals/effects references (IDs consumed by overlay/effects controllers)

Wiring
------

- At app init: aggregate hero modules, register their sound maps.
- Abilities call engine helpers and may publish overlay/effects events.
- UI subscribes to overlayController/ effectsBus to render visuals.

Notes
-----

- All sounds and overlays are optional; no-ops when not registered.
- Multiple audio keys per event are supported; one is picked at random.
- Centralizing these controllers enables scalable hero-specific behaviors without duplicating UI code.

Central Triggers & Flow
-----------------------

- Triggers supported:
  - onEnter: fires when a hero is deployed to a row
  - onUltimate: user-activated ability with synergy cost from the hero's current row
  - onDeath: fires when a hero reaches 0 health
  - onInterrupt: optional window offered before damage lands (e.g., Tracer Recall)
  - spawnSpecial / spawnToken: spawns a special card or a row/card token (e.g., B.O.B., Infra-Sight)

- onEnter variants from hero.json:
  - on_enter1 only: auto-executes
  - on_enter1 + on_enter2: show a choice modal; execute selected ability once

- Synergy rules:
  - Ultimates require row synergy ≥ cost to activate; upon activation, subtract cost from that row
  - Row synergy continues accumulating via placements unless modified by effects (modifiers take precedence)

- Interrupt flow (example: Tracer Recall):
  1) Damage pipeline pauses before applying
  2) If hero defines onInterrupt and row synergy ≥ cost, show modal to confirm
  3) If confirmed, execute interrupt (e.g., return Tracer to hand), consume synergy, skip applying that damage to that hero instance

- Row target tokens (example: Widowmaker Infra-Sight):
  - Highlight eligible enemy rows via CSS; on click, spawn token and register its effect (e.g., +1 damage taken in that row)

UI Infrastructure
-----------------

- Modal controller: provides confirm/select prompts for onEnter choices and interrupt windows
- Targeting helpers: highlight selectable rows/cards and resolve clicks
- Effects/Sound controllers: optionally play audio and show overlays during each trigger

