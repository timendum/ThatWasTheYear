# AGENT.md

## Project Overview

ThatWasTheYear is a browser-based multiplayer music timeline game built with React 19 + TypeScript, bundled with Deno and esbuild. Players take turns guessing the chronological position of mystery songs on their personal timelines. Song data and audio previews come from a local JSON library and the iTunes Search API.

Hosted at: <https://timendum.github.io/ThatWasTheYear/>

## Tech Stack

- **Runtime/Bundler**: Deno 2.x + esbuild (no Webpack/Vite)
- **Framework**: React 19 (functional components, hooks only)
- **Language**: TypeScript (strict mode)
- **Dependencies**: react, react-dom (zero runtime deps beyond React)
- **Linting/Formatting**: oxlint + oxfmt (config in `.oxlintrc.json` / `.oxfmtrc.json`); stylelint with `stylelint-config-standard` for CSS (config in `stylelint.config.mjs`)
- **External API**: iTunes Search/Lookup API (no key required)
- **Deployment**: GitHub Pages via GitHub Actions

## Commands

| Command | Description |
| --- | --- |
| `deno install` | Install dependencies |
| `deno task serve` | Dev server at <http://localhost:3000> (watch mode) |
| `deno task build` | Production build → `dist/` |
| `deno task check-songs` | Validate songs.json against iTunes data |
| `deno task validate-songs` | Validate songs.json structure |
| `deno task add-song` | Add a new song to songs.json |
| `deno task checks` | Run type-check + lint + format check + test + CSS lint |

## Project Structure

```
assets/               Static files (copied to dist/ on build)
  index.html          Single HTML page, mounts #root
  style.css           All styling
  songs.json          Song library: array of {t, a, y, itunesId?}
  placeholder-100.png Fallback album art
  icon.png            App icon (PNG)
  icon.svg            App icon (SVG)
src/
  index.tsx             Entry point, renders <App /> into #root
  App.tsx               Root component, orchestrates game flow and audio
  gameState.ts          gameReducer, initialGameState, utility functions (shuffleDeck, save/load, getStartingYear)
  gameState.test.ts     Tests for gameState (Deno test runner)
  songService.ts        Song loading (fetch from JSON packs) and iTunes API lookups (getDetailedSong)
  songService.test.ts   Tests for songService (Deno test runner)
  types.ts              Shared interfaces: Song, DetailedSong, Player, PlacementResult, GameState, GameAction, EndCondition
  components/
    SetupScreen.tsx       Player name inputs + end condition selection
    Controls.tsx          Turn indicator, draw/replay buttons, mystery card display
    PlayersContainer.tsx  Renders all PlayerLane components
    PlayerLane.tsx        Single player's timeline with drop zones for placement
    SongCard.tsx          Renders a song card (revealed or mystery)
    ResultModal.tsx       Correct/wrong overlay after placement
    GameOverScreen.tsx    End-of-game summary screen
    ErrorBoundary.tsx     Class-based error boundary (React requires class for error boundaries)
scripts/
  build.ts           Production build using esbuild + asset copy
  server.ts          Deno dev server (builds src/index.tsx on-the-fly via esbuild)
  copy-assets.ts     Copies assets/ → dist/ during build
  check-songs.ts     Validates song data against iTunes API
  validate-songs.ts  Validates songs.json structure
  add-song.ts        Adds a new song to songs.json
  songs-per-year.ts  Reports song count per year
```

## Architecture

### Song Loading

Songs are loaded differently depending on context:

- **Browser (runtime)**: `songService.ts` defines a `SONG_PACK_FILES` map (`base` → `./songs.json`, `it` → `./songs-it.json`). `loadSongPacks(packs)` fetches the selected packs via `fetch()` and merges them into a flat `Song[]`. The `SongPack` type (`"base" | "it"`) is defined in `types.ts`.
- **CLI scripts**: `scripts/lib/load-songs.ts` exports `loadSongsFromArgs()`, which reads JSON files via `Deno.readTextFile()`. Defaults to `assets/songs.json`; accepts file paths as CLI arguments.
- **iTunes enrichment**: `songService.ts` also handles iTunes API lookups (`getDetailedSong`, `getDetailedITunesSong`) — first tries lookup by `itunesId`, falls back to search by artist + title. Returns artwork, preview URL, and a `releaseYear` when it differs from `song.y` by exactly 1.

### State Management

- Game state is a plain `GameState` object managed via `useReducer(gameReducer, initialGameState)` in App.tsx
- All state transitions are handled by dispatching `GameAction` objects to the pure `gameReducer` function in `gameState.ts`; song loading and iTunes API logic live separately in `songService.ts`
- Placement correctness (including `releaseYear` fallback) is computed solely in the reducer's `PLACE_SONG` case; the result is stored in `GameState.lastResult`
- Async side effects (iTunes API fetches via `songService`) happen in event handlers; results are dispatched into the reducer
- UI-only state (`focusedDropZone`) lives in separate `useState` hooks in App.tsx
- Game state is persisted to localStorage via a `useEffect` that watches the reducer state (`lastResult` and `allSongs` are excluded from persistence)

### Game Flow

1. **Restore/Init**: On mount, fetches `songs.json` and attempts to restore saved game from localStorage
2. **Setup**: SetupScreen collects player names (minimum one) and end condition (infinite / N turns / first to N correct); each player starts with a placeholder year card (year ≈ average of all songs ± random offset). The deck is shuffled via a stratified strategy: songs are sorted by year, dealt round-robin into per-player piles, each pile is Fisher-Yates shuffled, then piles are interleaved back — so consecutive draws span different eras rather than clustering in one time period
3. **Draw**: Player clicks "Play Random Song" → pops from shuffled deck → fetches iTunes details → plays 10s audio preview
4. **Place**: Player clicks a drop zone on their timeline to place the song chronologically
5. **Result**: Modal shows correct/wrong — if correct the card is inserted, if wrong it is discarded — turn passes to next player, round increments when all players have gone
6. **Game Over**: At end of each round, checks end condition (turn limit reached or a player hit the correct-songs target); shows GameOverScreen with summary
7. **Reset**: Clears localStorage, preserves player name and end condition, reshuffles the full song library, returns to SetupScreen

### Audio

- Single `Audio` element managed via `useRef` in App.tsx
- 10-second playback limit enforced by `setTimeout`

## Conventions

- Functional React components only, except ErrorBoundary (React requires a class component for error boundaries)
- Space for indentation
- Tests use Deno's built-in test runner (`deno test`)
- Linting via oxlint (`.oxlintrc.json`), formatting via oxfmt (`.oxfmtrc.json`)
- No CSS framework — plain CSS in `assets/style.css`
- Build output is a single `index.js` bundle + copied assets
- The dev server builds `src/index.tsx` on each request (no pre-bundling)
