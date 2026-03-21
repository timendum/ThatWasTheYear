# ThatWasTheYear

ThatWasTheYear (hosted at <https://ellorans.github.io/ThatWasTheYear/>) is a browser-based multiplayer game where players take turns drawing mystery song cards and placing them into their personal timelines in chronological order.

Each round, a song is drawn from a deck (sourced from a local songLibrary).

The player hears a 10-second preview and must drop the mystery card into the correct chronological position on their timeline.

## How to play

Start the game and enter at least two player names (additional players can be added).  
Each player begins with one random song in their timeline.  
On your turn, click "Play Random Song" to draw a mystery song.  
A 10-second preview will play, you may replay it by clicking the "Replay ♫" button.  
Select the slot at the position into the timeline you believe is correct chronologically.  
If your guess is correct, the card is inserted at that position.  
If incorrect, your guess fails and the turn passes to the next player.  
Play to see who scores the most points!

### Usage Requirements

Modern browser with:

- Support for ES6+ JavaScript
- Fetch API
- Audio playback

The iTunes Search API is used to fetch album artwork and audio previews (No API key required)

## Development

Thanks to [Timendum's improvements](https://github.com/timendum/ThatWasTheYear).

Now on TypeScript with Bun, no runtime dependencies.

## Setup

```bash
bun install
```

## Test

```bash
bun run serve
```

Visit <http://localhost:3000>

## Build

```bash
bun run build
```

Output in `dist/` directory.

## Project Structure

- `assets/index.html` - The only HTML page
- `assets/style.css` - CSS Styling
- `asset/songs.json` - Song library data
- `src/types.ts` - TypeScript interfaces
- `src/app.ts` - Main game logic
- `scripts/server.ts` - Utility development server
- `scripts/check-songs.ts` - Script to check songs data against iTunes data
- `scripts/copy-assets.ts` - Script for the build step
