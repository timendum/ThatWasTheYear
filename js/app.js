let players = [];
let currentPlayerIndex = 0;
let roundCount = 1;
let currentSong = null;
let deck = [...songLibrary];
const audio = new Audio();
let audioTimeout;

function addPlayerField() {
  const container = document.getElementById('extra-players');
  const input = document.createElement('input');
  input.type = "text";
  input.placeholder = `Player ${document.querySelectorAll('.p-name').length + 1}`;
  input.className = "p-name";
  container.appendChild(input);
}

async function startGame() {
  const names = Array.from(document.querySelectorAll('.p-name'))
    .map(i => i.value.trim())
    .filter(n => n !== "");

  if (names.length === 0) return alert("Enter at least one name.");
  players = names.map(name => ({ name, timeline: [] }));

  // Initial cards
  for (let p of players) {
    const song = await getDetailedSong(deck.splice(Math.floor(Math.random() * deck.length), 1)[0]);
    p.timeline.push(song);
  }

  document.getElementById('splash').classList.remove('active');
  document.getElementById('game').classList.add('active');
  updateTurn();
}

async function getDetailedSong(song) {
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
  } catch (e) {
    return { ...song, img: "https://via.placeholder.com/100", link: "#" };
  }
}

function updateTurn() {
  const p = players[currentPlayerIndex];
  document.getElementById('turn-indicator').innerText = `${p.name}'s Turn`;
  document.getElementById('round-display').innerText = `Round ${roundCount}`;
  document.getElementById('draw-btn').style.display = 'inline-block';
  document.getElementById('replay-btn').style.display = 'none';
  document.getElementById('current-drag-item').innerHTML = '';
  document.getElementById('audio-status').innerText = "Draw a card to start.";
  renderBoard();
}

async function drawSong() {
  document.getElementById('draw-btn').style.display = 'none';
  document.getElementById('audio-status').innerText = "Searching iTunes...";

  const rawSong = deck.splice(Math.floor(Math.random() * deck.length), 1)[0];
  currentSong = await getDetailedSong(rawSong);

  document.getElementById('current-drag-item').innerHTML = `<div class="card mystery">?</div>`;
  document.getElementById('audio-status').innerText = "Listen and place the card!";

  if (currentSong.preview) {
    document.getElementById('replay-btn').style.display = 'inline-block';
    playPreview();
  } else {
    document.getElementById('audio-status').innerText = "No audio found! Guess by title.";
  }
  renderBoard();
}

function playPreview() {
  if (!currentSong || !currentSong.preview) return;
  audio.pause();
  clearTimeout(audioTimeout);
  audio.src = currentSong.preview;
  audio.play();
  audioTimeout = setTimeout(() => audio.pause(), 10000);
}

function renderBoard() {
  const container = document.getElementById('players-container');
  container.innerHTML = '';

  players.forEach((player, pIdx) => {
    const isCurrent = pIdx === currentPlayerIndex;
    const area = document.createElement('div');
    area.className = `player-area ${isCurrent ? 'active-player-border' : ''}`;
    area.innerHTML = `<h3>${player.name} (${player.timeline.length} Cards)</h3>`;

    const timeline = document.createElement('div');
    timeline.className = "timeline";

    timeline.appendChild(createDropZone(pIdx, 0));
    player.timeline.forEach((song, sIdx) => {
      const card = document.createElement('div');
      card.className = "card";
      card.innerHTML = `
        <a href="${song.link}" target="_blank"><img src="${song.img}" title="Listen on iTunes"></a>
        <div class="year">${song.y}</div>
        <div style="font-weight:bold; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">${song.t}</div>
      `;
      timeline.appendChild(card);
      timeline.appendChild(createDropZone(pIdx, sIdx + 1));
    });

    area.appendChild(timeline);
    container.appendChild(area);
  });
}

function createDropZone(pIdx, insertIndex) {
  const dz = document.createElement('div');
  dz.className = "drop-zone";
  if (pIdx === currentPlayerIndex && currentSong) dz.classList.add('waiting-for-input');

  dz.onclick = () => {
    if (pIdx !== currentPlayerIndex || !currentSong) return;
    handleGuess(insertIndex);
  };
  return dz;
}

function handleGuess(index) {
  audio.pause();
  clearTimeout(audioTimeout);

  const timeline = players[currentPlayerIndex].timeline;
  const prevYear = index === 0 ? -Infinity : timeline[index - 1].y;
  const nextYear = index === timeline.length ? Infinity : timeline[index].y;

  if (currentSong.y >= prevYear && currentSong.y <= nextYear) {
    timeline.splice(index, 0, currentSong);
    showOverlay(currentSong);
  } else {
    alert(`WRONG! The song might reappear later!`);
    deck.push(currentSong); // Put it back
    nextTurn();
  }
}

function showOverlay(song) {
  audio.play();
  const reveal = document.getElementById('reveal-card');
  reveal.innerHTML = `
    <div class="card" style="width:180px; min-height:240px; margin: 20px auto; font-size: 1rem;">
      <a href="${song.link}" target="_blank"><img src="${song.img}" style="width:100%"></a>
      <div class="year" style="font-size: 2.5rem;">${song.y}</div>
      <p><strong>${song.t}</strong></p>
      <p style="opacity:0.8">${song.a}</p>
    </div>
  `;
  document.getElementById('preview-overlay').style.display = 'flex';
}

function closeOverlay() {
  document.getElementById('preview-overlay').style.display = 'none';
  nextTurn();
}

function nextTurn() {
  currentSong = null;
  currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
  if (currentPlayerIndex === 0) roundCount++;
  updateTurn();
}
