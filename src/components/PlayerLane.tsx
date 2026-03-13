import { useEffect, useRef, Fragment } from "react";
import type { Player } from "../types";
import SongCard from "./SongCard";

interface PlayerLaneProps {
	player: Player;
	isActive: boolean;
	hasCurrentSong: boolean;
	onPlaceSong: (position: number) => void;
	focusedDropZone?: number;
}

export default function PlayerLane({
	player,
	isActive,
	hasCurrentSong,
	onPlaceSong,
	focusedDropZone = 0,
}: PlayerLaneProps) {
	const showDropZones = isActive && hasCurrentSong;
	const dropZoneRefs = useRef<(HTMLButtonElement | null)[]>([]);

	useEffect(() => {
		if (showDropZones && dropZoneRefs.current[focusedDropZone]) {
			dropZoneRefs.current[focusedDropZone]?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
		}
	}, [focusedDropZone, showDropZones]);

	return (
		<div className={`player-area${isActive ? " active-player-border" : ""}`}>
			<h3>{player.name} ({player.timeline.length} Cards)</h3>
			<div className="timeline">
				{showDropZones && (
					<button
						ref={el => dropZoneRefs.current[0] = el}
						className={`drop-zone waiting-for-input${focusedDropZone === 0 ? " focused" : ""}`}
						onClick={() => onPlaceSong(0)}
						tabIndex={0}
					>
						▼
					</button>
				)}
				{player.timeline.map((song, i) => (
					<Fragment key={`${song.t}-${song.y}`}>
						<SongCard song={song} />
						{showDropZones && (
							<button
								ref={el => dropZoneRefs.current[i + 1] = el}
								className={`drop-zone waiting-for-input${focusedDropZone === i + 1 ? " focused" : ""}`}
								onClick={() => onPlaceSong(i + 1)}
								tabIndex={0}
							>
								▼
							</button>
						)}
					</Fragment>
				))}
			</div>
		</div>
	);
}
