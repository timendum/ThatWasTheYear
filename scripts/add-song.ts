import { createInterface } from "node:readline/promises";
import type { ITunesResponse, ITunesTrack, Song } from "../src/types";
import { loadSongsFromArgs, DEFAULT_FILES } from "./lib/load-songs";

async function searchItunes(query: string): Promise<ITunesTrack[]> {
  const resp = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&limit=5&entity=song`,
  );
  if (resp.status !== 200) throw new Error("iTunes API error: status = " + resp.status);
  const data = (await resp.json()) as ITunesResponse;
  return data.results;
}

const sortKey = (s: string) => s.replace(/^(?:The|An|A) /i, "").toLowerCase();

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const query = await rl.question("Search query: ");
  if (!query.trim()) {
    rl.close();
    return;
  }

  const results = await searchItunes(query);
  if (results.length === 0) {
    console.log("No results found.");
    rl.close();
    return;
  }

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const year = r.releaseDate?.slice(0, 4) ?? "????";
    console.log(`  ${i + 1}) ${r.trackName} - ${r.artistName} (${year}) [${r.trackId}]`);
  }

  const pick = await rl.question("Pick a number (or empty to cancel): ");
  rl.close();

  const idx = parseInt(pick, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= results.length) {
    console.log("Cancelled.");
    return;
  }

  const track = results[idx];
  const newSong: Song = {
    t: track.trackName,
    a: track.artistName,
    y: new Date(track.releaseDate).getFullYear(),
    itunesId: track.trackId,
  };
  const filename = (process.argv.slice(2, 3) || DEFAULT_FILES)[0];

  const songs: Song[] = await loadSongsFromArgs([filename]);
  songs.push(newSong);
  songs.sort(
    (a, b) => sortKey(a.t).localeCompare(sortKey(b.t)) || sortKey(a.a).localeCompare(sortKey(b.a)),
  );

  const jsonLines = songs.map((s) => JSON.stringify(s)).join(",\n");
  await Bun.write(filename, `[\n${jsonLines}\n]\n`);
  console.log(`✅ Added: ${newSong.t} - ${newSong.a} (${newSong.y})`);
}

await main();
