## AI Implementation Plan

### 🎯 Current Status: PHASE 3 COMPLETE - Advanced Strategic AI

**Latest Updates (2025-01-30):**
- ✅ **Modal Choice System Fixed** - All 9 heroes with onEnter choices now work with AI
- ✅ **Deterministic RNG** - All Math.random() replaced with seeded RNG
- ✅ **Threat Assessment** - AI prioritizes targets based on role, power, synergy, health
- ✅ **Turn Economy** - AI respects 3 cards per turn limit
- ✅ **Row Hazard Awareness** - AI avoids debuffs and seeks buffs
- ✅ **ULTIMATE USAGE FIXED** - Lowered thresholds, added heal support, fixed conditions (2025-01-30)

**AI Capabilities:**
- ✅ Strategic card placement with win condition planning
- ✅ Intelligent ability choice selection (damage vs heal vs buff)
- ✅ Ultimate timing and target selection
- ✅ Special card auto-play (BOB, MEKA, Turret)
- ✅ Barrier toggle management (Reinhardt, Winston)
- ✅ Mercy resurrection with target prioritization
- ✅ Symmetra teleporter logic (enemy bounce vs ally save)

### Objectives
- Deliver a capable, testable AI that can evaluate the board, select optimal actions, and execute them via authoritative systems.
- Scale difficulty via depth, accuracy, and timing (not just delay/randomness).

### Assumptions
- No heroes are row-restricted by default.
- Limited reposition exists (e.g., Lifeweaver on-enter, Symmetra teleport).

---

## Phase 0 – Planning and Foundations

### P0.1 Create plan and staging (this document)
- Outcome: Roadmap with milestones and acceptance criteria.

### P0.2 Data access decoupling (adapter)
- Task: Introduce `GameAdapter` interface used by AI for reads/writes (rows, cards, actions).
- Replace direct `window.__ow_*` access with injected adapter.
- Acceptance: AI runs in dev with BrowserAdapter; unit tests run with MockAdapter.

### P0.3 Determinism and logging
- Task: Add seeded RNG utility and structured logger with levels (debug/info/warn/error) and toggles.
- Acceptance: Given a seed and fixed state, decisions are reproducible; logs are filterable.

---

## Phase 1 – Correctness: Row Awareness and Action Integration

### P1.1 Accurate row awareness and board caching
- Task: Compute card row from membership in `2f/2m/2b` (and enemy rows) each analysis tick; cache boards to avoid repeated fetches.
- Update `getCardRowType` to reflect actual placement.
- Acceptance: Power/synergy totals match visible board; logs show correct row types.

### P1.2 Wire playCard to authoritative placement
- Task: Implement `playCard(card, row)` via adapter command (removes from hand, validates, places card in row, triggers on-enter).
- Acceptance: AI plays a card and the board updates; failures return an error consumed by AI fallback.

### P1.3 Minimal targeting and ability execution
- Task: Implement `useAbility`/`useUltimate` path with target resolution using adapter helpers; apply effects via effects/damage buses.
- Acceptance: AI can execute at least one healing and one damage ability end-to-end.

---

## Phase 2 – Decision Quality: Targeting, Scoring, and Constraints

### P2.1 Targeting evaluator
- Task: Rank candidates per intent (heal/buff/cleanse on allies; damage/silence/remove on enemies) with rules for shields/stealth/taunt.
- Acceptance: Given mocked states, selected targets match expected rankings.

### P2.2 Turn economy and resources
- Task: Define per-turn play limits, resource costs, and ability/ultimate consumption rules; expose via adapter.
- Integrate into decision-making thresholds.
- Acceptance: AI respects limits and does not overspend; unit tests cover edge cases.

### P2.3 Row selection scoring
- Task: Score rows using: row-specific stats, existing auras/hazards, ally synergy, enemy pressure per lane; avoid overstacking into AoE.
- Acceptance: Placement shifts lanes when hazards/pressure change; tests validate lane choice.

---

## Phase 3 – Strategy: Win Conditions, Combos, and Adaptation

### P3.1 Win condition refinement
- Task: Expand `WIN_CONDITIONS` and multipliers; switch conditions based on game state deltas (ahead/behind, tempo windows).
- Acceptance: AI changes plan when falling behind or when payoff becomes available.

### P3.2 Combo planning and holds
- Task: Identify setup→payoff patterns; hold or sequence cards appropriately with timeouts to avoid paralysis.
- Acceptance: AI delays payoff until setup exists; releases holds if window passes.

### P3.3 Threat modeling and survivability
- Task: Score enemy threats by snowball potential and removal likelihood; protect supports; value tanks as screens.
- Acceptance: Supports placed safer when enemy burst exists; tests simulate threat shifts.

---

## Phase 4 – Quality-of-Life, Performance, and Testing

### P4.1 Performance and UX controls
- Task: Time budget per difficulty, early-exit on obvious plays, cancellation if state changes during delay, log toggles.
- Acceptance: Decisions complete within budgets; AI cancels outdated actions.

### P4.2 Test harness and snapshots
- Task: Build seeded scenarios and snapshot tests for decisions; add AI-vs-AI smoke test to prevent stalemates.
- Acceptance: CI runs deterministic tests; regressions are caught by snapshots.

### P4.3 Difficulty scaling beyond randomness
- Task: Unlock deeper targeting/combos and better evaluation at higher difficulties; simpler heuristics at lower ones.
- Acceptance: Observable skill gradient across difficulties in test scenarios.

---

## Deliverables Checklist
- Adapter abstraction implemented and used by AI.
- Deterministic RNG + structured logging.
- Correct row detection and cached board views.
- `playCard` integrated with authoritative system.
- Minimal ability/ultimate execution with targeting.
- Targeting evaluator with shield/stealth/taunt handling.
- Turn economy/resources respected.
- Enhanced row scoring with hazards/auras/threats.
- Win condition switching and combo timing.
- Tests: seeded scenarios, snapshots, AI-vs-AI sanity.

---

## Risks and Mitigations
- Hidden global coupling → Mitigate via adapter and mocks.
- Non-determinism → Seeded RNG, freeze time in tests.
- Overfitting heuristics → Scenario diversity and snapshot baselines.
- Performance regressions → Budgeted evaluators and cached reads.

---

## Acceptance Criteria by Phase (Summary)
- Phase 1: AI can place cards in optimal rows and execute at least one ability end-to-end.
- Phase 2: AI respects turn economy, selects intelligent targets, and adapts row placement to hazards/pressure.
- Phase 3: AI adjusts strategies (win conditions), plans combos, and protects key units.
- Phase 4: Deterministic, test-covered, performant, and clearly tiered by difficulty.

---

## Known Issues and Remaining Work (As of 2025-01-XX)

### 🔴 CRITICAL ISSUES (Blocks Gameplay)

#### 1. Modal Choices Not Fully Automated
**Status:** ✅ RESOLVED
**Problem (Fixed):**
- Heroes with modal choices had AI context flags cleared before targeting callbacks executed
- This caused player to be prompted for targeting even during AI turn
- Missing `title` fields in modal choice objects prevents AI detection
- AI gets stuck waiting for human input on modal choices

**Solution Implemented:**
- ✅ Created `aiContextHelper.js` with `withAIContext()` wrapper to restore AI flags
- ✅ Applied to all 9 heroes: Ashe, Mercy, Baptiste, Tracer, Zenyatta, Brigitte, Bastion, Lucio, Reaper
- ✅ AI can now use both onenter1 and onenter2 ability choices
- ✅ Intelligent scoring system evaluates choices based on game state
- ✅ Difficulty-based selection (Easy: 40% optimal, Medium: 70%, Hard: 90%)

---

#### 2. Turn Economy Not Enforced
**Status:** ✅ RESOLVED
**Problem (Fixed):**
- AI didn't track cards played per turn
- No enforcement of play limits (should be max 2-3 cards per turn)
- Could potentially violate game rules

**Solution Implemented:**
- ✅ Added `cardsPlayedThisTurn` counter to AIGameIntegration
- ✅ Added `MAX_CARDS_PER_TURN = 3` constant
- ✅ Enforced limit in `executePlayCard()` method (lines 162-165)
- ✅ Counter reset at turn start (line 61)

---

#### 3. Row Selection Doesn't Account for Hazards/Pressure
**Status:** ✅ RESOLVED
**Problem (Fixed):**
- Didn't avoid stacking in same row (AOE vulnerability)
- Ignored row debuffs (Hanzo sonic arrow, Widowmaker infra-sight, BOB token)
- Didn't leverage row buffs (Orisa barrier, Lucio heal token)

**Solution Implemented:**
- ✅ Added hazard detection in `positioningIntelligence.js` (lines 79-123)
- ✅ Penalties: Overstacking -30, Hanzo token -20, Widow sight -15, BOB token -25
- ✅ Bonuses: Orisa barrier +25, Lucio heal +15, Orisa supercharger +20
- ✅ Row density scoring to avoid AOE vulnerability

**Needed Improvements:**
```javascript
// Score penalties for hazards
if (row.enemyEffects?.some(e => e.type === 'damage-reduction')) score -= 20;
if (row.enemyEffects?.some(e => e.type === 'visibility')) score -= 15;

// Score bonuses for buffs
if (row.allyEffects?.some(e => e.type === 'damageReduction')) score += 25;
if (row.allyEffects?.some(e => e.type === 'heal-over-time')) score += 15;

// Avoid overstacking (AOE vulnerability)
if (row.cardIds.length >= 3) score -= 30;

// Column awareness (Reinhardt in same column)
if (hasReinhardtInColumn(columnIndex)) score += 20;
```

**Acceptance:**
- AI spreads cards across rows when possible
- AI avoids Hanzo-debuffed rows
- AI places squishies behind Reinhardt column
- Tests validate row choice shifts with hazards

---

#### 4. Ultimate Usage System Not Working
**Status:** ✅ RESOLVED (2025-01-30)
**Problem (Fixed):**
- AI wasn't using ultimate abilities at all
- Synergy thresholds were too restrictive (Hard AI needed 5+ synergy for AOE ults)
- No support for heal ultimates (only damage and buff)
- Board score condition ordering bug prevented desperation/victory modes
- Regular damage ultimates required too many enemies (2+ count or 8+ power)

**Solution Implemented:**
- ✅ **Lowered synergy thresholds for AOE ultimates:**
  - Hard: 5 → 3 synergy (or 2+ enemies with 8+ power)
  - Medium: 3 → 2 synergy (or 2+ enemies)
  - Easy: 2 → 1 synergy (or 1+ enemies)
- ✅ **Lowered thresholds for regular damage ultimates:**
  - Now fires with 1+ enemies OR 5+ power (was 2+ enemies OR 8+ power)
- ✅ **Added heal ultimate support:**
  - Hard AI: Fires with 1+ critical ally (≤40% health) OR 2+ wounded allies
  - Easy/Medium: Fires with any wounded ally
- ✅ **Lowered buff ultimate thresholds:**
  - Hard: 3 → 2 allies (or 1+ with 12+ enemy power)
  - Easy/Medium: 2 → 1 ally minimum
- ✅ **Fixed board score condition ordering:**
  - Now checks extremes first (-25, +25) before moderate thresholds (-15, +15)
  - Desperation mode and victory push now trigger correctly
- ✅ **Enhanced logging for ultimate decisions**

**Result:**
AI now uses ultimates appropriately based on game state and difficulty level.

---

### 🟡 MEDIUM PRIORITY ISSUES (Improves Strategy)

#### 5. Ability Usage System Not Implemented
**Status:** TODO (Line 975 in AIController.js)
**Problem:**
- AI can't use mid-turn abilities (only onEnter abilities work)
- No system for activating hero abilities after placement
- Examples: Can't use Mei's freeze, Lucio's speed boost, etc.

**Solution:**
- Implement `useAbilityIfBeneficial()` in AIGameIntegration
- Check each card on board for available abilities
- Score ability value vs. doing nothing
- Execute via ability system

---

#### 6. Threat Assessment
**Status:** ✅ RESOLVED
**Problem (Fixed):**
- Didn't identify high-priority targets
- Didn't protect key allies
- No priority targeting system

**Solution Implemented:**
- ✅ Comprehensive threat scoring: Role (Support+100, Damage+70, Tank+40), Power×8, Synergy, Health
- ✅ Kill priority: Supports > Damage > Tanks with easy kill bonuses
- ✅ Ally protection: Critical health+100, Low health+60, Support+80
- ✅ Special hero bonuses: Mercy+60, Ana+45, Pharah+55
- ✅ Integrated into targeting system in AIGameIntegration.js

---

#### 7. Combo Planning
**Status:** ✅ RESOLVED
**Problem (Fixed):**
- Didn't hold cards for synergy setups
- Played Pharah immediately instead of waiting for synergy buildup
- No awareness of setup→payoff patterns

**Solution Implemented:**
- ✅ Enhanced combo detection: Pharah+synergy, Reinhardt+backline, Zarya+AOE, Orisa+damage, Ana+power, Mercy+damage
- ✅ Hold tracking with 3-turn timeout to prevent paralysis
- ✅ Difficulty-based: Easy/Medium skip combo planning, Hard uses full system
- ✅ Examples:
  - Pharah held until synergy builders are played (Torbjorn, Mercy, Orisa, Baptiste)
  - AOE damage dealers (Hanzo, Junkrat, Reaper) held for Zarya combo
  - Damage dealers held for Orisa supercharger
  - High-power targets held for Ana nano boost
  - Reinhardt+backline combo detection

---

### 🟢 LOW PRIORITY (Code Quality / Polish)

#### 8. Non-Deterministic Decision Making
**Status:** ✅ RESOLVED
**Problem:**
- Many places used `Math.random()` instead of `this.rng.next()`
- Made debugging impossible (couldn't reproduce AI behavior)

**Solution:** ✅ Replaced all `Math.random()` calls with `this.rng.next()` in AI files
- AIGameIntegration.js: 8 replacements (modal choices, ultimate fallbacks)
- tacticalPlanner.js: Added RNG parameter, replaced 4 calls (difficulty-based randomness)
- AIController.js: Already had fallback to RNG
- All remaining Math.random() calls are safe fallbacks when RNG not provided

---

#### 9. Hardcoded Hero-Specific Logic
**Status:** TECH DEBT
**Problem:**
- Reinhardt, Winston, Baptiste logic hardcoded in AIGameIntegration
- Should use metadata from `abilityMetadata.js`
- Makes adding new heroes tedious

**Solution:** Refactor to metadata-driven system

---

#### 10. No Unit Tests
**Status:** NOT IMPLEMENTED
**Problem:**
- No test coverage for AI decisions
- No snapshot tests for reproducibility
- No AI-vs-AI smoke tests

**Solution:** Add test harness with MockAdapter (Phase 4)

---

#### 11. Difficulty Scaling
**Status:** ✅ SIGNIFICANTLY IMPROVED
**Current Implementation:**

**Easy AI (30% optimal):**
- 30% best card, 70% random card selection
- ±30% random noise in card scoring
- No combo planning (plays cards immediately)
- 50% chance to skip threat assessment and pick random/highest health targets
- 40% best modal choice, 60% random
- Timing: 3-second delays

**Medium AI (60% optimal):**
- 60% best card, 30% second best, 10% random
- ±15% random noise in card scoring
- No combo planning (plays cards immediately)
- 25% chance to skip threat assessment
- 70% best modal choice, 20% second best, 10% random
- Timing: 5-second delays

**Hard AI (90% optimal):**
- 90% best card, 8% second best, 2% third best
- No random noise in scoring
- Full combo planning with 3-turn timeout
- Always uses threat assessment
- 90% best modal choice, 8% second best, 2% third best
- Timing: 7-second delays

**Improvements Made:**
- ✅ Strategic differences beyond just timing
- ✅ Easy/Medium disable combo planning
- ✅ Difficulty-based targeting quality
- ✅ Card selection noise for inconsistency
- ✅ Modal choice quality varies by difficulty

---

### 📊 Current Phase Status

**Phase 1 (Correctness):** ✅ COMPLETE
- Row awareness implemented ✅
- playCard integrated ✅
- Basic targeting works ✅

**Phase 2 (Decision Quality):** 🟡 IN PROGRESS
- Targeting evaluator: ✅ DONE (targetingEvaluator.js)
- Turn economy: ❌ NOT IMPLEMENTED
- Row scoring: 🟡 BASIC (needs hazard/pressure awareness)

**Phase 3 (Strategy):** 🟡 PARTIAL
- Win conditions: ✅ IMPLEMENTED (strategicAnalysis.js)
- Combo planning: 🟡 BASIC (hold logic exists, not consistently used)
- Threat modeling: ❌ NOT IMPLEMENTED

**Phase 4 (QoL/Testing):** ❌ NOT STARTED
- Performance budgets: ❌
- Test harness: ❌
- Difficulty scaling: 🟡 BASIC (timing only)

---

### 🎯 Recommended Fix Order

**Sprint 1 (Critical - Gameplay Blockers):**
1. ✅ Modal choice automation audit & fixes
2. ❌ Turn economy enforcement
3. ❌ Row selection hazard/pressure awareness

**Sprint 2 (Strategic Improvements):**
4. ❌ Ability usage system
5. ❌ Threat assessment & kill priority
6. ❌ Combo planning consistency

**Sprint 3 (Code Quality):**
7. ❌ Deterministic RNG enforcement
8. ❌ Unit test harness
9. ❌ Adapter abstraction enforcement

**Sprint 4 (Polish):**
10. ❌ Performance budgets
11. ❌ Difficulty scaling refinement
12. ❌ Logging cleanup


