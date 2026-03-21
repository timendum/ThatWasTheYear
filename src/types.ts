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

export interface EndCondition {
  type: "infinite" | "turns" | "correctSongs";
  value: number;
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  roundCount: number;
  currentSong: DetailedSong | null;
  deck: Song[];
  allSongs: Song[];
  endCondition: EndCondition;
  gameStarted: boolean;
  gameOver: boolean;
}

export type GameAction =
  | { type: "INIT_DECK"; songs: Song[] }
  | { type: "START_GAME"; players: Player[] }
  | { type: "SET_END_CONDITION"; endCondition: EndCondition }
  | { type: "DRAW_SONG"; song: DetailedSong }
  | { type: "PLACE_SONG"; position: number }
  | { type: "RESTORE"; state: GameState }
  | { type: "RESET" };

export interface ITunesTrack {
  // wrapperType: string;
  // kind: string;
  // artistId: number;
  // collectionId: number;
  trackId: number;
  artistName: string;
  // collectionName: string;
  trackName: string;
  // collectionCensoredName: string;
  // trackCensoredName: string;
  // artistViewUrl: string;
  // collectionViewUrl: string;
  trackViewUrl: string;
  previewUrl?: string;
  // artworkUrl30: string;
  // artworkUrl60: string;
  artworkUrl100?: string;
  // collectionPrice: number;
  // trackPrice: number;
  releaseDate: string;
  // collectionExplicitness: string;
  // trackExplicitness: string;
  // discCount: number;
  // discNumber: number;
  // trackCount: number;
  // trackNumber: number;
  // trackTimeMillis: number;
  // country: string;
  // currency: string;
  // primaryGenreName: string;
  // contentAdvisoryRating?: string;
  // isStreamable: boolean;
}

export interface ITunesResponse {
  resultCount: number;
  results: ITunesTrack[];
}
