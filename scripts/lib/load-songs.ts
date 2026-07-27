/**
 * Shared helper for CLI scripts: loads song JSON files from disk.
 * Reads file paths from command-line arguments (defaults to assets/songs.json)
 * and returns the merged array of Song objects.
 */
/// <reference lib="deno.ns" />

import { expandGlobSync } from "@std/fs/expand-glob";
import type { Song } from "../../src/types.ts";

export const ALL_SONG_FILES: string[] = [...expandGlobSync("assets/*.json")].map(
  (entry) => entry.path,
);

export const DEFAULT_FILES = ["assets/songs.json"];

export async function loadSongsFromArgs(args: string[] = Deno.args): Promise<Song[]> {
  const files = args.length > 0 ? args : DEFAULT_FILES;
  const allSongs: Song[] = [];

  for (const file of files) {
    let text: string;
    try {
      text = await Deno.readTextFile(file);
    } catch {
      console.warn(`Skipping ${file}: file not found`);
      continue;
    }
    let content: unknown;
    try {
      content = JSON.parse(text);
    } catch {
      console.warn(`Skipping ${file}: invalid JSON`);
      continue;
    }
    const songs: Song[] = Array.isArray(content) ? content : [];
    allSongs.push(...songs);
    console.log(`Loaded ${songs.length} songs from ${file}`);
  }

  if (files.length > 1) {
    console.log(`Total loaded: ${allSongs.length} songs from ${files.length} files\n`);
  }

  return allSongs;
}

export async function loadSongsLibs() {
  return await loadSongsFromArgs(ALL_SONG_FILES);
}
