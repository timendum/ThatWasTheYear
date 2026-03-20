import type { ITunesTrack, Song } from "../src/types";
import songs from "../assets/songs.json";
import { getDetailedITunesSong } from "../src/gameState";

async function checkSong(song: Song, track: ITunesTrack | undefined) {
  // If track not found on iTunes, return all-false result
  if (!track) {
    return {
      ...song,
      check: { found: false, mp: false, mi: false, mt: false, ma: false, my: false },
      track,
    };
  }

  // Strip ", Pt. N" and "[nnnn Remaster]" unconditionally, then lowercase
  const tt = (track.trackName || "")
    .replace(/,\s*Pt\.\s*\d+\s*$/i, "")
    .replace(/\s*\[\d{4}\s+Remaster\]\s*$/i, "")
    .toLowerCase();
  const ta = (track.artistName || "").toLowerCase();
  const st = song.t.toLowerCase();
  const sa = song.a.toLowerCase();

  // Strip trailing parenthetical (e.g. "(Remastered 2012)")
  const normalize = (s: string) => s.replace(/\s*\([^)]+\)\s*$/, "");

  const featMatch = tt.match(/\s*\((feat\.?\s+[^)]+)\)\s*$/);
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
      my: !!(releaseYear && Math.abs(releaseYear - song.y) <= 1),
    },
    track,
  };
}

type CheckedSong = Awaited<ReturnType<typeof checkSong>>;

async function loadExisting(): Promise<Map<string, CheckedSong>> {
  const map = new Map();
  const file = Bun.file("./assets/songs-checked.json");
  if (await file.exists()) {
    const data = await file.json();
    for (const entry of data) {
      map.set(`${entry.t}|||${entry.a}`, entry);
    }
  }
  return map;
}

const sortKey = (s: string) => s.replace(/^The /i, "").toLowerCase();

async function saveResults(existing: Map<string, CheckedSong>) {
  const outputData = [...existing.values()];
  outputData.sort(
    (a, b) => sortKey(a.t).localeCompare(sortKey(b.t)) || sortKey(a.a).localeCompare(sortKey(b.a)),
  );
  await Bun.write("./assets/songs-checked.json", JSON.stringify(outputData));
  console.log(`\nWrote ${outputData.length} results to ./assets/songs-checked.json`);
}

async function main() {
  const existing = await loadExisting();
  console.log(`Found ${existing.size} already-checked songs.`);
  console.log(`Checking ${songs.length} songs...\n`);

  process.on("SIGINT", async () => {
    console.error("\n\nInterrupted, saving progress...");
    try {
      await saveResults(existing);
    } catch (e){
    console.log("Error while saving results:", e)}
    process.exit(0);
  });

  const results: CheckedSong[] = [];
  for (let i = 0; i < songs.length; i++) {
    let track: ITunesTrack | undefined = undefined;
    const song = songs[i];
    const key = `${song.t}|||${song.a}`;
    const ex = existing.get(key);
    if (ex && ex.track && ex.track.trackId == song.itunesId) {
      track = ex.track;
    }
    if (!track) {
      track = await getDetailedITunesSong(song);
      // Timeout for throttling iTunes calls
      await new Promise((resolve) => {
        setTimeout(resolve, (1000 * 60) / 20);
      });
    }

    const result = await checkSong(song, track);
    results.push(result);

    existing.set(key, result);

    const idOk = result.itunesId && result.itunesId == song.itunesId ? "🔗" : "🔍";

    if (!result.check.found) {
      console.log(
        `[${i + 1}/${songs.length}] ❌ NOT FOUND: ${result.t} - ${result.a} (${result.y})`,
      );
    } else if (!result.check.mt || !result.check.ma || !result.check.my) {
      console.log(
        `[${i + 1}/${songs.length}] ${idOk} MISMATCH: ${result.t} - ${result.a} (${result.y})`,
      );
      if (!result.check.mt) {
        console.log(`   Title: "${result.t}" vs "${result.track?.trackName}"`);
      }
      if (!result.check.ma) {
        console.log(`   Artist: "${result.a}" vs "${result.track?.artistName}"`);
      }
      if (!result.check.my)
        console.log(`   Year: ${result.y} vs ${result.track?.releaseDate.substring(0, 4)}`);
    } else if (!result.check.mp || !result.check.mi) {
      console.log(`[${i + 1}/${songs.length}] ⚠️  ${result.t} - ${result.a}`);
      console.log(`   Preview: ${result.check.mp}, Artwork: ${result.check.ma}`);
    } else {
      console.log(`[${i + 1}/${songs.length}] ${idOk} ${result.t} - ${result.a}`);
    }
  }

  console.log(`\n=== Summary (this run: ${results.length} new) ===`);
  const notFound = results.filter((r) => !r.check.found);
  const mismatch = results.filter(
    (r) => r.check.found && (!r.check.mt || !r.check.ma || !r.check.my),
  );
  console.log(`Checked: ${results.length}`);
  console.log(`Not found: ${notFound.length}`);
  console.log(`Mismatches: ${mismatch.length}`);

  await saveResults(existing);
}

main();
