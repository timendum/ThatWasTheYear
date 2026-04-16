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
  const newSongs: Song[] = [];

  while (true) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const query = await rl.question("Search query: ");
    if (!query.trim()) {
      rl.close();
      break;
    }

    const results = await searchItunes(query);
    if (results.length === 0) {
      console.log("No results found.");
      rl.close();
      break;
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
      break;
    }

    const track = results[idx];
    const song: Song = {
      t: track.trackName,
      a: track.artistName,
      y: new Date(track.releaseDate).getFullYear(),
      itunesId: track.trackId,
    };

    // Ask for optional overrides
    const rlOverride = createInterface({ input: process.stdin, output: process.stdout });

    const overrideTitle = await rlOverride.question(`Title [${song.t}]: `);
    if (overrideTitle.trim()) {
      song.t = overrideTitle.trim();
    }

    const overrideAuthor = await rlOverride.question(`Author [${song.a}]: `);
    if (overrideAuthor.trim()) {
      song.a = overrideAuthor.trim();
    }

    const overrideYear = await rlOverride.question(`Year [${song.y}]: `);
    if (overrideYear.trim()) {
      const parsed = parseInt(overrideYear.trim(), 10);
      if (!isNaN(parsed)) {
        song.y = parsed;
      }
    }

    rlOverride.close();

    console.log(`✅ Adding: ${song.t} - ${song.a} (${song.y})`);
    newSongs.push(song);
  }
  if (newSongs.length > 0) {
    const filename = (process.argv.slice(2, 3) || DEFAULT_FILES)[0];
    const songs: Song[] = await loadSongsFromArgs([filename]);
    songs.push(...newSongs);
    songs.sort(
      (a, b) =>
        sortKey(a.t).localeCompare(sortKey(b.t)) || sortKey(a.a).localeCompare(sortKey(b.a)),
    );

    const jsonLines = songs.map((s) => JSON.stringify(s)).join(",\n");
    await Bun.write(filename, `[\n${jsonLines}\n]\n`);
    console.log(`✅ Saved: ${newSongs.length} new songs - total ${songs.length} songs`);
  }
}

await main();
