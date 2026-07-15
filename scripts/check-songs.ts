import type { ITunesTrack, Song } from "../src/types.ts";
import { getDetailedITunesSong } from "../src/songService.ts";
import { loadSongsFromArgs } from "./lib/load-songs.ts";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function checkSong(song: Song, track: ITunesTrack | undefined) {
  // If track not found on iTunes, return all-false result
  if (!track) {
    return {
      ...song,
      check: {
        found: false,
        mp: false,
        mi: false,
        mt: false,
        ma: false,
        my: 1000,
      },
      track,
    };
  }

  // Strip ", Pt. N" and "[nnnn Remaster]" unconditionally, then lowercase
  const tt = (track.trackName || "")
    .replace(/,\s*Pt\.\s*\d+\s*$/iu, "")
    .replace(/\s*\[\d{4}\s+Remaster\]\s*$/iu, "")
    .toLowerCase();
  const ta = (track.artistName || "").toLowerCase();
  const st = song.t.toLowerCase();
  const sa = song.a.toLowerCase();

  // Strip trailing parenthetical (e.g. "(Remastered 2012)")
  const normalize = (s: string) => s.replace(/\s*\([^)]+\)\s*$/u, "");

  const featMatch = tt.match(/\s*\((feat\.?\s+[^)]+)\)\s*$/u);
  let titleMatch: boolean;
  let artistMatch: boolean;

  if (featMatch) {
    titleMatch = normalize(tt) === st;
    artistMatch = sa === `${ta} ${featMatch[1]}`;
    titleMatch = titleMatch && artistMatch;
  } else {
    titleMatch = tt === st || normalize(tt) === st;
    artistMatch = ta === sa;
  }

  // Compare release year
  const releaseYear = track.releaseDate ? new Date(track.releaseDate).getFullYear() : null;

  return {
    ...song,
    itunesId: track.trackId || song.itunesId,
    check: {
      found: true,
      mp: !!track.previewUrl?.startsWith("http"), // has playable preview
      mi: !!track.artworkUrl100?.startsWith("http"), // has artwork image
      mt: titleMatch,
      ma: artistMatch,
      my: releaseYear ? Math.abs(releaseYear - song.y) : 100,
    },
    track,
  };
}

async function loadExisting(): Promise<Map<string, Song>> {
  const map = new Map();
  try {
    const text = await Deno.readTextFile("./assets/ok-songs.json");
    const data = JSON.parse(text);
    for (const entry of data) {
      map.set(`${entry.t}|||${entry.a}`, entry);
    }
  } catch {
    // File doesn't exist or can't be parsed — start fresh
  }
  return map;
}

const sortKey = (s: string) => s.replace(/^(?:The|An|A) /iu, "").toLowerCase();

async function saveResults(songs: Song[]) {
  const outputData = [...songs];
  outputData.sort(
    (a, b) => sortKey(a.t).localeCompare(sortKey(b.t)) || sortKey(a.a).localeCompare(sortKey(b.a)),
  );
  const jsonLines = outputData
    .map((song) =>
      JSON.stringify({
        t: song.t,
        a: song.a,
        y: song.y,
        itunesId: song.itunesId,
      }),
    )
    .join(",\n");
  await Deno.writeTextFile("./assets/ok-songs.json", `[\n${jsonLines}\n]`);
  console.log(`\nWrote ${outputData.length} results to ./assets/ok-songs.json`);
}

async function main() {
  const existing = await loadExisting();
  console.log(`Found ${existing.size} already-accepted songs.`);
  const songs = await loadSongsFromArgs();
  console.log(`Checking ${songs.length} songs...\n`);

  const ask = (question: string): string | null => prompt(question);

  let i = 0;
  const okSongs: Song[] = [];
  while (i < songs.length) {
    const song = songs[i];
    const key = `${song.t}|||${song.a}`;
    const fromDB = existing.get(key);
    if (fromDB) {
      okSongs.push(fromDB);
      i++;
      continue;
    }
    const track = await getDetailedITunesSong(song);
    if (track) {
      await delay((60 * 1000) / 20);
    }

    const result = checkSong(song, track);

    const isFullMatch =
      result.check.found &&
      result.check.mp &&
      result.check.mi &&
      result.check.mt &&
      result.check.ma &&
      result.check.my === 0;

    if (isFullMatch) {
      okSongs.push(result);
      existing.set(key, result);
      console.log(`[${i + 1}/${songs.length}] ✅ ACCEPTED: ${result.t} - ${result.a}`);
      i++;
    } else {
      const trackInfo = result.track
        ? `${result.track.trackName} - ${result.track.artistName} (${result.track.releaseDate?.slice(
            0,
            4,
          )})`
        : "Not found";
      console.log(`DB: ${song.t} - ${song.a} (${song.y})`);
      console.log(`iTunes: ${trackInfo}`);
      console.log(
        `Matches: found=${result.check.found ? "✅" : "❌"}, ` +
          `preview=${result.check.mp ? "✅" : "❌"}, ` +
          `artwork=${result.check.mi ? "✅" : "❌"}, ` +
          `title=${result.check.mt ? "✅" : "❌"}, ` +
          `artist=${result.check.ma ? "✅" : "❌"}, ` +
          `year=${result.check.my === 0 ? "✅" : result.check.my === 1 ? "⚠️" : "❌"}`,
      );
      const answer = ask("Overwrite? (y/n) or provide new iTunes ID or quit: ") ?? "";
      if (answer.toLowerCase() === "y") {
        console.log(`Accepted: ${trackInfo}`);
        if (result.track && result.itunesId) {
          okSongs.push({
            t: result.track.trackName,
            a: result.track.artistName,
            y: new Date(result.track.releaseDate).getFullYear(),
            itunesId: result.track.trackId,
          });
          existing.set(key, result);
          i++;
        } else {
          console.log("No iTunes ID, cannot accept. Again.");
        }
      } else if (answer.toLowerCase() === "n") {
        console.log(`Keeping: ${song.t} - ${song.a} (${song.y})`);
        if (result.itunesId) {
          okSongs.push(song);
          existing.set(key, song);
          i++;
        } else {
          console.log("No iTunes ID, cannot accept. Again.");
        }
      } else if (/^\d+$/u.test(answer.trim())) {
        song.itunesId = Math.trunc(Number(answer.trim()));
        console.log(`Set new iTunes ID: ${song.itunesId}, rechecking...`);
        // don't increment i
      } else if (answer.toLowerCase() === "q") {
        i = songs.length;
      } else {
        console.log("What? Again.");
      }
    }
  }

  console.log(`\nAccepted: ${okSongs.length}`);
  await saveResults(okSongs);
}

await main();
