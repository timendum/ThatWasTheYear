import songs from "../assets/songs.json";
import type { Song } from "../src/types";
import { getDetailedITunesSong } from "../src/gameState";

async function checkSong(song: Song) {
  const result = await getDetailedITunesSong(song);

  const found = !!result;
  const hasPreview = result?.previewUrl?.startsWith("http");
  const hasArtwork = result?.artworkUrl100?.startsWith("http");

  const normalize = (s: string) => s.replace(/\s*\([^)]+\)\s*$/, "").toLowerCase();
  const titleMatch =
    found &&
    (result.trackName?.toLowerCase() === song.t.toLowerCase() ||
      normalize(result.trackName || "") === normalize(song.t));
  const artistMatch = found && result.artistName?.toLowerCase() === song.a.toLowerCase();

  let releaseYear = null;
  if (found && result.releaseDate) {
    releaseYear = new Date(result.releaseDate).getFullYear();
  }
  const yearMatch = releaseYear === song.y;

  return {
    ...song,
    itunesId: result?.trackId || song.itunesId,
    found,
    mp: hasPreview,
    mi: hasArtwork,
    mt: titleMatch,
    ma: artistMatch,
    my: yearMatch,
    ft: result?.trackName || null, // fetchedTitle
    fa: result?.artistName || null, // fetchedArtist
    fy: releaseYear, // fetchedYear
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

async function saveResults(existing: Map<string, unknown>) {
  const outputData = [...existing.values()] as { t: string; a: string }[];
  outputData.sort(
    (a, b) => sortKey(a.t).localeCompare(sortKey(b.t)) || sortKey(a.a).localeCompare(sortKey(b.a)),
  );
  const lines = outputData.map((entry) => `  ${JSON.stringify(entry)}`);
  await Bun.write("./assets/songs-checked.json", `[\n${lines.join(",\n")}\n]`);
  console.log(`\nWrote ${outputData.length} results to ./assets/songs-checked.json`);
}

async function main() {
  const existing = await loadExisting();
  console.log(`Found ${existing.size} already-checked songs.`);
  console.log(`Checking ${songs.length} songs...\n`);

  process.on("SIGINT", async () => {
    console.log("\n\nInterrupted, saving progress...");
    await saveResults(existing);
    process.exit(0);
  });

  const results: CheckedSong[] = [];
  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];
    const key = `${song.t}|||${song.a}`;
    if (existing.has(key)) {
      console.log(`[${i + 1}/${songs.length}] SKIP: ${song.t} - ${song.a}`);
      continue;
    }

    const result = await checkSong(song);
    results.push(result);

    existing.set(key, result);

    if (!result.found) {
      console.log(
        `[${i + 1}/${songs.length}] ❌ NOT FOUND: ${result.t} - ${result.a} (${result.y})`,
      );
    } else if (!result.mt || !result.ma || !result.my) {
      console.log(
        `[${i + 1}/${songs.length}] ⚠️  MISMATCH: ${result.t} - ${result.a} (${result.y})`,
      );
      if (!result.mt) {
        console.log(`   Title: "${result.t}" vs "${result.ft}"`);
      }
      if (!result.ma) {
        console.log(`   Artist: "${result.a}" vs "${result.fa}"`);
      }
      if (!result.my) console.log(`   Year: ${result.y} vs ${result.fy}`);
    } else if (!result.mp || !result.mi) {
      console.log(`[${i + 1}/${songs.length}] ⚠️  ${result.t} - ${result.a}`);
      console.log(`   Preview: ${result.mp}, Artwork: ${result.ma}`);
    } else {
      console.log(`[${i + 1}/${songs.length}] ✓ ${result.t} - ${result.a}`);
    }

    await new Promise((resolve) => {
      setTimeout(resolve, (1000 * 60) / 20);
    });
  }

  console.log(`\n=== Summary (this run: ${results.length} new) ===`);
  const notFound = results.filter((r) => !r.found);
  const mismatch = results.filter((r) => r.found && (!r.mt || !r.ma || !r.my));
  console.log(`Checked: ${results.length}`);
  console.log(`Not found: ${notFound.length}`);
  console.log(`Mismatches: ${mismatch.length}`);

  await saveResults(existing);
}

main();
