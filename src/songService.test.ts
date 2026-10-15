import { beforeAll, describe, expect, test } from "bun:test";
import { loadSongPacks } from "./songService";
import type { Song } from "./types";

function makeSong(year: number, title = `Song ${year}`): Song {
  return { t: title, a: `Artist ${year}`, y: year };
}

describe("loadSongPacks", () => {
  const baseSongs = [makeSong(2000), makeSong(2001)];
  const itSongs = [makeSong(1990), makeSong(1991)];

  beforeAll(() => {
    globalThis.fetch = ((url: string) => {
      if (url === "./songs.json") {
        return Promise.resolve({ json: () => Promise.resolve(baseSongs) } as Response);
      }
      if (url === "./songs-it.json") {
        return Promise.resolve({ json: () => Promise.resolve(itSongs) } as Response);
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    }) as typeof fetch;
  });

  test("loads a single pack", async () => {
    const songs = await loadSongPacks(["base"]);
    expect(songs).toEqual(baseSongs);
  });

  test("loads and merges multiple packs", async () => {
    const songs = await loadSongPacks(["base", "it"]);
    expect(songs).toEqual([...baseSongs, ...itSongs]);
  });

  test("loads only the italian pack", async () => {
    const songs = await loadSongPacks(["it"]);
    expect(songs).toEqual(itSongs);
  });

  test("deduplicates songs across packs ignoring case, punctuation and year", async () => {
    const shared: Song = { t: "Don't Stop Me Now", a: "Queen", y: 1979 };
    const variant: Song = { t: "Dont stop me now", a: "queen", y: 1978 };
    const unique: Song = { t: "Bohemian Rhapsody", a: "Queen", y: 1975 };

    globalThis.fetch = ((url: string) => {
      if (url === "./songs.json") {
        return Promise.resolve({ json: () => Promise.resolve([shared, unique]) } as Response);
      }
      if (url === "./songs-it.json") {
        return Promise.resolve({ json: () => Promise.resolve([variant]) } as Response);
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    }) as typeof fetch;

    const songs = await loadSongPacks(["base", "it"]);
    expect(songs).toEqual([shared, unique]);
  });
});
