import { useReducer, useEffect, useRef, useState, useCallback } from "react";
import type { DetailedSong } from "./types";
import {
  initialGameState,
  gameReducer,
  getDetailedSong,
  getStartingYear,
  saveGameState,
  loadGameState,
} from "./gameState";
import SetupScreen from "./components/SetupScreen";
import Controls from "./components/Controls";
import PlayersContainer from "./components/PlayersContainer";
import ResultModal from "./components/ResultModal";
import GameOverScreen from "./components/GameOverScreen";

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const [result, setResult] = useState<{
    correct: boolean;
    song: DetailedSong;
  } | null>(null);
  const audioRef = useRef(new Audio());
  const audioTimeoutRef = useRef<number>(-1);

  useEffect(() => {
    fetch("./songs.json")
      .then((r) => r.json())
      .then((songs) => {
        const saved = loadGameState();
        if (saved) {
          dispatch({ type: "RESTORE", state: { ...saved, allSongs: songs } });
        } else {
          dispatch({ type: "INIT_DECK", songs });
        }
      })
      .catch((e) => console.error("Failed to load songs", e));
  }, []);

  useEffect(() => {
    if (state.gameStarted) {
      saveGameState(state);
    }
  }, [state]);

  function handleStartGame(
    playerNames: string[],
    endCondition: {
      type: "infinite" | "turns" | "correctSongs";
      value: number;
    },
  ) {
    dispatch({ type: "SET_END_CONDITION", endCondition });
    const startingSong: DetailedSong = {
      t: "\u00A0",
      a: "\u00A0",
      y: getStartingYear(state.allSongs),
      img: "./placeholder-100.png",
      preview: null,
      link: "#",
    };
    const players = playerNames.map((name) => ({
      name,
      timeline: [startingSong],
    }));
    dispatch({ type: "START_GAME", players });
  }

  async function handleDrawSong() {
    if (state.deck.length === 0) return;
    const rawSong = state.deck[state.deck.length - 1];
    try {
      const song = await getDetailedSong(rawSong);
      dispatch({ type: "DRAW_SONG", song });
      if (song.preview) playPreview(song.preview);
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

  function playPreview(url?: string) {
    const src = url ?? state.currentSong?.preview;
    if (!src) {
      return;
    }
    stopAudio();
    audioRef.current.src = src;
    audioRef.current.play().catch((e) => {
      console.error("Failed to play preview", e);
      if (state.currentSong) {
        dispatch({
          type: "DRAW_SONG",
          song: {
            ...state.currentSong,
            preview: null,
          },
        });
      }
    });
    audioTimeoutRef.current = window.setTimeout(() => audioRef.current.pause(), 10000);
  }

  const handlePlaceSong = useCallback(
    (position: number) => {
      if (!state.currentSong) {
        return;
      }
      const timeline = state.players[state.currentPlayerIndex]?.timeline;
      const song = state.currentSong;
      const fitsAt = (year: number) =>
        (position === 0 || year >= timeline[position - 1].y) &&
        (position === timeline.length || year <= timeline[position]?.y);

      let correct = fitsAt(song.y);
      if (!!song.releaseYear && fitsAt(song.releaseYear)) {
        console.debug(
          `Using alternate year for validation: ${song.releaseYear} instead of ${song.y}`,
        );
        song.y = song.releaseYear;
      }
      setResult({ correct, song });
      dispatch({ type: "PLACE_SONG", position });
    },
    [state.currentSong, state.players, state.currentPlayerIndex],
  );

  function handleContinue() {
    stopAudio();
    setResult(null);
  }

  function handleReset(skipConfirm = false) {
    if (skipConfirm || confirm("Start over?")) {
      stopAudio();
      dispatch({ type: "RESET" });
      setResult(null);
    }
  }

  if (!state.gameStarted) {
    return (
      <SetupScreen
        onStartGame={handleStartGame}
        initialPlayers={state.players.map((p) => p.name)}
        initialEndCondition={state.endCondition}
      />
    );
  }

  const currentPlayer = state.players[state.currentPlayerIndex];

  if (state.gameOver && !result) {
    window.scrollTo(0, 0);
    return <GameOverScreen players={state.players} onReset={() => handleReset(true)} />;
  }

  return (
    <>
      <div id="game" className="screen">
        <Controls
          currentPlayer={currentPlayer.name}
          roundCount={state.roundCount}
          currentSong={state.currentSong}
          onDrawSong={handleDrawSong}
          onReplay={playPreview}
          onReset={handleReset}
          showReplay={!!state.currentSong?.preview}
        />
        <PlayersContainer
          players={state.players}
          currentPlayerIndex={state.currentPlayerIndex}
          hasCurrentSong={state.currentSong !== null}
          disabled={result !== null}
          onPlaceSong={handlePlaceSong}
        />
      </div>
      {result && (
        <ResultModal isCorrect={result.correct} song={result.song} onContinue={handleContinue} />
      )}
    </>
  );
}
