import type { DetailedSong } from "../types";
import SongCard from "./SongCard";

interface ControlsProps {
	currentPlayer: string;
	roundCount: number;
	currentSong: DetailedSong | null;
	onDrawSong: () => void;
	onReplay: () => void;
	onReset: () => void;
	showReplay: boolean;
}

export default function Controls({
	currentPlayer,
	roundCount,
	currentSong,
	onDrawSong,
	onReplay,
	onReset,
	showReplay,
}: ControlsProps) {
	return (
		<div id="controls">
			<div className="controls-header">
				<h2 id="turn-indicator">{currentPlayer}'s Turn</h2>
				<div id="round-display">Round {roundCount}</div>
				<button id="reset-btn" onClick={onReset} title="Start over" type="reset" tabIndex={0}>
					↻
				</button>
			</div>
			<div id="audio-status">
				{currentSong && (currentSong.preview ? "Listen and click the right position on the timeline!" : "No audio found! Guess by cover.")}
			</div>
			<div id="action-bar">
				{!currentSong && (
					<button id="draw-btn" onClick={onDrawSong} tabIndex={0}>
						Play Random Song
					</button>
				)}
				{showReplay && (
					<button id="replay-btn" onClick={onReplay} tabIndex={0}>
						Replay ♫
					</button>
				)}
			</div>
			<div id="current-drag-item">
				{currentSong && <SongCard song={currentSong} mystery />}
			</div>
		</div>
	);
}
