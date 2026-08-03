import type { Song } from "./types.ts";

function fisherYatesShuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

interface Bucket {
  startYear: number;
  endYear: number;
  songs: Song[];
}

/**
 * Cost of a bucket given ideals for song count and year width.
 */
function bucketCost(bucket: Bucket, idealCount: number, idealWidth: number): number {
  const countRatio = bucket.songs.length / idealCount;
  const width = bucket.endYear - bucket.startYear + 1;
  const widthDev = (width - idealWidth) / idealWidth;
  return countRatio * countRatio * countRatio * countRatio + 0.1 * widthDev * widthDev;
}

function mergeBuckets(a: Bucket, b: Bucket): Bucket {
  return {
    startYear: Math.min(a.startYear, b.startYear),
    endYear: Math.max(a.endYear, b.endYear),
    songs: [...a.songs, ...b.songs],
  };
}

/**
 * Build year-based ranges by creating one bucket per year then greedily merging
 * adjacent buckets with the lowest merge cost until we reach the target number of ranges.
 */
export function buildRanges(songs: Song[], targetRanges: number): Bucket[] {
  if (songs.length === 0) return [];

  const sorted = [...songs].sort((a, b) => a.y - b.y);
  const minYear = sorted[0].y;
  const maxYear = sorted.at(-1)!.y;

  // Create one bucket per year (including empty years)
  const yearSpan = maxYear - minYear + 1;
  const buckets: Bucket[] = [];
  for (let y = minYear; y <= maxYear; y++) {
    buckets.push({ startYear: y, endYear: y, songs: [] });
  }

  // Fill buckets with songs
  for (const song of sorted) {
    buckets[song.y - minYear].songs.push(song);
  }

  // If we already have fewer or equal buckets than target, return directly
  if (buckets.length <= targetRanges) {
    return buckets;
  }

  // Ideals for the cost function
  const idealCount = songs.length / targetRanges;
  const idealWidth = yearSpan / targetRanges;

  // Greedy merge: repeatedly merge the pair with lowest combined cost
  let current = buckets;
  while (current.length > targetRanges) {
    let bestIdx = 0;
    let bestCost = Infinity;

    for (let i = 0; i < current.length - 1; i++) {
      const merged = mergeBuckets(current[i], current[i + 1]);
      const cost = bucketCost(merged, idealCount, idealWidth);
      if (cost < bestCost) {
        bestCost = cost;
        bestIdx = i;
      }
    }

    // Perform the best merge
    const merged = mergeBuckets(current[bestIdx], current[bestIdx + 1]);
    current = [...current.slice(0, bestIdx), merged, ...current.slice(bestIdx + 2)];
  }

  return current;
}

export const RANGES_SIZE = 20;

/**
 * Distributes songs into per-player decks using a range-balanced strategy.
 *
 * Instead of a simple Fisher-Yates shuffle, songs are first partitioned into
 * year-based ranges (via `buildRanges`) so that each range covers a comparable
 * span of years and song count. Within each range, songs are shuffled randomly.
 *
 * Decks are then built iteratively: in each pass, a small batch (bucketSize
 * songs) is extracted from every range and collected together. This combined
 * batch is shuffled to interleave eras, then dealt round-robin across players.
 * The process repeats until all ranges are exhausted.
 *
 * The result is that every player's deck contains songs spread across the full
 * timeline rather than clustering in one era. Draw order within a deck mixes
 * eras, keeping gameplay varied turn-to-turn.
 *
 * @param songs - Full song library to distribute.
 * @param players - Number of players to deal to.
 * @param endValue - End condition value, used to calibrate batch size per range.
 * @returns An array of decks (one per player), each containing their dealt songs.
 */
export function shuffleDeck(songs: Song[], players: number, endValue: number): Song[][] {
  const ranges = buildRanges(songs, RANGES_SIZE);
  const bucketSize = Math.max(3, Math.round((endValue * 3) / RANGES_SIZE));

  // Shuffle each range in place so extraction is random within each era
  for (const range of ranges) {
    fisherYatesShuffle(range.songs);
  }

  // Build player decks by extracting bags of songs evenly from all ranges.
  const decks: Song[][] = Array.from({ length: players }, () => []);

  // Until we have songs
  while (ranges.some((r) => r.songs.length > 0)) {
    // Extract up to bucketSize songs from each range into one batch
    const batch: Song[] = [];
    for (const range of ranges) {
      const take = Math.min(bucketSize, range.songs.length);
      batch.push(...range.songs.splice(0, take));
    }

    // Shuffle the batch so songs from different eras are interleaved
    fisherYatesShuffle(batch);

    // Deal the shuffled batch round-robin to players
    for (let i = 0; i < batch.length; i++) {
      decks[i % players].push(batch[i]);
    }
  }

  return decks;
}
