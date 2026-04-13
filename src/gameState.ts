import type {
  Song,
  DetailedSong,
  GameState,
  GameAction,
  ITunesResponse,
  ITunesTrack,
} from "./types";

const STORAGE_KEY = "thatWasTheYear_gameState";

export const initialGameState: GameState = {
  players: [],
  currentPlayerIndex: 0,
  roundCount: 1,
  currentSong: null,
  deck: [],
  allSongs: [],
  endCondition: { type: "infinite", value: 10 },
  gameStarted: false,
  gameOver: false,
  lastResult: null,
};

function fisherYatesShuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function shuffleDeck(deck: Song[], players: number): Song[] {
  const sorted = [...deck].sort((a, b) => a.y - b.y);
  const piles: Song[][] = Array.from({ length: players }, () => []);
  for (let i = 0; i < sorted.length; i++) {
    piles[i % players].push(sorted[i]);
  }
  piles.forEach(fisherYatesShuffle);
  const result: Song[] = [];
  const minLen = piles.at(-1).length;
  for (let i = 0; i < minLen; i++) {
    for (const pile of piles) {
      result.push(pile.pop()!);
    }
  }
  return result;
}

export async function getDetailedITunesSong(song: Song): Promise<ITunesTrack | undefined> {
  let data: ITunesResponse | undefined = undefined;
  if (typeof song.itunesId === "number") {
    try {
      const resp = await fetch(`https://itunes.apple.com/lookup?id=${song.itunesId}`);
      if (resp.status === 200) {
        data = (await resp.json()) as ITunesResponse;
        if (!data?.results?.[0]) {
          data = undefined;
        }
      }
    } catch (e) {
      console.error(`Error fetching song "${song.t} - ${song.a}" by itunesId`, e);
    }
  }
  if (!data) {
    const resp = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(song.a + " " + song.t)}&limit=1&entity=song`,
    );
    if (resp.status !== 200) {
      throw new Error("iTunes API error: status = " + resp.status);
    }
    data = (await resp.json()) as ITunesResponse;
  }
  return data?.results?.[0];
}

export async function getDetailedSong(song: Song): Promise<DetailedSong> {
  const res = await getDetailedITunesSong(song);
  let releaseYear = undefined;
  if (res) {
    try {
      const parsedYear = parseInt(res.releaseDate?.slice(0, 4), 10);
      if (Math.abs(parsedYear - song.y) === 1) {
        releaseYear = parsedYear;
      }
    } catch {}
  }
  return {
    ...song,
    img: res?.artworkUrl100 || "./placeholder-100.png",
    preview: res?.previewUrl || null,
    link: res?.trackViewUrl || "#",
    releaseYear: releaseYear,
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "INIT_DECK": {
      return { ...state, deck: [], allSongs: action.songs };
    }

    case "SET_END_CONDITION":
      return { ...state, endCondition: action.endCondition };

    case "START_GAME":
      return {
        ...state,
        deck: shuffleDeck(state.allSongs, action.players.length),
        players: action.players,
        currentPlayerIndex: 0,
        roundCount: 1,
        gameStarted: true,
      };

    case "DRAW_SONG":
      return {
        ...state,
        currentSong: action.song,
        deck: state.deck.slice(0, -1),
      };

    case "UPDATE_CURRENT_SONG":
      return { ...state, currentSong: action.song };

    case "PLACE_SONG": {
      const player = state.players[state.currentPlayerIndex];
      const timeline = player.timeline;
      const song = { ...state.currentSong! };
      const pos = action.position;

      const fitsAt = (year: number) =>
        (pos === 0 || year >= timeline[pos - 1].y) &&
        (pos === timeline.length || year <= timeline[pos].y);

      const isCorrect = fitsAt(song.y) || (!!song.releaseYear && fitsAt(song.releaseYear));
      if (isCorrect && !fitsAt(song.y) && song.releaseYear) {
        console.debug(`Using release year ${song.releaseYear} instead of ${song.y}`);
        song.y = song.releaseYear;
      }

      const newPlayers = state.players.map((p, i) => {
        if (i !== state.currentPlayerIndex) return p;
        if (!isCorrect) return p;
        const newTimeline = [...p.timeline];
        newTimeline.splice(pos, 0, song);
        return { ...p, timeline: newTimeline };
      });

      const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
      const nextRound = nextIndex === 0 ? state.roundCount + 1 : state.roundCount;
      const isRoundEnd = nextIndex === 0;

      let gameOver = false;
      if (isRoundEnd) {
        const { type, value } = state.endCondition;
        if (type === "turns") {
          gameOver = state.roundCount >= value;
        } else if (type === "correctSongs") {
          // timeline starts with 1 song, so correct placements = timeline.length - 1
          gameOver = newPlayers.some((p) => p.timeline.length - 1 >= value);
        }
        if (!gameOver) {
          // Check if songs in deck are enough
          gameOver = state.deck.length < state.players.length;
        }
      }

      return {
        ...state,
        players: newPlayers,
        currentSong: null,
        currentPlayerIndex: nextIndex,
        roundCount: nextRound,
        gameOver,
        lastResult: { correct: isCorrect, song },
      };
    }

    case "CLEAR_RESULT":
      return { ...state, lastResult: null };

    case "RESTORE":
      if (!isValidGameState(action.state)) {
        throw new Error("Invalid game state received in RESTORE action");
      }
      return { ...action.state, lastResult: null };

    case "RESET":
      localStorage.removeItem(STORAGE_KEY);
      return {
        ...initialGameState,
        players: state.players,
        endCondition: state.endCondition,
        deck: [],
        allSongs: state.allSongs,
        lastResult: null,
      };

    default:
      return state;
  }
}

export function saveGameState(state: GameState): void {
  const { allSongs: _, lastResult: __, ...rest } = state;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
}

function isValidSong(s: unknown): s is Song {
  return (
    typeof s === "object" &&
    s !== null &&
    typeof (s as Song).t === "string" &&
    typeof (s as Song).a === "string" &&
    typeof (s as Song).y === "number" &&
    ((s as Song).itunesId === undefined || typeof (s as Song).itunesId === "number")
  );
}

function isValidDetailedSong(s: unknown): s is DetailedSong {
  return (
    isValidSong(s) &&
    typeof (s as DetailedSong).img === "string" &&
    (typeof (s as DetailedSong).preview === "string" || (s as DetailedSong).preview === null) &&
    typeof (s as DetailedSong).link === "string"
  );
}

function isValidGameState(obj: unknown): obj is GameState {
  if (typeof obj !== "object" || obj === null) return false;
  const s = obj as GameState;
  return (
    Array.isArray(s.players) &&
    s.players.every(
      (p) =>
        typeof p.name === "string" &&
        Array.isArray(p.timeline) &&
        p.timeline.every(isValidDetailedSong),
    ) &&
    typeof s.currentPlayerIndex === "number" &&
    typeof s.roundCount === "number" &&
    (s.currentSong === null || isValidDetailedSong(s.currentSong)) &&
    Array.isArray(s.deck) &&
    s.deck.every(isValidSong) &&
    typeof s.endCondition === "object" &&
    s.endCondition !== null &&
    ["infinite", "turns", "correctSongs"].includes(s.endCondition.type) &&
    typeof s.endCondition.value === "number" &&
    typeof s.gameStarted === "boolean" &&
    typeof s.gameOver === "boolean"
  );
}

export function getStartingYear(songs: Song[]): number {
  const avg = songs.reduce((sum, s) => sum + s.y, 0) / songs.length;
  const offset = Math.floor(Math.random() * 7) - 3; // -3 to +3
  return Math.round(avg) + offset;
}

export function loadGameState(): GameState | null {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return null;
  }
  try {
    const parsed = JSON.parse(saved);
    return isValidGameState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
