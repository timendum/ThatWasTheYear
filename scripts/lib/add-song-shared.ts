/**
 * Shared logic for the add-song tool (used by both CLI and browser UI).
 * This file must remain free of Deno/Node-specific APIs so it can be
 * bundled for the browser.
 */

import type { ITunesResponse, ITunesTrack, Song } from "../../src/types.ts";
import { normalizeAuthor, normalizeTitle } from "./normalize.ts";

export { normalizeAuthor, normalizeTitle };
export type { ITunesTrack, Song };

/** Count songs in the library by the same (normalized) author. */
export function countByAuthor(author: string, existingSongs: Song[]): number {
  const normalized = normalizeAuthor(author);
  return existingSongs.filter((s) => normalizeAuthor(s.a) === normalized).length;
}

export function findByAuthor(author: string, existingSongs: Song[]): Song[] {
  const normalized = normalizeAuthor(author);
  return existingSongs.filter((s) => normalizeAuthor(s.a) === normalized);
}

/** Check if a title is similar to any song already in the library. */
export function findSimilarSongs(title: string, existingSongs: Song[]): Song[] {
  const normalized = normalizeTitle(title);
  return existingSongs.filter((s) => normalizeTitle(s.t) === normalized);
}

/** Search the iTunes API for songs matching a query. */
export async function searchItunes(query: string): Promise<ITunesTrack[]> {
  const resp = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&limit=5&entity=song`,
  );
  if (resp.status !== 200) {
    throw new Error("iTunes API error: status = " + resp.status);
  }
  const data = (await resp.json()) as ITunesResponse;
  return data.results;
}

/** Sort key for song titles: strips leading articles and lowercases. */
export const sortKey = (s: string): string => s.replace(/^(?:The|An|A) /iu, "").toLowerCase();

/** Sort an array of songs by title then artist (using sortKey). */
export function sortSongs(songs: Song[]): Song[] {
  return songs.sort(
    (a, b) => sortKey(a.t).localeCompare(sortKey(b.t)) || sortKey(a.a).localeCompare(sortKey(b.a)),
  );
}

/** Format a sorted songs array as the canonical JSON string used in song files. */
export function formatSongsJson(songs: Song[]): string {
  const jsonLines = songs.map((s) => JSON.stringify(s)).join(",\n");
  return `[\n${jsonLines}\n]\n`;
}

/** Convert an iTunes track result to a Song object. */
export function trackToSong(track: ITunesTrack): Song {
  return {
    t: track.trackName,
    a: track.artistName,
    y: new Date(track.releaseDate).getFullYear(),
    itunesId: track.trackId,
  };
}
