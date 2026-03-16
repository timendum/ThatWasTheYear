import songs from "../assets/songs.json";
import type { Song } from "../src/types";

async function checkSong(song: Song) {
  const resp = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(song.a + " " + song.t)}&limit=1&entity=song`,
  );
  const data = await resp.json();
  const result = data.results?.[0];

  const found = !!result;
  const hasPreview = !!result?.previewUrl;
  const hasArtwork = !!result?.artworkUrl100;

  const titleMatch = found && result.trackName?.toLowerCase() === song.t.toLowerCase();
  const artistMatch = found && result.artistName?.toLowerCase() === song.a.toLowerCase();

  let releaseYear = null;
  if (found && result.releaseDate) {
    releaseYear = new Date(result.releaseDate).getFullYear();
  }
  const yearMatch = releaseYear === song.y;

  return {
    song,
    found,
    hasPreview,
    hasArtwork,
    titleMatch,
    artistMatch,
    yearMatch,
    fetchedTitle: result?.trackName || null,
    fetchedArtist: result?.artistName || null,
    fetchedYear: releaseYear,
    itunesId: result?.trackId || null,
  };
}

async function main() {
  console.log(`Checking ${songs.length} songs...\n`);

  const results = [];
  for (let i = 0; i < songs.length; i++) {
    const result = await checkSong(songs[i]);
    results.push(result);

    if (!result.found) {
      console.log(
        `[${i + 1}/${songs.length}] ❌ NOT FOUND: ${result.song.t} - ${result.song.a} (${result.song.y})`,
      );
    } else if (!result.titleMatch || !result.artistMatch || !result.yearMatch) {
      console.log(
        `[${i + 1}/${songs.length}] ⚠️  MISMATCH: ${result.song.t} - ${result.song.a} (${result.song.y})`,
      );
      if (!result.titleMatch) {
        console.log(`   Title: "${result.song.t}" vs "${result.fetchedTitle}"`);
      }
      if (!result.artistMatch) {
        console.log(`   Artist: "${result.song.a}" vs "${result.fetchedArtist}"`);
      }
      if (!result.yearMatch) console.log(`   Year: ${result.song.y} vs ${result.fetchedYear}`);
    } else if (!result.hasPreview || !result.hasArtwork) {
      console.log(`[${i + 1}/${songs.length}] ⚠️  ${result.song.t} - ${result.song.a}`);
      console.log(`   Preview: ${result.hasPreview}, Artwork: ${result.hasArtwork}`);
    } else {
      console.log(`[${i + 1}/${songs.length}] ✓ ${result.song.t} - ${result.song.a}`);
    }

    await new Promise((resolve) => {
      setTimeout(resolve, (1000 * 60) / 20);
    });
  }

  const notFound = results.filter((r) => !r.found);
  const noPreview = results.filter((r) => r.found && !r.hasPreview);
  const noArtwork = results.filter((r) => r.found && !r.hasArtwork);
  const mismatch = results.filter(
    (r) => r.found && (!r.titleMatch || !r.artistMatch || !r.yearMatch),
  );

  console.log(`\n=== Summary ===`);
  console.log(`Total: ${songs.length}`);
  console.log(`Found: ${results.filter((r) => r.found).length}`);
  console.log(`Not found: ${notFound.length}`);
  console.log(`Mismatches: ${mismatch.length}`);
  console.log(`No preview: ${noPreview.length}`);
  console.log(`No artwork: ${noArtwork.length}`);

  const outputData = results.map((r) => ({
    t: r.fetchedTitle || r.song.t,
    a: r.fetchedArtist || r.song.a,
    y: r.fetchedYear || r.song.y,
    itunesId: r.itunesId,
  }));

  await Bun.write("./assets/songs-checked.json", JSON.stringify(outputData, null, 2));
  console.log(`\nWrote results to ./assets/songs-checked.json`);
}

main();
