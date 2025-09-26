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