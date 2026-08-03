/**
 * Browser UI logic for the add-song tool.
 * Compiled on-the-fly by add-song-server.ts via esbuild.
 */
/* oxlint-disable max-lines */

import {
  findByAuthor,
  findSimilarSongs,
  formatSongsJson,
  searchItunes,
  sortSongs,
  trackToSong,
} from "./add-song-shared.ts";
import type { ITunesTrack, Song } from "./add-song-shared.ts";

// State
let existingSongs: Song[] = [];
let newSongs: Song[] = [];
let queries: string[] = [];
let queryIndex = 0;
let audioTimeout: ReturnType<typeof setTimeout> | null = null;

// DOM refs
const currentAudio = document.querySelector("#audioPlayer") as HTMLAudioElement;
const songFileSelect = document.querySelector("#songFileSelect") as HTMLSelectElement;
const sourceInput = document.querySelector("#sourceInput") as HTMLTextAreaElement;
const startBtn = document.querySelector("#startBtn") as HTMLButtonElement;
const saveBtn = document.querySelector("#saveBtn") as HTMLButtonElement;
const statusText = document.querySelector("#statusText") as HTMLElement;
const logPanel = document.querySelector("#logPanel") as HTMLElement;
const currentQueryEl = document.querySelector("#currentQuery") as HTMLElement;
const currentQueryRow = document.querySelector("#currentQueryRow") as HTMLElement;
const changeQueryBtn = document.querySelector("#changeQueryBtn") as HTMLButtonElement;
const resultsContainer = document.querySelector("#resultsContainer") as HTMLElement;
const actionsBar = document.querySelector("#actionsBar") as HTMLElement;
const stopBtn = document.querySelector("#stopBtn") as HTMLButtonElement;
const skipBtn = document.querySelector("#skipBtn") as HTMLButtonElement;
const newSongsSection = document.querySelector("#newSongsSection") as HTMLElement;
const newSongsCount = document.querySelector("#newSongsCount") as HTMLElement;
const newSongsList = document.querySelector("#newSongsList") as HTMLElement;
const wikiPanel = document.querySelector("#wikiPanel") as HTMLElement;
const wikiFrame = document.querySelector("#wikiFrame") as HTMLIFrameElement;
const overrideModal = document.querySelector("#overrideModal") as HTMLElement & {
  _song?: Song;
  _results?: ITunesTrack[];
  _idx?: number;
};
const overrideTitleInput = document.querySelector("#overrideTitle") as HTMLInputElement;
const overrideAuthorInput = document.querySelector("#overrideAuthor") as HTMLInputElement;
const overrideYearInput = document.querySelector("#overrideYear") as HTMLInputElement;
const overrideSkipInput = document.querySelector("#overrideSkip") as HTMLInputElement;
const overrideConfirmBtn = document.querySelector("#overrideConfirmBtn") as HTMLButtonElement;
const overrideCancelBtn = document.querySelector("#overrideCancelBtn") as HTMLButtonElement;

function log(msg: string, cls = "info"): void {
  const entry = document.createElement("div");
  entry.className = "log-entry " + cls;
  entry.textContent = msg;
  logPanel.append(entry);
  logPanel.scrollTop = logPanel.scrollHeight;
}

function updateNewSongsUI(): void {
  newSongsCount.textContent = String(newSongs.length);
  newSongsList.innerHTML = "";
  for (const s of newSongs) {
    const li = document.createElement("li");
    li.textContent = `${s.t} - ${s.a} (${s.y})`;
    newSongsList.append(li);
  }
  if (newSongs.length > 0) {
    newSongsSection.classList.remove("hidden");
    saveBtn.disabled = false;
  } else {
    newSongsSection.classList.add("hidden");
    saveBtn.disabled = true;
  }
}

// Load available song files into the select
async function loadSongFiles(): Promise<void> {
  try {
    const resp = await fetch("/api/files");
    if (!resp.ok) throw new Error("Failed to fetch file list");
    const files: string[] = await resp.json();
    songFileSelect.innerHTML = "";
    for (const file of files) {
      const opt = document.createElement("option");
      opt.value = file;
      opt.textContent = file;
      songFileSelect.append(opt);
    }
  } catch (err) {
    songFileSelect.innerHTML = '<option value="songs.json">songs.json</option>';
    console.error("Could not load file list:", err);
  }
}

async function loadExistingSongs(): Promise<void> {
  const files = [...songFileSelect.options].map((o) => o.value);
  existingSongs = [];
  for (const file of files) {
    try {
      const resp = await fetch(`/api/songs?file=${file}`);
      if (resp.ok) {
        const songs: Song[] = await resp.json();
        existingSongs.push(...songs);
      }
    } catch {
      /* ignore missing files */
    }
  }
  log(`Loaded ${existingSongs.length} existing songs from library.`);
}

function stopAudio(): void {
  currentAudio.pause();
  currentAudio.src = "";
  if (audioTimeout) {
    clearTimeout(audioTimeout);
    audioTimeout = null;
  }
}

function playPreview(url: string): void {
  stopAudio();
  if (url) {
    currentAudio.src = url;
    currentAudio.play();
    audioTimeout = setTimeout(() => {
      currentAudio.pause();
    }, 10000);
  }
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(s: string): string {
  return s.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

function addSong(song: Song): void {
  log(`✅ Added: ${song.t} - ${song.a} (${song.y})`, "added");
  newSongs.push(song);
  existingSongs.push(song);
  updateNewSongsUI();
  processNext();
}

function processNext(): void {
  stopAudio();
  resultsContainer.innerHTML = "";
  queryIndex++;
  if (queryIndex < queries.length) {
    processCurrentQuery();
  } else {
    finish();
  }
}

function showOverrideModal(song: Song, _results: ITunesTrack[], _idx: number): void {
  overrideTitleInput.value = song.t;
  overrideAuthorInput.value = song.a;
  overrideYearInput.value = String(song.y);
  overrideSkipInput.value = "";
  overrideModal.classList.remove("hidden");
  overrideTitleInput.focus();

  overrideModal._song = song;
  overrideModal._results = _results;
  overrideModal._idx = _idx;
}

function confirmOverride(): void {
  const song = overrideModal._song!;
  const title = overrideTitleInput.value.trim();
  const author = overrideAuthorInput.value.trim();
  const year = overrideYearInput.value.trim();
  const skip = overrideSkipInput.value.trim();

  if (title) song.t = title;
  if (author) song.a = author;
  if (year) {
    const parsed = Math.trunc(Number(year));
    if (!isNaN(parsed)) song.y = parsed;
  }
  if (skip) {
    const parsed = Math.trunc(Number(skip));
    if (!isNaN(parsed)) (song as Song & { skip?: number }).skip = parsed;
  }

  overrideModal.classList.add("hidden");
  addSong(song);
}

function cancelOverride(): void {
  overrideModal.classList.add("hidden");
}

function pickResult(results: ITunesTrack[], idx: number): void {
  stopAudio();
  const track = results[idx];
  const song = trackToSong(track);

  const similar = findSimilarSongs(song.t, existingSongs);
  if (similar.length > 0) {
    const dups = similar.map((s) => `${s.t} - ${s.a} (${s.y})`).join("\n");
    if (!confirm(`⚠️ Possible duplicate(s):\n${dups}\n\nProceed anyway?`)) {
      log(`Skipped "${song.t}" - user declined duplicate.`, "skipped");
      processNext();
      return;
    }
  }

  addSong(song);
}

function editAndPickResult(results: ITunesTrack[], idx: number): void {
  stopAudio();
  const track = results[idx];
  const song = trackToSong(track);

  const similar = findSimilarSongs(song.t, existingSongs);
  if (similar.length > 0) {
    const dups = similar.map((s) => `${s.t} - ${s.a} (${s.y})`).join("\n");
    if (!confirm(`⚠️ Possible duplicate(s):\n${dups}\n\nProceed anyway?`)) {
      log(`Skipped "${song.t}" - user declined duplicate.`, "skipped");
      processNext();
      return;
    }
  }

  showOverrideModal(song, results, idx);
}

function showResults(results: ITunesTrack[], query: string): void {
  currentQueryEl.textContent = `🔍 "${query}"`;
  currentQueryRow.classList.remove("hidden");
  actionsBar.classList.remove("hidden");
  resultsContainer.innerHTML = "";

  const wikiQuery = encodeURIComponent(query);
  wikiFrame.src = `https://en.m.wikipedia.org/w/index.php?search=${wikiQuery}&go=Go`;
  wikiPanel.classList.remove("hidden");

  if (results.length === 0) {
    resultsContainer.innerHTML = '<div style="color:#e74c3c;">No results found.</div>';
    return;
  }

  let dupCount = 0;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const year = r.releaseDate?.slice(0, 4) ?? "????";
    const similar = findSimilarSongs(r.trackName, existingSongs);
    const authorSongs = findByAuthor(r.artistName, existingSongs);

    if (similar.length > 0) dupCount++;

    const card = document.createElement("div");
    card.className = "result-card";
    card.innerHTML = `
      <div class="info">
        <div class="title">${escapeHtml(r.trackName)}</div>
        <div class="meta">${escapeHtml(r.artistName)} · ${year} · <a href="${escapeAttr(r.trackViewUrl || "#")}" target="_blank" rel="noopener noreferrer" style="color:#6c63ff;">ID: ${r.trackId}</a></div>
        ${
          similar.length > 0
            ? `<div class="dup-tag">⚠️ DUP: ${similar.map((s) => `${s.t} (${s.y})`).join(", ")}</div>`
            : authorSongs.some((s) => String(s.y) === year)
              ? `<div class="dup-tag">⚠️ Same year by author: ${authorSongs
                  .filter((s) => String(s.y) === year)
                  .map((s) => `${s.t} (${s.y})`)
                  .join(", ")}</div>`
              : ""
        }
        ${authorSongs.length > 0 ? `<div class="author-count" title="${escapeAttr(authorSongs.map((s) => `${s.t} - ${s.y}`).join("\n"))}">ℹ️ ${r.artistName}: ${authorSongs.length} song(s) in library</div>` : ""}
      </div>
      <button class="preview-btn" data-preview="${escapeAttr(r.previewUrl || "")}">🔊</button>
      <button class="edit-btn" data-index="${i}">✏️</button>
      <button class="pick-btn" data-index="${i}">✓ Pick</button>
    `;
    resultsContainer.append(card);
  }

  if (dupCount >= 3) {
    log(`Skipped "${query}" - too many duplicates (${dupCount}/5).`, "skipped");
    processNext();
    return;
  }

  resultsContainer.querySelectorAll(".preview-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const url = (btn as HTMLElement).dataset.preview;
      if (url) playPreview(url);
      else alert("No preview available for this track.");
    });
  });
  resultsContainer.querySelectorAll(".pick-btn").forEach((btn) => {
    btn.addEventListener("click", () =>
      pickResult(results, Math.trunc(Number((btn as HTMLElement).dataset.index!))),
    );
  });
  resultsContainer.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", () =>
      editAndPickResult(results, Math.trunc(Number((btn as HTMLElement).dataset.index!))),
    );
  });
}

function scrollSourceToCurrentLine(): void {
  // Place the cursor at the start of the current line so the textarea scrolls it into view
  const lines = sourceInput.value.split("\n");
  let pos = 0;
  for (let i = 0; i < queryIndex && i < lines.length; i++) {
    pos += lines[i].length + 1; // +1 for the newline character
  }
  sourceInput.selectionStart = pos;
  sourceInput.selectionEnd = pos;
  sourceInput.focus();
  // Use scrollTop calculation as a fallback to position the line at the top
  const lineHeight = Number(getComputedStyle(sourceInput).lineHeight) || 18;
  sourceInput.scrollTop = queryIndex * lineHeight;
}

async function processCurrentQuery(): Promise<void> {
  const query = queries[queryIndex];
  statusText.textContent = `Processing ${queryIndex + 1}/${queries.length}: "${query}"`;
  scrollSourceToCurrentLine();
  try {
    const results = await searchItunes(query);
    showResults(results, query);
  } catch (err) {
    log(`Error searching "${query}": ${(err as Error).message}`, "error");
    processNext();
  }
}

function finish(): void {
  stopAudio();
  currentQueryRow.classList.add("hidden");
  actionsBar.classList.add("hidden");
  wikiPanel.classList.add("hidden");
  wikiFrame.src = "";
  resultsContainer.innerHTML = "";
  startBtn.disabled = false;
  statusText.textContent = `Done! ${newSongs.length} song(s) added. Use "Save & Stop" to download.`;
  log(`--- Finished. ${newSongs.length} new song(s) total. ---`, "info");
}

// Start processing
startBtn.addEventListener("click", async () => {
  const text = sourceInput.value.trim();
  if (!text) {
    alert("Enter at least one search query.");
    return;
  }

  queries = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  queryIndex = 0;
  startBtn.disabled = true;
  logPanel.innerHTML = "";
  newSongs = [];
  updateNewSongsUI();

  statusText.textContent = "Loading existing songs...";
  await loadExistingSongs();

  processCurrentQuery();
});

// Stop audio button
stopBtn.addEventListener("click", () => {
  stopAudio();
});

// Skip button
skipBtn.addEventListener("click", () => {
  log(`Skipped "${queries[queryIndex]}".`, "skipped");
  processNext();
});

// Change query button
changeQueryBtn.addEventListener("click", () => {
  const current = queries[queryIndex];
  const newQuery = prompt("Edit query:", current);
  if (newQuery !== null && newQuery.trim() !== "") {
    queries[queryIndex] = newQuery.trim();
    processCurrentQuery();
  }
});

// Save & Stop
saveBtn.addEventListener("click", async () => {
  if (newSongs.length === 0) {
    alert("No new songs to save.");
    return;
  }

  const targetFile = songFileSelect.value;
  statusText.textContent = `Saving to ${targetFile}...`;

  try {
    const resp = await fetch(`/api/songs?file=${targetFile}`);
    let songs: Song[] = [];
    if (resp.ok) {
      songs = await resp.json();
    }
    songs.push(...newSongs);
    sortSongs(songs);
    const content = formatSongsJson(songs);

    const saveResp = await fetch(`/api/songs?file=${targetFile}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: content,
    });

    if (!saveResp.ok) {
      const err = await saveResp.json();
      throw new Error(err.error || "Save failed");
    }

    const result: { count: number } = await saveResp.json();
    log(`💾 Saved ${targetFile}: ${newSongs.length} new songs, ${result.count} total.`, "added");
    statusText.textContent = `Saved! Written to assets/${targetFile} (${result.count} songs total).`;
    newSongs = [];
    updateNewSongsUI();
    stopAudio();

    // Remove processed lines from source input and re-enable start
    const remaining = queries.slice(queryIndex);
    sourceInput.value = remaining.join("\n");
    queries = [];
    queryIndex = 0;
    startBtn.disabled = false;
    currentQueryRow.classList.add("hidden");
    actionsBar.classList.add("hidden");
    wikiPanel.classList.add("hidden");
    wikiFrame.src = "";
    resultsContainer.innerHTML = "";
  } catch (err) {
    log(`Error saving: ${(err as Error).message}`, "error");
    statusText.textContent = "Save failed. See log.";
  }
});

// Override modal events
overrideConfirmBtn.addEventListener("click", confirmOverride);
overrideCancelBtn.addEventListener("click", cancelOverride);
overrideModal.addEventListener("keydown", (e: KeyboardEvent) => {
  if (e.key === "Enter") confirmOverride();
  if (e.key === "Escape") cancelOverride();
});

// Initialize
await loadSongFiles();
