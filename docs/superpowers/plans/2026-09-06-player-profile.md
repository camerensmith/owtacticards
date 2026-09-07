# Player profile Implementation Plan

> **For agentic workers:** Spec `docs/superpowers/specs/2026-09-06-player-profile-design.md`. TDD for profile helpers.

**Goal:** Avatar upload, username, match + round W–L on home rail; Electron file + localStorage.

## Files
- `src/game/playerProfile.js` + `.test.js` — normalize, record, persist API
- `electron/preload.js` + `electron/main.js` — IPC load/save
- `HomeScreen.js` / `.css` — rail UI
- `App.js` — record on round/match end (skip practice)

## Tasks
1. Profile helpers + tests
2. Electron preload/IPC
3. HomeScreen rail UI
4. Wire App.js recording
