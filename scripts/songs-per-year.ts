import { loadSongsFromArgs } from "./lib/load-songs";

const allSongs = await loadSongsFromArgs();

// "1960s | ██ 99" → prefix is 10 chars, suffix " 99" is up to 4 chars → 76 chars for bar
const maxBar = 76;

const counts = new Map<number, number>();
for (const { y } of allSongs) {
  counts.set(y, (counts.get(y) ?? 0) + 1);
}

const sorted = [...counts.entries()].sort(([a], [b]) => a - b);
const maxYearCount = Math.max(...sorted.map(([, c]) => c));

console.log("Year | Songs");
console.log("-----|" + "-".repeat(maxBar + 5));
for (const [year, count] of sorted) {
  const bar = "█".repeat(Math.round((count / maxYearCount) * maxBar));
  console.log(`${year} | ${bar} ${count}`);
}
console.log("-----|" + "-".repeat(maxBar + 5));
console.log(`Total: ${allSongs.length} songs across ${sorted.length} years`);

const decades = new Map<number, number>();
for (const [year, count] of sorted) {
  const decade = Math.floor(year / 10) * 10;
  decades.set(decade, (decades.get(decade) ?? 0) + count);
}

const sortedDecades = [...decades.entries()].sort(([a], [b]) => a - b);
const maxCount = Math.max(...sortedDecades.map(([, c]) => c));

console.log("\nDecade | Songs");
console.log("-------|" + "-".repeat(maxBar + 5));
for (const [decade, count] of sortedDecades) {
  const bar = "█".repeat(Math.round((count / maxCount) * maxBar));
  console.log(`${decade}s | ${bar} ${count}`);
}
