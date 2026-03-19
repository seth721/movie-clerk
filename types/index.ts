export interface Movie {
  id: number;
  tmdb_id: number;
  title: string;
  year: number | null;
  poster_path: string | null;
  backdrop_path: string | null;
  genres: string[]; // stored as JSON
  cast: string[]; // top 5 actors
  director: string | null;
  keywords: string[];
  overview: string | null;
  runtime: number | null;
  vote_average: number | null;
  vote_count: number | null;
}

export interface UserRating {
  id: number;
  tmdb_id: number;
  letterboxd_title: string;
  rating: number; // 0.5–5.0
  watched_date: string | null;
  // joined data
  title?: string;
  year?: number | null;
  poster_path?: string | null;
  genres?: string[];
}

export interface Recommendation {
  id: number;
  tmdb_id: number;
  score: number;
  explanation: string;
  generated_at: string;
  rank: number;
  // joined movie data
  title?: string;
  year?: number | null;
  poster_path?: string | null;
  overview?: string | null;
  genres?: string[];
  director?: string | null;
  cast?: string[];
  vote_average?: number | null;
}

export interface TasteProfile {
  genres: Record<string, number>;
  directors: Record<string, number>;
  actors: Record<string, number>;
  keywords: Record<string, number>;
  decades: Record<string, number>; // avg affinity per decade e.g. "1970s"
  mainstreamScore: number; // 0 = arthouse/obscure, 1 = mainstream blockbusters
  avgRuntime: number | null; // avg runtime (mins) of 4★+ films, null if no data
  foreignFilmPct: number; // 0–1, share of 4★+ films that are non-English
  avgRating: number;
  totalRated: number;
  topRated: { title: string; rating: number; year?: number | null; rewatch?: boolean }[];
  lowestRated: { title: string; rating: number; year?: number | null }[];
}

export interface ImportResult {
  imported: number;
  skipped: number;
  failed: string[];
  total: number;
  username?: string;
}
