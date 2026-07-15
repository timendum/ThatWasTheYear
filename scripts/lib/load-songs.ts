import type { Song } from "../../src/types";

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
