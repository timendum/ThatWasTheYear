import type { DetailedSong, ITunesResponse, ITunesTrack, Song, SongPack } from "./types.ts";

const SONG_PACK_FILES: Record<SongPack, string> = {
  base: "./songs.json",
  it: "./songs-it.json",
};

export async function loadSongPacks(packs: SongPack[]): Promise<Song[]> {
  const results = await Promise.all(
    packs.map((pack) =>
      fetch(SONG_PACK_FILES[pack])
        .then((r) => r.json())
        .then((songs: Song[]) => songs),
    ),
  );
  const all = results.flat();
  const seen = new Set<string>();
  return all.filter((song) => {
    const key = `${song.t}${song.a}`.toLowerCase().replaceAll(/[^a-z0-9]/gu, "");
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export async function getDetailedITunesSong(song: Song): Promise<ITunesTrack | undefined> {
  let data: ITunesResponse | undefined = undefined;
  if (typeof song.itunesId === "number") {
    try {
      const resp = await fetch(`https://itunes.apple.com/lookup?id=${song.itunesId}`);
      if (resp.status === 200) {
        data = (await resp.json()) as ITunesResponse;
        if (!data?.results?.[0]) {
          data = undefined;
        }
      }
    } catch (e) {
      console.error(`Error fetching song "${song.t} - ${song.a}" by itunesId`, e);
    }
  }
  if (!data) {
    const resp = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(
        song.a + " " + song.t,
      )}&limit=1&entity=song`,
    );
    if (resp.status !== 200) {
      throw new Error("iTunes API error: status = " + resp.status);
    }
    data = (await resp.json()) as ITunesResponse;
  }
  return data?.results?.[0];
}

export async function getDetailedSong(song: Song): Promise<DetailedSong> {
  const res = await getDetailedITunesSong(song);
  let releaseYear = undefined;
  if (res) {
    try {
      const parsedYear = Math.trunc(Number(res.releaseDate?.slice(0, 4)));
      if (Math.abs(parsedYear - song.y) === 1) {
        releaseYear = parsedYear;
      }
    } catch {
      // keep releaseYear as undefined
    }
  }
  return {
    ...song,
    img: res?.artworkUrl100 || "./placeholder-100.png",
    preview: res?.previewUrl || null,
    link: res?.trackViewUrl || "#",
    releaseYear: releaseYear,
  };
}
