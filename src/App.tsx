import { useState, useEffect, useRef } from "react";
import type { DetailedSong } from "./types";
import { GameState } from "./gameState";
import SetupScreen from "./components/SetupScreen";
import Controls from "./components/Controls";
import PlayersContainer from "./components/PlayersContainer";
import ResultModal from "./components/ResultModal";

export default function App() {
	const [loading, setLoading] = useState(true);
	const [gameState] = useState(() => new GameState());
	const [gameStarted, setGameStarted] = useState(false);
	const [currentSong, setCurrentSong] = useState<DetailedSong | null>(null);
	const [showReplay, setShowReplay] = useState(false);
	const [showResult, setShowResult] = useState(false);
	const [lastResult, setLastResult] = useState<{ isCorrect: boolean; song: DetailedSong } | null>(null);
	const [focusedDropZone, setFocusedDropZone] = useState(0);
	const [, forceUpdate] = useState({});
	const audioRef = useRef(new Audio());
	const audioTimeoutRef = useRef<number>(-1);

	useEffect(() => {
		loadSongs();
	}, []);

	async function loadSongs() {
		try {
			const resp = await fetch("./songs.json");
			const data = await resp.json();
			gameState.initializeDeck(data);
		} catch (e) {
			console.error("Failed to load songs", e);
		} finally {
			setLoading(false);
		}
	}

	async function handleStartGame(playerNames: string[], endCondition: { type: "infinite" | "turns" | "correctSongs"; value: number }) {
		gameState.endCondition = endCondition;
		await gameState.startGame(playerNames);
		setGameStarted(true);
		forceUpdate({});
	}

	async function handleDrawSong() {
		const song = await gameState.drawSong();
		if (song) {
			setCurrentSong(song);
			setShowReplay(!!song.preview);
			setFocusedDropZone(0);
			if (song.preview) {
				playPreview(song.preview);
			}
		}
	}

	function playPreview(url: string) {
		audioRef.current.pause();
		if (audioTimeoutRef.current) clearTimeout(audioTimeoutRef.current);
		audioRef.current.src = url;
		audioRef.current.play();
		audioTimeoutRef.current = window.setTimeout(() => audioRef.current.pause(), 10000);
	}

	function handleReplay() {
		if (currentSong?.preview) {
			playPreview(currentSong.preview);
		}
	}

	function handlePlaceSong(position: number) {
		if (!currentSong) return;
		const isCorrect = gameState.placeSong(position);
		if (isCorrect && currentSong.preview) {
			audioRef.current.currentTime = 0;
			audioRef.current.play();
		}
		setLastResult({ isCorrect, song: currentSong });
		setShowResult(true);
		setCurrentSong(null);
		setShowReplay(false);
	}

	function handleContinue() {
		audioRef.current.pause();
		if (audioTimeoutRef.current) clearTimeout(audioTimeoutRef.current);
		setShowResult(false);
		setLastResult(null);
		forceUpdate({});
	}

	function handleReset() {
		if (confirm("Start over?")) {
			audioRef.current.pause();
			if (audioTimeoutRef.current) clearTimeout(audioTimeoutRef.current);
			gameState.clear();
			setGameStarted(false);
			setCurrentSong(null);
			setShowReplay(false);
			setShowResult(false);
			setLastResult(null);
		}
	}

	useEffect(() => {
		if (!gameStarted || !currentSong) return;

		function handleKeyDown(e: KeyboardEvent) {
			if (showResult) return;
			const player = gameState.players[gameState.currentPlayerIndex];
			const maxIndex = player.timeline.length;

			if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
				e.preventDefault();
				setFocusedDropZone(prev => Math.max(0, prev - 1));
			} else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
				e.preventDefault();
				setFocusedDropZone(prev => Math.min(maxIndex, prev + 1));
			} else if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				handlePlaceSong(focusedDropZone);
			}
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [gameStarted, currentSong, showResult, focusedDropZone]);

	if (loading) {
		return <div>Loading songs...</div>;
	}

	if (!gameStarted) {
		return <SetupScreen onStartGame={handleStartGame} />;
	}

	const currentPlayer = gameState.players[gameState.currentPlayerIndex];

	return (
		<>
			<div id="game" className="screen active">
				<Controls
					currentPlayer={currentPlayer.name}
					roundCount={gameState.roundCount}
					currentSong={currentSong}
					onDrawSong={handleDrawSong}
					onReplay={handleReplay}
					onReset={handleReset}
					showReplay={showReplay}
				/>
				<PlayersContainer
					players={gameState.players}
					currentPlayerIndex={gameState.currentPlayerIndex}
					hasCurrentSong={currentSong !== null}
					onPlaceSong={handlePlaceSong}
					focusedDropZone={focusedDropZone}
				/>
			</div>
			{showResult && lastResult && (
				<ResultModal
					isCorrect={lastResult.isCorrect}
					song={lastResult.song}
					onContinue={handleContinue}
				/>
			)}
		</>
	);
}
