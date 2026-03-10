import { songLibrary } from './songs';
import type { Player, Song, DetailedSong } from './types';

const STORAGE_KEY = 'thatWasTheYear_gameState';

class GameState {
  players: Player[] = [];
  currentPlayerIndex = 0;
  roundCount = 1;
  currentSong: DetailedSong | null = null;
  deck: Song[] = [...songLibrary];

  serialize(): string {
    return JSON.stringify({
      players: this.players,
      currentPlayerIndex: this.currentPlayerIndex,
      roundCount: this.roundCount,
      currentSong: this.currentSong,
      deck: this.deck
    });
  }

  deserialize(json: string): void {
    const data = JSON.parse(json);
    this.players = data.players;
    this.currentPlayerIndex = data.currentPlayerIndex;
    this.roundCount = data.roundCount;
    this.currentSong = data.currentSong;
    this.deck = data.deck;
  }

  save(): void {
    localStorage.setItem(STORAGE_KEY, this.serialize());
  }

  restore(): boolean {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      this.deserialize(saved);
      return true;
    }
    return false;
  }

  clear(): void {
    this.players = [];
    this.currentPlayerIndex = 0;
    this.roundCount = 1;
    this.currentSong = null;
    this.deck = [...songLibrary];
    localStorage.removeItem(STORAGE_KEY);
  }
}

const gameState = new GameState();
const audio = new Audio();
let audioTimeout: number;

function addPlayerField(): void {
  const container = document.getElementById('extra-players')!;
  const input = document.createElement('input');
  input.type = "text";
  input.placeholder = `Player ${document.querySelectorAll('.p-name').length + 1}`;
  input.className = "p-name";
  container.appendChild(input);
}

async function startGame(): Promise<void> {
  const names = Array.from(document.querySelectorAll<HTMLInputElement>('.p-name'))
    .map(i => i.value.trim())
    .filter(n => n !== "");

  if (names.length === 0) return alert("Enter at least one name.");
  gameState.clear();
  gameState.players = names.map(name => ({ name, timeline: [] }));

  for (const p of gameState.players) {
    const song = await getDetailedSong(gameState.deck.splice(Math.floor(Math.random() * gameState.deck.length), 1)[0]);
    p.timeline.push(song);
  }

  document.getElementById('splash')!.classList.remove('active');
  document.getElementById('game')!.classList.add('active');
  gameState.save();
  updateTurn();
}

async function getDetailedSong(song: Song): Promise<DetailedSong> {
  try {
    const resp = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(song.a + " " + song.t)}&limit=1&entity=song`);
    const data = await resp.json();
    const res = data.results?.[0];
    return {
      ...song,
      img: res?.artworkUrl100 || "https://via.placeholder.com/100",
      preview: res?.previewUrl || null,
      link: res?.trackViewUrl || "#"
    };
  } catch {
    return { ...song, img: "https://via.placeholder.com/100", link: "#" };
  }
}

function updateTurn(): void {
  const p = gameState.players[gameState.currentPlayerIndex];
  document.getElementById('turn-indicator')!.textContent = `${p.name}'s Turn`;
  document.getElementById('round-display')!.textContent = `Round ${gameState.roundCount}`;
  document.getElementById('draw-btn')!.style.display = 'inline-block';
  document.getElementById('replay-btn')!.style.display = 'none';
  document.getElementById('current-drag-item')!.replaceChildren();
  document.getElementById('audio-status')!.textContent = "";
  renderBoard();
  audio.pause();
  clearTimeout(audioTimeout);
}

async function drawSong(): Promise<void> {
  document.getElementById('draw-btn')!.style.display = 'none';
  document.getElementById('audio-status')!.textContent = "Searching iTunes...";

  const rawSong = gameState.deck.splice(Math.floor(Math.random() * gameState.deck.length), 1)[0];
  gameState.currentSong = await getDetailedSong(rawSong);

  const mysteryCard = document.createElement('div');
  mysteryCard.className = 'card mystery';
  mysteryCard.textContent = '?';
  document.getElementById('current-drag-item')!.replaceChildren(mysteryCard);
  document.getElementById('audio-status')!.textContent = "Listen and click the right position on the timeline!";

  if (gameState.currentSong.preview) {
    document.getElementById('replay-btn')!.style.display = 'inline-block';
    playPreview();
  } else {
    document.getElementById('audio-status')!.textContent = "No audio found! Guess by title.";
  }
  gameState.save();
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
  const container = document.getElementById('players-container')!;
  container.replaceChildren();

  gameState.players.forEach((player, pIdx) => {
    const isCurrent = pIdx === gameState.currentPlayerIndex;
    const area = document.createElement('div');
    area.className = `player-area ${isCurrent ? 'active-player-border' : ''}`;
    
    const h3 = document.createElement('h3');
    h3.textContent = `${player.name} (${player.timeline.length} Cards)`;
    area.appendChild(h3);

    const timeline = document.createElement('div');
    timeline.className = "timeline";

    timeline.appendChild(createDropZone(pIdx, 0));
    player.timeline.forEach((song, sIdx) => {
      const card = document.createElement('div');
      card.className = "card";
      
      const link = document.createElement('a');
      link.href = song.link;
      link.target = '_blank';
      link.className = 'card-link';
      
      const img = document.createElement('img');
      img.src = song.img;
      img.title = 'Listen on iTunes';
      
      const yearDiv = document.createElement('div');
      yearDiv.className = 'year';
      yearDiv.textContent = String(song.y);
      
      const titleDiv = document.createElement('div');
      titleDiv.className = 'card-title';
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
  const dz = document.createElement('div');
  dz.className = "drop-zone";
  if (pIdx === gameState.currentPlayerIndex && gameState.currentSong) dz.classList.add('waiting-for-input');

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

  if (gameState.currentSong!.y >= prevYear && gameState.currentSong!.y <= nextYear) {
    timeline.splice(index, 0, gameState.currentSong!);
    gameState.save();
    showOverlay(gameState.currentSong!);
  } else {
    alert(`WRONG! The song might reappear later!`);
    gameState.deck.push(gameState.currentSong!);
    gameState.save();
    nextTurn();
  }
}

function showOverlay(song: DetailedSong): void {
  audio.play();
  const reveal = document.getElementById('reveal-card')!;
  
  const card = document.createElement('div');
  card.className = 'card reveal-card-large';
  
  const link = document.createElement('a');
  link.href = song.link;
  link.target = '_blank';
  link.className = 'card-link';
  const img = document.createElement('img');
  img.src = song.img;
  link.appendChild(img);
  
  const yearDiv = document.createElement('div');
  yearDiv.className = 'year';
  yearDiv.textContent = String(song.y);
  
  const titleP = document.createElement('p');
  const strong = document.createElement('strong');
  strong.textContent = song.t;
  titleP.appendChild(strong);
  
  const artistP = document.createElement('p');
  artistP.className = 'reveal-artist';
  artistP.textContent = song.a;
  
  card.append(link, yearDiv, titleP, artistP);
  reveal.replaceChildren(card);
  document.getElementById('preview-overlay')!.style.display = 'flex';
}

function closeOverlay(): void {
  document.getElementById('preview-overlay')!.style.display = 'none';
  nextTurn();
}

function nextTurn(): void {
  gameState.currentSong = null;
  gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
  if (gameState.currentPlayerIndex === 0) gameState.roundCount++;
  gameState.save();
  updateTurn();
}

function restoreGame(): void {
  if (gameState.restore()) {
    document.getElementById('splash')!.classList.remove('active');
    document.getElementById('game')!.classList.add('active');
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
  }
}

window.addPlayerField = addPlayerField;
window.startGame = startGame;
window.drawSong = drawSong;
window.playPreview = playPreview;
window.closeOverlay = closeOverlay;
