import { songLibrary } from './songs';
import type { Player, Song, DetailedSong } from './types';

let players: Player[] = [];
let currentPlayerIndex = 0;
let roundCount = 1;
let currentSong: DetailedSong | null = null;
let deck: Song[] = [...songLibrary];
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
  players = names.map(name => ({ name, timeline: [] }));

  for (const p of players) {
    const song = await getDetailedSong(deck.splice(Math.floor(Math.random() * deck.length), 1)[0]);
    p.timeline.push(song);
  }

  document.getElementById('splash')!.classList.remove('active');
  document.getElementById('game')!.classList.add('active');
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
  const p = players[currentPlayerIndex];
  document.getElementById('turn-indicator')!.textContent = `${p.name}'s Turn`;
  document.getElementById('round-display')!.textContent = `Round ${roundCount}`;
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

  const rawSong = deck.splice(Math.floor(Math.random() * deck.length), 1)[0];
  currentSong = await getDetailedSong(rawSong);

  const mysteryCard = document.createElement('div');
  mysteryCard.className = 'card mystery';
  mysteryCard.textContent = '?';
  document.getElementById('current-drag-item')!.replaceChildren(mysteryCard);
  document.getElementById('audio-status')!.textContent = "Listen and click the right position on the timeline!";

  if (currentSong.preview) {
    document.getElementById('replay-btn')!.style.display = 'inline-block';
    playPreview();
  } else {
    document.getElementById('audio-status')!.textContent = "No audio found! Guess by title.";
  }
  renderBoard();
}

function playPreview(): void {
  if (!currentSong?.preview) return;
  audio.pause();
  clearTimeout(audioTimeout);
  audio.src = currentSong.preview;
  audio.play();
  audioTimeout = window.setTimeout(() => audio.pause(), 10000);
}

function renderBoard(): void {
  const container = document.getElementById('players-container')!;
  container.replaceChildren();

  players.forEach((player, pIdx) => {
    const isCurrent = pIdx === currentPlayerIndex;
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
  if (pIdx === currentPlayerIndex && currentSong) dz.classList.add('waiting-for-input');

  dz.onclick = () => {
    if (pIdx !== currentPlayerIndex || !currentSong) return;
    handleGuess(insertIndex);
  };
  return dz;
}

function handleGuess(index: number): void {
  audio.pause();
  clearTimeout(audioTimeout);

  const timeline = players[currentPlayerIndex].timeline;
  const prevYear = index === 0 ? -Infinity : timeline[index - 1].y;
  const nextYear = index === timeline.length ? Infinity : timeline[index].y;

  if (currentSong!.y >= prevYear && currentSong!.y <= nextYear) {
    timeline.splice(index, 0, currentSong!);
    showOverlay(currentSong!);
  } else {
    alert(`WRONG! The song might reappear later!`);
    deck.push(currentSong!);
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
  currentSong = null;
  currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
  if (currentPlayerIndex === 0) roundCount++;
  updateTurn();
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
