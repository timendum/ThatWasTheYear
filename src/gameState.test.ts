/* oxlint-disable eslint/max-lines */
import { beforeAll, describe, expect, test } from "bun:test";
import {
  gameReducer,
  initialGameState,
  shuffleDeck,
  saveGameState,
  loadGameState,
} from "./gameState";
import type { DetailedSong, GameState, Player, Song } from "./types";

beforeAll(() => {
  // Stub localStorage for RESET action
  if (globalThis.localStorage === undefined) {
    const store: Record<string, string> = {};
    globalThis.localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        for (const k in store) delete store[k];
      },
      get length() {
        return Object.keys(store).length;
      },
      key: (i: number) => Object.keys(store)[i] ?? null,
    };
  }
});

function makeSong(year: number, title = `Song ${year}`): Song {
  return { t: title, a: `Artist ${year}`, y: year };
}

function makeDetailedSong(year: number, title = `Song ${year}`): DetailedSong {
  return { t: title, a: `Artist ${year}`, y: year, img: "img.png", preview: null, link: "#" };
}

function makePlayer(name: string, timelineYears: number[] = []): Player {
  return { name, timeline: timelineYears.map((y) => makeDetailedSong(y)) };
}

function startWith(overrides: Partial<GameState>): GameState {
  return { ...initialGameState, ...overrides };
}

function makeStandardGame(): GameState {
  const deck = [makeSong(1985), makeSong(1995), makeSong(2005), makeSong(2015)];

  const players = [makePlayer("Marco", [1990, 2000]), makePlayer("Mirco", [1990, 2000])];
  const allSongs = [...deck, ...players[0].timeline, ...players[1].timeline];
  const currentSong = makeDetailedSong(1996);
  const state = startWith({
    allSongs,
    players,
    currentPlayerIndex: 0,
    currentSong: currentSong,
    deck,
    roundCount: 1,
    endCondition: { type: "infinite", value: 10 },
  });
  return state;
}

function checkRestore(gs: GameState) {
  const before = gs;
  saveGameState(gs);
  const state = loadGameState();
  expect(state).not.toEqual(undefined);
  if (state) {
    const after = gameReducer(initialGameState, { type: "RESTORE", state: state });
    const { allSongs: _a, lastResult: _b, ...expectedFields } = before;
    const { allSongs: _c, lastResult: _d, ...actualFields } = after;

    expect(actualFields).toEqual(expectedFields);
  }
}

describe("gameReducer", () => {
  describe("INIT_DECK", () => {
    test("sets allSongs and clears deck", () => {
      const songs = [makeSong(2000), makeSong(2001)];

      const result = gameReducer(initialGameState, { type: "INIT_DECK", songs });

      expect(result.allSongs).toEqual(songs);
      expect(result.deck).toEqual([]);

      checkRestore(result);
    });
  });

  describe("SET_END_CONDITION", () => {
    test("updates end condition", () => {
      const endCondition = { type: "turns" as const, value: 5 };

      const result = gameReducer(initialGameState, { type: "SET_END_CONDITION", endCondition });

      expect(result.endCondition).toEqual(endCondition);

      checkRestore(result);
    });
  });

  describe("START_GAME", () => {
    test("sets players, shuffles deck, and starts game", () => {
      const sbase = makeStandardGame();
      const state = startWith({ allSongs: sbase.allSongs });

      const result = gameReducer(state, { type: "START_GAME", players: sbase.players });

      expect(result.gameStarted).toBe(true);
      expect(result.players).toEqual(sbase.players);
      expect(result.currentPlayerIndex).toBe(0);
      expect(result.roundCount).toBe(1);
      expect(result.deck.length).toBeGreaterThan(0);

      checkRestore(result);
    });
  });

  describe("DRAW_SONG", () => {
    test("sets currentSong and removes last card from deck", () => {
      const sbase = makeStandardGame();
      const state = startWith({ ...sbase });
      const drawn = makeDetailedSong(2002);

      const result = gameReducer(state, { type: "DRAW_SONG", song: drawn });

      expect(result.currentSong).toEqual(drawn);
      expect(result.deck.length).toEqual(sbase.deck.length - 1);

      checkRestore(result);
    });
  });

  describe("UPDATE_CURRENT_SONG", () => {
    test("replaces current song", () => {
      const sbase = makeStandardGame();
      const updated = makeDetailedSong(2002);

      const result = gameReducer(sbase, { type: "UPDATE_CURRENT_SONG", song: updated });

      expect(result.currentSong).toEqual(updated);

      checkRestore(result);
    });
  });

  describe("PLACE_SONG", () => {
    test("correct placement inserts song into timeline", () => {
      const year = 1997;
      const state = startWith({
        ...makeStandardGame(),
        currentSong: makeDetailedSong(year),
      });

      // Place 1997 between 1990 and 2000 — correct
      const result = gameReducer(state, { type: "PLACE_SONG", position: 1 });

      expect(result.lastResult?.correct).toBe(true);
      expect(result.players[0].timeline).toHaveLength(3);
      expect(result.players[0].timeline[1].y).toBe(year);
      expect(result.currentSong).toBeNull();

      checkRestore(result);
    });

    test("incorrect placement does not modify timeline", () => {
      const state = startWith({
        ...makeStandardGame(),
        currentSong: makeDetailedSong(1983),
      });

      // Place 1983 between 1990 and 2010 — wrong
      const result = gameReducer(state, { type: "PLACE_SONG", position: 1 });

      expect(result.lastResult?.correct).toBe(false);
      expect(result.players[0].timeline).toHaveLength(2);

      checkRestore(result);
    });

    test("advances to next player", () => {
      const state = startWith({
        ...makeStandardGame(),
      });

      const result = gameReducer(state, { type: "PLACE_SONG", position: 1 });

      expect(result.currentPlayerIndex).toBe(1);

      checkRestore(result);
    });

    test("wraps around to first player and increments round", () => {
      const state = startWith({
        ...makeStandardGame(),
        currentPlayerIndex: 1,
      });

      const result = gameReducer(state, { type: "PLACE_SONG", position: 1 });

      expect(result.currentPlayerIndex).toBe(0);
      expect(result.roundCount).toBe(2);

      checkRestore(result);
    });

    test("game over when turns limit reached", () => {
      const sbase = makeStandardGame();
      const state = startWith({
        ...sbase,
        currentPlayerIndex: sbase.players.length - 1,
        roundCount: 3,
        endCondition: { type: "turns", value: 3 },
      });

      const result = gameReducer(state, { type: "PLACE_SONG", position: 1 });

      expect(result.lastResult?.correct).toBe(true);
      expect(result.gameOver).toBe(true);

      checkRestore(result);
    });

    test("game over when correctSongs limit reached", () => {
      // Player has 3 songs in timeline (2 correct placements), triggering the limit
      const sbase = makeStandardGame();
      const state = startWith({
        ...sbase,
        roundCount: 1,
        currentPlayerIndex: sbase.players.length - 1,
        endCondition: { type: "correctSongs", value: 2 },
      });

      const result = gameReducer(state, { type: "PLACE_SONG", position: 1 });

      expect(result.lastResult?.correct).toBe(true);
      expect(result.gameOver).toBe(true);

      checkRestore(result);
    });

    test("game over when deck runs out", () => {
      const sbase = makeStandardGame();
      const state = startWith({
        ...sbase,
        roundCount: 1,
        currentPlayerIndex: sbase.players.length - 1,
        endCondition: { type: "infinite", value: 10 },
        deck: [makeSong(1980)], // only 1 card left, need 2 for next round
      });

      const result = gameReducer(state, { type: "PLACE_SONG", position: 1 });

      expect(result.lastResult?.correct).toBe(true);
      expect(result.gameOver).toBe(true);

      checkRestore(result);
    });

    test("uses releaseYear when it fits but original year does not", () => {
      const sbase = makeStandardGame();
      const song = makeDetailedSong(2002); // y=2002 doesn't fit between 1990 and 2000
      song.releaseYear = 1995; // but releaseYear does
      const state = startWith({
        ...sbase,

        currentSong: song,
      });

      const result = gameReducer(state, { type: "PLACE_SONG", position: 1 });

      expect(result.lastResult?.correct).toBe(true);
      expect(result.players[0].timeline[1].y).toBe(1995);

      checkRestore(result);
    });
  });

  describe("CLEAR_RESULT", () => {
    test("clears lastResult", () => {
      const state = startWith({
        lastResult: { correct: true, song: makeDetailedSong(2000) },
      });

      const result = gameReducer(state, { type: "CLEAR_RESULT" });

      expect(result.lastResult).toBeNull();

      checkRestore(result);
    });
  });

  describe("RESTORE", () => {
    test("restores a valid game state", () => {
      const saved: GameState = {
        ...initialGameState,
        players: [makePlayer("Alice", [2000])],
        gameStarted: true,
        roundCount: 3,
      };

      const result = gameReducer(initialGameState, { type: "RESTORE", state: saved });

      expect(result.players[0].name).toBe("Alice");
      expect(result.roundCount).toBe(3);
      expect(result.lastResult).toBeNull();

      checkRestore(result);
    });

    test("throws on invalid state", () => {
      const bad = { garbage: true } as unknown as GameState;
      expect(() => gameReducer(initialGameState, { type: "RESTORE", state: bad })).toThrow();
    });
  });

  describe("RESET", () => {
    test("resets game but keeps players, endCondition, and allSongs", () => {
      const songs = [makeSong(2000)];
      const state = startWith({
        players: [makePlayer("Alice", [2000])],
        allSongs: songs,
        endCondition: { type: "turns", value: 5 },
        gameStarted: true,
        roundCount: 5,
      });

      const result = gameReducer(state, { type: "RESET" });

      expect(result.gameStarted).toBe(false);
      expect(result.gameOver).toBe(false);
      expect(result.roundCount).toBe(1);
      expect(result.players).toEqual(state.players);
      expect(result.endCondition).toEqual(state.endCondition);
      expect(result.allSongs).toEqual(songs);
      expect(result.lastResult).toBeNull();

      checkRestore(result);
    });
  });

  describe("unknown action", () => {
    test("returns state unchanged", () => {
      const state = startWith({ roundCount: 42 });
      // @ts-expect-error testing unknown action
      const result = gameReducer(state, { type: "UNKNOWN" });
      expect(result).toEqual(state);
    });
  });
});

describe("shuffleDeck", () => {
  test("returns songs distributed across players", () => {
    const songs = Array.from({ length: 10 }, (_, i) => makeSong(2000 + i));
    expect(songs.length).toBe(10);
    const result = shuffleDeck(songs, 2);
    expect(result.length).toBe(10);
  });
});
