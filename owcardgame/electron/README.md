# Electron desktop build

Packaged installers land in `owcardgame/dist/` (gitignored).

## Scripts

From `owcardgame/`:

| Command | What it does |
|---------|----------------|
| `npm run electron:dist` | CRA build with `PUBLIC_URL=./`, then electron-builder → `dist/` (portable + NSIS) |
| `npm run electron:start` | CRA electron build, then open Electron once |
| `npm run electron:dev` | Open Electron against `http://localhost:3000` (run `npm start` in another terminal) |

## Notes

- GitHub Pages still uses `npm run build` (homepage stays the gh-pages URL).
- Electron uses relative asset URLs via `build:electron`.
