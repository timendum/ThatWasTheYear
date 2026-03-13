import type { Player, Song, DetailedSong, GameStateData } from "./types";

const STORAGE_KEY = "thatWasTheYear_gameState";

function shuffleDeck(deck: Song[]): void {
	for (let i = deck.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[deck[i], deck[j]] = [deck[j], deck[i]];
	}
}

async function getDetailedSong(song: Song): Promise<DetailedSong> {
	let data = undefined;
	if (typeof song.itunesId === "number") {
		try {
			const resp = await fetch(
				`https://itunes.apple.com/lookup?id=${song.itunesId}`,
			);
			if (resp.status === 200) {
				data = await resp.json();
				if (!data.results?.[0]) {
					data = undefined;
				}
			}
		} catch (e) {
			console.error("Error fetching song by itunesId", e);
		}
	}
	if (!data) {
		const resp = await fetch(
			`https://itunes.apple.com/search?term=${encodeURIComponent(song.a + " " + song.t)}&limit=1&entity=song`,
		);
		if (resp.status !== 200) {
			throw new Error("iTunes API error: status = " + resp.status);
		}
		data = await resp.json();
	}
	const res = data.results?.[0];
	return {
		...song,
		img: res?.artworkUrl100 || "./placeholder-100.png",
		preview: res?.previewUrl || null,
		link: res?.trackViewUrl || "#",
	};
}

export class GameState implements GameStateData {
	players: Player[] = [];
	currentPlayerIndex = 0;
	roundCount = 1;
	currentSong: DetailedSong | null = null;
	deck: Song[] = [];
	endCondition: { type: "infinite" | "turns" | "correctSongs"; value: number } = {
		type: "infinite",
		value: 10,
	};

	initializeDeck(songs: Song[]): void {
		this.deck = [...songs];
		shuffleDeck(this.deck);
	}

	async startGame(playerNames: string[]): Promise<void> {
		this.players = playerNames.map((name) => ({ name, timeline: [] }));
		this.currentPlayerIndex = 0;
		this.roundCount = 1;
		
		for (const p of this.players) {
			const song = await getDetailedSong(this.deck.pop()!);
			p.timeline.push(song);
		}
		
		this.save();
	}

	async drawSong(): Promise<DetailedSong | null> {
		if (this.deck.length === 0) return null;
		const rawSong = this.deck.pop()!;
		try {
			this.currentSong = await getDetailedSong(rawSong);
			return this.currentSong;
		} catch (e) {
			console.error("Failed to fetch song", e);
			return null;
		}
	}

	placeSong(position: number): boolean {
		if (!this.currentSong) return false;
		
		const player = this.players[this.currentPlayerIndex];
		const timeline = player.timeline;
		
		const isCorrect =
			(position === 0 || this.currentSong.y >= timeline[position - 1].y) &&
			(position === timeline.length || this.currentSong.y <= timeline[position].y);
		
		if (isCorrect) {
			timeline.splice(position, 0, this.currentSong);
		}
		
		this.currentSong = null;
		this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
		if (this.currentPlayerIndex === 0) {
			this.roundCount++;
		}
		
		this.save();
		return isCorrect;
	}

	save(): void {
		const data: GameStateData = {
			players: this.players,
			currentPlayerIndex: this.currentPlayerIndex,
			roundCount: this.roundCount,
			currentSong: this.currentSong,
			deck: this.deck,
			endCondition: this.endCondition,
		};
		localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
	}

	restore(): boolean {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved) {
			try {
				const data = JSON.parse(saved);
				this.players = data.players;
				this.currentPlayerIndex = data.currentPlayerIndex;
				this.roundCount = data.roundCount;
				this.currentSong = data.currentSong;
				this.deck = data.deck;
				this.endCondition = data.endCondition;
				return true;
			} catch (e) {
				return false;
			}
		}
		return false;
	}

	clear(): void {
		localStorage.removeItem(STORAGE_KEY);
	}
}