import type { Player } from "../types";
import PlayerLane from "./PlayerLane";

interface PlayersContainerProps {
	players: Player[];
	currentPlayerIndex: number;
	hasCurrentSong: boolean;
	onPlaceSong: (position: number) => void;
	focusedDropZone?: number;
}

export default function PlayersContainer({
	players,
	currentPlayerIndex,
	hasCurrentSong,
	onPlaceSong,
	focusedDropZone = 0,
}: PlayersContainerProps) {
	return (
		<div id="players-container">
			{players.map((player, i) => (
				<PlayerLane
					key={player.name}
					player={player}
					isActive={i === currentPlayerIndex}
					hasCurrentSong={hasCurrentSong}
					onPlaceSong={onPlaceSong}
					focusedDropZone={focusedDropZone}
				/>
			))}
		</div>
	);
}
