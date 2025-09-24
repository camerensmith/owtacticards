Modular Ability System Architecture
====================================

## Core Engine Modules

### engine/damageBus.js
Centralized damage application system.
- `dealDamage(cardId, rowId, amount, ignoreShields=false)` - Apply damage to a card
- `subscribe(listener)` - Listen for damage events (used by HeroAbilities)

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
- Use `dealDamage(cardId, rowId, amount, ignoreShields)` for all damage
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
3. **Hero intro sound** (`{heroId}-intro.mp3`) - the hero's intro voice line

#### Hero-Specific Intro Sounds
When a hero is automatically drawn during gameplay (NOT during initial setup), the system plays:
1. **Hero intro sound** (`{heroId}-intro.mp3`) - the hero's intro voice line

**Important**: Intro sounds are NOT played during the initial 4-card setup to avoid audio overload.

To add enter/intro/ability sounds for new heroes:
1. Create audio files: 
   - `src/assets/audio/{heroId}-enter.mp3` (deployment voice line)
   - `src/assets/audio/{heroId}-intro.mp3` (draw voice line)
   - `src/assets/audio/{heroId}-ability1.mp3` (first ability voice line)
   - `src/assets/audio/{heroId}-ability2.mp3` (second ability voice line)
2. Add imports to `src/assets/imageImports.js`
3. Add mappings to `abilityAudioFiles` object
4. The system will automatically play them at the appropriate times

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

## Development Workflow

1. **Create hero module** in `src/abilities/heroes/<heroId>.js`
2. **Export trigger functions** (onEnter, onUltimate, etc.)
3. **Use engine modules** for all interactions (damage, targeting, sounds)
4. **Add to index.js** to register the hero
5. **Test integration** with existing UI components
6. **Update documentation** with new patterns

## Example: Complete Hero Implementation

See `src/abilities/heroes/ashe.js` for a complete implementation example with:
- onEnter choice modal
- Single and multi-target damage
- Targeting UI integration
- Event handling best practices