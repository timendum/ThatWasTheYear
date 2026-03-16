import { useEffect, useRef, Fragment } from "react";
import type { Player } from "../types";
import SongCard from "./SongCard";

interface PlayerLaneProps {
  player: Player;
  isActive: boolean;
  hasCurrentSong: boolean;
  onPlaceSong: (position: number) => void;
  focusedDropZone: number | null;
}

export default function PlayerLane({
  player,
  isActive,
  hasCurrentSong,
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
        {player.name} ({player.timeline.length} Cards)
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
        {player.timeline.map((song, i) => (
          <Fragment key={`${song.t}-${song.y}`}>
            <SongCard song={song} mystery={false} />
            <button
              ref={(el) => {
                dropZoneRefs.current[i + 1] = el;
              }}
              className={`drop-zone waiting-for-input${dropZonesActive && focusedDropZone === i + 1 ? " focused" : ""}`}
              onClick={() => onPlaceSong(i + 1)}
              tabIndex={0}
              disabled={!dropZonesActive}
            >
              ▼
            </button>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
