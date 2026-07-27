/// <reference lib="deno.ns" />

/**
 * Interactive CLI script to add songs to the song library.
 *
 * Searches the iTunes API by query, lets the user pick a result,
 * optionally override title/artist/year, then appends the new entry
 * to the target songs JSON file (default: assets/songs.json).
 *
 * Usage:
 *   deno task add-song [songsFile]          Interactive mode (prompts for queries)
 *   deno task add-song --txt queries.txt    Batch mode (one query per line)
 */

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import type { ITunesResponse, ITunesTrack, Song } from "../src/types.ts";
import { DEFAULT_FILES, loadSongsFromArgs } from "./lib/load-songs.ts";
import { normalizeTitle } from "./lib/normalize.ts";

/** Check if a title is similar to any song already in the library. */
function findSimilarSongs(title: string, existingSongs: Song[]): Song[] {
  const normalized = normalizeTitle(title);
  return existingSongs.filter((s) => normalizeTitle(s.t) === normalized);
}

async function searchItunes(query: string): Promise<ITunesTrack[]> {
  const resp = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&limit=5&entity=song`,
  );
  if (resp.status !== 200) {
    throw new Error("iTunes API error: status = " + resp.status);
  }
  const data = (await resp.json()) as ITunesResponse;
  return data.results;
}

const sortKey = (s: string) => s.replace(/^(?:The|An|A) /iu, "").toLowerCase();

function parseArgs(): { txtFile: string | null; songFile: string | null } {
  let txtFile: string | null = null;
  let songFile: string | null = null;
  const args = [...Deno.args];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--txt" && i + 1 < args.length) {
      txtFile = args[i + 1];
      i++;
    } else if (!songFile) {
      songFile = args[i];
    }
  }
  return { txtFile, songFile };
}

async function* querySource(txtFile: string | null): AsyncGenerator<string> {
  if (txtFile) {
    const content = await Deno.readTextFile(txtFile);
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed) yield trimmed;
    }
  } else {
    while (true) {
      const rl = createInterface({
        input: stdin,
        output: stdout,
        terminal: false,
      });
      const query = await rl.question("Search query: ");
      rl.close();
      if (!query.trim()) break;
      yield query.trim();
    }
  }
}

async function main() {
  const { txtFile, songFile } = parseArgs();
  const targetFile = songFile ?? DEFAULT_FILES[0];
  const newSongs: Song[] = [];

  // Load existing songs from target file and songs.json (if different) for duplicate detection
  const filesToCheck = [targetFile];
  if (targetFile !== DEFAULT_FILES[0]) {
    filesToCheck.push(DEFAULT_FILES[0]);
  }
  const existingSongs: Song[] = await loadSongsFromArgs(filesToCheck);

  for await (const query of querySource(txtFile)) {
    if (txtFile) {
      console.log(`\nSearch query: ${query}`);
    }
    const results = await searchItunes(query);
    if (results.length === 0) {
      console.log(`No results found for "${query}".`);
      break;
    }

    console.log("  0) skip");
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const year = r.releaseDate?.slice(0, 4) ?? "????";
      const dup = findSimilarSongs(r.trackName, existingSongs);
      const dupTag = dup.length > 0 ? " ⚠️ DUP" : "";
      console.log(`  ${i + 1}) ${r.trackName} - ${r.artistName} (${year}) [${r.trackId}]${dupTag}`);
    }

    const rl = createInterface({
      input: stdin,
      output: stdout,
      terminal: false,
    });
    const pick = await rl.question("Pick a number (or q to quit): ");
    rl.close();
    if (pick.trim().toLowerCase() == "q") {
      console.log("Cancelled.");
      break;
    }

    const idx = Math.trunc(Number(pick)) - 1;
    if (isNaN(idx) || idx < 0 || idx >= results.length) {
      console.log("Skipped.");
      continue;
    }

    const track = results[idx];
    const song: Song = {
      t: track.trackName,
      a: track.artistName,
      y: new Date(track.releaseDate).getFullYear(),
      itunesId: track.trackId,
    };

    // Check for duplicate by actual track title (may differ from search query)
    const similarByTrack = findSimilarSongs(song.t, existingSongs);
    if (similarByTrack.length > 0) {
      console.log(`⚠️  Possible duplicate(s) for "${song.t}":`);
      for (const s of similarByTrack) {
        console.log(`   • ${s.t} - ${s.a} (${s.y})`);
      }
      const rlDup = createInterface({
        input: stdin,
        output: stdout,
        terminal: false,
      });
      const dupAnswer = await rlDup.question("Proceed anyway? (y/n): ");
      rlDup.close();
      if (dupAnswer.trim().toLowerCase() !== "y") {
        console.log("Skipped.");
        continue;
      }
    }

    // Ask for optional overrides
    const rlOverride = createInterface({
      input: stdin,
      output: stdout,
      terminal: false,
    });

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
      const parsed = Math.trunc(Number(overrideYear.trim()));
      if (!isNaN(parsed)) {
        song.y = parsed;
      }
    }
    const skip = (await rlOverride.question(`Skip? `)).trim();
    if (skip) {
      const parsed = Math.trunc(Number(overrideYear.trim()));
      if (!isNaN(parsed)) {
        song.skip = parsed;
      }
    }

    rlOverride.close();

    console.log(`✅ Adding: ${song.t} - ${song.a} (${song.y})`);
    newSongs.push(song);
    existingSongs.push(song);
  }
  if (newSongs.length > 0) {
    const filename = targetFile;
    const songs: Song[] = await loadSongsFromArgs([filename]);
    songs.push(...newSongs);
    songs.sort(
      (a, b) =>
        sortKey(a.t).localeCompare(sortKey(b.t)) || sortKey(a.a).localeCompare(sortKey(b.a)),
    );

    const jsonLines = songs.map((s) => JSON.stringify(s)).join(",\n");
    await Deno.writeTextFile(filename, `[\n${jsonLines}\n]\n`);
    console.log(`✅ Saved: ${newSongs.length} new songs - total ${songs.length} songs`);
  }
}

await main();
