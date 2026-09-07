# Player profile — avatar, username, W–L record

**Date:** 2026-09-06  
**Status:** Approved for implementation  
**Product:** owtacticards (`owcardgame`)

## Goal

Replace the Operative Hub shield placeholder with a real player profile: uploadable avatar, editable username, and tabulated wins/losses (match + round). Persist so Electron keeps a durable file; browser uses localStorage.

## Locked decisions

| Topic | Choice |
|-------|--------|
| Approach | Profile module + home rail UI (recommended) |
| Win tally | **Both:** Match W–L primary; Round W–L secondary |
| Persistence | Electron JSON in `userData` + localStorage fallback |
| Who is “you” | Player 1 (human) vs AI |
| Practice | Does **not** count toward W–L |
| Edit UX | Rail: click avatar to upload; click/rename username inline |

## Data model

```js
{
  username: string,          // default "Operative"
  avatarDataUrl: string|null, // resized image data URL, or null
  matchWins: number,
  matchLosses: number,
  roundWins: number,
  roundLosses: number,
}
```

## UI (Home rail)

- Avatar circle: image if set, else placeholder icon; click opens file input (`image/*`).
- Username under avatar; click to edit, blur/Enter to save.
- **Match** line: `W–L` (e.g. `12–7`).
- **Rounds** line (smaller): `Rounds 34–29`.
- Keep version subtitle nearby; drop the static shield-only “Operative Hub” as the identity.

## Persistence

1. **Always** read/write `localStorage` key `owtacticards.playerProfile`.
2. **Electron:** preload exposes `window.owProfile.load()` / `save(profile)`.
   - Main process: `path.join(app.getPath('userData'), 'player-profile.json')`.
3. Boot order: try Electron file → if missing/invalid, localStorage → defaults. After load, write both so they stay in sync.
4. Avatar stored as compressed data URL (max edge ~256px, JPEG/WebP quality ~0.85) so the JSON stays small.

## Recording hooks

| Event | Action |
|-------|--------|
| Round ends, P1 wins | `roundWins++` |
| Round ends, P2 wins | `roundLosses++` |
| Round draw | no change |
| Match over, P1 wins | `matchWins++` |
| Match over, P2 wins (or P1 loses) | `matchLosses++` |
| Practice mode | skip all |

Wire in `App.js` `endRound` / match-over paths after the winner is decided.

## Electron changes

- Enable a **preload** script with `contextIsolation: true` (keep `nodeIntegration: false`).
- IPC: `profile:load`, `profile:save`.
- No change to packaging output layout beyond including preload in `electron/`.

## Out of scope

- Cloud sync / accounts  
- Opponent (AI) profile  
- Reset-stats UI (can add later in Settings)  
- Changing in-match scoreboard chrome beyond recording

## Test plan

- [x] Default profile loads with 0–0 / 0–0 and placeholder avatar.
- [ ] Username edit persists across reload (localStorage).
- [ ] Avatar upload shows in rail and persists.
- [ ] Versus-AI round win increments round W; match win increments match W.
- [ ] Practice match does not change totals.
- [x] Unit tests for profile normalize/merge and W–L record helpers.
