const TMDB_BASE = "https://api.themoviedb.org/3";
const API_KEY = process.env.TMDB_API_KEY!;

export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

// Rate limit: simple delay helper to be polite to the API
const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", API_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
  if (!res.ok) {
    throw new Error(`TMDB error ${res.status} on ${path}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

// ── Search ───────────────────────────────────────────────────────────────────

export interface TMDBSearchResult {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string;
  overview?: string;
  vote_average?: number;
}

export async function searchMovie(title: string, year?: number): Promise<TMDBSearchResult | null> {
  const params: Record<string, string> = { query: title };
  if (year) params.year = String(year);

  const data = await tmdbFetch<{ results: TMDBSearchResult[] }>("/search/movie", params);
  if (!data.results?.length) return null;

  // Prefer exact title match
  const exact = data.results.find(
    (r) => r.title.toLowerCase() === title.toLowerCase()
  );
  return exact ?? data.results[0];
}

// ── Movie Details ─────────────────────────────────────────────────────────────

export interface TMDBMovieDetails {
  id: number;
  title: string;
  tagline?: string;
  release_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
  runtime?: number;
  vote_average?: number;
  vote_count?: number;
  original_language?: string;
  genres?: { id: number; name: string }[];
  production_companies?: { id: number; name: string; logo_path?: string | null; origin_country?: string }[];
  credits?: {
    cast?: { id: number; name: string; character?: string; order: number; profile_path?: string | null }[];
    crew?: { id: number; name: string; job: string; department: string; profile_path?: string | null }[];
  };
  keywords?: { keywords?: { name: string }[] };
  budget?: number;
  revenue?: number;
  imdb_id?: string | null;
}

// ── Videos ───────────────────────────────────────────────────────────────────

export interface TMDBVideo {
  id: string;
  key: string;        // YouTube video ID
  name: string;
  site: string;       // "YouTube" | "Vimeo"
  type: string;       // "Trailer" | "Teaser" | "Clip" | "Featurette" | ...
  official: boolean;
  published_at: string;
}

export async function getMovieVideos(tmdbId: number): Promise<TMDBVideo[]> {
  const data = await tmdbFetch<{ results: TMDBVideo[] }>(`/movie/${tmdbId}/videos`);
  return data.results ?? [];
}

// ── Movie Logos ───────────────────────────────────────────────────────────────

export interface TMDBImageLogo {
  file_path: string;
  iso_639_1: string | null;
  vote_average: number;
  width: number;
  height: number;
}

export async function getMovieLogoPath(tmdbId: number): Promise<string | null> {
  try {
    const data = await tmdbFetch<{ logos: TMDBImageLogo[] }>(`/movie/${tmdbId}/images`, {
      include_image_language: "en,null",
    });
    const logos = data.logos ?? [];
    // Prefer English logos, then any language, sorted by vote_average desc
    const en = logos.filter((l) => l.iso_639_1 === "en").sort((a, b) => b.vote_average - a.vote_average);
    const any = logos.sort((a, b) => b.vote_average - a.vote_average);
    return en[0]?.file_path ?? any[0]?.file_path ?? null;
  } catch {
    return null;
  }
}

export function pickBestTrailer(videos: TMDBVideo[]): TMDBVideo | null {
  // Prefer official YouTube trailers, then teasers
  const yt = videos.filter((v) => v.site === "YouTube");
  return (
    yt.find((v) => v.type === "Trailer" && v.official) ??
    yt.find((v) => v.type === "Trailer") ??
    yt.find((v) => v.type === "Teaser" && v.official) ??
    yt.find((v) => v.type === "Teaser") ??
    yt[0] ??
    null
  );
}

export async function getMovieDetails(tmdbId: number): Promise<TMDBMovieDetails> {
  const data = await tmdbFetch<TMDBMovieDetails>(`/movie/${tmdbId}`, {
    append_to_response: "credits,keywords",
  });
  return data;
}

export function extractMovieData(d: TMDBMovieDetails) {
  const year = d.release_date ? parseInt(d.release_date.split("-")[0]) : null;
  const genres = (d.genres ?? []).map((g) => g.name);
  const cast = (d.credits?.cast ?? [])
    .sort((a, b) => a.order - b.order)
    .slice(0, 6)
    .map((c) => c.name);
  const director =
    d.credits?.crew?.find((c) => c.job === "Director")?.name ?? null;
  const keywords = (d.keywords?.keywords ?? []).map((k) => k.name).slice(0, 20);

  return {
    tmdb_id: d.id,
    title: d.title,
    year,
    poster_path: d.poster_path ?? null,
    backdrop_path: d.backdrop_path ?? null,
    genres,
    cast,
    director,
    keywords,
    overview: d.overview ?? null,
    runtime: d.runtime ?? null,
    vote_average: d.vote_average ?? null,
    vote_count: d.vote_count ?? null,
    original_language: d.original_language ?? null,
  };
}

// ── People ────────────────────────────────────────────────────────────────────

export interface TMDBPersonResult {
  id: number;
  name: string;
  known_for_department: string;
  popularity: number;
}

export async function searchPerson(name: string): Promise<TMDBPersonResult | null> {
  const data = await tmdbFetch<{ results: TMDBPersonResult[] }>("/search/person", {
    query: name,
  });
  const results = data.results ?? [];
  // Prefer exact name match in Directing/Directing dept
  const exact = results.find((r) => r.name.toLowerCase() === name.toLowerCase());
  return exact ?? results[0] ?? null;
}

export interface TMDBPersonCredit {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  overview?: string;
  job?: string;
  department?: string;
}

export async function getDirectorFilmography(
  personId: number,
  minVoteCount = 500
): Promise<TMDBPersonCredit[]> {
  const data = await tmdbFetch<{ crew: TMDBPersonCredit[] }>(
    `/person/${personId}/movie_credits`
  );
  return (data.crew ?? [])
    .filter(
      (c) =>
        c.job === "Director" &&
        (c.vote_count ?? 0) >= minVoteCount &&
        c.release_date // must have a release date
    )
    .sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0));
}

// ── Recommendations & Similar ─────────────────────────────────────────────────

export interface TMDBMovieStub {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  original_language?: string;
  overview?: string;
}

export async function getRelatedMovies(tmdbId: number): Promise<TMDBMovieStub[]> {
  const [recs, similar] = await Promise.allSettled([
    tmdbFetch<{ results: TMDBMovieStub[] }>(`/movie/${tmdbId}/recommendations`),
    tmdbFetch<{ results: TMDBMovieStub[] }>(`/movie/${tmdbId}/similar`),
  ]);

  const results: TMDBMovieStub[] = [];
  if (recs.status === "fulfilled") results.push(...(recs.value.results ?? []));
  if (similar.status === "fulfilled") results.push(...(similar.value.results ?? []));
  return results;
}

// ── Discover ──────────────────────────────────────────────────────────────────

export interface TMDBDiscoverResult {
  results: TMDBMovieStub[];
  total_pages: number;
  total_results: number;
  page: number;
}

/**
 * Discover top-rated movies by genre.
 * genreIds should be pipe-separated for OR logic: "28|18|12"
 */
export async function discoverMovies(
  genreIds: string,
  page: number = 1
): Promise<TMDBDiscoverResult> {
  return tmdbFetch<TMDBDiscoverResult>("/discover/movie", {
    with_genres: genreIds,
    sort_by: "vote_average.desc",
    "vote_count.gte": "300",
    page: String(page),
    include_adult: "false",
  });
}

export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface WatchProviders {
  flatrate?: WatchProvider[]; // subscription streaming
  rent?: WatchProvider[];
  buy?: WatchProvider[];
  link?: string; // JustWatch deeplink
}

export async function getWatchProviders(
  tmdbId: number,
  region = "US"
): Promise<WatchProviders | null> {
  const data = await tmdbFetch<{ results: Record<string, WatchProviders> }>(
    `/movie/${tmdbId}/watch/providers`
  );
  return data.results?.[region] ?? null;
}

export async function getNowPlaying(): Promise<TMDBDiscoverResult> {
  return tmdbFetch<TMDBDiscoverResult>("/movie/now_playing", {
    language: "en-US",
    page: "1",
  });
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export async function getNewOnDigital(): Promise<TMDBDiscoverResult> {
  // Films released 14–75 days ago typically land on digital/VOD
  return tmdbFetch<TMDBDiscoverResult>("/discover/movie", {
    sort_by: "popularity.desc",
    "primary_release_date.gte": daysAgo(75),
    "primary_release_date.lte": daysAgo(14),
    "vote_count.gte": "20",
    include_adult: "false",
    language: "en-US",
  });
}

export async function getNewOnPhysical(): Promise<TMDBDiscoverResult> {
  // Films released 75–150 days ago typically hit 4K/Blu-Ray
  return tmdbFetch<TMDBDiscoverResult>("/discover/movie", {
    sort_by: "popularity.desc",
    "primary_release_date.gte": daysAgo(150),
    "primary_release_date.lte": daysAgo(75),
    "vote_count.gte": "50",
    include_adult: "false",
    language: "en-US",
  });
}

// ── Batch helpers ─────────────────────────────────────────────────────────────

/**
 * Fetch full details for an array of TMDB IDs, with rate-limit-friendly delays.
 */
export async function batchFetchDetails(
  tmdbIds: number[],
  onProgress?: (done: number, total: number) => void
) {
  const results: ReturnType<typeof extractMovieData>[] = [];
  for (let i = 0; i < tmdbIds.length; i++) {
    try {
      const d = await getMovieDetails(tmdbIds[i]);
      results.push(extractMovieData(d));
    } catch (err) {
      console.warn(`Failed to fetch TMDB ${tmdbIds[i]}:`, err);
    }
    onProgress?.(i + 1, tmdbIds.length);
    if (i > 0 && i % 30 === 0) await sleep(1000); // be polite
  }
  return results;
}
