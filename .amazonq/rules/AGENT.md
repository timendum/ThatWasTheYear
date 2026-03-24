# AGENT.md

## Project Overview

ThatWasTheYear is a browser-based multiplayer music timeline game built with React 19 + TypeScript, bundled with Bun. Players take turns guessing the chronological position of mystery songs on their personal timelines. Song data and audio previews come from a local JSON library and the iTunes Search API.

Hosted at: <https://timendum.github.io/ThatWasTheYear/>

## Tech Stack

- **Runtime/Bundler**: Bun (no Webpack/Vite)
- **Framework**: React 19 (functional components, hooks only)
- **Language**: TypeScript (strict mode)
- **Dependencies**: react, react-dom (zero runtime deps beyond React)
- **Linting/Formatting**: oxlint + oxfmt (config in `.oxlintrc.json` / `.oxfmtrc.json`)
- **External API**: iTunes Search/Lookup API (no key required)
- **Deployment**: GitHub Pages via GitHub Actions

## Commands

| Command | Description |
| --- | --- |
| `bun install` | Install dependencies |
| `bun run serve` | Dev server at <http://localhost:3000> (hot reload) |
| `bun run build` | Production build → `dist/` |
| `bun run check-songs` | Validate songs.json against iTunes data |
| `bun run lint` | Lint with oxlint |
| `bun run lint:fix` | Lint and auto-fix with oxlint |
| `bun run fmt` | Format with oxfmt |
| `bun run fmt:check` | Check formatting with oxfmt |

## Project Structure

```
assets/              Static files (copied to dist/ on build)
  index.html         Single HTML page, mounts #root
  style.css          All styling
  songs.json         Song library: array of {t, a, y, itunesId?}
  placeholder-100.png Fallback album art
  favicon.ico        Favicon
  icon.png           App icon (PNG)
  icon.svg           App icon (SVG)
src/
  index.tsx          Entry point, renders <App /> into #root
  App.tsx            Root component, orchestrates game flow and audio
  gameState.ts       gameReducer, initialGameState, utility functions (shuffleDeck, getDetailedSong, save/load)
  types.ts           Shared interfaces: Song, DetailedSong, Player, PlacementResult, GameState, GameAction, EndCondition
  components/
    SetupScreen.tsx  Player name inputs + end condition selection
    Controls.tsx     Turn indicator, draw/replay buttons, mystery card display
    PlayersContainer.tsx  Renders all PlayerLane components
    PlayerLane.tsx   Single player's timeline with drop zones for placement
    SongCard.tsx     Renders a song card (revealed or mystery)
    ResultModal.tsx  Correct/wrong overlay after placement
    GameOverScreen.tsx  End-of-game summary screen
scripts/
  server.ts          Bun dev server (builds src/index.tsx on-the-fly)
  copy-assets.ts     Copies assets/ → dist/ during build
  check-songs.ts     Validates song data against iTunes API
```

## Architecture

### State Management

- Game state is a plain `GameState` object managed via `useReducer(gameReducer, initialGameState)` in App.tsx
- All state transitions are handled by dispatching `GameAction` objects to the pure `gameReducer` function in `gameState.ts`
- Placement correctness (including `releaseYear` fallback) is computed solely in the reducer's `PLACE_SONG` case; the result is stored in `GameState.lastResult`
- Async side effects (iTunes API fetches) happen in event handlers; results are dispatched into the reducer
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

- Functional React components only, no class components
- Space for indentation
- No test framework currently configured
- Linting via oxlint (`.oxlintrc.json`), formatting via oxfmt (`.oxfmtrc.json`)
- No CSS framework — plain CSS in `assets/style.css`
- Build output is a single `index.js` bundle + copied assets
- The dev server builds `src/index.tsx` on each request (no pre-bundling)
