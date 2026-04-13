import { useEffect, useRef, Fragment } from "react";
import type { Player, EndCondition } from "../types";
import SongCard from "./SongCard";

interface PlayerLaneProps {
  player: Player;
  isActive: boolean;
  hasCurrentSong: boolean;
  endCondition: EndCondition;
  onPlaceSong: (position: number) => void;
  focusedDropZone: number | null;
}

export default function PlayerLane({
  player,
  isActive,
  hasCurrentSong,
  endCondition,
  onPlaceSong,
  focusedDropZone,
}: PlayerLaneProps) {
  const dropZonesActive = isActive && hasCurrentSong;
  const laneRef = useRef<HTMLDivElement>(null);
  const dropZoneRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (dropZonesActive && laneRef.current) {
      laneRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [dropZonesActive]);

  useEffect(() => {
    if (dropZonesActive && focusedDropZone !== null && dropZoneRefs.current[focusedDropZone]) {
      dropZoneRefs.current[focusedDropZone]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });
    }
  }, [focusedDropZone, dropZonesActive]);

  return (
    <div ref={laneRef} className={`player-area${isActive ? " active-player-border" : ""}`}>
      <h3>
        {player.name} ({player.timeline.length - 1} Songs)
        {endCondition.type === "correctSongs" && (
          <span className="win-progress">
            {" — "}
            {Math.max(0, endCondition.value - (player.timeline.length - 1))} to win
          </span>
        )}
      </h3>
      <div className="timeline">
        <button
          ref={(el) => {
            dropZoneRefs.current[0] = el;
          }}
          className={`drop-zone waiting-for-input${dropZonesActive && focusedDropZone === 0 ? " focused" : ""}`}
          onClick={() => onPlaceSong(0)}
          tabIndex={0}
          disabled={!dropZonesActive}
        >
          ▼
        </button>
        {player.timeline.map((song, i) => {
          const sameYear = i + 1 < player.timeline.length && song.y === player.timeline[i + 1].y;
          return (
            <Fragment key={`${song.t}-${song.y}`}>
              <SongCard song={song} mystery={false} />
              <button
                ref={(el) => {
                  dropZoneRefs.current[i + 1] = el;
                }}
                className={`drop-zone waiting-for-input${sameYear ? " same-year" : ""}${dropZonesActive && focusedDropZone === i + 1 ? " focused" : ""}`}
                onClick={() => onPlaceSong(i + 1)}
                tabIndex={0}
                disabled={!dropZonesActive}
              >
                {sameYear ? "=" : "▼"}
              </button>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
