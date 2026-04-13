import songs from "../assets/songs.json";

let errors = 0;

if (!Array.isArray(songs)) {
  console.error("songs.json must be an array");
  process.exit(1);
}

for (let i = 0; i < songs.length; i++) {
  const song = songs[i];
  const prefix = `[${i}]`;

  if (typeof song.t !== "string" || song.t.length === 0) {
    console.error(`${prefix} missing or invalid title "t": ${JSON.stringify(song)}`);
    errors++;
  }
  if (typeof song.a !== "string" || song.a.length === 0) {
    console.error(`${prefix} missing or invalid artist "a": ${JSON.stringify(song)}`);
    errors++;
  }
  if (typeof song.y !== "number" || !Number.isInteger(song.y) || song.y < 1900 || song.y > 2100) {
    console.error(`${prefix} missing or invalid year "y": ${JSON.stringify(song)}`);
    errors++;
  }
  if (typeof song.itunesId !== "number" || !Number.isInteger(song.itunesId)) {
    console.error(`${prefix} missing or invalid itunesId: ${JSON.stringify(song)}`);
    errors++;
  }

  const extra = Object.keys(song).filter((k) => !["t", "a", "y", "itunesId"].includes(k));
  if (extra.length > 0) {
    console.error(`${prefix} unexpected keys: ${extra.join(", ")} in : ${JSON.stringify(song)}`);
    errors++;
  }
}

// Check for duplicates (same title + artist)
const seen = new Set<string>();
for (let i = 0; i < songs.length; i++) {
  const key = `${songs[i].t?.toLowerCase()}|||${songs[i].a?.toLowerCase()}`;
  if (seen.has(key)) {
    console.error(`[${i}] duplicate: "${songs[i].t}" by "${songs[i].a}"`);
    errors++;
  }
  seen.add(key);
}

if (errors > 0) {
  console.error(`\n${errors} error(s) found in songs.json`);
  process.exit(1);
} else {
  console.log(`✓ songs.json valid (${songs.length} songs)`);
}
