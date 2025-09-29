Modular Ability System Architecture
====================================

## ⚠️ CRITICAL: Hero Implementation Consistency Requirements

**ALL NEW HERO IMPLEMENTATIONS MUST FOLLOW THESE ESTABLISHED PATTERNS:**

### 1. **Modal System Requirements**
- **MUST USE**: `showOnEnterChoice()` from `modalController.js` for onEnter abilities
- **NEVER**: Create custom modals or DOM manipulation for choice interfaces
- **PATTERN**: Follow Ashe and Baptiste implementations exactly

```javascript
import { showOnEnterChoice } from '../engine/modalController';

export function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    const opt1 = { 
        name: 'Ability Name', 
        description: 'Clear description of what this ability does' 
    };
    const opt2 = { 
        name: 'Ability Name 2', 
        description: 'Clear description of what this ability does' 
    };

    showOnEnterChoice('HeroName', opt1, opt2, async (choiceIndex) => {
        // Handle choice logic here
    });
}
```

### 2. **Targeting System Requirements**
- **MUST USE**: `selectCardTarget()` and `selectRowTarget()` from `targeting.js`
- **NEVER**: Use custom jQuery click handlers or DOM manipulation for targeting
- **PATTERN**: Follow established targeting patterns from Ashe and Baptiste

```javascript
import { selectCardTarget, selectRowTarget } from '../engine/targeting';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';

// For card targeting
showToast('Hero: Select target enemy');
const target = await selectCardTarget();
if (target) {
    dealDamage(target.cardId, target.rowId, amount, false, playerHeroId);
}

// For row targeting  
showToast('Hero: Select enemy row');
const target = await selectRowTarget();
if (target) {
    // Place token or effect on target.rowId
}
```

### 3. **Audio Integration Requirements**
- **MUST USE**: `playAudioByKey()` from `imageImports.js`
- **NEVER**: Create custom audio handling or direct Audio() constructors
- **TIMING**: Flexible based on ability design - voice lines, sound effects, and confirmations can play at different times
- **PATTERN**: Consistent audio integration with proper error handling

```javascript
import { playAudioByKey } from '../../assets/imageImports';

// Example 1: Voice line on selection, sound effect on resolve
showOnEnterChoice('Hero', opt1, opt2, async (choiceIndex) => {
    // Voice line when option is selected
    try {
        playAudioByKey('hero-voice-line');
    } catch {}
    
    const target = await selectCardTarget();
    if (target) {
        dealDamage(target.cardId, target.rowId, amount, false, playerHeroId);
        // Sound effect when ability resolves
        try {
            playAudioByKey('hero-gunshot');
        } catch {}
    }
});

// Example 2: Audio only on resolve (confirmation)
const target = await selectCardTarget();
if (target) {
    dealDamage(target.cardId, target.rowId, amount, false, playerHeroId);
    // Confirmation sound after damage
    try {
        playAudioByKey('hero-ability1');
    } catch {}
}

// Example 3: Audio on targeting start (preparation)
showToast('Hero: Select target');
try {
    playAudioByKey('hero-targeting-start');
} catch {}
const target = await selectCardTarget();
```

**Audio Design Considerations:**
- **Voice Lines**: Play when abilities are selected or activated (character personality)
- **Sound Effects**: Play when abilities resolve (gunshots, explosions, etc.)
- **Confirmations**: Play after successful ability execution (feedback)
- **Preparation**: Play when targeting begins (UI feedback)
- **Multiple Audio**: Can layer different sounds for complex abilities

### 4. **Integration Requirements**
- **MUST ADD**: Hero to `checkOnEnterAbilities()` in `App.js`
- **MUST ADD**: Hero to ultimate handling in `App.js`
- **MUST ADD**: Hero to `abilities/index.js`
- **MUST REMOVE**: Any old logic from `HeroAbilities.js`

### 5. **Function Signature Requirements**
- **onEnter**: `({ playerHeroId, rowId })` - Extract `playerNum` inside function
- **onUltimate**: `({ playerHeroId, rowId, cost })` - Extract `playerNum` inside function
- **onDraw**: `({ playerHeroId })` - Optional, for intro sounds
- **onDeath**: `({ playerHeroId, rowId })` - Optional, for cleanup when hero dies

### 6. **Error Handling Requirements**
- **MUST**: Use try/catch blocks around all async operations
- **MUST**: Provide user feedback via toast messages
- **MUST**: Clean up targeting state on errors
- **PATTERN**: Follow established error handling from existing heroes

### 7. **Code Organization Requirements**
- **MUST**: Place hero in `src/abilities/heroes/heroName.js`
- **MUST**: Export functions as named exports: `{ onEnter, onUltimate, onDraw }`
- **MUST**: Use default export with all functions: `export default { onEnter, onUltimate, onDraw }`

### 8. **Testing Checklist**
Before considering a hero implementation complete:
- [ ] Modal appears when hero is deployed
- [ ] Both onEnter options work correctly
- [ ] Ultimate triggers with proper cost
- [ ] Audio plays at correct times
- [ ] Targeting works for all abilities
- [ ] Error handling works (cancellation, invalid targets)
- [ ] No old logic remains in HeroAbilities.js
- [ ] Integration points added to App.js

**FAILURE TO FOLLOW THESE PATTERNS WILL RESULT IN INCONSISTENT BEHAVIOR AND TECHNICAL DEBT.**

### 9. **Migration Process for Existing Heroes**
When converting existing heroes from `HeroAbilities.js` to modular system:

1. **Create new hero file** in `src/abilities/heroes/heroName.js`
2. **Copy ability logic** from `HeroAbilities.js` abilities object
3. **Convert to proper patterns**:
   - Replace custom modals with `showOnEnterChoice()`
   - Replace jQuery click handlers with `selectCardTarget()`/`selectRowTarget()`
   - Replace custom audio with `playAudioByKey()`
   - Add proper error handling and toast messages
4. **Add to integration points**:
   - Add to `abilities/index.js`
   - Add to `checkOnEnterAbilities()` in `App.js`
   - Add to ultimate handling in `App.js`
5. **Remove old logic** from `HeroAbilities.js`
6. **Test thoroughly** using the testing checklist above

### 10. **Reference Implementations**
- **Ashe**: Perfect example of modal choice + targeting patterns
- **Baptiste**: Good example of row targeting + effects system
- **Bastion**: Complete implementation following all requirements
- **Junkrat**: Example of onDeath abilities with damage source tracking
- **Lúcio**: Example of token-based abilities with turn effects
- **McCree**: Example of synergy manipulation and damage distribution

**Use these as templates for all future hero implementations.**

### 11. **Current Migration Status**
**✅ COMPLETED (Modular System):**
- Ashe - Complete implementation with modal choice + targeting
- Baptiste - Complete implementation with row targeting + effects
- Bastion - Complete implementation following all requirements
- BOB - Basic implementation (needs review for consistency)
- Junkrat - Complete implementation with onDeath ability + damage source tracking
- Lúcio - Complete implementation with token-based abilities + turn effects
- McCree - Complete implementation with synergy manipulation + damage distribution

**🔄 NEEDS MIGRATION (Still in HeroAbilities.js):**
- All other heroes in the abilities object need to be migrated
- Each hero should follow the established patterns above
- Priority: Heroes with complex abilities or modal choices

**📋 MIGRATION PRIORITY:**
1. Heroes with onEnter1 + onEnter2 (modal choices)
2. Heroes with complex targeting requirements
3. Heroes with special effects or tokens
4. Heroes with simple abilities (can be done last)

**🎯 GOAL:** All heroes should use the modular system for consistency, maintainability, and proper integration with the game's targeting, modal, and audio systems.

---

## Core Engine Modules

### engine/damageBus.js
Centralized damage application system with invulnerability support.
- `dealDamage(cardId, rowId, amount, ignoreShields=false, sourceCardId=null)` - Apply damage to a card
- `subscribe(listener)` - Listen for damage events (used by App.js damage system)
- **Invulnerability Check**: Automatically blocks damage to invulnerable slots
- **Damage Reduction**: Supports row-based damage reduction (e.g., Hanzo token)
- **Debug Logging**: Shows invulnerability checks and damage blocking
- **Source Tracking**: Includes sourceCardId in published damage events for death-triggered abilities

**⚠️ CRITICAL: Source Card ID Requirement**
- **MUST PASS** `playerHeroId` as the 5th parameter (`sourceCardId`) for ALL damage dealing abilities
- **REQUIRED FOR**: Damage reduction systems (Hanzo token), damage tracking, and death-triggered abilities
- **PATTERN**: `dealDamage(target.cardId, target.rowId, amount, false, playerHeroId)`

**Damage System Architecture:**
- **App.js**: Handles actual damage application and onDeath triggers
- **HeroAbilities.js**: Legacy system (not used for modular heroes)
- **damageBus.js**: Publishes damage events with source tracking

### engine/targetingBus.js
Manages targeting UI state and interactions.
- `setTargetingMessage(message)` - Show targeting banner (e.g., "Select One Target!")
- `clearTargetingMessage()` - Hide targeting banner
- `setTargetingCursor(cursorType)` - Change cursor (e.g., crosshair for targeting)
- `clearTargetingCursor()` - Reset to default cursor
- `isTargeting()` - Check if currently in targeting mode
- `subscribe(listener)` - Listen for targeting state changes

Recommended toast/feedback usage:
- Show a short banner during ability flows (targeting, multi-step prompts)
- Show a short banner when tokens spawn or special cards are added to hand
```javascript
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';

// Ability in progress
showToast('Ashe: Select One Target!');
// Later
clearToast();

// Token spawn
showToast('Widowmaker: Token spawned on enemy middle row');
setTimeout(() => clearToast(), 1500);

// Special card added to hand
showToast('BOB added to Player 1 hand (this round only)');
setTimeout(() => clearToast(), 2000);
```
Guidelines:
- Keep messages concise (≤ 60 chars)
- Auto-clear after ~1.5–2s unless awaiting user input
- One toast at a time; replace current message when a new event occurs

### engine/targeting.js
DOM/jQuery targeting logic abstraction.
- `selectCardTarget()` - Returns Promise<{cardId, rowId}> for card selection
- `selectRowTarget()` - Returns Promise<{rowId}> for row selection
- `selectRowTargetWithSound(heroId, cardId, eventName)` - Row selection with audio

### engine/TurnEffectsRunner.js
Handles turn-start effects and cleanup for all heroes.
- **Turn Change Detection**: Automatically detects when turns change
- **Effect Processing**: Runs `on: 'turnstart'` effects for all heroes
- **Cleanup Management**: Calls cleanup functions when effects expire
- **Debug Logging**: Shows turn changes and effect processing

### engine/aimLineBus.js (Visual Source→Target Indicator)
Lightweight bus to show a line/arrow from a source element (e.g., a card) to the cursor while targeting.
- `setArrowSource(elementId)` - Start drawing from element with this DOM id
- `clearArrow()` - Stop drawing
- `subscribe(listener)` - Subscribe to arrow source changes

Usage example (BOB onEnter):
```javascript
import aimLineBus from '../engine/aimLineBus';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';

const sourceId = `${playerNum}bob`; // playerHeroId
aimLineBus.setArrowSource(sourceId);
showToast('BOB: Place token next to an enemy row');
// After row selected
aimLineBus.clearArrow();
clearToast();
```

Guideline: When drawing a visual relationship between a source and target (e.g., onEnter abilities that require placement or targeting), display a source→cursor indicator for clarity.

### engine/modalController.js
Centralized modal management.
- `showChoiceModal(title, choices, onSelect)` - Show choice between options
- `showInterruptModal(heroId, abilityName, cost, currentSynergy, onConfirm)` - Show interrupt prompt
- `closeModal()` - Close any open modal
- `subscribeToModal(listener)` - Listen for modal state changes

### engine/actionsBus.js
Event bus for user actions and game events.
- `requestUltimate(heroId, rowId, cost)` - Request ultimate ability activation
- `requestTransform(heroId, rowId)` - Request card transformation (e.g., Ramattra → Nemesis)
- `subscribe(listener)` - Listen for action requests

### engine/soundController.js
Centralized sound management with event-based API and comprehensive audio library.
- `SoundEvents`: onDraw, onPlacement, onUltimate, onDamaged, onHealed, onDeath, onRez, onFlavor, onAcquaintance, onEnemy, onRowTarget, onInterrupt, onAbility, onGameEvent
- `AvailableAudio` - Complete catalog of all available sounds organized by category:
  - `gameEvents`: placement, victory, defeat, round1-3, initiatingMatch, prepareToAttack
  - `heroIntros`: All 37 hero intro sounds
  - `heroUltimates`: All hero ultimate sounds
  - `heroAbilities`: Key ability sounds for each hero
- `registerHeroSounds(heroId, mapping)` - Register hero-specific sound mappings
- `playHeroEventSound(heroId, eventName)` - Play sound for specific event
- `playWithOverlay(heroId, cardId, eventName)` - Play sound with visual overlay
- `playGameEvent(eventName)` - Play game event sounds (victory, defeat, etc.)
- `playHeroIntro(heroId)` - Play hero intro sound
- `playHeroUltimate(heroId)` - Play hero ultimate sound
- `playHeroAbility(heroId, abilityIndex)` - Play specific hero ability sound
- `playRandomHeroAbility(heroId)` - Play random ability sound for hero
- `autoRegisterAllHeroSounds()` - Auto-register all hero sounds from AvailableAudio
- `setOverlayListener(listener)` - Set callback for overlay events

### engine/effectsBus.js
Event bus for visual effects.
- `subscribe(listener)`, `publish(event)` - Standard event bus pattern
- Effects helpers: `overlay:damage/heal/death`, `fx:muzzleFlash`, `fx:rowBarrier`

### engine/overlayController.js
Visual overlay management.
- `subscribe(listener)` - Listen for overlay events
- `showDamage(cardId, amount)`, `showHeal(cardId, amount)` - Show damage/heal overlays
- `showDeath(cardId)`, `hideDeath(cardId)` - Show/hide death overlays
- `muzzleFlash(cardId)`, `rowBarrier(rowId, durationMs)` - Special effects

## Hero Module Implementation

### File Structure
```
src/abilities/heroes/
├── ashe.js              # Example: Ashe's abilities
├── tracer.js            # Example: Tracer's abilities
└── index.js             # Aggregates all hero modules
```

### Hero Module Template
```javascript
import targetingBus from '../engine/targetingBus';
import { dealDamage } from '../engine/damageBus';
import { selectCardTarget, selectRowTarget } from '../engine/targeting';

export const onEnter = (heroId, rowId, playerNum) => {
    // Example: Ashe's onEnter choice
    return new Promise((resolve) => {
        // Show choice modal
        const choices = [
            {
                title: "The Viper",
                description: "Deal 2 damage to one enemy ignoring shields.",
                onSelect: () => handleSingleTarget(2)
            },
            {
                title: "The Viper (Split Fire)",
                description: "Deal 1 damage to two enemies in the same row ignoring shields.",
                onSelect: () => handleSplitTarget()
            }
        ];
        
        // Show modal and handle selection
        // ... modal logic
    });
};

const handleSingleTarget = (damage) => {
    targetingBus.setTargetingMessage("Select One Target!");
    targetingBus.setTargetingCursor(true);
    
    selectCardTarget().then(({ cardId, rowId }) => {
        dealDamage(cardId, rowId, damage, true); // ignoreShields = true
        targetingBus.clearTargetingMessage();
        targetingBus.clearTargetingCursor();
    });
};

const handleSplitTarget = () => {
    targetingBus.setTargetingMessage("Select Two Targets!");
    targetingBus.setTargetingCursor(true);
    
    // Select first target
    selectCardTarget().then(({ cardId: card1Id, rowId: row1Id }) => {
        targetingBus.setTargetingMessage("Select Final Target!");
        
        // Select second target (must be same row)
        selectCardTarget().then(({ cardId: card2Id, rowId: row2Id }) => {
            if (row1Id !== row2Id) {
                console.warn('Split Fire: Targets must be in the same row.');
                return;
            }
            
            dealDamage(card1Id, row1Id, 1, true);
            dealDamage(card2Id, row2Id, 1, true);
            targetingBus.clearTargetingMessage();
            targetingBus.clearTargetingCursor();
        });
    });
};

export default { onEnter };
```

## Trigger System

### Supported Triggers
- **onEnter**: Fires when a hero is deployed to a row
- **onUltimate**: User-activated ability with synergy cost from the hero's current row
- **onDeath**: Fires when a hero reaches 0 health
- **onInterrupt**: Optional window offered before damage lands (e.g., Tracer Recall)
- **spawnSpecial/spawnToken**: Spawns a special card or row/card token (e.g., B.O.B., Infra-Sight)

### onEnter Variants
- **onEnter1 only**: Auto-executes the ability
- **onEnter1 + onEnter2**: Show a choice modal; execute selected ability once

When a hero defines two on-enter options, always present a modal to the player to choose which one to run. Use the shared choice modal helper:

```javascript
import { showOnEnterChoice } from '../engine/modalController';

const opt1 = { name: 'Ability 1', description: 'Describe option 1' };
const opt2 = { name: 'Ability 2', description: 'Describe option 2' };

showOnEnterChoice('HeroName', opt1, opt2, (choiceIndex) => {
  if (choiceIndex === 0) {
    // resolve option 1
  } else {
    // resolve option 2
  }
});
```

This matches the pattern used by Ashe and Baptiste: modal → targeting prompt(s) with an aim line → resolve with overlays and sounds.

### Synergy Rules
- Ultimates require row synergy ≥ cost to activate
- Upon activation, subtract cost from that row
- Row synergy continues accumulating via placements unless modified by effects

### Interrupt Flow (Example: Tracer Recall)
1. Damage pipeline pauses before applying
2. If hero defines onInterrupt and row synergy ≥ cost, show modal to confirm
3. If confirmed, execute interrupt (e.g., return Tracer to hand), consume synergy, skip applying that damage

**⚠️ IMPORTANT: Tracer Recall Limitations**
- Tracer cannot avoid killshots - Dragon Blade and Widowmaker's ultimate bypass Recall
- These abilities use fixed damage that cannot be interrupted by Recall

## UI Components

## Board Geometry: Rows and Columns

Definitions used across abilities and effects:

- Rows (per side):
  - Front (`f`), Middle (`m`), Back (`b`). Full ids are `1f/1m/1b` for Player 1 and `2f/2m/2b` for Player 2.
  - Each row owns an ordered list of `cardIds` (the visual left→right order).

- Columns:
  - A column is defined by the same index across a side’s rows.
  - For index `k`, the column contains the k-th card from any of that side’s rows that has a card at `k`.
  - Example: Front has 3 cards (indices 0..2), Middle has 2 cards (0..1).
    - Column 0 = front[0] + middle[0]
    - Column 1 = front[1] + middle[1]
    - Column 2 = front[2] + middle[2] (middle[2] is empty)
  - If a row has no card at that index, that slot in the column is empty.
  - Opponent columns are computed the same way using their rows (`1f/1m/1b` vs `2f/2m/2b`).

- Targeting index:
  - We derive the column index from the DOM list item index (`liIndex`) when selecting a card.
  - For row-based effects, use the same `liIndex` across the three rows for that side to build the column set.

These conventions ensure consistent behavior for column-based abilities (e.g., effects that hit “this column” across multiple rows).

### Row Capacity Standard
- Baseline maximum of 4 units per row.
- Moves or placements into a full row are prevented by the reducer and drag/deploy handler.
- Use `window.__ow_isRowFull(rowId)` to check capacity from hero modules/UI before attempting moves.

## Hero Implementation Checklist

Use this checklist when adding a new hero module in `src/abilities/heroes/<hero>.js`:

- Sounds
  - Draw sound: `<hero>-intro.mp3` (play in `onDraw()`)
  - Placement sound: `<hero>-enter.mp3` (play in `onEnter()`)
  - Ability/Ultimate voice lines and SFX: map new files in `imageImports.js` and play on resolution (e.g., voice + gun SFX)

- Targeting & UI
  - Use `selectRowTarget()` / `selectCardTarget()` for interactions
  - Show prompts with `targetingBus.showMessage(...)` and clear with `clearMessage()`
  - Draw a source→cursor line while targeting using `aimLineBus.setArrowSource(playerHeroId)` and clear with `clearArrow()` when done
  - Right-click (contextmenu) can cancel flows early; ensure you clear arrow/toast and apply partial selections if required

- Effects/Overlays
  - Publish ephemeral visuals with `effectsBus`:
    - `Effects.showHeal(cardId, amount)` → green “+amount”
    - `Effects.showDamage(cardId, amount)` → red “-amount”

- Rows & Columns
  - Rows: `1f/1m/1b` (P1) and `2f/2m/2b` (P2)
  - Columns: same index across a side’s rows; missing slots are empty
  - Opposing row for a position is the same `f/m/b` on the other side

- Ultimate Cost Modifiers
  - Row-wide modifiers (e.g., BOB token) append objects to a row’s effects array
    - Example: `{ id:'bob-token', hero:'bob', type:'ultCost', value:2, tooltip:'+2 to Synergy Costs' }` in `row.enemyEffects`
  - Ultimate resolver adds `value` to the base cost and deducts the adjusted amount

- State Bridges (temporary helpers for modules)
  - `__ow_getRow(rowId)` → current row object
  - `__ow_getCard(playerHeroId)` → card object (health, shields, etc.)
  - `__ow_getMaxHealth(playerHeroId)` → card’s max health (from data)
  - `__ow_setCardHealth(playerHeroId, newHealth)` → update health
  - `__ow_updateSynergy(rowId, delta)` → mutate row synergy (e.g., -1)
  - `__ow_isRowFull(rowId)` → returns true if row has 4 units
  - `__ow_moveCardToRow(cardId, targetRowId)` → moves a card to another row (inserts at end), capacity-enforced
  - Use sparingly; long-term we’ll route all state changes through centralized actions

Implementing Steps
1) Create `src/abilities/heroes/<hero>.js` exporting needed triggers (`onDraw`, `onEnter`, `onUltimate`, etc.)
2) Register the module in `src/abilities/index.js`
3) Add audio imports/mappings in `src/assets/imageImports.js`
4) If needed, integrate trigger calls in `App.checkOnEnterAbilities()` or the ultimate handler
5) Test with targeting prompts, overlays, and sounds

### Row Tokens & Dynamic Power

- Store row-wide tokens as objects on the row effects:
  - Ally-side: `row.allyEffects`, Enemy-side: `row.enemyEffects`
  - Example (BOB): `{ id:'bob-token', hero:'bob', type:'ultCost', value:2, tooltip:'+2 to Synergy Costs' }`
  - Example (Ana): `{ id:'ana-token', hero:'ana', type:'rowPowerBoost', tooltip:'+X Power (heroes in row)' }`
- Dynamic power (e.g., Ana):
  - Compute X = number of alive heroes in the row
  - Exclude `special: true` units (BOB, MEKA, turret), except `nemesis` which counts as a hero
  - Persist if source dies; recompute as heroes enter/leave/die

### Audio & Targeting Conventions

- Sound keys are unique and strict (no substring matches): `ashe-ability1`, `ana-ability1`, etc.
  - Use `playAudioByKey(key, { debounceMs })` to avoid rapid double-plays
  - Shared/global sounds are limited to items like `placement`, `endturn`
- Targeting UX:
  - Always show a toast prompt and draw a source→cursor aim line during selection
  - Keep the indicator visible until a valid selection or explicit cancel (right-click)
  - Clear both on resolve/cancel

### Modal Components
- `components/modals/Modal.js` - Base modal component
- `components/modals/ChoiceModal.js` - Choice between multiple options
- `components/modals/InterruptModal.js` - Interrupt confirmation prompt

### Targeting Components
- `components/layout/TopBanner.js` - Non-intrusive targeting messages
- `components/cards/ContextMenu.js` - Right-click context menu for cards

### CSS Classes
- `.modal-open` - Applied to body when modal is open (prevents background scrolling)
- `.targeting-cursor` - Applied when in targeting mode
- `.context-menu` - Right-click context menu styling

## Integration Points

### App.js Integration
- Subscribes to `actionsBus` for ultimate/transform requests
- Subscribes to `targetingBus` for targeting state
- Manages modal state and `onEnter` ability flow
- Enforces synergy deduction for ultimates
- Prevents ultimate use on same turn as deployment

### Card.js Integration
- Right-click context menu for ultimates/transforms
- Disables card focus during targeting mode
- Prevents event propagation conflicts

### HeroAbilities.js Integration
- Checks `targetingBus.isTargeting()` to prevent interference
- Maintains backward compatibility with old ability system

## Best Practices

### Event Handling
- Always use `e.preventDefault()` and `e.stopPropagation()` in targeting handlers
- Check `targetingBus.isTargeting()` before executing old ability system
- Use Promise-based targeting functions for clean async flow

### Damage Application
- Use `dealDamage(cardId, rowId, amount, ignoreShields, sourceCardId)` for all damage
- Never call UI internals directly from hero modules
- Subscribe to `damageBus` for centralized damage handling

### Sound Integration
- Register hero sounds with `soundController.registerHeroSounds()`
- Use event-based sound triggers (onDraw, onPlacement, etc.)
- Support multiple audio files per event with random selection

#### Sound Usage Examples
```javascript
import soundController, { 
    playGameEvent, 
    playHeroIntro, 
    playHeroUltimate, 
    playHeroAbility,
    AvailableAudio 
} from '../engine/soundController';

// Play game events
playGameEvent('placement');        // Unit placement sound
playGameEvent('endturn');          // End turn sound
playGameEvent('victory');          // Victory announcement
playGameEvent('defeat');           // Defeat announcement

// Play hero sounds
playHeroIntro('tracer');           // Tracer's intro sound
playHeroUltimate('reaper');        // Reaper's ultimate sound
playHeroAbility('mercy', 0);       // Mercy's first ability sound
playHeroAbility('mercy', 1);       // Mercy's second ability sound

// Access available sounds
console.log(AvailableAudio.heroIntros.tracer);     // 'tracer-intro'
console.log(AvailableAudio.heroUltimates.reaper);  // 'reaper-ult'
console.log(AvailableAudio.heroAbilities.mercy);   // ['mercy-heal', 'mercy-damageboost', ...]
```

#### Hero-Specific Enter Sounds
When a hero is deployed to a row, the system automatically plays:
1. **General placement sound** (`placement.mp3`) - the "drop in" sound effect
2. **Hero-specific enter sound** (`{heroId}-enter.mp3`) - the hero's voice line (if available)

#### Hero-Specific Intro Sounds
When a hero is automatically drawn during gameplay (NOT during initial setup), the system plays:
1. **Hero intro sound** (`{heroId}-intro.mp3`) - the hero's intro voice line

**Important**: Intro sounds are NOT played during the initial 4-card setup to avoid audio overload.

### Audio Implementation Requirements

**CRITICAL**: All hero audio files must be properly imported and mapped to work correctly.

#### Required Audio Files for Each Hero:
- `{heroId}-enter.mp3` - Plays when hero is deployed to a row
- `{heroId}-intro.mp3` - Plays when hero is drawn from deck
- `{heroId}-ability1.mp3` - Plays when first ability is used
- `{heroId}-ability2.mp3` - Plays when second ability is used (if applicable)
- `{heroId}-ultimate.mp3` - Plays when ultimate is activated

#### Implementation Steps:
1. **Add Audio Imports** to `src/assets/imageImports.js`:
   ```javascript
   import heroEnter from './audio/hero-enter.mp3';
   import heroIntro from './audio/hero-intro.mp3';
   import heroAbility1 from './audio/hero-ability1.mp3';
   import heroUltimate from './audio/hero-ultimate.mp3';
   ```

2. **Add Audio Mappings** to `abilityAudioFiles` object:
   ```javascript
   'hero-enter': heroEnter,
   'hero-intro': heroIntro,
   'hero-ability1': heroAbility1,
   'hero-ultimate': heroUltimate,
   ```

3. **System Handles Player IDs Automatically**: The `getAudioFile()` function automatically converts player-specific IDs (e.g., `1lucio-intro`) to hero-specific keys (e.g., `lucio-intro`).

## **Ramattra & Nemesis Implementation - Complete Guide**

### **Overview**
Ramattra and Nemesis Ramattra are unique heroes that require special transformation mechanics, custom card removal, and persistent effects. This section documents all the challenges encountered and solutions implemented.

### **Key Challenges & Solutions**

#### **1. Hero Transformation System**
**Challenge**: Ramattra needs to transform into Nemesis when using his ultimate, requiring removal of alive hero and addition of special card.

**Solution**: Created new action type `REMOVE_ALIVE_CARD` for removing alive heroes (bypasses health check).

```javascript
// In App.js - Added new action type
REMOVE_ALIVE_CARD: 'remove-alive-card',

// In reducer - Added case for removing alive cards
case ACTIONS.REMOVE_ALIVE_CARD: {
    // Same logic as REMOVE_DEAD_CARD but for alive heroes
}

// In Ramattra ultimate
window.__ow_dispatchAction?.({
    type: 'remove-alive-card',  // Note: use string, not constant
    payload: { cardId: playerHeroId }
});
```

#### **2. Special Card Intro Sounds**
**Challenge**: Special cards (Nemesis, D.Va+MEKA, BOB) weren't playing intro sounds when added to hand.

**Solution**: Added intro sound logic to `ADD_SPECIAL_CARD_TO_HAND` reducer.

```javascript
// In App.js - ADD_SPECIAL_CARD_TO_HAND reducer
const result = produce(gameState, (draft) => {
    // ... card creation logic
});

// Play intro sound AFTER state update but BEFORE return
console.log(`ADD_SPECIAL_CARD_TO_HAND: Attempting to play intro sound for ${cardId}`);
try {
    const introAudioSrc = getAudioFile(`${cardId}-intro`);
    if (introAudioSrc) {
        const introAudio = new Audio(introAudioSrc);
        introAudio.play();
    }
} catch (err) {
    console.log(`${cardId} intro audio creation failed:`, err);
}

return result;
```

#### **3. Card-Level Overlay Rendering**
**Challenge**: AnnihilationOverlay was rendering at row level, causing it to appear in center of row instead of tracking Nemesis.

**Solution**: Moved overlay rendering to individual Card component.

```javascript
// In Card.js - Render overlays at card level
{health > 0 && Array.isArray(effects) && effects.some(e => e?.id === 'annihilation') && (
    <AnnihilationOverlay playerHeroId={playerHeroId} rowId={rowId} />
)}

// In BoardRow.js - REMOVED overlay rendering
// (No longer renders overlays at row level)
```

#### **4. Window Dispatch Function**
**Challenge**: Hero modules couldn't dispatch actions because they don't have access to dispatch function.

**Solution**: Created `window.__ow_dispatchAction` function.

```javascript
// In App.js - Added window function
window.__ow_dispatchAction = (action) => {
    dispatch(action);
};

// In hero modules - Use window function
window.__ow_dispatchAction?.({
    type: 'remove-alive-card',
    payload: { cardId: playerHeroId }
});
```

#### **5. Focus Images for Special Cards**
**Challenge**: Ramattra and Nemesis were missing from shift-click focus system.

**Solution**: Added focus image imports and mappings.

```javascript
// In imageImports.js
import ramattraFocus from './heroes/cardfocus/ramattra.webp';
import nemesisFocus from './heroes/cardfocus/nemesis.webp';

export const heroCardFocusImages = {
    // ... other heroes
    ramattra: ramattraFocus,
    nemesis: nemesisFocus,
};
```

#### **6. Persistent Turn Effects**
**Challenge**: Nemesis Annihilation needed to trigger every turn start.

**Solution**: Added processing to TurnEffectsRunner.

```javascript
// In TurnEffectsRunner.js - Added Nemesis processing
// Process Nemesis Annihilation effects
const row = gameState.rows[rowId];
if (row && row.cardIds) {
    for (let cardId of row.cardIds) {
        const card = gameState.playerCards[`player${playerTurn}cards`]?.cards?.[cardId];
        if (card && card.id === 'nemesis' && Array.isArray(card.effects)) {
            const hasAnnihilation = card.effects.some(effect => 
                effect?.id === 'annihilation' && effect?.type === 'persistent'
            );
            if (hasAnnihilation) {
                processAnnihilation(cardId, rowId);
            }
        }
    }
}
```

### **File Structure for Ramattra/Nemesis**

```
src/abilities/heroes/
├── ramattra.js          # Ramattra abilities + transformation
├── nemesis.js           # Nemesis abilities + Annihilation processing

src/components/effects/
├── AnnihilationOverlay.js  # Visual effect for Nemesis

src/assets/
├── audio/
│   ├── ramattra-*.mp3   # Ramattra audio files
│   └── nemesis-*.mp3    # Nemesis audio files
├── heroes/cardfocus/
│   ├── ramattra.webp    # Focus images
│   └── nemesis.webp
└── annihilation.png     # Overlay icon
```

### **Key Implementation Notes**

1. **Transformation Timing**: Ramattra transforms immediately when ultimate is used, not at end of turn
2. **Special Card Handling**: Nemesis is treated as special card (ignores hand size limits)
3. **Effect Cleanup**: Annihilation effect ends when Nemesis dies
4. **Overlay Positioning**: Card-level overlays track the hero, row-level overlays don't
5. **Audio Integration**: Special cards need intro sounds in ADD_SPECIAL_CARD_TO_HAND reducer
6. **Action Dispatch**: Use window functions for dispatching actions from hero modules

### **Testing Checklist**

- [ ] Ramattra ultimate removes Ramattra from board
- [ ] Nemesis added to hand with intro sound
- [ ] Nemesis Pummel ability works (damage = shield value, pierces shields)
- [ ] Nemesis Annihilation ultimate adds persistent effect
- [ ] Annihilation overlay appears and tracks Nemesis
- [ ] Annihilation damage triggers every turn start
- [ ] Effect ends when Nemesis dies
- [ ] Both heroes have shift-click focus images

#### Common Mistakes:
- ❌ **Missing Imports**: Audio files imported but not mapped
- ❌ **Missing Mappings**: Audio files mapped but not imported
- ❌ **Wrong File Names**: Using incorrect naming convention
- ❌ **Player ID Confusion**: The system handles this automatically - don't worry about player numbers

#### Testing Audio:
- Check console for "Playing {heroId} intro sound..." messages
- Verify audio files exist in `src/assets/audio/` directory
- Ensure all imports and mappings are added correctly

#### Hero-Specific Ability Sounds
When a hero uses their abilities, the system can play specific voice lines:
- **Ability 1**: `{heroId}-ability1.mp3` - for the first ability option
- **Ability 2**: `{heroId}-ability2.mp3` - for the second ability option

**Example**: Ashe plays `ashe-ability1.mp3` for "The Viper" and `ashe-ability2.mp3` for "The Viper (Split Fire)"

// Auto-register all hero sounds (call once at app startup)
soundController.autoRegisterAllHeroSounds();
```

### Modal Management
- Use `modalController` for all modal operations
- Subscribe to modal state changes for UI updates
- Always clean up targeting state when modals close

## Card Focus System

### CardFocusLite Component
A lightweight card preview system for SHIFT+Click interactions.

**Features:**
- **SHIFT+Left Click** on any card to show a large preview
- **Non-interactive** - No ability activation from focused view
- **Transparent background** - Keeps battlefield visible
- **Auto-close** - Click anywhere to close

**Implementation:**
```javascript
// In Card.js - handle SHIFT+Click
onClick={(e) => {
    if (e.shiftKey && e.button === 0) { // SHIFT+Left Click
        props.setCardFocus({
            playerHeroId: props.playerHeroId,
            rowId: props.rowId
        });
    }
}}

// In BoardRow.js - render CardFocusLite
<CardFocusLite 
    focus={props.cardFocus && props.cardFocus.playerHeroId ? props.cardFocus : null} 
    onClose={() => props.setCardFocus('invisible')} 
/>
```

## Development Workflow

1. **Create hero module** in `src/abilities/heroes/<heroId>.js`
2. **Export trigger functions** (onEnter, onUltimate, etc.)
3. **Use engine modules** for all interactions (damage, targeting, sounds)
4. **Add to index.js** to register the hero
5. **Test integration** with existing UI components
6. **Update documentation** with new patterns

## Special Effects System

### Invulnerability System
The game supports slot-based invulnerability through the damage bus and game state.

**Implementation:**
- `gameState.invulnerableSlots[rowId][sourceCardId] = [slotIndices]` - Stores protected slots
- `window.__ow_isSlotInvulnerable(rowId, slotIndex)` - Checks if a slot is protected
- `window.__ow_setInvulnerableSlots(rowId, sourceCardId, sourceRowId)` - Sets protected slots
- `window.__ow_clearInvulnerableSlots(rowId)` - Clears protected slots

**Example - Baptiste Immortality Field:**
```javascript
// Set invulnerable slots (Baptiste + adjacent)
window.__ow_setInvulnerableSlots(rowId, playerHeroId, rowId);

// Add effect for cleanup
const immortalityEffect = {
    id: 'immortality-field',
    hero: 'baptiste',
    type: 'invulnerability',
    sourceCardId: playerHeroId,
    sourceRowId: rowId,
    on: 'turnstart',
    tooltip: 'Immortality Field: Adjacent slots are invulnerable to damage'
};
window.__ow_appendRowEffect(rowId, 'allyEffects', immortalityEffect);

// Cleanup function
export function cleanupImmortalityField(rowId) {
    window.__ow_clearInvulnerableSlots(rowId);
    window.__ow_removeRowEffect(rowId, 'allyEffects', 'immortality-field');
}
```

### Visual Overlays
Custom React components for visual effects that follow heroes.

**Example - ImmortalityFieldOverlay:**
- Renders as a child of BoardRow with `position: absolute`
- Automatically follows the hero when they move
- Uses CSS transforms for smooth positioning
- Cleans up when the effect expires

**Implementation Pattern:**
```javascript
// In BoardRow.js - render overlay for each hero with active effects
{gameState.rows[rowId].cardIds.map(cardId => {
    const card = gameState.playerCards[`player${playerNum}cards`]?.cards?.[cardId];
    if (card && card.id === 'baptiste') {
        return (
            <ImmortalityFieldOverlay
                key={`immortality-${cardId}`}
                playerHeroId={cardId}
                rowId={rowId}
            />
        );
    }
    return null;
})}
```

## Ultimate Usage Tracking System

## Hero Mechanics: Doomfist (Reference)

### Rocket Punch (On Enter Option)
- Deal 2 damage to a single enemy (respects shields).
- After damage, attempt to push the target to the row behind on its side:
  - Front → Middle, Middle → Back, Back → no push.
  - Push is blocked if destination row is full (4 units).
- If the target dies from the hit, still attempt the push (if possible), then deal 1 damage to all remaining enemies in the target’s original row.
- Cannot target dead heroes.

Implementation notes:
- Use `dealDamage(target.cardId, target.rowId, 2)`.
- Determine push row from `target.rowId[1]` and call `window.__ow_moveCardToRow(target.cardId, pushToRow)` if `!window.__ow_isRowFull(pushToRow)`.
- For the death-trigger, iterate the original row’s `cardIds` and apply `dealDamage(..., 1)` to others.

### Meteor Strike (Ultimate, Cost 3)
- Deal 3 damage to the selected enemy.
- Then deal 1 damage to adjacent enemies:
  - Left and right neighbors in the same row (based on index in `row.cardIds`).
  - Row-adjacent positions on the same side: from Front↔Middle↔Back (do not cross sides).

Audio guidance:
- Play the start sound on activation and a distinct landing/impact sound after resolving damage.

Edge cases handled:
- Shields absorb Rocket Punch damage; push still occurs if capacity allows.
- If destination row is full, no push occurs but damage still applies.

### Overview
The game enforces that **each hero can only use their ultimate once per round**. This system tracks usage and provides visual feedback.

### Implementation Details
- **Game State**: `ultimateUsage: { player1: [], player2: [] }` - Arrays of hero IDs that have used ultimate
- **Array Methods**: Use `array.includes(heroId)` to check usage, `array.push(heroId)` to mark as used
- **Why Arrays**: Uses arrays instead of Sets for Immer compatibility (Sets require `enableMapSet()` plugin)
- **Reset**: Cleared at the start of each round via `RESET_ULTIMATE_USAGE` action
- **Prevention**: Ultimate activation checks `ultimateUsage` before allowing execution
- **Visual Feedback**: Context menu shows "Ultimate (Used)" with strikethrough when disabled

### Code Pattern
```javascript
// Check if hero has used ultimate
const hasUsedUltimate = gameState.ultimateUsage?.[playerKey]?.includes(heroId);

// Mark ultimate as used
dispatch({
    type: ACTIONS.MARK_ULTIMATE_USED,
    payload: { playerNum, heroId }
});

// Reset at round start
dispatch({ type: ACTIONS.RESET_ULTIMATE_USAGE });
```

## Death Cleanup System

### Overview
Heroes can define an `onDeath` function that automatically triggers when they reach 0 health, allowing for cleanup of persistent effects and death-triggered abilities.

### Implementation Details
- **Trigger**: Automatically called when a hero's health reaches 0 during damage application
- **Function Signature**: `onDeath({ playerHeroId, rowId })` - receives the dying hero's ID and current row
- **Cleanup**: Use `window.__ow_removeRowEffect()` to clean up persistent effects
- **Error Handling**: Wrapped in try/catch to prevent death cleanup errors from breaking the game
- **Damage System**: onDeath triggers are handled in App.js damage system, not HeroAbilities.js

### Code Pattern
```javascript
// In hero module
export function onDeath({ playerHeroId, rowId }) {
    // Remove all persistent effects created by this hero
    const rowIds = ['1b', '1m', '1f', '2b', '2m', '2f'];
    rowIds.forEach(rowId => {
        window.__ow_removeRowEffect?.(rowId, 'enemyEffects', 'hero-token');
    });
    console.log(`${playerHeroId} died - effects cleaned up`);
}
```

### Death-Triggered Abilities
Some heroes have abilities that trigger when they die, such as:
- **Junkrat Total Mayhem**: Deals damage to the killer and adjacent enemies
- **Future heroes**: Can implement similar death-triggered abilities

### Examples
- **Bastion**: Removes all Bastion tokens from all rows when Bastion dies
- **Bob**: Removes Bob token from the row when Bob dies
- **Baptiste**: Clears invulnerability effects when Baptiste dies
- **Junkrat**: Deals damage to killer and adjacent enemies (Total Mayhem)

### Implementing Death-Triggered Abilities with Damage Source Tracking

For heroes that need to track who killed them (like Junkrat's Total Mayhem), use the damage source tracking system:

```javascript
import { dealDamage, subscribe as subscribeToDamage } from '../engine/damageBus';

// Track the last damage source for death abilities
let lastDamageSource = null;

// Function to track damage sources
function trackDamageSource(event) {
    if (event.type === 'damage' && event.targetCardId && event.sourceCardId) {
        // Check if this is damage to this hero
        const targetCard = window.__ow_getCard?.(event.targetCardId);
        if (targetCard && targetCard.id === 'heroId') {
            // Find which row the source card is in
            const allRows = ['1f', '1m', '1b', '2f', '2m', '2b'];
            for (const rowId of allRows) {
                const row = window.__ow_getRow?.(rowId);
                if (row && row.cardIds.includes(event.sourceCardId)) {
                    lastDamageSource = {
                        cardId: event.sourceCardId,
                        rowId: rowId
                    };
                    console.log(`Hero: Tracked damage source ${event.sourceCardId} in row ${rowId}`);
                    break;
                }
            }
        }
    }
}

// Subscribe to damage events to track sources
subscribeToDamage(trackDamageSource);

// onDeath: Use tracked damage source
export function onDeath({ playerHeroId, rowId }) {
    if (!lastDamageSource) {
        console.log('Hero: No damage source tracked, cannot execute death ability');
        return;
    }
    
    const killerCardId = lastDamageSource.cardId;
    const killerRowId = lastDamageSource.rowId;
    
    // Deal damage to killer
    dealDamage(killerCardId, killerRowId, 2, false, playerHeroId);
    
    // Deal damage to adjacent enemies
    const killerRow = window.__ow_getRow?.(killerRowId);
    if (killerRow) {
        const killerIndex = killerRow.cardIds.indexOf(killerCardId);
        
        // Target left neighbor
        if (killerIndex > 0) {
            const leftCardId = killerRow.cardIds[killerIndex - 1];
            dealDamage(leftCardId, killerRowId, 1, false, playerHeroId);
        }
        
        // Target right neighbor
        if (killerIndex < killerRow.cardIds.length - 1) {
            const rightCardId = killerRow.cardIds[killerIndex + 1];
            dealDamage(rightCardId, killerRowId, 1, false, playerHeroId);
        }
    }
    
    // Clear the tracked damage source
    lastDamageSource = null;
}
```

**Key Points:**
- **Damage Source Tracking**: Subscribe to damage bus to track who deals damage to your hero
- **onDeath Implementation**: Use tracked source information in death abilities
- **Source Card ID**: All damage calls must include `playerHeroId` as 5th parameter
- **Error Handling**: Always check if damage source was tracked before using it

## Shield System

### Overview
The game features a comprehensive shield system that protects heroes from damage and provides visual feedback through shield counters.

### Shield Mechanics
- **Shield Tokens**: Visual representation using `shieldcounter.png/webp` images
- **Shield Values**: Stored as `shield` number property on cards (0-3, except Wrecking Ball)
- **Shield Priority**: Shields take damage before health
- **Shield Persistence**: Row shields persist even if source hero dies
- **Shield Cleanup**: Individual hero shields are cleared when hero dies

### Turret Healing Rules
- **General Rule**: Turrets cannot be healed by most abilities (Mercy, Ana, Baptiste, Soldier: 76, Moira, Lúcio, etc.)
- **Exception**: Brigitte's Repair Pack can heal turrets up to their max HP
- **No Shields**: Turrets cannot receive shield tokens from any source (Lúcio's Sound Barrier, etc.)
- **Implementation**: Most healing functions check `card.turret === true` and skip healing
- **Brigitte Exception**: Repair Pack bypasses turret healing prevention for health only

### Future Hero Considerations
- **Symmetra**: When implemented, her healing and shield abilities should NOT affect turrets
- **Zenyatta**: When implemented, his healing and shield abilities should NOT affect turrets
- **General Rule**: All future healing and shield abilities should check `card.turret === true` and skip turrets

### Shield Implementation
```javascript
// Update shield value
window.__ow_dispatchShieldUpdate(cardId, newShieldValue);

// Check current shield
const currentShield = window.__ow_getCard?.(cardId)?.shield || 0;

// Shield overflow from healing
const maxShield = heroId === 'wreckingball' ? 999 : 3; // Wrecking Ball exception
const newShield = Math.min(currentShield + shieldToAdd, maxShield);
```

### Shield Visual Components
- **ShieldCounter**: React component that displays shield value
- **Shield Images**: `shieldcounter.png` and `shieldcounter.webp` assets
- **Shield Display**: Shows on hero cards when `shield > 0`

### Shield Examples
- **Brigitte Repair Pack**: Heals allies, excess healing becomes shields
- **Sigma Void Barrier**: Places shield tokens on rows (persistent)
- **Wrecking Ball Adaptive Shield**: Can exceed normal 3-shield limit

## Visual Overlay System

### Overview
Custom React components provide visual feedback for hero abilities and effects, enhancing gameplay clarity.

### Overlay Implementation Pattern
```javascript
// 1. Create overlay component
export default function EffectOverlay({ playerHeroId, rowId }) {
    const { gameState } = useContext(gameContext);
    
    // Check for effect condition
    const hasEffect = checkEffectCondition(gameState, playerHeroId);
    if (!hasEffect) return null;
    
    return (
        <div className="effect-overlay" style={{ /* positioning */ }}>
            {/* Visual effect content */}
        </div>
    );
}

// 2. Add to Card component
import EffectOverlay from '../effects/EffectOverlay';

// In Card render:
<EffectOverlay playerHeroId={playerHeroId} rowId={rowId} />
```

### Shield Bash Overlay Example
```javascript
// ShieldBashOverlay.js - Shows "SHIELD BASHED" with mirror effect
export default function ShieldBashOverlay({ playerHeroId, rowId }) {
    const { gameState } = useContext(gameContext);
    
    // Check if card has Shield Bash effect
    const playerNum = parseInt(playerHeroId[0]);
    const card = gameState.playerCards[`player${playerNum}cards`]?.cards?.[playerHeroId];
    const hasShieldBash = Array.isArray(card?.effects) && 
        card.effects.some(effect => effect?.id === 'shield-bash');
    
    if (!hasShieldBash) return null;
    
    return (
        <div className="shield-bash-overlay" style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) scaleY(-1)', // Mirror effect
            zIndex: 10,
            pointerEvents: 'none'
        }}>
            <div>SHIELD BASHED</div>
        </div>
    );
}
```

### Overlay Design Principles
- **Non-Intrusive**: `pointerEvents: 'none'` to avoid blocking interactions
- **Conditional Rendering**: Only show when effect is active
- **Proper Z-Index**: Ensure overlays appear above cards but below modals
- **Context Integration**: Use `gameContext` to check effect states
- **Array Safety**: Always check if arrays exist before using `.some()`, `.filter()`, etc.

### Overlay Types
1. **Status Overlays**: Show ongoing effects (Shield Bash, invulnerability)
2. **Action Overlays**: Show temporary effects (damage, healing numbers)
3. **Token Overlays**: Show persistent tokens (Bastion tokens, shield tokens)
4. **Debuff Overlays**: Show negative effects (ultimate lock, stat reductions)

### Overlay Integration
- **Card Component**: Add overlay imports and render calls
- **Effect Detection**: Use game state to determine when to show overlays
- **Cleanup**: Overlays automatically hide when effects are removed
- **Performance**: Only render when effect is active to avoid unnecessary renders

## Ultimate Blocking System

### Overview
The game supports blocking ultimate abilities through debuff effects, preventing heroes from using their ultimate for the remainder of the round.

### Implementation
```javascript
// 1. Apply ultimate block effect
window.__ow_appendCardEffect(targetCardId, {
    id: 'shield-bash',
    hero: 'brigitte',
    type: 'debuff',
    sourceCardId: playerHeroId,
    sourceRowId: rowId,
    tooltip: 'Shield Bash: Cannot use ultimate this round',
    visual: 'mirror' // For 180° turn effect
});

// 2. Check for ultimate block in context menu
const hasShieldBash = Array.isArray(card?.effects) && 
    card.effects.some(effect => effect?.id === 'shield-bash');

// 3. Update context menu display
items.push({
    label: hasUsedUltimate ? 'Ultimate (Used)' : 
           hasShieldBash ? 'Ultimate (Shield Bashed)' : 'Ultimate',
    disabled: hasUsedUltimate || hasShieldBash,
    onClick: () => {
        if (hasUsedUltimate || hasShieldBash) return;
        // ... ultimate activation logic
    }
});
```

### Ultimate Block Features
- **Visual Feedback**: Context menu shows "Ultimate (Shield Bashed)" when blocked
- **Persistent Effect**: Block persists even if source hero dies
- **Round Cleanup**: Effects are automatically cleared at round end
- **Array Safety**: Proper checks for effect arrays before using `.some()`

### Ultimate Block Examples
- **Brigitte Shield Bash**: Turns enemy 180° and blocks ultimate
- **Future Heroes**: Can implement similar blocking mechanics
- **Custom Effects**: Easy to add new ultimate-blocking abilities

## Token Cleanup Strategies

### Overview
Heroes can create persistent effects (tokens, icons, etc.) that may need cleanup. The cleanup strategy depends on the effect's design and gameplay requirements.

### Cleanup Strategies

#### 1. **Death-Based Cleanup** (Recommended for most cases)
Remove effects when the source hero dies. This prevents "orphaned" effects and maintains game balance.

```javascript
export function onDeath({ playerHeroId, rowId }) {
    // Remove all effects created by this hero
    const rowIds = ['1b', '1m', '1f', '2b', '2m', '2f'];
    rowIds.forEach(rowId => {
        window.__ow_removeRowEffect?.(rowId, 'enemyEffects', 'hero-token');
    });
}
```

**Use when:**
- Effects are directly tied to the hero's presence
- Effects would be meaningless without the hero
- Game balance requires cleanup (e.g., Bastion tokens, Bob tokens)

#### 2. **Persistent Effects** (Use sparingly)
Keep effects active even after the hero dies. Useful for environmental or lasting effects.

```javascript
// No onDeath function = effect persists
export function onEnter({ playerHeroId, rowId }) {
    window.__ow_appendRowEffect?.(rowId, 'enemyEffects', {
        id: 'environmental-hazard',
        hero: 'heroName',
        type: 'environmental',
        persistent: true, // Mark as persistent
        tooltip: 'Environmental effect that persists'
    });
}
```

**Use when:**
- Effects represent environmental changes
- Effects should outlast the hero (e.g., terrain modifications)
- Game design specifically requires persistence

#### 3. **Conditional Cleanup**
Clean up based on specific conditions rather than just death.

```javascript
export function onDeath({ playerHeroId, rowId }) {
    // Only clean up if specific conditions are met
    const gameState = window.__ow_getGameState?.();
    if (gameState?.roundNumber > 2) {
        // Clean up only in later rounds
        window.__ow_removeRowEffect?.(rowId, 'enemyEffects', 'conditional-token');
    }
}
```

### Design Considerations

**Choose Death-Based Cleanup when:**
- Effects are hero-specific abilities
- Effects provide ongoing benefits that should end with the hero
- Game balance requires cleanup
- Effects are clearly tied to the hero's presence

**Choose Persistent Effects when:**
- Effects represent environmental changes
- Effects should create lasting strategic impact
- Game design specifically calls for persistence
- Effects are meant to outlast the hero

### Implementation Pattern
```javascript
// Always include cleanup in onDeath for most effects
export function onDeath({ playerHeroId, rowId }) {
    // Remove all effects created by this hero
    const allRows = ['1b', '1m', '1f', '2b', '2m', '2f'];
    allRows.forEach(rowId => {
        window.__ow_removeRowEffect?.(rowId, 'enemyEffects', 'hero-token');
        window.__ow_removeRowEffect?.(rowId, 'allyEffects', 'hero-buff');
    });
    console.log(`${playerHeroId} died - effects cleaned up`);
}

// For persistent effects, document the decision
export function onEnter({ playerHeroId, rowId }) {
    window.__ow_appendRowEffect?.(rowId, 'enemyEffects', {
        id: 'persistent-effect',
        hero: 'heroName',
        type: 'environmental',
        persistent: true, // Document that this persists
        tooltip: 'This effect persists even after hero death'
    });
}
```

## Common Implementation Pitfalls and Solutions

### Card Object Structure Issues

**Problem**: Cards missing required properties causing runtime errors (e.g., `Cannot read properties of undefined (reading 'length')`).

**Solution**: Always ensure cards have complete structure matching `PlayerCard` class:

```javascript
// Complete card object structure
const cardObject = {
    id: 'heroId',                    // Base hero ID
    name: 'Hero Name',               // Display name
    health: 3,                       // Current health
    maxHealth: 3,                    // Maximum health
    power: { f: 1, m: 2, b: 3 },    // Power per row
    synergy: { f: 0, m: 1, b: 2 },  // Synergy per row
    shield: 0,                       // Shield count
    effects: [],                     // Card-specific effects
    enemyEffects: [],                // REQUIRED: Enemy effects array
    allyEffects: [],                 // REQUIRED: Ally effects array
    isPlayed: false,                 // Deployment status
    isDiscarded: false,              // Discard status
    enteredTurn: 0,                  // Turn when deployed
};
```

**Critical**: Never create cards without `enemyEffects: []` and `allyEffects: []` - these are required by `CardEffects` component.

### Damage Dealing Requirements

**Problem**: Damage reduction systems (like Hanzo token) not working because source card ID is missing.

**Solution**: ALWAYS pass `playerHeroId` as the source when dealing damage:

```javascript
// ❌ WRONG - Missing source card ID
dealDamage(target.cardId, target.rowId, amount);

// ✅ CORRECT - Includes source card ID
dealDamage(target.cardId, target.rowId, amount, false, playerHeroId);
```

**Why This Matters**:
- Damage reduction systems need to know which card is dealing damage
- Hanzo token reduces damage from enemies in the affected row
- Future effects may depend on damage source tracking
- Required for proper damage bus functionality

**Pattern for All Heroes**:
```javascript
export function onEnter({ playerHeroId, rowId }) {
    // ... targeting logic ...
    dealDamage(target.cardId, target.rowId, amount, false, playerHeroId);
}

export function onUltimate({ playerHeroId, rowId }) {
    // ... targeting logic ...
    dealDamage(target.cardId, target.rowId, amount, false, playerHeroId);
}
```

### Special Card Creation

**Problem**: Special cards (like D.Va+MEKA) not draggable or missing properties.

**Solution**: Use `ADD_SPECIAL_CARD_TO_HAND` action with complete card structure:

```javascript
// In hero module
window.__ow_addSpecialCardToHand?.(playerNum, 'specialHeroId');

// In App.js reducer
case ACTIONS.ADD_SPECIAL_CARD_TO_HAND: {
    const { playerNum, cardId } = action.payload;
    const playerKey = `player${playerNum}cards`;
    const handId = `player${playerNum}hand`;
    
    return produce(gameState, (draft) => {
        const heroData = data.heroes[cardId];
        if (!heroData) return;
        
        const playerCardId = `${playerNum}${cardId}`;
        
        // Create complete card object
        draft.playerCards[playerKey].cards[playerCardId] = {
            id: cardId,
            name: heroData.name,
            health: heroData.health,
            maxHealth: heroData.health,
            power: heroData.power,
            synergy: heroData.synergy,
            shield: 0,
            effects: [],
            enemyEffects: [],  // REQUIRED
            allyEffects: [],   // REQUIRED
            isPlayed: false,   // Must be false for hand cards
            isDiscarded: false,
            enteredTurn: 0,
        };
        
        // Add to hand
        draft.rows[handId].cardIds.unshift(playerCardId);
    });
}
```

### Hero vs Special Card Distinction

**Problem**: Confusing regular heroes with special cards.

**Solution**: Clear distinction:
- **Regular Heroes**: Can be drawn, played normally, have `special: false` in data
- **Special Cards**: Spawned by abilities, have `special: true` in data, ignore hand size limits

**Never**: Hardcode special behavior for regular heroes (e.g., `isPlayed: true` in `helper.js`).

### Component Safety Checks

**Problem**: Components crashing on undefined props.

**Solution**: Add safety checks in components:

```javascript
// CardEffects.js - Safe array handling
export default function CardEffects(props) {
    const effects = props.effects || []; // Safety check
    return (
        <div className={`effectscontainer ${props.type}effects`}>
            {effects.length > 0 ? (
                // Render effects
            ) : null}
        </div>
    );
}
```

### Audio Implementation Patterns

**Problem**: Incorrect audio file usage or missing audio files causing build errors.

**Solution**: Follow established audio patterns and verify file existence:

```javascript
// Correct audio flow pattern
export async function onEnter({ playerHeroId, rowId }) {
    // 1. Play enter sound on activation
    try {
        playAudioByKey('hero-enter');
    } catch {}
    
    // ... ability logic ...
    
    // 2. Play ability sound on resolve
    try {
        playAudioByKey('hero-ability1');
    } catch {}
}

export async function onUltimate({ playerHeroId, rowId, cost }) {
    // 1. Play ultimate activation sound
    try {
        playAudioByKey('hero-ultimate');
    } catch {}
    
    // ... ultimate logic ...
    
    // 2. Play ultimate resolve sound (if different)
    try {
        playAudioByKey('hero-ultimate-resolve');
    } catch {}
}
```

**Audio File Naming Convention**:
- `{hero}-intro.mp3` - onDraw (if implemented)
- `{hero}-enter.mp3` - onEnter activation
- `{hero}-ability1.mp3` - onEnter resolve
- `{hero}-ability2.mp3` - onEnter2 resolve (if applicable)
- `{hero}-ultimate.mp3` - onUltimate activation
- `{hero}-ultimate-resolve.mp3` - onUltimate execution (if different)

**Common Mistakes**:
- Using non-existent audio files (check file existence first)
- Playing wrong audio at wrong times
- Missing audio imports in `imageImports.js`
- Not adding audio mappings to `abilityAudioFiles`

### Column Targeting Implementation

**Problem**: Incorrect column targeting logic causing wrong targets or errors.

**Solution**: Use proper column targeting pattern:

```javascript
// Column targeting pattern (e.g., Genji Shuriken)
export async function onEnter({ playerHeroId, rowId }) {
    const target = await selectCardTarget();
    if (target) {
        // 1. Get target's column index
        const targetRow = window.__ow_getRow?.(target.rowId);
        const columnIndex = targetRow.cardIds.indexOf(target.cardId);
        
        // 2. Determine enemy rows
        const playerNum = parseInt(playerHeroId[0]);
        const enemyPlayer = playerNum === 1 ? 2 : 1;
        const enemyRows = [`${enemyPlayer}f`, `${enemyPlayer}m`, `${enemyPlayer}b`];
        
        // 3. Hit all enemies in same column
        for (const enemyRowId of enemyRows) {
            const enemyRow = window.__ow_getRow?.(enemyRowId);
            if (enemyRow && enemyRow.cardIds[columnIndex]) {
                const enemyCardId = enemyRow.cardIds[columnIndex];
                // Apply effect to enemyCardId
            }
        }
    }
}
```

**Key Points**:
- Column index is based on position in `row.cardIds` array
- Check for card existence before applying effects
- Handle cases where rows don't have cards at certain positions
- Use proper enemy row ID calculation

### Ultimate Tracking Integration

**Problem**: New heroes not tracked for Echo's Duplicate ability.

**Solution**: Add tracking to all ultimate executions in `App.js`:

```javascript
// In App.js ultimate handling
} else if (heroId === 'newhero' && abilitiesIndex?.newhero?.onUltimate) {
    try {
        // Track ultimate usage for Echo's Duplicate
        window.__ow_trackUltimateUsed?.(heroId, 'Hero Name', 'Ability Name', playerNum, rowId, adjustedCost);
        abilitiesIndex.newhero.onUltimate({ playerHeroId, rowId, cost: adjustedCost });
    } catch (e) {
        console.log('Error executing NEWHERO ultimate:', e);
    }
```

**Required Information**:
- `heroId`: Base hero ID (e.g., 'genji')
- `'Hero Name'`: Display name (e.g., 'Genji')
- `'Ability Name'`: Ultimate ability name (e.g., 'Dragon Blade')
- `playerNum`: Player number
- `rowId`: Row where ultimate was used
- `adjustedCost`: Final synergy cost

### Testing Checklist

Before considering any hero implementation complete:

- [ ] Card shows card back when not your turn
- [ ] Card shows front when it's your turn  
- [ ] Card is draggable from hand
- [ ] Card can be placed in rows
- [ ] Card has complete object structure
- [ ] Special cards work with hand system
- [ ] No runtime errors in console
- [ ] All required arrays present (`enemyEffects`, `allyEffects`)
- [ ] No hardcoded special behavior for regular heroes
- [ ] Audio files exist and are properly imported
- [ ] Audio plays at correct times (activation vs resolve)
- [ ] Ultimate tracking added to App.js
- [ ] Column targeting works correctly (if applicable)
- [ ] Edge cases handled (invalid targets, empty columns, etc.)
- [ ] **Source card ID passed to all damage calls** (`playerHeroId` as 5th parameter)
- [ ] Damage reduction systems work correctly (if applicable)

## Example: Complete Hero Implementation

See `src/abilities/heroes/ashe.js` for a complete implementation example with:
- onEnter choice modal
- Single and multi-target damage
- Targeting UI integration
- Event handling best practices

## McCree Implementation Patterns

### Synergy Manipulation
McCree's Flashbang demonstrates how to manipulate row synergy:

```javascript
// Get current synergy from row data
const currentSynergy = targetRowData.synergy || 0;

// Calculate amount to remove (with bounds checking)
const synergyToRemove = Math.min(enemyCount, currentSynergy);

// Update synergy using the bridge function
if (synergyToRemove > 0) {
    window.__ow_updateSynergy?.(targetRow.rowId, -synergyToRemove);
}
```

**Key Points:**
- Use `targetRowData.synergy` (not `totalSynergy`)
- Always check bounds (minimum 0)
- Use negative delta for removal

### Damage Distribution
McCree's Dead Eye demonstrates even damage distribution:

```javascript
// Calculate base damage per target
const totalDamage = 7;
const enemyCount = livingEnemies.length;
const baseDamage = Math.floor(totalDamage / enemyCount);
const remainder = totalDamage % enemyCount;

// Distribute damage with remainder handling
const damageDistribution = livingEnemies.map((cardId, index) => {
    const damage = baseDamage + (index < remainder ? 1 : 0);
    return { cardId, damage };
});
```

**Key Points:**
- Use `Math.floor()` for base distribution
- Handle remainder by adding 1 to first N targets
- Only target living enemies (`health > 0`)

### Enemy-Only Targeting
Both abilities validate enemy rows:

```javascript
const targetPlayerNum = parseInt(targetRow.rowId[0]);
const isEnemyRow = targetPlayerNum !== playerNum;

if (!isEnemyRow) {
    showToast('McCree: Ability can only target enemy rows');
    setTimeout(() => clearToast(), 1500);
    return;
}
```

**Key Points:**
- Extract player number from row ID
- Compare with current player number
- Provide clear error feedback

## Mei Implementation Patterns

### Ultimate Cost Modification
Mei's Blizzard demonstrates how to modify ultimate costs:

```javascript
// Place Mei token on enemy row
window.__ow_appendRowEffect?.(targetRow.rowId, 'enemyEffects', {
    id: 'mei-token',
    hero: 'mei',
    type: 'ultimateCostModifier',
    value: 2, // Double the cost
    sourceCardId: playerHeroId,
    sourceRowId: rowId,
    tooltip: 'Blizzard: Ultimate abilities cost double synergy from this row',
    visual: 'mei-icon'
});
```

**Key Points:**
- Use `ultimateCostModifier` type for cost changes
- Use multiplication (`*`) not addition (`+`) for doubling
- App.js handles the cost calculation automatically

### Card Effect Immunity System
Mei's Cryo Freeze demonstrates card effect immunity:

```javascript
// Apply immunity effect to target card
window.__ow_appendCardEffect?.(target.cardId, {
    id: 'cryo-freeze',
    hero: 'mei',
    type: 'immunity',
    sourceCardId: playerHeroId,
    sourceRowId: rowId,
    tooltip: 'Cryo Freeze: Immune to damage and abilities for remainder of round',
    visual: 'frozen'
});
```

**Key Points:**
- Use `type: 'immunity'` for immunity effects
- Damage bus automatically checks for immunity
- Targeting system automatically blocks frozen cards
- Visual overlays show immunity status

### Visual Overlay System
Mei's Cryo Freeze demonstrates visual overlays:

```javascript
// 1. Create overlay component
export default function CryoFreezeOverlay({ playerHeroId, rowId }) {
    const { gameState } = useContext(gameContext);
    
    // Check for effect condition
    const hasEffect = checkEffectCondition(gameState, playerHeroId);
    if (!hasEffect) return null;
    
    return (
        <div className="effect-overlay" style={{ /* positioning */ }}>
            {/* Visual effect content */}
        </div>
    );
}

// 2. Add to BoardRow.js
{gameState.rows[rowId].cardIds.map(cardId => {
    const card = gameState.playerCards[`player${playerNum}cards`]?.cards?.[cardId];
    if (card && Array.isArray(card.effects) && 
        card.effects.some(effect => effect?.id === 'cryo-freeze')) {
        return (
            <CryoFreezeOverlay
                key={`cryo-freeze-${cardId}`}
                playerHeroId={cardId}
                rowId={rowId}
            />
        );
    }
    return null;
})}
```

**Key Points:**
- Use `position: absolute` for overlays
- Check effect conditions in overlay component
- Add to BoardRow.js for each affected card
- Use unique keys for React rendering

### Card Styling for Effects
Mei's Cryo Freeze demonstrates card styling:

```javascript
// In Card.js - check for effect
const isFrozen = Array.isArray(effects) && 
    effects.some(effect => effect?.id === 'cryo-freeze' && effect?.type === 'immunity');

// Apply CSS class
className={`card ${isFrozen ? 'frozen' : ''}`}

// In Card.css - style the effect
.frozen {
    filter: hue-rotate(180deg) brightness(0.7) saturate(1.2);
    opacity: 0.8;
    pointer-events: none;
    cursor: not-allowed;
}
```

**Key Points:**
- Check effects array for specific effect ID and type
- Apply CSS classes conditionally
- Use `pointer-events: none` to disable interaction
- Use visual filters to indicate status

## Mercy Implementation Patterns

### Card Effect System
Mercy's Caduceus Staff demonstrates card effect management:

```javascript
// Apply healing effect to target card
window.__ow_appendCardEffect?.(target.cardId, {
    id: 'mercy-heal',
    hero: 'mercy',
    type: 'healing',
    sourceCardId: playerHeroId,
    sourceRowId: rowId,
    tooltip: 'Mercy Healing: Heals 1 HP at start of each turn',
    visual: 'mercyheal.png'
});

// Apply damage boost effect to target card
window.__ow_appendCardEffect?.(target.cardId, {
    id: 'mercy-damage',
    hero: 'mercy',
    type: 'damageBoost',
    value: 1,
    sourceCardId: playerHeroId,
    sourceRowId: rowId,
    tooltip: 'Mercy Damage Boost: +1 damage to all abilities',
    visual: 'mercydamage.png'
});
```

**Key Points:**
- Use `type: 'healing'` for healing effects
- Use `type: 'damageBoost'` for damage modifications
- Card effects persist until source or target dies
- Visual overlays show effect status

### Turn-Based Healing System
Mercy's healing demonstrates persistent turn effects:

```javascript
// Function to handle turn-based healing
export function mercyTokenHealing(cardId) {
    const card = window.__ow_getCard?.(cardId);
    if (!card || card.health <= 0) return;
    
    const hasMercyHeal = Array.isArray(card.effects) && 
        card.effects.some(effect => effect.id === 'mercy-heal' && effect.hero === 'mercy');
    
    if (hasMercyHeal) {
        const currentHealth = card.health;
        const newHealth = Math.min(currentHealth + 1, card.maxHealth || 4);
        const healingAmount = newHealth - currentHealth;
        
        if (healingAmount > 0) {
            window.__ow_setCardHealth?.(cardId, newHealth);
            
            // Show floating text
            if (window.effectsBus) {
                window.effectsBus.publish({
                    type: 'fx:heal',
                    cardId: cardId,
                    amount: healingAmount,
                    text: `+${healingAmount}`
                });
            }
        }
    }
}
```

**Key Points:**
- Check for effect existence before applying
- Respect maximum health limits
- Show floating text for visual feedback
- Use `window.effectsBus` for UI updates

### Damage Boost Integration
Mercy's damage boost demonstrates damage modification:

```javascript
// In damageBus.js - Check for Mercy damage boost on source card
if (sourceCardId) {
    const sourceCard = window.__ow_getCard?.(sourceCardId);
    if (sourceCard && Array.isArray(sourceCard.effects)) {
        const mercyDamageBoost = sourceCard.effects.find(effect => 
            effect?.id === 'mercy-damage' && effect?.type === 'damageBoost'
        );
        if (mercyDamageBoost) {
            finalAmount += mercyDamageBoost.value || 1;
            console.log(`DamageBus - Mercy damage boost added ${mercyDamageBoost.value || 1} damage (total: ${finalAmount})`);
        }
    }
}
```

**Key Points:**
- Check source card effects for damage boosts
- Apply boost to all damage calculations
- Use `finalAmount` for final damage calculation
- Log damage modifications for debugging

### Resurrection System
Mercy's Guardian Angel demonstrates hero resurrection:

```javascript
// Resurrect the hero
const baseHealth = targetCard.maxHealth || 4;
window.__ow_setCardHealth?.(target.cardId, baseHealth);

// Remove any negative effects
if (Array.isArray(targetCard.effects)) {
    const negativeEffects = targetCard.effects.filter(effect => 
        effect.type === 'debuff' || effect.type === 'damage' || effect.type === 'damageBoost'
    );
    negativeEffects.forEach(effect => {
        window.__ow_removeCardEffect?.(target.cardId, effect.id);
    });
}

// Show floating resurrection effect
if (window.effectsBus) {
    window.effectsBus.publish({
        type: 'fx:resurrect',
        cardId: target.cardId,
        text: 'RESURRECTED',
        icon: 'mercyrez.png'
    });
}
```

**Key Points:**
- Restore to base health from hero.json
- Clean up negative effects on resurrection
- Use floating effects for visual feedback
- Play audio on successful resurrection

### Visual Overlay System
Mercy's effects demonstrate card-specific overlays:

```javascript
// 1. Create overlay component
export default function MercyHealOverlay({ playerHeroId, rowId }) {
    const { gameState } = useContext(gameContext);
    
    const playerNum = parseInt(playerHeroId[0]);
    const card = gameState.playerCards[`player${playerNum}cards`]?.cards?.[playerHeroId];
    const hasMercyHeal = Array.isArray(card?.effects) &&
        card.effects.some(effect => effect?.id === 'mercy-heal' && effect?.type === 'healing');

    if (!hasMercyHeal) return null;

    return (
        <div className="mercy-heal-overlay">
            <div className="mercy-heal-icon">
                <img src="/src/assets/mercyheal.png" alt="Mercy Heal" />
            </div>
        </div>
    );
}

// 2. Add to BoardRow.js
{gameState.rows[rowId].cardIds.map(cardId => {
    const card = gameState.playerCards[`player${playerNum}cards`]?.cards?.[cardId];
    if (card && Array.isArray(card.effects) && 
        card.effects.some(effect => effect?.id === 'mercy-heal' && effect?.type === 'healing')) {
        return (
            <MercyHealOverlay
                key={`mercy-heal-${cardId}`}
                playerHeroId={cardId}
                rowId={rowId}
            />
        );
    }
    return null;
})}
```

**Key Points:**
- Check for specific effect ID and type
- Use conditional rendering for overlays
- Add to BoardRow.js for each affected card
- Use unique keys for React rendering

## Advanced Implementation Patterns

### Damage Source Tracking
Junkrat's Total Mayhem demonstrates damage source tracking:

```javascript
import { dealDamage, subscribe as subscribeToDamage } from '../engine/damageBus';

let lastDamageSource = null;

function trackDamageSource(event) {
    if (event.type === 'damage' && event.targetCardId && event.sourceCardId) {
        const targetCard = window.__ow_getCard?.(event.targetCardId);
        if (targetCard && targetCard.id === 'junkrat') {
            // Find which row the source card is in
            const allRows = ['1f', '1m', '1b', '2f', '2m', '2b'];
            for (const rowId of allRows) {
                const row = window.__ow_getRow?.(rowId);
                if (row && row.cardIds.includes(event.sourceCardId)) {
                    lastDamageSource = {
                        cardId: event.sourceCardId,
                        rowId: rowId
                    };
                    break;
                }
            }
        }
    }
}

// Subscribe to damage events
subscribeToDamage(trackDamageSource);

// Use in onDeath
export function onDeath({ playerHeroId, rowId }) {
    if (!lastDamageSource) return;
    
    const killerCardId = lastDamageSource.cardId;
    const killerRowId = lastDamageSource.rowId;
    
    // Deal damage to killer
    dealDamage(killerCardId, killerRowId, 2, false, playerHeroId);
}
```

**Key Points:**
- Subscribe to damage bus to track sources
- Store last damage source for death abilities
- Always pass `sourceCardId` in damage calls
- Use tracked source in onDeath abilities

### Turn Effects and Token Cleanup
Lúcio's abilities demonstrate turn effects and cleanup:

```javascript
// Place token with turn effect
window.__ow_appendRowEffect?.(targetRow.rowId, 'enemyEffects', {
    id: 'lucio-shuffle-token',
    hero: 'lucio',
    type: 'shuffle',
    sourceCardId: playerHeroId,
    sourceRowId: rowId,
    on: 'turnstart',
    tooltip: 'Lúcio Shuffle: Randomly shuffle positions of all heroes in this row at start of turn',
    visual: 'token'
});

// Cleanup on death
export function onDeath({ playerHeroId, rowId }) {
    const allRows = ['1f', '1m', '1b', '2f', '2m', '2b'];
    allRows.forEach(rowId => {
        window.__ow_removeRowEffect?.(rowId, 'enemyEffects', 'lucio-shuffle-token');
        window.__ow_removeRowEffect?.(rowId, 'allyEffects', 'lucio-token');
    });
}
```

**Key Points:**
- Use `on: 'turnstart'` for turn-based effects
- TurnEffectsRunner processes these automatically
- Clean up tokens in onDeath function
- Use `window.__ow_removeRowEffect` for cleanup

### Audio Implementation Best Practices
Based on Lúcio and Mei implementations:

```javascript
// 1. Import audio files
import heroEnter from './audio/hero-enter.mp3';
import heroIntro from './audio/hero-intro.mp3';
import heroAbility1 from './audio/hero-ability1.mp3';
import heroUltimate from './audio/hero-ultimate.mp3';

// 2. Add to abilityAudioFiles
'hero-enter': heroEnter,
'hero-intro': heroIntro,
'hero-ability1': heroAbility1,
'hero-ultimate': heroUltimate,

// 3. Play at appropriate times
export function onEnter({ playerHeroId, rowId }) {
    try {
        playAudioByKey('hero-enter'); // On activation
    } catch {}
    
    // ... ability logic ...
    
    try {
        playAudioByKey('hero-ability1'); // On resolve
    } catch {}
}

export async function onUltimate({ playerHeroId, rowId, cost }) {
    // ... targeting logic ...
    
    try {
        playAudioByKey('hero-ultimate'); // On resolve
    } catch {}
}
```

**Key Points:**
- Play enter sounds on activation
- Play ability sounds on resolve
- Play ultimate sounds on resolve (not activation)
- Always wrap in try/catch blocks
- System handles player ID conversion automatically

### Common Implementation Mistakes to Avoid

1. **Wrong Synergy Property**: Use `targetRowData.synergy` not `targetRowData.totalSynergy`
2. **Missing Source Card ID**: Always pass `playerHeroId` as 5th parameter to `dealDamage`
3. **Wrong Import Syntax**: Use `import gameContext` not `import { gameContext }`
4. **Missing Audio Mappings**: Import audio files AND add to `abilityAudioFiles`
5. **Incorrect Cost Modification**: Use multiplication for doubling, not addition
6. **Missing Effect Cleanup**: Always clean up effects in `onDeath` function
7. **Wrong Effect Type**: Use `type: 'immunity'` for immunity effects
8. **Missing Visual Feedback**: Add overlays and CSS classes for status effects
9. **Wrong Toast Import**: Use `targetingBus` not `toastController` for toast functions
10. **Missing Default Export**: Always include default export in hero modules
11. **Wrong Effect Type Names**: Use `type: 'healing'` for healing, `type: 'damageBoost'` for damage boosts
12. **Missing Turn Effect Integration**: Add turn-based effects to TurnEffectsRunner
13. **Incorrect Damage Boost Logic**: Apply boosts in damageBus.js, not individual abilities
14. **Missing Player Tracking**: Track source player for turn-based cleanup effects
15. **Incorrect Temporary HP Calculation**: Use current HP + bonus, not base HP + bonus
16. **Missing UI Re-render Triggers**: Use dynamic keys to force component re-renders
17. **Wrong Cleanup Timing**: Only clean up effects when it's the source player's turn
14. **Missing Resurrection Cleanup**: Remove negative effects when resurrecting heroes

## Lifeweaver Implementation Guide

### Overview
Lifeweaver demonstrates several advanced patterns including automatic targeting, temporary HP systems, player-specific cleanup, and UI re-rendering techniques.

### Key Abilities

#### Life Grip (onEnter1)
- **Automatic targeting**: Finds most damaged friendly unit across all friendly rows
- **Smart selection**: Uses health percentage (current/max) to determine most damaged
- **Row capacity check**: Fails gracefully if destination row is full
- **Shield granting**: Gives 1 shield (respects 3-shield maximum)

#### Tree of Life (Ultimate, Cost 2)
- **Adjacent targeting**: Affects Lifeweaver + left/right + front/back column
- **Temporary HP system**: Special visual system with green styling
- **Player tracking**: Tracks which player used the ultimate for proper cleanup

### Temporary HP System Implementation

#### Core Concept
Temporary HP shows as green health values that persist until the source player's next turn.

#### Key Components

1. **Effect Structure**:
```javascript
// Main effect
{
    id: 'tree-of-life-temp-hp',
    hero: 'lifeweaver',
    type: 'temporaryHP',
    value: 1,
    sourcePlayerNum: playerNum, // Critical for cleanup timing
    tooltip: 'Tree of Life: +1 temporary HP until start of next turn'
}

// Display effect
{
    id: 'temp-hp-display',
    hero: 'lifeweaver',
    type: 'display',
    tempHP: currentHealth + 1, // Current HP + bonus
    originalHealth: currentHealth,
    sourcePlayerNum: playerNum
}
```

2. **HealthCounter Component Updates**:
```javascript
// Check for temporary HP effect
const hasTempHP = Array.isArray(effects) && 
    effects.some(effect => effect?.id === 'temp-hp-display' && effect?.type === 'display');

// Display logic
if (hasTempHP) {
    const tempHPEffect = effects.find(effect => 
        effect?.id === 'temp-hp-display' && effect?.type === 'display'
    );
    if (tempHPEffect && tempHPEffect.tempHP) {
        displayHealth = tempHPEffect.tempHP;
        isTemporary = true;
    }
}
```

3. **CSS Styling**:
```css
.healthcounter.temporary-hp {
    filter: hue-rotate(120deg) brightness(1.2) saturate(1.5);
}

.healthvalue.temp-hp-value {
    color: #00ff00 !important;
    font-weight: bold;
    text-shadow: 0 0 3px #00ff00;
}
```

4. **UI Re-rendering**:
```javascript
// Force re-render when effects change
<HealthCounter
    key={`${playerHeroId}-${effects?.length || 0}-${effects?.map(e => e.id).join(',') || ''}`}
    type='cardcounter'
    health={health}
    effects={effects}
    playerHeroId={playerHeroId}
/>
```

### Player-Specific Cleanup System

#### Problem
Temporary HP effects were being removed immediately when any turn changed, not when the source player's turn started.

#### Solution
Track the source player and only clean up when it's their turn:

```javascript
// In effect creation
sourcePlayerNum: playerNum // Track which player used the ultimate

// In cleanup function
const shouldCleanup = (mainEffect && mainEffect.sourcePlayerNum === currentPlayerTurn) ||
                     (displayEffect && displayEffect.sourcePlayerNum === currentPlayerTurn);
```

#### TurnEffectsRunner Integration
```javascript
// Pass current player turn to cleanup function
cleanupTemporaryHP(gameState, playerTurn);
```

### Key Learning Points

#### 1. Temporary HP Calculation
- **Wrong**: `maxHealth + 1` (base HP + bonus)
- **Correct**: `currentHealth + 1` (current HP + bonus)
- **Example**: Hero at 1/3 HP should get 2 temporary HP, not 4

#### 2. UI Re-rendering Issues
- **Problem**: React components don't re-render when props change internally
- **Solution**: Use dynamic keys that change when effects change
- **Pattern**: `key={cardId}-${effects.length}-${effectIds.join(',')}`

#### 3. Player-Specific Effect Cleanup
- **Problem**: Effects cleaned up on any turn change
- **Solution**: Track source player and only clean up on their turn
- **Pattern**: Store `sourcePlayerNum` in effects, check in cleanup

#### 4. Effect Detection for Cleanup
- **Problem**: Only checking for main effect, missing display effect
- **Solution**: Check for both effect types independently
- **Pattern**: Use `find()` to get specific effects, check both

#### 5. Function Parameter Passing
- **Problem**: `playerNum` not in scope for nested functions
- **Solution**: Pass as parameter through function chain
- **Pattern**: `onUltimate` → `applyTemporaryHP` → `updateTemporaryHPDisplay`

### Debugging Techniques

#### Console Logging
```javascript
// Track cleanup process
console.log(`Lifeweaver: Found temporary HP on ${cardId} (${card.name}) from player ${currentPlayerTurn}`);
console.log(`Lifeweaver: Has main effect: ${!!mainEffect}, Has display effect: ${!!displayEffect}`);

// Verify effect removal
setTimeout(() => {
    const updatedCard = window.__ow_getCard?.(cardId);
    console.log(`Lifeweaver: Card effects after removal:`, updatedCard?.effects);
}, 100);
```

#### HealthCounter Debugging
```javascript
// Track what HealthCounter receives
console.log(`HealthCounter for ${playerHeroId}:`, { 
    health, 
    effects, 
    effectsLength: effects?.length 
});
```

### Common Pitfalls

1. **Scope Issues**: Always pass `playerNum` through function parameters
2. **UI Not Updating**: Use dynamic keys to force re-renders
3. **Wrong Cleanup Timing**: Track source player for proper cleanup
4. **Incorrect HP Calculation**: Use current HP, not base HP
5. **Missing Effect Types**: Check for both main and display effects
6. **ESLint Errors**: Ensure all variables are properly defined

### Integration Checklist

- [ ] Add hero to `data.js` with correct stats
- [ ] Create hero module with proper function signatures
- [ ] Add to `abilities/index.js` exports
- [ ] Add to `App.js` onEnter and ultimate handling
- [ ] Add audio imports and mappings to `imageImports.js`
- [ ] Add focus image for shift-click
- [ ] Integrate with TurnEffectsRunner for cleanup
- [ ] Add CSS styling for visual effects
- [ ] Test UI re-rendering with dynamic keys
- [ ] Verify player-specific cleanup timing

## Winston Implementation Guide

### Overview
Winston demonstrates advanced patterns including toggle systems, damage absorption mechanics, movement-based ultimates, and team validation for protective abilities.

### Key Abilities

#### Barrier Protector (onEnter1)
- **Passive Effect**: Winston gets 3 shield tokens when deployed
- **Toggle System**: Right-click context menu with "Enable/Disable Barrier Protector" option
- **Damage Absorption**: When active, absorbs damage for friendly heroes in Winston's row using his shield tokens
- **Audio**: `winston-ability1-toggle` plays only when toggling (not on enter)

#### Primal Rage (Ultimate, Cost 3)
- **Movement**: Can move to any row on Winston's side (1f, 1m, 1b for Player 1)
- **Damage Targeting Logic**:
  - Front row → Strikes middle row enemies
  - Middle row → Player chooses front OR back row enemies
  - Back row → Strikes middle row enemies
- **Audio**: `winston-ultimate` on activation, `winston-ultimate-resolve` on damage resolution
- **Shields**: Respects shields (does not pierce)
- **Floating Text**: Uses Baptiste-style floating combat text for damage

### Toggle System Implementation

#### Card Component Integration
```javascript
// In Card.js - Add toggle button for Winston
if (id === 'winston') {
    const hasBarrierProtector = Array.isArray(card?.effects) && 
        card.effects.some(effect => effect?.id === 'barrier-protector' && effect?.type === 'barrier');
    const isActive = hasBarrierProtector && card.effects.find(effect => 
        effect?.id === 'barrier-protector' && effect?.type === 'barrier'
    )?.active;
    
    if (hasBarrierProtector) {
        items.push({
            label: isActive ? 'Disable Barrier Protector' : 'Enable Barrier Protector',
            onClick: () => {
                // Import Winston's toggle function
                import('../../abilities/heroes/winston').then(module => {
                    module.toggleBarrierProtector(playerHeroId);
                });
                setMenu(null);
            },
        });
    }
}
```

#### Toggle Function Pattern
```javascript
// In hero module - Export toggle function
export function toggleBarrierProtector(playerHeroId) {
    const card = window.__ow_getCard?.(playerHeroId);
    if (!card || !Array.isArray(card.effects)) return;
    
    const barrierEffect = card.effects.find(effect => 
        effect?.id === 'barrier-protector' && effect?.type === 'barrier'
    );
    
    if (barrierEffect) {
        // Toggle the barrier
        const newActive = !barrierEffect.active;
        
        // Update the effect
        window.__ow_removeCardEffect?.(playerHeroId, 'barrier-protector');
        window.__ow_appendCardEffect?.(playerHeroId, {
            ...barrierEffect,
            active: newActive,
            tooltip: newActive ? 
                'Barrier Protector: ACTIVE - Absorbing damage for heroes in Winston\'s row' :
                'Barrier Protector: INACTIVE - Click to activate'
        });
        
        // Play toggle sound
        try {
            playAudioByKey('winston-ability1-toggle');
        } catch {}
        
        showToast(`Winston: Barrier Protector ${newActive ? 'ACTIVATED' : 'DEACTIVATED'}`);
        setTimeout(() => clearToast(), 1500);
    }
}
```

### Damage Absorption System

#### Team Validation Pattern
```javascript
// In damageBus.js - Check for Winston Barrier Protector damage absorption
if (finalAmount > 0 && window.__ow_getRow) {
    // Find Winston cards that might absorb this damage
    const allRows = ['1f', '1m', '1b', '2f', '2m', '2b'];
    for (const rowId of allRows) {
        const row = window.__ow_getRow(rowId);
        if (row && row.cardIds) {
            for (const cardId of row.cardIds) {
                const card = window.__ow_getCard?.(cardId);
                if (card && card.id === 'winston' && Array.isArray(card.effects)) {
                    const barrierEffect = card.effects.find(effect => 
                        effect?.id === 'barrier-protector' && effect?.type === 'barrier' && effect?.active === true
                    );
                    if (barrierEffect) {
                        // Check if target is in Winston's row AND on the same team
                        const targetRowData = window.__ow_getRow(targetRow);
                        const targetPlayerNum = parseInt(targetCardId[0]);
                        const winstonPlayerNum = parseInt(cardId[0]);
                        
                        if (targetRowData && targetRowData.cardIds.includes(targetCardId) && targetPlayerNum === winstonPlayerNum) {
                            // Check if Winston has shields to absorb with
                            const winstonShields = card.shield || 0;
                            if (winstonShields > 0) {
                                const shieldsToUse = Math.min(finalAmount, winstonShields);
                                finalAmount = Math.max(0, finalAmount - shieldsToUse);
                                absorbedAmount += shieldsToUse;
                                
                                // Update Winston's shields
                                const newShieldCount = winstonShields - shieldsToUse;
                                window.__ow_dispatchShieldUpdate?.(cardId, newShieldCount);
                                
                                console.log(`DamageBus - Winston Barrier Protector absorbed ${shieldsToUse} damage for ${targetCardId}, remaining Winston shields: ${newShieldCount}`);
                            }
                        }
                    }
                }
            }
        }
    }
}
```

### Movement-Based Ultimate Pattern

#### Row Targeting with Position Logic
```javascript
// Determine which enemy rows Winston can strike
const winstonRowPosition = targetRow.rowId[1]; // 'f', 'm', 'b'
let targetableEnemyRows = [];

if (winstonRowPosition === 'f') {
    // Front row can strike middle row
    targetableEnemyRows = [`${playerNum === 1 ? 2 : 1}m`];
} else if (winstonRowPosition === 'm') {
    // Middle row can strike front OR back row
    targetableEnemyRows = [`${playerNum === 1 ? 2 : 1}f`, `${playerNum === 1 ? 2 : 1}b`];
} else if (winstonRowPosition === 'b') {
    // Back row can strike middle row
    targetableEnemyRows = [`${playerNum === 1 ? 2 : 1}m`];
}

if (targetableEnemyRows.length === 1) {
    // Only one target row, strike it automatically
    const enemyRowId = targetableEnemyRows[0];
    strikeEnemyRow(enemyRowId, playerHeroId);
} else {
    // Multiple target rows, let player choose
    showToast('Winston: Select enemy row to strike');
    const strikeTarget = await selectRowTarget();
    
    if (strikeTarget && targetableEnemyRows.includes(strikeTarget.rowId)) {
        strikeEnemyRow(strikeTarget.rowId, playerHeroId);
    } else {
        showToast('Winston: Invalid target row');
        setTimeout(() => clearToast(), 1500);
    }
}
```

### Key Learning Points

#### 1. Toggle System Implementation
- **Problem**: Need to allow players to enable/disable abilities
- **Solution**: Use right-click context menu with dynamic import of toggle function
- **Pattern**: Check effect state, provide toggle option, update effect with new state

#### 2. Team Validation for Protective Abilities
- **Problem**: Protective abilities were affecting enemies instead of allies
- **Solution**: Always check `targetPlayerNum === sourcePlayerNum` for team validation
- **Pattern**: Extract player numbers from card IDs and compare before applying effects

#### 3. Movement-Based Ultimate Logic
- **Problem**: Need different targeting rules based on hero's position
- **Solution**: Use row position to determine valid target rows
- **Pattern**: Calculate targetable rows based on position, handle single vs multiple choices

#### 4. Shield-Based Damage Absorption
- **Problem**: Need to absorb damage using hero's own shields
- **Solution**: Check hero's shield count and reduce both damage and shields
- **Pattern**: Use `Math.min(damage, shields)` and update both values

### Common Pitfalls

1. **Missing Team Validation**: Protective abilities affecting enemies instead of allies
2. **Incorrect Toggle State**: Not properly checking current effect state before toggling
3. **Wrong Row Position Logic**: Not accounting for different targeting rules per position
4. **Missing Shield Updates**: Forgetting to update hero's shields after absorption
5. **Incorrect Audio Timing**: Playing toggle sounds on enter instead of only on toggle

### Integration Checklist

- [ ] Add hero to `data.js` with correct stats
- [ ] Create hero module with proper function signatures
- [ ] Add to `abilities/index.js` exports
- [ ] Add to `App.js` onEnter and ultimate handling
- [ ] Add audio imports and mappings to `imageImports.js`
- [ ] Implement toggle system in `Card.js` with dynamic import
- [ ] Add damage absorption logic to `damageBus.js` with team validation
- [ ] Test toggle functionality and state persistence
- [ ] Test damage absorption for allies only
- [ ] Test movement-based ultimate targeting
- [ ] Verify audio plays at correct times (toggle only, not enter)

## Wrecking Ball Implementation Guide

### Overview
Wrecking Ball demonstrates advanced patterns including synergy-based ultimates, overshield mechanics, persistent token systems, and ability-triggered damage effects.

### Key Abilities

#### Adaptive Shield (onEnter1)
- **Enemy Counting**: Counts living enemies in the opposing row
- **Shield Calculation**: Enemies + 1, maximum 5 shields
- **Overshield Styling**: Shields > 3 get golden styling with glow effects
- **Audio**: `wreckingball-enter` plays on deployment

#### Minefield (Ultimate, Cost X)
- **Synergy-Based Cost**: Cost equals current row synergy
- **Token Placement**: Places X tokens on target enemy row
- **Synergy Reduction**: Reduces Wrecking Ball's row synergy to 0
- **Audio**: `wreckingball-ultimate` plays after successful placement
- **Trigger System**: Tokens trigger when enemies use abilities in that row

### Overshield System Implementation

#### Shield Counter Styling
```javascript
// In ShieldCounter.js
const isOvershield = shield > 3;

return (
    <div className={`shieldcounter counter ${type} ${isOvershield ? 'overshield' : ''}`}>
        <span className={`shieldvalue ${isOvershield ? 'overshield-value' : ''}`}>{shield}</span>
    </div>
);
```

#### CSS Styling
```css
/* In Counters.css */
.shieldcounter.overshield {
    filter: hue-rotate(60deg) brightness(1.3) saturate(1.5);
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.6);
}

.shieldvalue.overshield-value {
    color: #FFD700 !important;
    font-weight: bold;
    text-shadow: 0 0 5px rgba(255, 215, 0, 0.8);
}
```

### Synergy-Based Ultimate Pattern

#### Row Synergy Integration
```javascript
// Get current row synergy
const currentRow = window.__ow_getRow?.(rowId);
const currentSynergy = currentRow?.synergy || 0;

if (currentSynergy <= 0) {
    showToast('Wrecking Ball: No synergy in current row to deploy Minefield');
    return;
}

// Place tokens equal to synergy
for (let i = 0; i < currentSynergy; i++) {
    const tokenId = `wreckingball-minefield-${Date.now()}-${i}`;
    // ... create token
}

// Reduce synergy to 0
window.__ow_updateSynergy?.(rowId, -currentSynergy);
```

### Persistent Token System

#### Token Creation and Management
```javascript
// Create unique tokens with charges
const minefieldTokens = [];
for (let i = 0; i < currentSynergy; i++) {
    const tokenId = `wreckingball-minefield-${Date.now()}-${i}`;
    minefieldTokens.push({
        id: tokenId,
        hero: 'wreckingball',
        type: 'minefield',
        charges: 1,
        sourceCardId: playerHeroId,
        sourceRowId: rowId,
        tooltip: 'Minefield: Deals 2 damage when enemies use abilities in this row',
        visual: 'wreckingball-icon'
    });
}

// Add to enemy row effects
minefieldTokens.forEach(token => {
    window.__ow_appendRowEffect?.(targetRow.rowId, 'enemyEffects', token);
});
```

### Ability-Triggered Damage System

#### Trigger Integration
```javascript
// In App.js - After each ability execution
if (abilitiesIndex?.wreckingball?.triggerMinefieldDamage) {
    abilitiesIndex.wreckingball.triggerMinefieldDamage(playerHeroId, rowId);
}

// In wreckingball.js - Trigger function
export function triggerMinefieldDamage(cardId, rowId) {
    const row = window.__ow_getRow?.(rowId);
    if (!row || !row.enemyEffects) return;
    
    const minefieldTokens = row.enemyEffects.filter(effect => 
        effect?.hero === 'wreckingball' && effect?.type === 'minefield' && effect?.charges > 0
    );
    
    if (minefieldTokens.length > 0) {
        const token = minefieldTokens[0];
        
        // Check for immortality field
        const targetCard = window.__ow_getCard?.(cardId);
        if (targetCard && Array.isArray(targetCard.effects)) {
            const hasImmortality = targetCard.effects.some(effect => 
                effect?.id === 'immortality-field' && effect?.type === 'invulnerability'
            );
            if (hasImmortality) return; // Don't consume token or deal damage
        }
        
        // Deal damage and consume token
        dealDamage(cardId, rowId, 2, false, token.sourceCardId);
        effectsBus.publish(Effects.showDamage(cardId, 2));
        window.__ow_removeRowEffect?.(rowId, 'enemyEffects', token.id);
    }
}
```

### Key Learning Points

#### 1. Overshield Visual System
- **Problem**: Need to distinguish shields above normal limit
- **Solution**: Use CSS filters and golden color scheme for shields > 3
- **Pattern**: Check shield count, apply conditional styling classes

#### 2. Synergy-Based Resource Management
- **Problem**: Ultimate cost should be based on available resources
- **Solution**: Use current row synergy as cost, reduce to 0 after use
- **Pattern**: Check resource availability, use all available resources, reset to 0

#### 3. Persistent Token System
- **Problem**: Tokens need to persist after hero death but clear at round end
- **Solution**: Store tokens as row effects with unique IDs and charge tracking
- **Pattern**: Create unique tokens, store in enemy effects, track charges, remove when depleted

#### 4. Ability-Triggered Damage
- **Problem**: Need to trigger damage when enemies use abilities
- **Solution**: Hook into ability resolution system and check for tokens
- **Pattern**: Listen to all ability executions, check for relevant tokens, trigger damage

#### 5. Damage Mitigation Integration
- **Problem**: Minefield damage should respect damage reduction and immortality
- **Solution**: Use standard damage bus and check for immortality before triggering
- **Pattern**: Check for immortality first, then use dealDamage for proper integration

### Common Pitfalls

1. **Missing Immortality Check**: Forgetting to check for immortality before consuming tokens
2. **Incorrect Token Cleanup**: Not properly removing tokens when charges are depleted
3. **Synergy Management**: Forgetting to reduce synergy to 0 after ultimate use
4. **Overshield Styling**: Not applying conditional classes for overshield display
5. **Audio Timing**: Playing ultimate sound before placement instead of after

### Integration Checklist

- [ ] Add hero to `data.js` with correct stats
- [ ] Create hero module with proper function signatures
- [ ] Add to `abilities/index.js` exports
- [ ] Add to `App.js` onEnter and ultimate handling
- [ ] Add audio imports and mappings to `imageImports.js`
- [ ] Implement overshield styling in `ShieldCounter.js` and `Counters.css`
- [ ] Add ability trigger system to `App.js` for both onEnter and ultimate
- [ ] Test overshield visual effects (4-5 shields)
- [ ] Test synergy-based ultimate cost calculation
- [ ] Test minefield token placement and persistence
- [ ] Test ability-triggered damage with damage mitigation
- [ ] Test immortality field blocking minefield damage
- [ ] Verify audio plays at correct times (enter on deploy, ultimate after placement)

## Roadhog Implementation Guide

### Overview
Roadhog demonstrates advanced patterns including movement mechanics, random damage distribution over time, visual effects, and proper floating damage text integration.

### Key Abilities

#### Chain Hook (onEnter1)
- **Targeting**: Any enemy hero (excludes turret as immobile)
- **Movement Logic**: 
  - Front row → Middle row → Back row (if previous is full)
  - If all rows full, just deals damage without movement
- **Damage**: 2 damage dealt **immediately** with movement
- **Edge Cases**: Can target dead heroes (they move but take no damage)

#### Whole Hog (Ultimate, Cost 4)
- **Damage Calculation**: `2 × number of living enemies`
- **Distribution**: Randomly distributed over 4 seconds
- **Visual**: Floating combat text shows individual damage instances
- **Targeting**: Only living enemies

### Random Damage Distribution System

#### Core Concept
Unlike McCree's mathematical distribution, Roadhog's Whole Hog uses true randomness where each damage instance is randomly assigned to any living enemy.

#### Implementation Pattern
```javascript
// Calculate total damage (2 per enemy)
const totalDamage = livingEnemies.length * 2;

// Create damage instances (each = 1 damage)
const damageInstances = [];
for (let i = 0; i < totalDamage; i++) {
    const randomEnemy = livingEnemies[Math.floor(Math.random() * livingEnemies.length)];
    damageInstances.push(randomEnemy);
}

// Shuffle for more randomness
for (let i = damageInstances.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [damageInstances[i], damageInstances[j]] = [damageInstances[j], damageInstances[i]];
}

// Apply damage over time
const damageInterval = 4000 / totalDamage; // Spread over 4 seconds
damageInstances.forEach((enemy, index) => {
    setTimeout(() => {
        const currentCard = window.__ow_getCard?.(enemy.cardId);
        if (currentCard && currentCard.health > 0) {
            dealDamage(enemy.cardId, enemy.rowId, 1, false, playerHeroId);
            effectsBus.publish(Effects.showDamage(enemy.cardId, 1));
        }
    }, index * damageInterval);
});
```

### Movement Mechanics with Row Capacity

#### Problem
Heroes need to move to specific rows but must handle cases where destination rows are full.

#### Solution
Implement fallback logic with row capacity checking:

```javascript
// Determine destination row (front -> middle -> back)
const targetPlayerNum = parseInt(target.rowId[0]);
const enemyPlayer = targetPlayerNum;
const frontRow = `${enemyPlayer}f`;
const middleRow = `${enemyPlayer}m`;
const backRow = `${enemyPlayer}b`;

let destinationRow = frontRow;

// Check if front row is full
if (window.__ow_isRowFull?.(frontRow)) {
    // Check if middle row is full
    if (window.__ow_isRowFull?.(middleRow)) {
        // Check if back row is full
        if (window.__ow_isRowFull?.(backRow)) {
            // All rows full, just deal damage
            destinationRow = null;
        } else {
            destinationRow = backRow;
        }
    } else {
        destinationRow = middleRow;
    }
}

// Move target if possible
if (destinationRow && destinationRow !== target.rowId) {
    window.__ow_moveCardToRow?.(target.cardId, destinationRow);
}
```

### Floating Damage Text Integration

#### Problem
Floating damage text wasn't showing for Roadhog's ultimate damage.

#### Solution
Use the proper `Effects.showDamage()` method from effectsBus:

```javascript
// ❌ WRONG - Custom event structure
window.effectsBus.publish({
    type: 'fx:damage',
    cardId: enemy.cardId,
    amount: 1,
    text: '-1'
});

// ✅ CORRECT - Use Effects helper
effectsBus.publish(Effects.showDamage(enemy.cardId, 1));
```

#### Key Points
- **Import effectsBus**: `import effectsBus, { Effects } from '../engine/effectsBus';`
- **Use Effects helpers**: `Effects.showDamage(cardId, amount)` and `Effects.showHeal(cardId, amount)`
- **Follow established patterns**: Look at Baptiste, Moira, or other heroes for reference

### Visual Effects System

#### Chain Hook Rope Animation
```javascript
// 1. Create overlay component (ChainHookOverlay.js)
export default function ChainHookOverlay({ sourceCardId, targetCardId, duration = 1000 }) {
    // SVG-based rope animation with chain pattern
    return (
        <div className="chain-hook-overlay">
            <svg>
                <defs>
                    <pattern id="chainPattern" patternUnits="userSpaceOnUse" width="20" height="20">
                        <circle cx="10" cy="10" r="2" fill="#8B4513" opacity="0.8"/>
                    </pattern>
                </defs>
                <line stroke="url(#chainPattern)" strokeDasharray="10,5" className="chain-hook-line"/>
            </svg>
        </div>
    );
}

// 2. Add to effectsBus
export const Effects = {
    chainHook: (sourceCardId, targetCardId, duration = 1000) => ({ 
        type: 'fx:chainHook', 
        payload: { sourceCardId, targetCardId, duration } 
    }),
};

// 3. Publish effect from hero module
if (window.effectsBus) {
    window.effectsBus.publish({
        type: 'fx:chainHook',
        sourceCardId: playerHeroId,
        targetCardId: target.cardId,
        duration: 1000
    });
}

// 4. Handle in Card component
const [chainHookEffect, setChainHookEffect] = useState(null);

useEffect(() => {
    const unsub = effectsBus.subscribe((event) => {
        if (event.type === 'fx:chainHook' && event.payload) {
            if (event.payload.sourceCardId === playerHeroId || event.payload.targetCardId === playerHeroId) {
                setChainHookEffect(event.payload);
                setTimeout(() => setChainHookEffect(null), event.payload.duration || 1000);
            }
        }
    });
    return unsub;
}, [playerHeroId]);

// 5. Render overlay
{chainHookEffect && (
    <ChainHookOverlay 
        sourceCardId={chainHookEffect.sourceCardId} 
        targetCardId={chainHookEffect.targetCardId} 
        duration={chainHookEffect.duration} 
    />
)}
```

#### CSS Animation
```css
@keyframes chainHookAnimation {
    0% {
        stroke-dashoffset: 0;
        opacity: 0.8;
    }
    50% {
        opacity: 1;
    }
    100% {
        stroke-dashoffset: -30;
        opacity: 0.6;
    }
}

.chain-hook-line {
    animation: chainHookAnimation 1s ease-in-out;
}
```

### Key Learning Points

#### 1. Floating Damage Text
- **Problem**: Custom event structure doesn't work
- **Solution**: Use `Effects.showDamage(cardId, amount)` from effectsBus
- **Pattern**: Always use the Effects helpers, never custom event structures

#### 2. Random Damage Distribution
- **Problem**: Mathematical distribution (like McCree) doesn't fit all abilities
- **Solution**: Create individual damage instances and randomly assign them
- **Pattern**: True randomness over time with proper interval spacing

#### 3. Movement with Row Capacity
- **Problem**: Heroes can't move to full rows
- **Solution**: Implement fallback logic with `window.__ow_isRowFull()`
- **Pattern**: Check capacity before movement, provide alternatives

#### 4. Visual Effects Integration
- **Problem**: Custom visual effects need proper event system integration
- **Solution**: Use effectsBus with proper event types and payload structure
- **Pattern**: Create effect type → publish event → handle in components → render overlay

#### 5. Time-Based Abilities
- **Problem**: Abilities that happen over time need proper scheduling
- **Solution**: Use `setTimeout` with calculated intervals
- **Pattern**: Calculate total time, divide by instances, schedule each one

### Debugging Techniques

#### Console Logging for Damage Distribution
```javascript
console.log(`Hero Ability: ${enemyCount} enemies, total damage: ${totalDamage}`);
console.log(`Hero Ability: Damage instances:`, damageInstances.map(d => d.cardId));
```

#### Health Counter Debugging
```javascript
// Track what HealthCounter receives
console.log(`HealthCounter for ${playerHeroId}:`, { 
    health, 
    effects, 
    effectsLength: effects?.length 
});
```

### Common Pitfalls

1. **Wrong Floating Text Method**: Use `Effects.showDamage()`, not custom events
2. **Missing effectsBus Import**: Always import `effectsBus, { Effects }`
3. **Incorrect Movement Logic**: Check row capacity before attempting moves
4. **Poor Random Distribution**: Use proper shuffling and individual instances
5. **Missing Visual Effect Handling**: Subscribe to effectsBus in Card component
6. **Timing Issues**: Calculate intervals properly for time-based abilities

### Integration Checklist

- [ ] Add hero to `data.js` with correct stats
- [ ] Create hero module with proper function signatures
- [ ] Add to `abilities/index.js` exports
- [ ] Add to `App.js` onEnter and ultimate handling
- [ ] Add audio imports and mappings to `imageImports.js`
- [ ] Add focus image for shift-click
- [ ] Import `effectsBus, { Effects }` for floating text
- [ ] Use `Effects.showDamage()` for damage text
- [ ] Implement proper movement logic with row capacity checks
- [ ] Add visual effects to effectsBus if needed
- [ ] Handle visual effects in Card component
- [ ] Add CSS animations for visual effects
- [ ] Test random distribution and timing
- [ ] Verify floating damage text appears

## Sigma Implementation Guide

### Overview
Sigma demonstrates advanced patterns including row-level shield tokens, damage absorption systems, and custom visual indicators for row effects.

### Key Abilities

#### Experimental Barrier (onEnter1)
- **Targeting**: Friendly rows only with proper validation
- **Row Effect**: Places Sigma Token as row effect with 3 shield tokens
- **Shield Mechanics**: Automatically absorbs up to 3 damage for any hero in that row
- **Persistence**: Tokens persist even if Sigma dies
- **Cleanup**: Token removed when all shields are expended

#### Gravitic Flux (Ultimate, Cost 3)
- **Targeting**: Enemy rows only with proper validation
- **Damage**: 1 damage to all living enemies (respects shields)
- **Synergy Removal**: Sets row synergy to 0
- **Concurrent**: Damage and synergy removal happen simultaneously
- **Visual**: Floating red `-1` text for all enemies

### Row-Level Shield Token System

#### Core Concept
Sigma's Experimental Barrier creates row-level shield tokens that automatically absorb damage for any hero in that row, similar to Reinhardt's barrier but row-specific instead of column-specific.

#### Implementation Pattern
```javascript
// Place Sigma Token on the row
const sigmaToken = {
    id: 'sigma-token',
    hero: 'sigma',
    type: 'barrier',
    shields: 3,
    maxShields: 3,
    sourceCardId: playerHeroId,
    sourceRowId: rowId,
    tooltip: 'Experimental Barrier: Absorbs up to 3 damage for any hero in this row',
    visual: 'sigma-icon'
};

window.__ow_appendRowEffect?.(target.rowId, 'allyEffects', sigmaToken);
```

#### Damage Absorption Integration
```javascript
// In damageBus.js - Check for Sigma Token shield absorption
if (finalAmount > 0 && window.__ow_getRow) {
    const targetRowData = window.__ow_getRow(targetRow);
    if (targetRowData && targetRowData.allyEffects) {
        const sigmaToken = targetRowData.allyEffects.find(effect => 
            effect?.id === 'sigma-token' && effect?.type === 'barrier'
        );
        
        if (sigmaToken && sigmaToken.shields > 0) {
            const shieldsToUse = Math.min(finalAmount, sigmaToken.shields);
            finalAmount = Math.max(0, finalAmount - shieldsToUse);
            absorbedAmount += shieldsToUse;
            
            // Update Sigma Token shields
            const newShieldCount = sigmaToken.shields - shieldsToUse;
            
            // Remove old effect and add updated one
            window.__ow_removeRowEffect?.(targetRow, 'allyEffects', 'sigma-token');
            
            if (newShieldCount > 0) {
                setTimeout(() => {
                    window.__ow_appendRowEffect?.(targetRow, 'allyEffects', {
                        ...sigmaToken,
                        shields: newShieldCount
                    });
                }, 10);
            }
        }
    }
}
```

### Custom Visual Indicators for Row Effects

#### Problem
Row effects (like Sigma tokens) need custom visual indicators that appear over the token icon in the row counter area.

#### Solution
Modify the `HeroCounter` component to display custom indicators for specific row effects:

```javascript
// In HeroCounter.js - Add custom shield display for Sigma tokens
{shields && shields > 0 && (
    <div style={{ 
        position: 'absolute', 
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -50%)',
        zIndex: 1000
    }}>
        <div style={{ 
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#00ff00',
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
            background: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #00ff00'
        }}>
            {shields}
        </div>
    </div>
)}
```

#### Key Requirements
- **Parent Container**: Must have `position: 'relative'` for absolute positioning
- **High Z-Index**: Use `zIndex: 1000` to appear above token icons
- **Centered Positioning**: Use `top: 50%, left: 50%, transform: translate(-50%, -50%)`
- **Custom Styling**: Create distinctive visual indicators that match the effect theme

### Row Effect Visual Integration

#### CounterArea Integration
```javascript
// In CounterArea.js - Pass shields property to HeroCounter
<HeroCounter
    playerHeroId={effect.playerHeroId}
    heroId={effect.hero}
    key={`${effect.hero}-${effect.id || 'row'}-${idx}`}
    setCardFocus={props.setCardFocus}
    playerNum={props.playerNum}
    rowId={rowId}
    health={effect.health}
    shields={effect.shields}  // Pass shields for Sigma tokens
    tooltip={effect.tooltip}
/>
```

### Key Learning Points

#### 1. Row-Level Damage Absorption
- **Problem**: Need to absorb damage for any hero in a specific row
- **Solution**: Check target row for shield tokens in damage bus
- **Pattern**: Row effects can modify damage before it reaches the target

#### 2. Effect Update Pattern
- **Problem**: Need to update existing row effects (like shield count)
- **Solution**: Remove old effect, add updated effect with new values
- **Pattern**: Use `removeRowEffect` + `appendRowEffect` with timeout

#### 3. Custom Visual Indicators
- **Problem**: Row effects need custom visual feedback
- **Solution**: Modify HeroCounter to display custom indicators
- **Pattern**: Use absolute positioning with high z-index over token icons

#### 4. Row Effect Persistence
- **Problem**: Effects should persist even if source hero dies
- **Solution**: Store effects on row, not on hero
- **Pattern**: Row effects are independent of source hero lifecycle

### Common Pitfalls

1. **Missing Parent Positioning**: Forgot to add `position: 'relative'` to parent container
2. **Low Z-Index**: Custom indicators appear behind token icons
3. **Wrong Effect Update**: Used `appendRowEffect` instead of remove + add pattern
4. **Missing Shields Property**: Forgot to pass `shields` from CounterArea to HeroCounter
5. **Incorrect Row Targeting**: Used wrong row ID in damage absorption logic

### Integration Checklist

- [ ] Add hero to `data.js` with correct stats
- [ ] Create hero module with proper function signatures
- [ ] Add to `abilities/index.js` exports
- [ ] Add to `App.js` onEnter and ultimate handling
- [ ] Add audio imports and mappings to `imageImports.js`
- [ ] Add focus image for shift-click
- [ ] Implement row-level shield token system
- [ ] Add damage absorption logic to damageBus.js
- [ ] Modify HeroCounter for custom visual indicators
- [ ] Update CounterArea to pass shields property
- [ ] Test shield absorption mechanics
- [ ] Verify visual indicators appear correctly
- [ ] Test effect persistence when source hero dies

## Sombra Implementation Guide

### Overview
Sombra demonstrates advanced patterns including comprehensive token cleanup systems, effect type filtering, and global board-wide abilities that affect all rows on both sides.

### Key Abilities

#### HACK (onEnter1)
- **Targeting**: Any enemy hero (cannot target allies or self)
- **Shield Removal**: Removes all shield tokens from target hero
- **Effect Cleanup**: Removes ALL effects belonging to target hero from all rows
- **Validation**: Only targets living heroes
- **Visual Feedback**: Shows floating text for removed shields

#### E.M.P. (Ultimate, Cost 3)
- **Global Scope**: Affects all rows on both sides of the board
- **Comprehensive Cleanup**: Removes all row effects except invulnerability/immortality
- **Shield Removal**: Removes all shields from all heroes
- **Turret Destruction**: Immediately destroys all turrets
- **Instant Cast**: Resolves immediately without targeting

### Token Cleanup System

#### Effect Type Classification
The game uses many different effect types, not just `type: 'token'`:

```javascript
// Common effect types in the codebase
'damage-reduction'     // Hanzo Sonic Arrow
'damageReduction'      // Orisa Protective Barrier  
'synergyBoost'         // Orisa Supercharger
'healing'              // Mercy, Lúcio healing tokens
'immunity'             // Mei Cryo Freeze
'invulnerability'      // Baptiste Immortality Field
'barrier'              // Reinhardt, Sigma barriers
'ultimateCostModifier' // Mei Blizzard
'persistent'           // Nemesis Annihilation
'temporaryHP'          // Lifeweaver Tree of Life
'debuff'               // Brigitte Shield Bash
```

#### HACK Cleanup Pattern
```javascript
// Remove all effects belonging to target hero
const effectsToRemove = row.allyEffects.filter(effect => 
    effect?.sourceCardId === target.cardId
);
for (const effect of effectsToRemove) {
    window.__ow_removeRowEffect?.(rowId, 'allyEffects', effect.id);
    removedTokens++;
}
```

#### E.M.P. Cleanup Pattern
```javascript
// Remove all effects except defensive ones
const effectsToRemove = row.allyEffects.filter(effect => 
    effect?.type !== 'invulnerability' && effect?.type !== 'immortality'
);
for (const effect of effectsToRemove) {
    window.__ow_removeRowEffect?.(rowId, 'allyEffects', effect.id);
    totalTokensRemoved++;
}
```

### Key Learning Points

#### 1. Comprehensive Effect Cleanup
- **Problem**: Only looking for `type: 'token'` misses most effects
- **Solution**: Remove all effects by `sourceCardId` (HACK) or all effects except defensive ones (E.M.P.)
- **Pattern**: Use descriptive effect types, not generic "token" classification

#### 2. Effect Type Preservation
- **Problem**: E.M.P. should clear most effects but preserve defensive ones
- **Solution**: Filter out `invulnerability` and `immortality` effects
- **Pattern**: Preserve critical defensive effects while clearing offensive/utility effects

#### 3. Global Board Effects
- **Problem**: Need to affect all rows on both sides
- **Solution**: Iterate through all row IDs and process each row
- **Pattern**: Use comprehensive row iteration for global abilities

#### 4. Shield Removal System
- **Problem**: Need to remove shields from all heroes
- **Solution**: Check each hero in each row and set shields to 0
- **Pattern**: Use `window.__ow_dispatchShieldUpdate?.(cardId, 0)` for shield removal

### Common Pitfalls

1. **Wrong Effect Type Filtering**: Only looking for `type: 'token'` instead of all effect types
2. **Missing Defensive Effect Preservation**: Accidentally removing Immortality Field or other critical effects
3. **Incomplete Row Iteration**: Not checking all 6 rows (1f, 1m, 1b, 2f, 2m, 2b)
4. **Missing Shield Removal**: Forgetting to remove shields in addition to effects
5. **Incorrect Source Card ID Matching**: Not properly matching `sourceCardId` for HACK cleanup

### Integration Checklist

- [ ] Add hero to `data.js` with correct stats
- [ ] Create hero module with proper function signatures
- [ ] Add to `abilities/index.js` exports
- [ ] Add to `App.js` onEnter and ultimate handling
- [ ] Add audio imports and mappings to `imageImports.js`
- [ ] Implement comprehensive token cleanup system
- [ ] Test HACK ability with various effect types
- [ ] Test E.M.P. ultimate with all row effects
- [ ] Verify defensive effects are preserved
- [ ] Test shield removal mechanics
- [ ] Verify turret destruction works

## Fixed Damage System

### Overview
The fixed damage system allows abilities to deal damage that cannot be mitigated or amplified by other effects, while still respecting shields.

### Implementation
```javascript
// In damageBus.js - Fixed damage bypasses all modifications
if (fixedDamage) {
    console.log(`Fixed Damage: ${amount} damage to ${targetCardId} (no modifications)`);
    let finalAmount = amount;
    
    // Still respect shields if not ignoring them
    if (!ignoreShields && finalAmount > 0) {
        const card = window.__ow_getCard?.(targetCardId);
        if (card && card.shield > 0) {
            const shieldAbsorbed = Math.min(finalAmount, card.shield);
            finalAmount = Math.max(0, finalAmount - shieldAbsorbed);
            window.__ow_dispatchShieldUpdate?.(targetCardId, card.shield - shieldAbsorbed);
        }
    }
    
    // Apply remaining damage to health
    if (finalAmount > 0) {
        const card = window.__ow_getCard?.(targetCardId);
        if (card) {
            const newHealth = Math.max(0, card.health - finalAmount);
            window.__ow_setCardHealth?.(targetCardId, newHealth);
        }
    }
    
    // Publish damage event for consistency
    publish({ type: 'damage', targetCardId, targetRow, amount: finalAmount, ignoreShields, sourceCardId, fixedDamage: true });
    return;
}
```

### Usage Example
```javascript
// Soldier: 76 Tactical Visor - Fixed damage that cannot be mitigated
dealDamage(target.cardId, target.rowId, damage, false, playerHeroId, true);
//                                                                      ^^^^
//                                                                  fixedDamage = true
```

### Key Features
- **Bypasses Modifications**: Ignores Reinhardt, Orisa, Sigma, Hanzo, and Mercy damage modifications
- **Respects Shields**: Still absorbs shields normally
- **Consistent API**: Uses same `dealDamage` function with additional parameter
- **Event Publishing**: Publishes damage events for consistency with other systems

### When to Use Fixed Damage
- **Ultimate Abilities**: High-cost abilities that should be powerful and reliable
- **Special Mechanics**: Abilities that specifically mention "cannot be mitigated"
- **Balance Requirements**: When damage needs to be consistent regardless of other effects

## Wrecking Ball Implementation Guide

### Overview
Wrecking Ball demonstrates advanced patterns including synergy-based ultimates, overshield mechanics, persistent token systems, movement-triggered damage effects, and proper floating combat text integration.

### Key Abilities

#### Adaptive Shield (onEnter1)
- **Enemy Counting**: Counts living enemies in the opposing row
- **Shield Calculation**: Enemies + 1, maximum 5 shields
- **Overshield Styling**: Shields > 3 get golden styling with glow effects
- **Audio**: `wreckingball-enter` plays on deployment

#### Minefield (Ultimate, Cost X)
- **Synergy-Based Cost**: Cost equals current row synergy
- **Token Placement**: Places single token with X charges on target enemy row
- **Synergy Reduction**: Reduces Wrecking Ball's row synergy to 0
- **Audio**: `wreckingball-ultimate` plays after successful placement
- **Trigger System**: Tokens trigger when enemies move into or out of that row

### Overshield System Implementation

#### Shield Counter Styling
```javascript
// In ShieldCounter.js
const isOvershield = shield > 3;

return (
    <div className={`shieldcounter counter ${type} ${isOvershield ? 'overshield' : ''}`}>
        <span className={`shieldvalue ${isOvershield ? 'overshield-value' : ''}`}>{shield}</span>
    </div>
);
```

#### CSS Styling
```css
/* In Counters.css */
.shieldcounter.overshield {
    filter: hue-rotate(60deg) brightness(1.3) saturate(1.5);
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.6);
}

.shieldvalue.overshield-value {
    color: #FFD700 !important;
    font-weight: bold;
    text-shadow: 0 0 5px rgba(255, 215, 0, 0.8);
}
```

### Synergy-Based Ultimate Pattern

#### Row Synergy Integration
```javascript
// Get current row synergy
const currentRow = window.__ow_getRow?.(rowId);
const currentSynergy = currentRow?.synergy || 0;

if (currentSynergy <= 0) {
    showToast('Wrecking Ball: No synergy in current row to deploy Minefield');
    return;
}

// Create single token with charges equal to synergy
const minefieldToken = {
    id: `wreckingball-minefield-${Date.now()}`,
    hero: 'wreckingball',
    type: 'minefield',
    charges: currentSynergy, // Total number of charges
    sourceCardId: playerHeroId,
    sourceRowId: rowId,
    tooltip: `Minefield: Deals 2 damage when enemies move into or out of this row (${currentSynergy} charges)`,
    visual: 'wreckingball-icon'
};

// Reduce synergy to 0
window.__ow_updateSynergy?.(rowId, -currentSynergy);
```

### Persistent Token System

#### Single Token with Charges
```javascript
// Create single token with multiple charges (not multiple tokens)
const minefieldToken = {
    id: `wreckingball-minefield-${Date.now()}`,
    hero: 'wreckingball',
    type: 'minefield',
    charges: currentSynergy, // Total number of charges
    sourceCardId: playerHeroId,
    sourceRowId: rowId,
    tooltip: `Minefield: Deals 2 damage when enemies move into or out of this row (${currentSynergy} charges)`,
    visual: 'wreckingball-icon'
};

// Add single token to enemy row
const currentRow = window.__ow_getRow?.(targetRow.rowId);
const currentEnemyEffects = currentRow?.enemyEffects || [];
const updatedEnemyEffects = [...currentEnemyEffects, minefieldToken];
window.__ow_setRowArray?.(targetRow.rowId, 'enemyEffects', updatedEnemyEffects);
```

#### Token Update Pattern
```javascript
// When reducing charges, update the token in place
const updatedToken = {
    ...minefieldToken,
    charges: newCharges,
    tooltip: `Minefield: Deals 2 damage when enemies move into or out of this row (${newCharges} charges)`
};

// Use setRowArray to replace the entire array (prevents duplication)
const currentRow = window.__ow_getRow?.(rowId);
const currentEnemyEffects = currentRow?.enemyEffects || [];
const updatedEnemyEffects = currentEnemyEffects.map(effect => 
    effect.id === minefieldToken.id ? updatedToken : effect
);
window.__ow_setRowArray?.(rowId, 'enemyEffects', updatedEnemyEffects);
```

### Movement-Triggered Damage System

#### Trigger Integration
```javascript
// In App.js - After each card movement
if (abilitiesIndex?.wreckingball?.checkMinefieldTrigger) {
    // Check if moving into a row with minefield tokens
    if (finishRowId[0] !== 'p') {
        abilitiesIndex.wreckingball.checkMinefieldTrigger(targetCardId, finishRowId);
    }
    // Check if moving out of a row with minefield tokens
    if (startRowId[0] !== 'p') {
        abilitiesIndex.wreckingball.checkMinefieldTrigger(targetCardId, startRowId);
    }
}

// In wreckingball.js - Trigger function
export function checkMinefieldTrigger(cardId, rowId) {
    const row = window.__ow_getRow?.(rowId);
    if (!row || !row.enemyEffects) return;

    const minefieldToken = row.enemyEffects.find(effect =>
        effect?.hero === 'wreckingball' && effect?.type === 'minefield'
    );

    if (minefieldToken && minefieldToken.charges > 0) {
        // Check for immortality field
        const targetCard = window.__ow_getCard?.(cardId);
        if (targetCard && Array.isArray(targetCard.effects)) {
            const hasImmortality = targetCard.effects.some(effect =>
                effect?.id === 'immortality-field' && effect?.type === 'invulnerability'
            );
            if (hasImmortality) return; // Don't consume charge or deal damage
        }

        // Deal damage and reduce charges
        dealDamage(cardId, rowId, 2, false, minefieldToken.sourceCardId);
        effectsBus.publish(Effects.showDamage(cardId, 2));
        
        // Update or remove token based on remaining charges
        // ... (see token update pattern above)
    }
}
```

### Floating Combat Text Integration

#### Critical Requirement
**ALL damage and healing MUST include floating combat text for visual feedback.**

#### Damage Floating Text
```javascript
// Always include this after dealing damage
dealDamage(cardId, rowId, 2, false, sourceCardId);
effectsBus.publish(Effects.showDamage(cardId, 2)); // REQUIRED for visual feedback
```

#### Healing Floating Text
```javascript
// For healing effects, use the healing floating text
effectsBus.publish(Effects.showHealing(cardId, healingAmount));
```

#### Shield Floating Text
```javascript
// For shield changes, use the shield floating text
effectsBus.publish(Effects.showShield(cardId, shieldAmount));
```

### Custom Token Overlay System

#### WreckingBallTokenOverlay Component
```javascript
// In WreckingBallTokenOverlay.js
export default function WreckingBallTokenOverlay({ rowId }) {
    const { gameState } = useContext(gameContext);

    const row = gameState.rows[rowId];
    if (!row || !row.enemyEffects) return null;

    const minefieldToken = row.enemyEffects.find(effect => 
        effect?.hero === 'wreckingball' && effect?.type === 'minefield'
    );
    
    if (!minefieldToken || minefieldToken.charges <= 0) return null;
    
    const totalCharges = minefieldToken.charges;

    return (
        <div className="wreckingball-token-overlay" style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            zIndex: 20,
            pointerEvents: 'none'
        }}>
            <div className="wreckingball-token-icon" style={{
                width: '40px',
                height: '40px',
                backgroundImage: 'url(/src/assets/heroes/wreckingball-icon.png)',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: '#ff6b35',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                    background: 'rgba(0, 0, 0, 0.6)',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #ff6b35',
                    position: 'absolute',
                    top: '-5px',
                    right: '-5px'
                }}>
                    {totalCharges}
                </div>
            </div>
        </div>
    );
}
```

#### Integration in BoardRow
```javascript
// In BoardRow.js
import WreckingBallTokenOverlay from 'components/effects/WreckingBallTokenOverlay';

// Inside the row component
<WreckingBallTokenOverlay rowId={rowId} />
```

### Dynamic Ultimate Cost System

#### Card.js Integration
```javascript
// Special case for Wrecking Ball - cost is current row synergy
if (heroId === 'wreckingball') {
    const ultimateCost = currentSynergy;
    actionsBus.publish(Actions.requestUltimate(playerHeroId, rowId, ultimateCost));
} else {
    // Parse ultimate cost from description text like "Shield Generator (2)"
    let ultimateCost = 3; // Default to 3 if not specified
    if (heroJsonData?.ultimate) {
        const match = heroJsonData.ultimate.match(/\((\d+)\)/);
        if (match) {
            ultimateCost = parseInt(match[1]);
        }
    }
    actionsBus.publish(Actions.requestUltimate(playerHeroId, rowId, ultimateCost));
}
```

### Audio Integration

#### Required Audio Files
```javascript
// In imageImports.js
import wreckingballIntro from './audio/wreckingball-intro.mp3';
import wreckingballEnter from './audio/wreckingball-enter.mp3';
import wreckingballUltimate from './audio/wreckingball-ultimate.mp3';

export const abilityAudioFiles = {
    'wreckingball-intro': wreckingballIntro,
    'wreckingball-enter': wreckingballEnter,
    'wreckingball-ultimate': wreckingballUltimate,
};
```

#### Audio Playback Pattern
```javascript
// Intro audio on card draw
playAudioByKey('wreckingball-intro');

// Enter audio on deployment
playAudioByKey('wreckingball-enter');

// Ultimate audio after successful placement
playAudioByKey('wreckingball-ultimate');
```

### Common Pitfalls and Solutions

#### 1. Token Duplication Issue
**Problem**: Multiple `wreckingball-icon` tokens appear instead of one with charges
**Solution**: Create single token with `charges` property, not multiple individual tokens

#### 2. State Update Race Conditions
**Problem**: `__ow_appendRowEffect` uses stale state, causing only last token to be stored
**Solution**: Use `__ow_setRowArray` with current state for bulk operations

#### 3. Token Update Duplication
**Problem**: Updating token charges creates duplicates instead of replacing
**Solution**: Use `setRowArray` with mapped array to update token in place

#### 4. Missing Floating Combat Text
**Problem**: Damage/healing happens without visual feedback
**Solution**: Always include `effectsBus.publish(Effects.showDamage/healing/shield(cardId, amount))`

#### 5. Movement Trigger Timing
**Problem**: Minefield doesn't trigger on card movement
**Solution**: Hook into `MOVE_CARD` action in App.js reducer

### Integration Checklist

- [ ] Add hero to `data.js` with correct stats
- [ ] Create hero module with proper function signatures
- [ ] Add to `abilities/index.js` exports
- [ ] Add to `App.js` onEnter and ultimate handling
- [ ] Add movement trigger integration in `MOVE_CARD` action
- [ ] Add audio imports and mappings to `imageImports.js`
- [ ] Implement overshield styling in `ShieldCounter.js` and `Counters.css`
- [ ] Create custom token overlay component
- [ ] Integrate overlay in `BoardRow.js`
- [ ] Add dynamic ultimate cost calculation in `Card.js`
- [ ] Test synergy-based ultimate cost system
- [ ] Test movement-triggered damage mechanics
- [ ] Test token charge reduction and removal
- [ ] Verify floating combat text appears for all damage/healing
- [ ] Test overshield styling (shields > 3)
- [ ] Test immortality field interaction
- [ ] Verify audio plays at correct times

### Key Learning Points

#### 1. Single Token with Charges Pattern
- **Problem**: Multiple tokens create visual clutter and management complexity
- **Solution**: Use single token with `charges` property for count-based effects
- **Pattern**: Prefer charge-based tokens over multiple individual tokens

#### 2. State Management for Bulk Operations
- **Problem**: `appendRowEffect` uses stale state in loops
- **Solution**: Use `setRowArray` with current state for bulk operations
- **Pattern**: Get current state, modify, then set entire array

#### 3. Movement-Triggered Effects
- **Problem**: Need to respond to card movement events
- **Solution**: Hook into `MOVE_CARD` action in App.js reducer
- **Pattern**: Check both source and destination rows for movement effects

#### 4. Floating Combat Text Requirements
- **Problem**: Damage/healing without visual feedback is confusing
- **Solution**: Always include appropriate floating combat text
- **Pattern**: `effectsBus.publish(Effects.showDamage/healing/shield(cardId, amount))`

#### 5. Dynamic Ultimate Costs
- **Problem**: Some ultimates have variable costs based on game state
- **Solution**: Calculate cost dynamically in `Card.js` context menu
- **Pattern**: Special case handling for heroes with dynamic costs

### Advanced Patterns Demonstrated

1. **Synergy-Based Resource Management**: Ultimate cost tied to current row synergy
2. **Overshield Visual System**: Special styling for shields above normal limits
3. **Persistent Token Systems**: Tokens that persist across turns with charge management
4. **Movement-Triggered Damage**: Effects that respond to card movement events
5. **Single Token with Charges**: Efficient token management for count-based effects
6. **Dynamic Cost Calculation**: Ultimate costs that change based on game state
7. **Comprehensive Floating Text**: Visual feedback for all damage, healing, and shield changes

## AI Controller Implementation Guide

### Overview
Implementing an AI controller for "player 2" is a complex undertaking that requires overriding the interactive targeting system and implementing strategic decision-making logic. This guide outlines the technical challenges, implementation approach, and development timeline.

### Complexity Assessment
**Level: HIGH** 🔴 - Due to the game's sophisticated targeting system and interactive nature.

### Core Challenges

#### 1. Interactive Targeting System Override 🎯
**Current System**: The game uses jQuery-based click handlers for targeting:
- `selectCardTarget()` - Waits for user to click a card
- `selectRowTarget()` - Waits for user to click a row
- Both return `null` if user right-clicks to cancel

**AI Challenge**: Need to replace these with AI decision-making logic.

#### 2. Complex Game State Analysis 🧠
**Required AI Capabilities**:
- **Board State Evaluation**: Analyze all 6 rows (1f, 1m, 1b, 2f, 2m, 2b)
- **Card Value Assessment**: Evaluate each card's power, synergy, health, shields, effects
- **Threat Assessment**: Identify high-value targets and dangerous enemy cards
- **Synergy Management**: Plan ultimate usage based on row synergy
- **Effect Interaction**: Understand complex ability interactions (shields, immunity, etc.)

#### 3. Turn Action Decision Tree 🌳
**AI Must Decide**:
1. **Which card to play** from hand (8 cards max)
2. **Which row to place it** (front/middle/back)
3. **Whether to use onEnter ability** (if available)
4. **Whether to use ultimate** (if synergy available)
5. **Target selection** for abilities (cards/rows)

### Implementation Approach

#### Phase 1: Basic AI Framework (2-3 weeks)
```javascript
// AI Controller Structure
class AIController {
    constructor(playerNum) {
        this.playerNum = playerNum;
        this.gameState = null;
        this.strategy = 'aggressive'; // or 'defensive', 'balanced'
    }
    
    // Main AI decision function
    async makeTurnDecision(gameState) {
        this.gameState = gameState;
        
        // 1. Analyze current board state
        const boardAnalysis = this.analyzeBoard();
        
        // 2. Choose card to play
        const cardToPlay = this.selectCardToPlay(boardAnalysis);
        
        // 3. Choose row placement
        const targetRow = this.selectRowPlacement(cardToPlay, boardAnalysis);
        
        // 4. Decide on abilities
        const abilityDecisions = this.decideAbilities(cardToPlay, targetRow);
        
        return {
            cardToPlay,
            targetRow,
            useOnEnter: abilityDecisions.useOnEnter,
            useUltimate: abilityDecisions.useUltimate,
            ultimateTarget: abilityDecisions.ultimateTarget
        };
    }
}
```

#### Phase 2: Targeting System Override (1-2 weeks)
```javascript
// Override targeting functions for AI
export function selectCardTargetAI(validTargets, strategy = 'random') {
    return new Promise((resolve) => {
        // AI logic instead of click handler
        const target = chooseBestTarget(validTargets, strategy);
        resolve(target);
    });
}

export function selectRowTargetAI(validRows, strategy = 'random') {
    return new Promise((resolve) => {
        // AI logic instead of click handler
        const target = chooseBestRow(validRows, strategy);
        resolve(target);
    });
}
```

#### Phase 3: Strategy Implementation (2-3 weeks)
```javascript
// Different AI strategies
const strategies = {
    aggressive: {
        priority: ['damage', 'elimination', 'board_control'],
        riskTolerance: 'high'
    },
    defensive: {
        priority: ['survival', 'shields', 'healing'],
        riskTolerance: 'low'
    },
    balanced: {
        priority: ['value', 'flexibility', 'adaptation'],
        riskTolerance: 'medium'
    }
};
```

### Technical Implementation Details

#### 1. Game State Access
```javascript
// AI needs access to current game state
const getGameState = () => {
    return {
        rows: window.__ow_getAllRows?.(),
        playerCards: window.__ow_getPlayerCards?.(),
        currentTurn: window.__ow_getCurrentTurn?.(),
        // ... other state
    };
};
```

#### 2. Card Evaluation System
```javascript
// Evaluate card value for AI decision making
const evaluateCard = (card, boardState) => {
    return {
        powerValue: card.power,
        synergyValue: card.synergy,
        healthValue: card.health,
        abilityValue: evaluateAbility(card.abilities),
        threatLevel: calculateThreat(card, boardState),
        placementValue: calculatePlacementValue(card, boardState)
    };
};
```

#### 3. Target Selection Logic
```javascript
// AI target selection for abilities
const selectTarget = (ability, validTargets, strategy) => {
    switch (ability.type) {
        case 'damage':
            return selectHighestValueTarget(validTargets);
        case 'healing':
            return selectLowestHealthAlly(validTargets);
        case 'utility':
            return selectMostStrategicTarget(validTargets);
        default:
            return selectRandomTarget(validTargets);
    }
};
```

### Development Timeline

#### Minimum Viable AI (4-6 weeks)
- Basic card playing
- Simple targeting (random/priority-based)
- No complex strategy

#### Competent AI (8-12 weeks)
- Strategic decision making
- Multiple difficulty levels
- Complex ability usage
- Synergy management

#### Advanced AI (16-20 weeks)
- Machine learning integration
- Adaptive strategies
- Tournament-level play
- Psychological elements

### Key Files to Modify

1. **`targeting.js`** - Override targeting functions
2. **`App.js`** - Add AI turn handling
3. **`PlayerButtons.js`** - Add AI mode toggle
4. **New: `AIController.js`** - Main AI logic
5. **New: `AIStrategies.js`** - Different AI behaviors
6. **New: `AITargeting.js`** - AI targeting logic

### Alternative: Simpler Approach

#### Rule-Based AI (2-3 weeks)
Instead of complex decision trees, use simple rules:
- Always play highest power card
- Always target lowest health enemy
- Use ultimates when synergy available
- Random row placement

This would be much simpler but less strategic.

### Integration with Existing Systems

#### Turn Management
```javascript
// In App.js - Add AI turn handling
if (gameState.playerTurn === 2 && gameState.aiMode) {
    const aiDecision = await AIController.makeTurnDecision(gameState);
    // Execute AI decisions
    executeAITurn(aiDecision);
}
```

#### Targeting Override
```javascript
// In targeting.js - Add AI targeting functions
export function selectCardTarget() {
    if (window.__ow_aiMode && window.__ow_currentPlayer === 2) {
        return selectCardTargetAI();
    }
    // ... existing click handler logic
}
```

#### UI Integration
```javascript
// In PlayerButtons.js - Add AI mode toggle
const toggleAIMode = () => {
    setAIMode(!aiMode);
    if (!aiMode) {
        // Start AI turn
        AIController.startAITurn();
    }
};
```

### Common Pitfalls

#### 1. Targeting System Integration
**Problem**: AI needs to work with existing targeting system
**Solution**: Create AI-specific targeting functions that bypass click handlers

#### 2. Game State Synchronization
**Problem**: AI needs real-time access to game state
**Solution**: Expose game state through window functions or context

#### 3. Turn Timing
**Problem**: AI needs to respect turn timing and animations
**Solution**: Add delays and respect existing turn flow

#### 4. Ability Complexity
**Problem**: Some abilities have complex targeting requirements
**Solution**: Create ability-specific AI logic for complex cases

### Testing Strategy

#### Unit Tests
- Test individual AI decision functions
- Test targeting logic with various board states
- Test strategy implementations

#### Integration Tests
- Test AI vs human gameplay
- Test AI vs AI gameplay
- Test different difficulty levels

#### Performance Tests
- Ensure AI decisions are fast enough
- Test with complex board states
- Monitor memory usage

### Future Enhancements

#### Machine Learning Integration
- Train AI on human gameplay data
- Implement reinforcement learning
- Adaptive difficulty based on player skill

#### Advanced Features
- Personality-based AI (aggressive, defensive, etc.)
- Learning from player patterns
- Tournament mode with multiple AI opponents

### Recommendation

**Start with a simple rule-based AI** to get basic functionality, then gradually add complexity. The targeting system override is the biggest technical hurdle, but once that's solved, the AI logic itself is manageable.

The rule-based approach would provide immediate value while allowing for future enhancement with more sophisticated decision-making algorithms.

## Zarya Implementation Guide

### Overview
Zarya demonstrates advanced patterns including custom token systems, shield-piercing mechanics, multi-target selection, dynamic damage reduction, and proper visual token overlays. Her implementation showcases how to create shield-like effects that behave identically to normal shields.

### Key Abilities

#### Particle Barrier (onEnter1)
- **Targeting**: Point-based selection of self or one ally hero
- **Token Placement**: Places 3 Zarya tokens as card effects
- **Token Behavior**: Functions exactly like shields (absorbs damage, respects shield-piercing)
- **Audio**: `zarya-enter` and `zarya-ability1` play on successful placement
- **Visual**: Custom orange circular badge with token count

#### Particle Cannon (Ultimate, Cost 3)
- **Multi-Target**: Select up to 3 enemy heroes with right-click cancel
- **Damage Calculation**: 4 damage per target, reduced by 1 for each Zarya token on your side
- **Minimum Damage**: Always deals at least 1 damage per target
- **Audio**: `zarya-ultimate` and `zarya-ultimate-resolve` play on activation and resolution
- **Floating Text**: Individual damage numbers for each target

### Custom Token System Implementation

#### Token Creation Pattern
```javascript
// Helper function to place Zarya tokens on a hero
function placeZaryaTokens(cardId, amount) {
    // Create a single token with the total amount
    const tokenId = `zarya-token-${Date.now()}`;
    const zaryaToken = {
        id: tokenId,
        hero: 'zarya',
        type: 'zarya-shield',
        amount: amount, // Total number of tokens
        sourceCardId: cardId,
        tooltip: `Zarya Token: Absorbs damage like shields, reduces Particle Cannon damage (${amount} charges)`,
        visual: 'zarya-icon'
    };
    
    // Add to card effects using the proper function
    window.__ow_appendCardEffect?.(cardId, zaryaToken);
}
```

#### Token Counting Pattern
```javascript
// Helper function to count Zarya tokens on your side
function countZaryaTokensOnSide(playerNum) {
    let totalTokens = 0;
    const yourRows = playerNum === 1 ? ['1f', '1m', '1b'] : ['2f', '2m', '2b'];
    yourRows.forEach(rowId => {
        const row = window.__ow_getRow?.(rowId);
        if (row && row.cardIds) {
            row.cardIds.forEach(cardId => {
                const card = window.__ow_getCard?.(cardId);
                if (card && Array.isArray(card.effects)) {
                    const zaryaToken = card.effects.find(effect => 
                        effect?.hero === 'zarya' && effect?.type === 'zarya-shield'
                    );
                    if (zaryaToken) {
                        totalTokens += zaryaToken.amount || 0;
                    }
                }
            });
        }
    });
    return totalTokens;
}
```

### Shield-Piercing Integration

#### Damage Bus Integration
```javascript
// In damageBus.js - Zarya token absorption respects shield-piercing
if (finalAmount > 0 && !ignoreShields && window.__ow_getRow) {
    // Check all friendly cards for Zarya tokens
    for (const rowId of friendlyRows) {
        const row = window.__ow_getRow(rowId);
        if (row && row.cardIds) {
            for (const cardId of row.cardIds) {
                const card = window.__ow_getCard?.(cardId);
                if (card && Array.isArray(card.effects)) {
                    const zaryaToken = card.effects.find(effect => 
                        effect?.hero === 'zarya' && effect?.type === 'zarya-shield'
                    );
                    
                    if (zaryaToken && zaryaToken.amount > 0) {
                        const useZarya = Math.min(zaryaToken.amount, finalAmount);
                        const newAmount = zaryaToken.amount - useZarya;
                        finalAmount = Math.max(0, finalAmount - useZarya);
                        absorbedAmount += useZarya;
                        
                        // Update or remove token using proper game state functions
                        if (newAmount <= 0) {
                            window.__ow_removeCardEffect?.(cardId, zaryaToken.id);
                        } else {
                            const updatedToken = {
                                ...zaryaToken,
                                amount: newAmount,
                                tooltip: `Zarya Token: Absorbs damage like shields, reduces Particle Cannon damage (${newAmount} charges)`
                            };
                            window.__ow_removeCardEffect?.(cardId, zaryaToken.id);
                            setTimeout(() => {
                                window.__ow_appendCardEffect?.(cardId, updatedToken);
                            }, 10);
                        }
                        
                        if (finalAmount <= 0) break;
                    }
                }
            }
        }
        if (finalAmount <= 0) break;
    }
}
```

### Visual Token Overlay System

#### Custom Overlay Component
```javascript
// ZaryaTokenOverlay.js
import React, { useContext } from 'react';
import gameContext from '../../context/gameContext';
import { heroIconImages } from '../../assets/imageImports';

export default function ZaryaTokenOverlay({ cardId }) {
    const { gameState } = useContext(gameContext);

    // Get the card data
    const playerNum = parseInt(cardId[0]);
    const card = gameState.playerCards[`player${playerNum}cards`]?.cards?.[cardId];
    
    if (!card || !Array.isArray(card.effects)) return null;

    // Find Zarya token on this card
    const zaryaToken = card.effects.find(effect => 
        effect?.hero === 'zarya' && effect?.type === 'zarya-shield'
    );

    if (!zaryaToken || zaryaToken.amount <= 0) return null;

    return (
        <div key={`zarya-token-${cardId}-${zaryaToken.amount}`} className="zarya-token-overlay" style={{
            position: 'absolute',
            bottom: '5px',
            right: '5px',
            zIndex: 15,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <div className="zarya-token-icon" style={{
                width: '24px',
                height: '24px',
                backgroundImage: `url(${heroIconImages['zarya-icon']})`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #ff6b35',
                borderRadius: '50%',
                backgroundColor: 'rgba(0, 0, 0, 0.7)'
            }}>
                <span style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: '#ff6b35',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    background: 'rgba(0, 0, 0, 0.8)',
                    borderRadius: '50%',
                    width: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #ff6b35'
                }}>
                    {zaryaToken.amount}
                </span>
            </div>
        </div>
    );
}
```

#### Card Integration
```javascript
// In Card.js - Add Zarya token overlay
import ZaryaTokenOverlay from '../effects/ZaryaTokenOverlay';

// Inside the card component
<ZaryaTokenOverlay cardId={playerHeroId} />
```

### Multi-Target Selection Pattern

#### Ultimate Implementation
```javascript
export async function onUltimate({ playerHeroId, rowId, cost }) {
    try {
        // Play ultimate audio
        playAudioByKey('zarya-ultimate');
        
        // Get current Zarya tokens on your side
        const playerNum = parseInt(playerHeroId[0]);
        const totalZaryaTokens = countZaryaTokensOnSide(playerNum);
        
        // Calculate damage per target (4 - tokens, minimum 1)
        const damagePerTarget = Math.max(1, 4 - totalZaryaTokens);
        
        // Select up to 3 enemy heroes
        const targets = [];
        for (let i = 0; i < 3; i++) {
            const target = await selectCardTarget('enemy');
            if (!target) break; // Right-click cancel
            targets.push(target);
        }
        
        if (targets.length === 0) {
            showToast('Particle Cannon: No targets selected');
            return;
        }
        
        // Play resolve audio
        playAudioByKey('zarya-ultimate-resolve');
        
        // Deal damage to each target
        targets.forEach(target => {
            dealDamage(target.cardId, target.rowId, damagePerTarget, false, playerHeroId);
            
            // Show floating combat text
            effectsBus.publish(Effects.showDamage({
                cardId: target.cardId,
                amount: damagePerTarget
            }));
        });
        
        // Track ultimate usage
        window.__ow_trackUltimateUsed?.(playerHeroId);
        
    } catch (error) {
        console.error('Zarya Ultimate Error:', error);
    }
}
```

### Key Implementation Patterns

#### 1. Single Token with Amount
- **Pattern**: Create one token with `amount` property instead of multiple individual tokens
- **Benefits**: Easier to manage, better performance, cleaner state
- **Usage**: `zaryaToken.amount` represents total charges

#### 2. Shield-Piercing Respect
- **Pattern**: Check `!ignoreShields` before token absorption
- **Benefits**: Tokens behave identically to normal shields
- **Usage**: `if (finalAmount > 0 && !ignoreShields && window.__ow_getRow)`

#### 3. Token State Updates
- **Pattern**: Remove old token, add updated token with delay
- **Benefits**: Avoids read-only property errors, ensures proper state updates
- **Usage**: `setTimeout(() => { window.__ow_appendCardEffect?.(cardId, updatedToken); }, 10);`

#### 4. Visual Re-rendering
- **Pattern**: Use `key` prop with changing values to force re-renders
- **Benefits**: Ensures overlay updates when token amount changes
- **Usage**: `key={\`zarya-token-${cardId}-${zaryaToken.amount}\`}`

#### 5. Icon Import System
- **Pattern**: Use `heroIconImages` mapping instead of hardcoded paths
- **Benefits**: Consistent with other icons, proper file format handling
- **Usage**: `backgroundImage: \`url(${heroIconImages['zarya-icon']})\``

### Common Pitfalls

#### 1. Read-Only Property Errors
**Problem**: Directly mutating `zaryaToken.amount` causes errors
**Solution**: Create new token object and use proper state update functions

#### 2. Visual Update Issues
**Problem**: Overlay doesn't update when token amount changes
**Solution**: Use `key` prop with changing values to force re-renders

#### 3. Shield-Piercing Bypass
**Problem**: Tokens absorb damage even when `ignoreShields = true`
**Solution**: Add `!ignoreShields` condition to token absorption logic

#### 4. Token Duplication
**Problem**: Multiple tokens created instead of updating existing one
**Solution**: Remove old token before adding updated one

#### 5. File Format Mismatch
**Problem**: Using wrong file extension (`.png` vs `.jpg`)
**Solution**: Use proper import system with `heroIconImages` mapping

### Testing Checklist

#### Basic Functionality
- [ ] Particle Barrier places 3 tokens on selected hero
- [ ] Tokens display correct count in overlay
- [ ] Tokens absorb damage like shields
- [ ] Tokens respect shield-piercing abilities
- [ ] Tokens deplete correctly when taking damage
- [ ] Tokens disappear when depleted

#### Ultimate Functionality
- [ ] Particle Cannon selects up to 3 targets
- [ ] Right-click cancels target selection
- [ ] Damage calculation includes token reduction
- [ ] Minimum 1 damage per target
- [ ] Floating combat text shows for each target
- [ ] Audio plays correctly

#### Visual System
- [ ] Token overlay appears on correct cards
- [ ] Overlay updates when token count changes
- [ ] Correct icon displays (zarya-icon.jpg)
- [ ] Orange styling matches design
- [ ] Overlay disappears when tokens depleted

#### Edge Cases
- [ ] No tokens on side (damage = 4)
- [ ] All tokens depleted (damage = 1)
- [ ] Shield-piercing abilities bypass tokens
- [ ] Multiple Zarya tokens on different cards
- [ ] Token updates during damage absorption

### Future Enhancements

#### Advanced Token Systems
- **Token Transfer**: Allow tokens to move between heroes
- **Token Decay**: Tokens reduce over time
- **Token Interactions**: Tokens affect other abilities

#### Visual Improvements
- **Animation**: Smooth token count transitions
- **Effects**: Glow effects for active tokens
- **Particles**: Visual effects when tokens absorb damage

#### Balance Considerations
- **Token Limits**: Maximum tokens per hero
- **Cost Scaling**: Ultimate cost based on tokens
- **Synergy Integration**: Tokens affect row synergy

### Recommendation

**Zarya's implementation demonstrates the gold standard for custom token systems.** The single-token-with-amount pattern, shield-piercing integration, and proper visual updates make it a perfect reference for future hero implementations that require similar mechanics.

The key lesson is that custom effects should behave identically to built-in systems (shields, damage, etc.) while providing the flexibility to add custom visual and mechanical elements.

---

## Junker Queen Implementation Guide

### Overview
Junker Queen introduces **damage-over-time (DoT) mechanics** and **damage tracking systems** that fundamentally change how damage is calculated and distributed. Her implementation demonstrates advanced state management, turn-based effects, and complex ultimate calculations.

### Core Mechanics

#### 1. **Wound System (Damage Over Time)**
- **Effect Type**: Card-level effect (`jq-wound`)
- **Trigger**: Start of wounded hero's turn
- **Damage**: 1 piercing damage (ignores shields)
- **Restrictions**: Prevents shield gain while wounded
- **Visual**: Red "W" badge overlay

#### 2. **Damage Tracking System**
- **Storage**: Internal Map (`roundWoundDamageByCard`) + Card Effect (`jq-rampage-counter`)
- **Purpose**: Track total wound damage for ultimate calculation
- **Persistence**: Resets each round
- **Visual**: Counter overlay on Junker Queen

#### 3. **Rampage Ultimate**
- **Cost**: 4 synergy
- **Calculation**: Total wound damage dealt this round
- **Distribution**: Split evenly among all living enemies
- **Timing**: 3-second damage distribution (like Roadhog)
- **Cleanup**: Removes all wounds after ultimate

### Implementation Details

#### File Structure
```
src/abilities/heroes/junkerqueen.js
src/components/effects/JunkerQueenWoundOverlay.js
src/components/effects/JunkerQueenRampageCounterOverlay.js
```

#### Key Functions

```javascript
// Main ability functions
export function onEnter({ playerHeroId, rowId })
export async function onUltimate({ playerHeroId, rowId, cost })
export function processWoundsAtTurnStart(cardId, rowId)
export function onRoundStart()
export function getRampageTotal(playerHeroId)

// Integration points
export function cleanseWoundsFromCard(cardId)
```

#### State Management Pattern

```javascript
// Dual storage system for reliability
const roundWoundDamageByCard = new Map(); // Internal tracking
// + Card effect with value/amount properties // UI consistency

// Update both systems when wound damage occurs
roundWoundDamageByCard.set(sourceCardId, next);
window.__ow_appendCardEffect?.(sourceCardId, {
    id: 'jq-rampage-counter',
    value: next,
    amount: next
});
```

#### Turn-Based Effect Integration

```javascript
// In TurnEffectsRunner.js
if (hasWound && abilities.junkerqueen?.processWoundsAtTurnStart) {
    abilities.junkerqueen.processWoundsAtTurnStart(cardId, rowId);
}
```

### Visual System

#### Wound Overlay
- **Component**: `JunkerQueenWoundOverlay`
- **Position**: Top-left of card
- **Style**: Red "W" badge
- **Trigger**: Card has `jq-wound` effect

#### Rampage Counter
- **Component**: `JunkerQueenRampageCounterOverlay`
- **Position**: Center of Junker Queen card
- **Style**: Orange counter badge
- **Data Source**: Card effect `value`/`amount` properties

### Audio Integration

```javascript
// Required audio files
'junkerqueen-intro'    // On draw
'junkerqueen-enter'    // On placement
'junkerqueen-ultimate' // On ultimate activation
// No ability1 or ultimate-resolve sounds
```

### Advanced Patterns

#### 1. **Dual State Management**
- **Problem**: UI needs immediate updates, internal logic needs reliability
- **Solution**: Maintain both Map and card effect, prioritize card effect for UI
- **Benefit**: Consistent display even with async updates

#### 2. **Damage Distribution Algorithm**
```javascript
// Split damage evenly with remainder distribution
const base = Math.floor(total / livingEnemies.length);
let remainder = total % livingEnemies.length;

livingEnemies.forEach((enemy, index) => {
    const dmg = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    // Apply damage with timing
});
```

#### 3. **Effect Cleanup Strategy**
```javascript
// Cleanup all wounds after ultimate
const allRows = ['1f', '1m', '1b', '2f', '2m', '2b'];
allRows.forEach(rId => {
    const row = window.__ow_getRow?.(rId);
    row.cardIds.forEach(cid => {
        window.__ow_removeCardEffect?.(cid, 'jq-wound');
    });
});
```

### Integration Points

#### Damage Bus Integration
- **Wound Application**: Called from `onEnter` after shield checks
- **Wound Damage**: Called from `TurnEffectsRunner` at turn start
- **Shield Prevention**: Wounded heroes cannot gain shields

#### Turn System Integration
- **Turn Start**: Process wound damage for all wounded heroes
- **Round Start**: Reset damage tracking counters
- **Round End**: Cleanup all wound effects

#### Shield System Integration
- **Sigma Barrier**: Prevents wound application to protected rows
- **Shield Gain**: Blocked while wounded
- **Shield Piercing**: Wound damage ignores all shields

### Testing Checklist

#### Basic Functionality
- [ ] Wounds apply to unshielded enemies on enter
- [ ] Wounds prevent shield gain
- [ ] Wound damage triggers at turn start
- [ ] Counter increments with wound damage
- [ ] Ultimate distributes correct total damage
- [ ] All wounds clean up after ultimate

#### Visual System
- [ ] Wound overlay appears on affected heroes
- [ ] Counter overlay shows correct value
- [ ] Overlays update in real-time
- [ ] Overlays disappear when effects end

#### Edge Cases
- [ ] Sigma barrier prevents wound application
- [ ] Junker Queen doesn't wound herself
- [ ] No living enemies (ultimate does nothing)
- [ ] Round resets counter correctly
- [ ] Multiple Junker Queens track separately

### Common Pitfalls

#### 1. **State Synchronization**
- **Problem**: UI shows stale data
- **Solution**: Use `key` prop with changing values to force re-renders
- **Pattern**: `key={`counter-${value}`}`

#### 2. **Async Updates**
- **Problem**: `setTimeout(0)` not reliable
- **Solution**: Use `setTimeout(10)` for deferred updates
- **Pattern**: Remove effect, then add updated effect

#### 3. **Effect Cleanup**
- **Problem**: Wounds persist after round/ultimate
- **Solution**: Explicit cleanup in multiple places
- **Pattern**: Cleanup in `onUltimate`, `onRoundStart`, and `onDeath`

### Future Enhancements

#### Advanced DoT Systems
- **Stacking Wounds**: Multiple wound sources
- **Wound Types**: Different wound effects
- **Wound Interactions**: Wounds affecting other abilities

#### Visual Improvements
- **Wound Animation**: Pulsing effect on wounded heroes
- **Damage Preview**: Show ultimate damage before activation
- **Counter Animation**: Smooth counter transitions

---

## Mauga Implementation Guide

### Overview
Mauga introduces **permanent additional HP mechanics** and **row locking systems** that create unique strategic gameplay. His implementation demonstrates advanced HP management, movement restrictions, and conditional damage systems.

### Core Mechanics

#### 1. **Berserker System (Permanent Additional HP)**
- **Trigger**: Ally hero deals direct ability damage
- **Effect**: +1 HP to Mauga (up to 12 max)
- **Restriction**: Cannot gain direct shields (card shields or Zarya tokens)
- **Visual**: Counter overlay in bottom-left
- **Persistence**: Permanent until Mauga dies

#### 2. **Cage Fight Ultimate (Row Locking)**
- **Cost**: 3 synergy
- **Target**: Automatically targets opposing row
- **Effect**: Locks row (prevents movement in/out)
- **Damage**: HP difference damage to opposing column
- **Visual**: Grey border around locked row
- **Duration**: Until end of round

### Implementation Details

#### File Structure
```
src/abilities/heroes/mauga.js
src/components/effects/MaugaBerserkerOverlay.js
src/components/effects/MaugaCageFightOverlay.js
```

#### Key Functions

```javascript
// Main ability functions
export function onEnter({ playerHeroId, rowId })
export async function onUltimate({ playerHeroId, rowId, cost })
export function onDeath({ playerHeroId })

// Integration points
export function processBerserkerGain(sourceCardId, targetCardId)
```

#### HP Management System

```javascript
// Berserker HP gain logic
const maugaMaxHealth = 12; // Mauga's max HP with Berserker
const currentHealth = card.health || 0;
const baseHealth = data.heroes.mauga.health; // Mauga's base HP

if (currentHealth < maugaMaxHealth) {
    const newHealth = Math.min(currentHealth + 1, maugaMaxHealth);
    const healingAmount = newHealth - currentHealth;
    if (healingAmount > 0) {
        window.__ow_setCardHealth?.(cardId, newHealth);
        // Update counter overlay
    }
}
```

#### Row Locking System

```javascript
// Add row lock effect
window.__ow_appendRowEffect?.(targetRowId, 'enemyEffects', {
    id: 'cage-fight-lock',
    hero: 'mauga',
    type: 'lock',
    tooltip: 'Row locked by Mauga\'s Cage Fight'
});

// Visual styling
row.classList.add('mauga-cage-fight-locked');
```

### Visual System

#### Berserker Counter
- **Component**: `MaugaBerserkerOverlay`
- **Position**: Bottom-left of Mauga card
- **Style**: Orange counter badge
- **Data**: Additional HP gained this round

#### Row Lock Border
- **Component**: `MaugaCageFightOverlay`
- **Position**: Around entire row
- **Style**: Grey border with subtle glow
- **Trigger**: Row has `cage-fight-lock` effect

### Audio Integration

```javascript
// Required audio files
'mauga-intro'    // On draw
'mauga-enter'    // On placement
'mauga-ultimate' // On ultimate activation
// No ability1 or ultimate-resolve sounds
```

### Advanced Patterns

#### 1. **Permanent HP System**
- **Problem**: Distinguish between base HP and additional HP
- **Solution**: Track additional HP separately, display as counter
- **Benefit**: Clear visual distinction, proper HP management

#### 2. **Movement Prevention**
- **Problem**: Prevent cards from entering locked rows
- **Solution**: Validation in `handleOnDragEnd` before `onEnter` calls
- **Pattern**: Check for lock effect, show toast, cancel operation

#### 3. **Conditional Damage**
- **Problem**: Only damage if Mauga's HP > target's HP
- **Solution**: Compare HP values before damage calculation
- **Pattern**: `if (maugaHP > targetHP) { dealDamage(difference) }`

### Integration Points

#### Damage Bus Integration
- **Berserker Trigger**: Called when ally deals direct ability damage
- **HP Gain**: Updates Mauga's health and counter
- **Shield Restriction**: Prevents direct shield gain

#### Movement System Integration
- **Drag Prevention**: Validates row locks before placement
- **Toast Feedback**: Informs player why movement is blocked
- **Effect Cleanup**: Removes locks at round end

#### HP System Integration
- **Base HP**: Respects Mauga's original health value
- **Max HP**: Enforces 12 HP limit
- **Healing**: Works normally for base HP, special for additional HP

### Testing Checklist

#### Basic Functionality
- [ ] Berserker triggers on ally damage
- [ ] HP gain respects 12 max limit
- [ ] Counter updates correctly
- [ ] Ultimate locks opposing row
- [ ] HP difference damage works
- [ ] Movement blocked into locked row

#### Visual System
- [ ] Berserker counter appears and updates
- [ ] Row lock border appears
- [ ] Counter shows correct additional HP
- [ ] Border persists until round end

#### Edge Cases
- [ ] No opposing unit (row still locks)
- [ ] Mauga HP <= target HP (no damage)
- [ ] Mauga dies (locks persist)
- [ ] Round end (locks clear)
- [ ] Direct shields blocked

### Common Pitfalls

#### 1. **Movement Validation Timing**
- **Problem**: `onEnter` triggers before movement validation
- **Solution**: Validate in `handleOnDragEnd` before any ability calls
- **Pattern**: Check effects, show toast, return early

#### 2. **HP State Management**
- **Problem**: Additional HP not properly tracked
- **Solution**: Use card effects for persistent state
- **Pattern**: Store additional HP in effect, update counter

#### 3. **Effect Cleanup**
- **Problem**: Row locks persist indefinitely
- **Solution**: Cleanup in `TurnEffectsRunner` at round end
- **Pattern**: Remove all lock effects from all rows

### Future Enhancements

#### Advanced HP Systems
- **HP Decay**: Additional HP reduces over time
- **HP Transfer**: Share additional HP with allies
- **HP Interactions**: Additional HP affects other abilities

#### Row Lock Variations
- **Partial Locks**: Lock specific columns
- **Conditional Locks**: Locks based on conditions
- **Lock Interactions**: Locks affecting other abilities

#### Visual Improvements
- **HP Animation**: Smooth HP gain transitions
- **Lock Effects**: More dramatic visual feedback
- **Counter Animation**: Animated counter updates

### Recommendation

**Mauga's implementation demonstrates advanced state management and movement restriction systems.** The permanent HP mechanics and row locking create unique strategic depth while maintaining clear visual feedback and proper integration with existing systems.

The key lessons are:
1. **Complex state requires multiple storage systems** (internal + card effects)
2. **Movement restrictions need early validation** (before ability triggers)
3. **Visual feedback is crucial** for complex mechanics (counters, borders)
4. **Cleanup must be comprehensive** (multiple cleanup points)