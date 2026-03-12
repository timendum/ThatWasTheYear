export interface Song {
  t: string;
  a: string;
  y: number;
  itunesId?: number;
}

export interface DetailedSong extends Song {
  img: string;
  preview: string | null;
  link: string;
}

export interface Player {
  name: string;
  timeline: DetailedSong[];
}

export interface GameStateData {
  players: Player[];
  currentPlayerIndex: number;
  roundCount: number;
  currentSong: DetailedSong | null;
  deck: Song[];
  endCondition: { type: 'infinite' | 'turns'; value: number };
}
