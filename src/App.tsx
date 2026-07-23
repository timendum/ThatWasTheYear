import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  gameReducer,
  getStartingYear,
  initialGameState,
  loadGameState,
  saveGameState,
} from "./gameState.ts";
import { getDetailedSong, loadSongPacks } from "./songService.ts";
import SetupScreen from "./components/SetupScreen.tsx";
import Controls from "./components/Controls.tsx";
import PlayersContainer from "./components/PlayersContainer.tsx";
import ResultModal from "./components/ResultModal.tsx";
import GameOverScreen from "./components/GameOverScreen.tsx";
import type { DetailedSong, Song, SongPack } from "./types.ts";

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const audioRef = useRef(new Audio());
  const audioTimeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const skipRef = useRef(0);

  useEffect(() => {
    const audio = audioRef.current;
    function onLoadedMetadata() {
      if (skipRef.current > 0) {
        audio.currentTime = skipRef.current;
      }
      audio.play().catch((e) => console.error("Failed to play preview", e));
    }
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    return () => audio.removeEventListener("loadedmetadata", onLoadedMetadata);
  }, []);

  useEffect(() => {
    const saved = loadGameState();
    if (saved) {
      loadSongPacks(saved.songPacks)
        .then((songs) => {
          dispatch({ type: "RESTORE", state: { ...saved, allSongs: songs } });
        })
        .catch((e) => console.error("Failed to load songs", e));
    }
  }, []);

  useEffect(() => {
    if (state.gameStarted) {
      saveGameState(state);
    }
  }, [state]);

  async function handleStartGame(
    playerNames: string[],
    endCondition: {
      type: "infinite" | "turns" | "correctSongs";
      value: number;
    },
    songPacks: SongPack[],
  ) {
    dispatch({ type: "SET_END_CONDITION", endCondition });
    dispatch({ type: "SET_SONG_PACKS", songPacks });

    let allSongs: Song[];
    try {
      allSongs = await loadSongPacks(songPacks);
      dispatch({ type: "INIT_DECK", songs: allSongs });
    } catch (e) {
      console.error("Failed to load song packs", e);
      return;
    }

    const startingSong: DetailedSong = {
      t: "\u00A0",
      a: "\u00A0",
      y: getStartingYear(allSongs),
      img: "./placeholder-100.png",
      preview: null,
      link: "#",
    };
    const players = playerNames.map((name) => ({
      name,
      timeline: [startingSong],
      missedSongs: [] as DetailedSong[],
    }));
    dispatch({ type: "START_GAME", players });
  }

  async function handleDrawSong() {
    if (state.deck.length === 0) return;
    const rawSong = state.deck.at(-1);
    if (!rawSong) {
      console.error("Deck is empty in handleDrawSong");
      return;
    }
    try {
      const song = await getDetailedSong(rawSong);
      dispatch({ type: "DRAW_SONG", song });
      if (song.preview) playPreview(song.preview, song);
    } catch (e) {
      console.error("Failed to fetch song", e);
    }
  }

  function stopAudio() {
    audioRef.current.pause();
    if (audioTimeoutRef.current) {
      clearTimeout(audioTimeoutRef.current);
    }
  }

  function playPreview(url?: string, song?: DetailedSong) {
    const target = song ?? state.currentSong;
    const src = url ?? target?.preview;
    if (!src) {
      return;
    }
    stopAudio();
    const audio = audioRef.current;
    skipRef.current = target?.skip ?? 0;
    audio.src = src;
    audio.load();
    audioTimeoutRef.current = globalThis.setTimeout(() => audio.pause(), 10000);
  }

  const handlePlaceSong = useCallback(
    (position: number) => {
      if (!state.currentSong) return;
      dispatch({ type: "PLACE_SONG", position });
    },
    [state.currentSong],
  );

  function handleContinue() {
    stopAudio();
    dispatch({ type: "CLEAR_RESULT" });
  }

  function handleReset(skipConfirm = false) {
    if (skipConfirm || confirm("Start over?")) {
      stopAudio();
      dispatch({ type: "RESET" });
    }
  }

  if (!state.gameStarted) {
    return (
      <SetupScreen
        onStartGame={handleStartGame}
        initialPlayers={state.players.map((p) => p.name)}
        initialEndCondition={state.endCondition}
        initialSongPacks={state.songPacks}
      />
    );
  }

  const currentPlayer = state.players[state.currentPlayerIndex];

  if (state.gameOver && !state.lastResult) {
    globalThis.scrollTo(0, 0);
    return <GameOverScreen players={state.players} onReset={() => handleReset(true)} />;
  }

  return (
    <>
      <div id="game" className="screen">
        <Controls
          currentPlayer={currentPlayer.name}
          players={state.players}
          currentPlayerIndex={state.currentPlayerIndex}
          roundCount={state.roundCount}
          currentSong={state.currentSong}
          endCondition={state.endCondition}
          onDrawSong={handleDrawSong}
          onReplay={playPreview}
          onReset={handleReset}
          showReplay={!!state.currentSong?.preview}
        />
        <PlayersContainer
          players={state.players}
          currentPlayerIndex={state.currentPlayerIndex}
          hasCurrentSong={state.currentSong !== null}
          endCondition={state.endCondition}
          disabled={state.lastResult !== null}
          onPlaceSong={handlePlaceSong}
        />
      </div>
      {state.lastResult && (
        <ResultModal
          isCorrect={state.lastResult.correct}
          song={state.lastResult.song}
          onContinue={handleContinue}
        />
      )}
    </>
  );
}
