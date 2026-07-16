import type { DetailedSong, EndCondition, Player } from "../types.ts";
import SongCard from "./SongCard.tsx";

interface ControlsProps {
  currentPlayer: string;
  players: Player[];
  currentPlayerIndex: number;
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
  players,
  currentPlayerIndex,
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
      <div className="controls-body">
        <div className="controls-main">
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
                type="submit"
              >
                Play Random Song
              </button>
            )}
            {showReplay && (
              <button type="button" id="replay-btn" onClick={(_) => onReplay()} tabIndex={0}>
                Replay ♫
              </button>
            )}
          </div>
          <div id="current-drag-item">{currentSong && <SongCard song={currentSong} mystery />}</div>
        </div>
        <div className="controls-scores">
          {players.map((player, i) => (
            <div
              key={player.name}
              className={`player-pill${i === currentPlayerIndex ? " player-pill-active" : ""}`}
            >
              <span className="player-pill-name">{player.name}</span>
              <span className="player-pill-score">{player.timeline.length - 1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
