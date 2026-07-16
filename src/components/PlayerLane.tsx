import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import type { EndCondition, Player } from "../types.ts";
import SongCard from "./SongCard.tsx";

interface PlayerLaneProps {
  player: Player;
  isActive: boolean;
  hasCurrentSong: boolean;
  endCondition: EndCondition;
  onPlaceSong: (position: number) => void;
  focusedDropZone: number | null;
}

function useIsMobile(breakpoint = 600) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" && globalThis.innerWidth <= breakpoint,
  );
  useEffect(() => {
    const mq = globalThis.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
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
  const carouselRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Track which drop zone is currently centered in the carousel
  const [selectedDropZone, setSelectedDropZone] = useState<number | null>(null);

  // Reset selection when a new song is drawn
  useEffect(() => {
    setSelectedDropZone(null);
  }, [hasCurrentSong]);

  // Scroll the active player's lane into view, accounting for the sticky #controls header.
  // We measure controls height dynamically so the offset stays correct at any viewport size.
  useEffect(() => {
    if (isActive && laneRef.current) {
      const controls = document.querySelector("#controls");
      const offset = controls ? controls.getBoundingClientRect().bottom : 0;
      const laneTop = laneRef.current.getBoundingClientRect().top + globalThis.scrollY;
      globalThis.scrollTo({ top: laneTop - offset, behavior: "smooth" });
    }
  }, [isActive]);

  useEffect(() => {
    if (dropZonesActive && focusedDropZone !== null && dropZoneRefs.current[focusedDropZone]) {
      dropZoneRefs.current[focusedDropZone]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [focusedDropZone, dropZonesActive]);

  // On mobile, detect which drop zone is closest to center after scrolling stops
  const handleScroll = useCallback(() => {
    if (!isMobile || !carouselRef.current || !dropZonesActive) return;
    const container = carouselRef.current;
    const centerX = container.scrollLeft + container.clientWidth / 2;

    let closestIdx: number | null = null;
    let closestDist = Number.POSITIVE_INFINITY;

    for (let i = 0; i < dropZoneRefs.current.length; i++) {
      const el = dropZoneRefs.current[i];
      if (!el) continue;
      const elCenter = el.offsetLeft + el.offsetWidth / 2;
      const dist = Math.abs(elCenter - centerX);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    }
    setSelectedDropZone(closestIdx);
  }, [isMobile, dropZonesActive]);

  // Scroll carousel to center the focused drop zone on mobile (keyboard nav)
  useEffect(() => {
    if (!isMobile || !carouselRef.current || focusedDropZone === null) return;
    const el = dropZoneRefs.current[focusedDropZone];
    if (!el) return;
    const container = carouselRef.current;
    const scrollTarget = el.offsetLeft - container.clientWidth / 2 + el.offsetWidth / 2;
    container.scrollTo({ left: scrollTarget, behavior: "smooth" });
  }, [focusedDropZone, isMobile]);

  const handleConfirmPlacement = () => {
    if (selectedDropZone !== null) {
      onPlaceSong(selectedDropZone);
    }
  };

  // Mobile carousel layout
  if (isMobile) {
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
        <div className="timeline-carousel-wrapper">
          <div className="timeline-carousel" ref={carouselRef} onScroll={handleScroll}>
            <div className="carousel-spacer" />
            <button
              ref={(el) => {
                dropZoneRefs.current[0] = el;
              }}
              type="button"
              className={`drop-zone-mobile${
                dropZonesActive && selectedDropZone === 0 ? " selected" : ""
              }${dropZonesActive ? "" : " disabled"}`}
              onClick={() => dropZonesActive && setSelectedDropZone(0)}
              disabled={!dropZonesActive}
              aria-label="Place before first song"
            >
              <span className="drop-zone-mobile-label">▼</span>
              <span className="drop-zone-mobile-hint">Place here</span>
            </button>
            {player.timeline.map((song, i) => {
              const sameYear =
                i + 1 < player.timeline.length && song.y === player.timeline[i + 1].y;
              return (
                <Fragment key={`${song.t}-${song.y}`}>
                  <div className="carousel-card">
                    <SongCard song={song} mystery={false} />
                  </div>
                  <button
                    type="button"
                    ref={(el) => {
                      dropZoneRefs.current[i + 1] = el;
                    }}
                    className={`drop-zone-mobile${sameYear ? " same-year" : ""}${
                      dropZonesActive && selectedDropZone === i + 1 ? " selected" : ""
                    }${dropZonesActive ? "" : " disabled"}`}
                    onClick={() => dropZonesActive && setSelectedDropZone(i + 1)}
                    disabled={!dropZonesActive}
                    aria-label={`Place after song ${i + 1}`}
                  >
                    <span className="drop-zone-mobile-label">{sameYear ? "=" : "▼"}</span>
                    <span className="drop-zone-mobile-hint">Place here</span>
                  </button>
                </Fragment>
              );
            })}
            <div className="carousel-spacer" />
          </div>
        </div>
        {dropZonesActive && selectedDropZone !== null && (
          <button className="confirm-placement-btn" onClick={handleConfirmPlacement} type="button">
            Confirm placement
          </button>
        )}
      </div>
    );
  }

  // Desktop layout
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
          type="button"
          ref={(el) => {
            dropZoneRefs.current[0] = el;
          }}
          className={`drop-zone waiting-for-input${
            dropZonesActive && focusedDropZone === 0 ? " focused" : ""
          }`}
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
                type="button"
                ref={(el) => {
                  dropZoneRefs.current[i + 1] = el;
                }}
                className={`drop-zone waiting-for-input${sameYear ? " same-year" : ""}${
                  dropZonesActive && focusedDropZone === i + 1 ? " focused" : ""
                }`}
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
