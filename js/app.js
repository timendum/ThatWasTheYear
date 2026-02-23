let players = [];
let currentPlayerIndex = 0;
let currentSong = null;
let deck = [...songLibrary];
const audio = new Audio();
let replayTimeout;

function addPlayerField() {
  const container = document.getElementById('extra-players');
  if (container.children.length < 4) {
    const input = document.createElement('input');
    input.type = "text";
    input.placeholder = `Player ${container.children.length + 3}`;
    input.className = "p-name";
    container.appendChild(input);
  }
}

async function startGame() {
  const names = Array.from(document.querySelectorAll('.p-name'))
    .map(i => i.value.trim())
    .filter(n => n !== "");

  if (names.length < 2) return alert("Min 2 players required.");

  players = names.map(name => ({name, timeline: []}));

  for (let p of players) {
    const song = await getDetailedSong(deck.splice(Math.floor(Math.random() * deck.length), 1)[0]);
    p.timeline.push(song);
  }

  showScreen('game');
  updateTurn();
}

async function getDetailedSong(song) {
  try {
    const resp = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(song.a + " " + song.t)}&limit=1&entity=song`);
    const data = await resp.json();
    if (data.results[0]) {
      return {...song, img: data.results[0].artworkUrl100, preview: data.results[0].previewUrl};
    }
  } catch (e) {
    console.error("iTunes fetch failed", e);
  }
  return {...song, img: "https://via.placeholder.com/100?text=Song", preview: null};
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function updateTurn() {
  const p = players[currentPlayerIndex];
  document.getElementById('turn-indicator').innerText = `${p.name}'s Turn`;
  document.getElementById('draw-btn').style.display = 'inline-block';
  document.getElementById('current-drag-item').innerHTML = '';
  document.getElementById('audio-status').innerHTML = "Ready to draw...";
  renderBoard();
}

async function drawSong() {
  if (deck.length === 0) deck = [...songLibrary];

  const status = document.getElementById('audio-status');
  status.innerText = "Searching...";

  const rawSong = deck.splice(Math.floor(Math.random() * deck.length), 1)[0];
  currentSong = await getDetailedSong(rawSong);

  document.getElementById('draw-btn').style.display = 'none';

  if (currentSong.preview) {
    playPreview();
  } else {
    status.innerText = "No audio found! Guess by title.";
  }

  const dragContainer = document.getElementById('current-drag-item');
  const card = document.createElement('div');
  card.className = "card mystery";
  card.draggable = true;
  card.innerHTML = `?`;
  card.ondragstart = (e) => e.dataTransfer.setData("text", "mystery");
  dragContainer.appendChild(card);
}

function playPreview() {
  if (!currentSong.preview) return;

  clearTimeout(replayTimeout);
  audio.src = currentSong.preview;
  audio.currentTime = 0;
  audio.play();

  const status = document.getElementById('audio-status');
  status.innerHTML = `Playing Preview (10s)... <br>`;

  const replayBtn = document.createElement('button');
  replayBtn.innerText = "Replay ♫";
  replayBtn.onclick = playPreview;
  status.appendChild(replayBtn);

  replayTimeout = setTimeout(() => audio.pause(), 10000);
}

function renderBoard() {
  const container = document.getElementById('players-container');
  container.innerHTML = '';

  players.forEach((player, pIdx) => {
    const area = document.createElement('div');
    area.className = `player-area ${pIdx === currentPlayerIndex ? 'active-player-border' : ''}`;
    area.innerHTML = `<h3>${player.name} (${player.timeline.length}/10)</h3>`;

    const timeline = document.createElement('div');
    timeline.className = "timeline";
    timeline.appendChild(createDropZone(pIdx, 0));

    player.timeline.forEach((song, sIdx) => {
      const card = document.createElement('div');
      card.className = "card";
      card.innerHTML = `
        <img src="${song.img}">
        <div class="year">${song.y}</div>
        <div style="font-weight:600; text-overflow: ellipsis; white-space: nowrap; width: 100%; overflow:hidden;">${song.t}</div>
        <div style="opacity:0.6; font-size:0.55rem;">${song.a}</div>
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
  dz.ondragover = (e) => {
    if (pIdx !== currentPlayerIndex) return;
    e.preventDefault();
    dz.classList.add('hover');
  };
  dz.ondragleave = () => dz.classList.remove('hover');
  dz.ondrop = (e) => {
    e.preventDefault();
    dz.classList.remove('hover');
    handleGuess(insertIndex);
  };
  return dz;
}

function handleGuess(index) {
  const timeline = players[currentPlayerIndex].timeline;
  const prevYear = index === 0 ? -Infinity : timeline[index - 1].y;
  const nextYear = index === timeline.length ? Infinity : timeline[index].y;

  audio.pause();
  clearTimeout(replayTimeout);

  if (currentSong.y >= prevYear && currentSong.y <= nextYear) {
    timeline.splice(index, 0, currentSong);
    if (timeline.length >= 10) return endGame();
    //   alert(`CORRECT! It was ${currentSong.y}: ${currentSong.t} by ${currentSong.a}`);
  } else {
    alert(`WRONG!`
      // It was ${currentSong.y}: ${currentSong.t} by ${currentSong.a}`
    );
  }

  currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
  updateTurn();
}

function endGame() {
  showScreen('win');
  document.getElementById('winner-text').innerText = `${players[currentPlayerIndex].name} Wins!`;
  startConfetti();
}

function startConfetti() {
  const canvas = document.getElementById('confetti');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  let particles = Array.from({length: 150}, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    c: `hsl(${Math.random() * 360}, 70%, 50%)`,
    v: Math.random() * 3 + 2,
    r: Math.random() * 5 + 2
  }));

  function anim() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.y += p.v;
      if (p.y > canvas.height) p.y = -10;
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(anim);
  }

  anim();
}
