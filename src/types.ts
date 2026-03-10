export interface Song {
  t: string;
  a: string;
  y: number;
}

export interface DetailedSong extends Song {
  img: string;
  preview?: string | null;
  link: string;
}

export interface Player {
  name: string;
  timeline: DetailedSong[];
}
