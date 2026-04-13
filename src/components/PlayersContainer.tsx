import { useState, useEffect } from "react";
import type { Player, EndCondition } from "../types";
import PlayerLane from "./PlayerLane";

interface PlayersContainerProps {
  players: Player[];
  currentPlayerIndex: number;
  hasCurrentSong: boolean;
  endCondition: EndCondition;
  disabled: boolean;
  onPlaceSong: (position: number) => void;
}

export default function PlayersContainer({
  players,
  currentPlayerIndex,
  hasCurrentSong,
  endCondition,
  disabled,
  onPlaceSong,
}: PlayersContainerProps) {
  const [focusedDropZone, setFocusedDropZone] = useState<number | null>(null);

  useEffect(() => {
    setFocusedDropZone(null);
  }, [hasCurrentSong]);

  useEffect(() => {
    if (!hasCurrentSong || disabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      const maxIndex = players[currentPlayerIndex].timeline.length;

      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedDropZone((prev) => (prev === null ? 0 : Math.max(0, prev - 1)));
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedDropZone((prev) => (prev === null ? 0 : Math.min(maxIndex, prev + 1)));
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (focusedDropZone !== null) onPlaceSong(focusedDropZone);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasCurrentSong, disabled, focusedDropZone, players, currentPlayerIndex, onPlaceSong]);

  return (
    <div id="players-container">
      {players.map((player, i) => (
        <PlayerLane
          key={player.name}
          player={player}
          isActive={i === currentPlayerIndex}
          hasCurrentSong={hasCurrentSong}
          endCondition={endCondition}
          onPlaceSong={onPlaceSong}
          focusedDropZone={focusedDropZone}
        />
      ))}
    </div>
  );
}
