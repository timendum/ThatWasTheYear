import type { DetailedSong } from "../types";

interface SongCardProps {
	song: DetailedSong;
	mystery?: boolean;
}

export default function SongCard({ song, mystery }: SongCardProps) {
	if (mystery) {
		if (song.preview) {
			return <div className="card mystery">?</div>;
		}
		return (
			<div className="card mystery">
				<img src={song.img} alt="Mystery song" />
				<div className="card-title">{song.t}</div>
			</div>
		);
	}

	return (
		<div className="card">
			<a href={song.link} target="_blank" rel="noopener noreferrer" className="card-link">
				<img src={song.img} alt={song.t} />
			</a>
			<div className="year">{song.y}</div>
			<p><strong>{song.t}</strong></p>
			<p className="card-artist">{song.a}</p>
		</div>
	);
}
