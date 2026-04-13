import type { DetailedSong } from "../types";
import SongCard from "./SongCard";

import type { EndCondition } from "../types";

interface ControlsProps {
  currentPlayer: string;
  roundCount: number;
  currentSong: DetailedSong | null;
  endCondition: EndCondition;
  onDrawSong: () => void;
  onReplay: () => void;
  onReset: () => void;
  showReplay: boolean;
}

export default function Controls({
  currentPlayer,
  roundCount,
  currentSong,
  endCondition,
  onDrawSong,
  onReplay,
  onReset,
  showReplay,
}: ControlsProps) {
  const roundLabel =
    endCondition.type === "turns"
      ? `Round ${roundCount}/${endCondition.value}`
      : `Round ${roundCount}`;
  return (
    <div id="controls">
      <div className="controls-header">
        <h2 id="turn-indicator">{currentPlayer}&apos;s Turn</h2>
        <div id="round-display">{roundLabel}</div>
        <button
          id="reset-btn"
          onClick={(_) => onReset()}
          title="Start over"
          type="reset"
          tabIndex={0}
        >
          ↻
        </button>
      </div>
      <div id="audio-status">
        {currentSong
          ? currentSong.preview
            ? "Listen and click the right position on the timeline!"
            : "No audio found! Guess by cover."
          : "\u00A0"}
      </div>
      <div id="action-bar">
        {!currentSong && (
          <button
            id="draw-btn"
            ref={(el) => el?.focus()}
            onClick={(_) => onDrawSong()}
            tabIndex={0}
          >
            Play Random Song
          </button>
        )}
        {showReplay && (
          <button id="replay-btn" onClick={(_) => onReplay()} tabIndex={0}>
            Replay ♫
          </button>
        )}
      </div>
      <div id="current-drag-item">{currentSong && <SongCard song={currentSong} mystery />}</div>
    </div>
  );
}
