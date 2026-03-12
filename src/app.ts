import type { Player, Song, DetailedSong, GameStateData } from "./types";

const STORAGE_KEY = "thatWasTheYear_gameState";

let songLibrary: Song[] = [];

async function loadSongs() {
	if (songLibrary.length > 0) {
		return;
	}
	try {
		const resp = await fetch("./songs.json");
		songLibrary = await resp.json();
	} catch (e) {
		console.error("Failed to load songs", e);
	}
}

function shuffleDeck(deck: Song[]): void {
	for (let i = deck.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[deck[i], deck[j]] = [deck[j], deck[i]];
	}
}

class GameState implements GameStateData {
	players: Player[] = [];
	currentPlayerIndex = 0;
	roundCount = 1;
	currentSong: DetailedSong | null = null;
	deck: Song[] = [];
	endCondition: { type: "infinite" | "turns" | "correctSongs"; value: number } =
		{
			type: "infinite",
			value: 10,
		};

	serialize(): string {
		const data: GameStateData = {
			players: this.players,
			currentPlayerIndex: this.currentPlayerIndex,
			roundCount: this.roundCount,
			currentSong: this.currentSong,
			deck: this.deck,
			endCondition: this.endCondition,
		};
		return JSON.stringify(data);
	}

	deserialize(json: string): void {
		const data = JSON.parse(json);

		if (!this.isValidGameData(data)) {
			throw new Error("Invalid game state data");
		}

		this.players = data.players;
		this.currentPlayerIndex = data.currentPlayerIndex;
		this.roundCount = data.roundCount;
		this.currentSong = data.currentSong;
		this.deck = data.deck;
		this.endCondition = data.endCondition;
	}

	private isValidGameData(data: any): data is GameStateData {
		return (
			Array.isArray(data.players) &&
			data.players.every((p: unknown) => this.isPlayer(p)) &&
			typeof data.currentPlayerIndex === "number" &&
			typeof data.roundCount === "number" &&
			(data.currentSong === null || this.isDetailedSong(data.currentSong)) &&
			Array.isArray(data.deck) &&
			data.deck.every((s: unknown) => this.isSong(s)) &&
			this.isEndCondition(data.endCondition)
		);
	}

	private isEndCondition(e: any): boolean {
		return (
			typeof e === "object" &&
			e !== null &&
			(e.type === "infinite" ||
				e.type === "turns" ||
				e.type === "correctSongs") &&
			typeof e.value === "number"
		);
	}

	private isPlayer(p: any): p is Player {
		return (
			typeof p === "object" &&
			p !== null &&
			typeof p.name === "string" &&
			Array.isArray(p.timeline) &&
			p.timeline.every((s: unknown) => this.isDetailedSong(s))
		);
	}

	private isDetailedSong(s: any): s is DetailedSong {
		if (!this.isSong(s)) {
			return false;
		}
		s = s as any;
		return (
			typeof s.img === "string" &&
			((s as any).preview === undefined ||
				(s as any).preview === null ||
				typeof (s as any).preview === "string") &&
			typeof (s as any).link === "string"
		);
	}

	private isSong(s: any): s is Song {
		return (
			typeof s === "object" &&
			s !== null &&
			typeof s.t === "string" &&
			typeof s.a === "string" &&
			typeof s.y === "number" &&
			(s.itunesId === undefined || typeof s.itunesId === "number")
		);
	}

	save(): void {
		localStorage.setItem(STORAGE_KEY, this.serialize());
	}

	restore(): boolean {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved) {
			try {
				this.deserialize(saved);
			} catch (e) {
				this.clear();
				return false;
			}
			return true;
		}
		return false;
	}

	clear(): void {
		this.players = [];
		this.currentPlayerIndex = 0;
		this.roundCount = 1;
		this.currentSong = null;
		if (songLibrary.length > 0) {
			this.deck = [...songLibrary];
			shuffleDeck(this.deck);
		} else {
			this.deck = [];
		}
		localStorage.removeItem(STORAGE_KEY);
	}
}

const gameState = new GameState();
const audio = new Audio();
let audioTimeout: number;

function addPlayerField(): void {
	const container = document.getElementById("player-inputs")!;
	const input = document.createElement("input");
	input.type = "text";
	input.placeholder = `Player ${document.querySelectorAll(".p-name").length + 1}`;
	input.className = "p-name";
	container.appendChild(input);
}

async function startGame(): Promise<void> {
	await loadSongs();
	const names = Array.from(
		document.querySelectorAll<HTMLInputElement>(".p-name"),
	)
		.map((i) => i.value.trim())
		.filter((n) => n !== "");

	if (names.length === 0) return alert("Enter at least one name.");

	const type = (document.querySelector<HTMLInputElement>(
		'input[name="endCondition"]:checked',
	)?.value || "infinite") as "infinite" | "turns" | "correctSongs";
	let value = 0;
	if (type === "turns") {
		value = parseInt(
			(document.getElementById("turnsPerPlayer") as HTMLInputElement)?.value ||
				"10",
		);
	} else if (type === "correctSongs") {
		value = parseInt(
			(document.getElementById("correctSongsTarget") as HTMLInputElement)
				?.value || "10",
		);
	}

	gameState.clear();
	gameState.players = names.map((name) => ({ name, timeline: [] }));
	gameState.endCondition = { type, value };

	for (const p of gameState.players) {
		const song = await getDetailedSong(gameState.deck.pop()!);
		p.timeline.push(song);
	}

	document.getElementById("splash")!.classList.remove("active");
	document.getElementById("game")!.classList.add("active");
	updateTurn();
}

async function getDetailedSong(song: Song): Promise<DetailedSong> {
	let data = undefined;
	if (typeof song.itunesId === "number") {
		// Let's try with itunesId
		try {
			const resp = await fetch(
				`https://itunes.apple.com/lookup?id=${song.itunesId}`,
			);
			if (resp.status == 200) {
				data = await resp.json();
				const res = data.results?.[0];
				if (!data.results || !data.results?.[0]) {
					data = undefined;
				}
			}
		} catch (e) {
			console.error("Error fetching song by itunesId", e);
		}
	}
	if (!data) {
		// Fallback to search by title and author
		const resp = await fetch(
			`https://itunes.apple.com/search?term=${encodeURIComponent(song.a + " " + song.t)}&limit=1&entity=song`,
		);
		if (resp.status != 200) {
			throw new Error("iTunes API error: status = " + resp.status);
		}
		data = await resp.json();
	}
	const res = data.results?.[0];
	const itunes_song = {
		...song,
		img: (res?.artworkUrl100 as string) || "./placeholder-100.png",
		preview: (res?.previewUrl as string) || null,
		link: (res?.trackViewUrl as string) || "#",
	};
	if (
		!res ||
		(!itunes_song.preview && itunes_song.img == "./placeholder-100.png")
	) {
		throw new Error("No results");
	}
	return itunes_song;
}

function updateTurn(): void {
	const p = gameState.players[gameState.currentPlayerIndex];
	document.getElementById("turn-indicator")!.textContent = `${p.name}'s Turn`;
	document.getElementById("round-display")!.textContent =
		`Round ${gameState.roundCount}`;
	document.getElementById("draw-btn")!.style.display = "inline-block";
	document.getElementById("replay-btn")!.style.display = "none";
	document.getElementById("current-drag-item")!.replaceChildren();
	document.getElementById("audio-status")!.textContent = "";
	gameState.save();
	renderBoard();
	audio.pause();
	clearTimeout(audioTimeout);
}

async function drawSong(): Promise<void> {
	document.getElementById("draw-btn")!.style.display = "none";
	document.getElementById("audio-status")!.textContent = "Searching iTunes...";

	const rawSong = gameState.deck.pop()!;
	try {
		gameState.currentSong = await getDetailedSong(rawSong);
	} catch (e) {
		console.error("getDetailedSong failed", e);
		alert("Failed to fetch song details. Try again.");
		updateTurn();
		return;
	}

	const mysteryCard = document.createElement("div");
	mysteryCard.className = "card mystery";

	if (gameState.currentSong.preview) {
		mysteryCard.textContent = "?";
		document.getElementById("audio-status")!.textContent =
			"Listen and click the right position on the timeline!";
		document.getElementById("replay-btn")!.style.display = "inline-block";
		playPreview();
	} else {
		const img = document.createElement("img");
		img.src = gameState.currentSong.img;
		const titleDiv = document.createElement("div");
		titleDiv.className = "card-title";
		titleDiv.textContent = gameState.currentSong.t;
		mysteryCard.append(img, titleDiv);
		document.getElementById("audio-status")!.textContent =
			"No audio found! Guess by cover.";
	}

	document.getElementById("current-drag-item")!.replaceChildren(mysteryCard);
	renderBoard();
}

function playPreview(): void {
	if (!gameState.currentSong?.preview) return;
	audio.pause();
	clearTimeout(audioTimeout);
	audio.src = gameState.currentSong.preview;
	audio.play();
	audioTimeout = window.setTimeout(() => audio.pause(), 10000);
}

function renderBoard(): void {
	const container = document.getElementById("players-container")!;
	container.replaceChildren();

	gameState.players.forEach((player, pIdx) => {
		const isCurrent = pIdx === gameState.currentPlayerIndex;
		const area = document.createElement("div");
		area.className = `player-area ${isCurrent ? "active-player-border" : ""}`;

		const h3 = document.createElement("h3");
		h3.textContent = `${player.name} (${player.timeline.length} Cards)`;
		area.appendChild(h3);

		const timeline = document.createElement("div");
		timeline.className = "timeline";

		timeline.appendChild(createDropZone(pIdx, 0));
		player.timeline.forEach((song, sIdx) => {
			const card = document.createElement("div");
			card.className = "card";

			const link = document.createElement("a");
			link.href = song.link;
			link.target = "_blank";
			link.className = "card-link";

			const img = document.createElement("img");
			img.src = song.img;
			img.title = "Listen on iTunes";

			const yearDiv = document.createElement("div");
			yearDiv.className = "year";
			yearDiv.textContent = String(song.y);

			const titleDiv = document.createElement("div");
			titleDiv.className = "card-title";
			titleDiv.textContent = song.t;

			link.append(img, yearDiv, titleDiv);
			card.appendChild(link);
			timeline.appendChild(card);
			timeline.appendChild(createDropZone(pIdx, sIdx + 1));
		});

		area.appendChild(timeline);
		container.appendChild(area);
	});
}

function createDropZone(pIdx: number, insertIndex: number): HTMLDivElement {
	const dz = document.createElement("div");
	dz.className = "drop-zone";
	if (pIdx === gameState.currentPlayerIndex && gameState.currentSong)
		dz.classList.add("waiting-for-input");

	dz.onclick = () => {
		if (pIdx !== gameState.currentPlayerIndex || !gameState.currentSong) return;
		handleGuess(insertIndex);
	};
	return dz;
}

function handleGuess(index: number): void {
	audio.pause();
	clearTimeout(audioTimeout);

	const timeline = gameState.players[gameState.currentPlayerIndex].timeline;
	const prevYear = index === 0 ? -Infinity : timeline[index - 1].y;
	const nextYear = index === timeline.length ? Infinity : timeline[index].y;

	if (
		gameState.currentSong!.y >= prevYear &&
		gameState.currentSong!.y <= nextYear
	) {
		timeline.splice(index, 0, gameState.currentSong!);
		gameState.save();
		showOverlay(gameState.currentSong!, true);
	} else {
		gameState.deck.push(gameState.currentSong!);
		shuffleDeck(gameState.deck);
		gameState.save();
		showOverlay(gameState.currentSong!, false);
	}
}

function showOverlay(song: DetailedSong, isCorrect: boolean): void {
	const overlayContent = document.querySelector(".overlay-content")!;

	if (isCorrect) {
		overlayContent.classList.remove("wrong");
	} else {
		overlayContent.classList.add("wrong");
	}

	document.getElementById("overlay-title")!.textContent = isCorrect
		? "CORRECT!"
		: "WRONG!";
	document.getElementById("overlay-message")!.textContent = isCorrect
		? ""
		: "The song might reappear later.";

	const revealCard = document.getElementById("reveal-card")!;

	if (isCorrect) {
		audio.play();
		document.getElementById("reveal-img")!.setAttribute("src", song.img);
		document.getElementById("reveal-link")!.setAttribute("href", song.link);
		document.getElementById("reveal-year")!.textContent = String(song.y);
		document.getElementById("reveal-title")!.textContent = song.t;
		document.getElementById("reveal-artist")!.textContent = song.a;
		revealCard.style.display = "block";
	} else {
		revealCard.style.display = "none";
	}

	document.getElementById("preview-overlay")!.style.display = "flex";
}

function closeOverlay(): void {
	document.getElementById("preview-overlay")!.style.display = "none";
	nextTurn();
}

function nextTurn(): void {
	gameState.currentSong = null;
	gameState.currentPlayerIndex =
		(gameState.currentPlayerIndex + 1) % gameState.players.length;
	if (gameState.currentPlayerIndex === 0) {
		gameState.roundCount++;
	}
	gameState.save();

	if (endGame()) {
		return;
	}
	updateTurn();
}

function endGame(): boolean {
	if (gameState.endCondition.type == "infinite") {
		return false;
	}
	let winners: Player[];
	let message: string;

	if (gameState.endCondition.type === "correctSongs") {
		if (gameState.currentPlayerIndex != 0) {
			// Check only after the last player in the turn
			return false;
		}
		// Players get one song in the timeline for free, so -1
		winners = gameState.players.filter(
			(p) => p.timeline.length - 1 >= gameState.endCondition.value,
		);
		if (winners.length === 0) {
			return false;
		}
		const correctSongs = winners[0].timeline.length - 1;
		message =
			winners.length > 1
				? `Game Over! Tie between: ${winners.map((w) => w.name).join(", ")} with ${correctSongs} correct songs!`
				: `Game Over! Winner: ${winners[0].name} with ${correctSongs} correct songs!`;
	} else {
		if (gameState.roundCount <= gameState.endCondition.value) {
			return false;
		}
		const maxScore = Math.max(
			...gameState.players.map((p) => p.timeline.length),
		);
		winners = gameState.players.filter((p) => p.timeline.length === maxScore);
		message =
			winners.length > 1
				? `Game Over! Tie between: ${winners.map((w) => w.name).join(", ")} with ${maxScore} cards!`
				: `Game Over! Winner: ${winners[0].name} with ${maxScore} cards!`;
	}

	audio.pause();
	clearTimeout(audioTimeout);
	alert(message);
	gameState.clear();
	document.getElementById("game")!.classList.remove("active");
	document.getElementById("splash")!.classList.add("active");
	return true;
}

function resetGame(): void {
	if (confirm("Are you sure you want to start over?")) {
		audio.pause();
		clearTimeout(audioTimeout);
		gameState.clear();
		document.getElementById("game")!.classList.remove("active");
		document.getElementById("splash")!.classList.add("active");
	}
}

function restoreGame(): void {
	if (gameState.restore()) {
		document.getElementById("splash")!.classList.remove("active");
		document.getElementById("game")!.classList.add("active");
		updateTurn();
	}
}

if (gameState.restore()) {
	restoreGame();
}
declare global {
	interface Window {
		addPlayerField: typeof addPlayerField;
		startGame: typeof startGame;
		drawSong: typeof drawSong;
		playPreview: typeof playPreview;
		closeOverlay: typeof closeOverlay;
		resetGame: typeof resetGame;
	}
}

window.addPlayerField = addPlayerField;
window.startGame = startGame;
window.drawSong = drawSong;
window.playPreview = playPreview;
window.closeOverlay = closeOverlay;
window.resetGame = resetGame;
