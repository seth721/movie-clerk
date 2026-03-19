import { getDb, upsertMovie, upsertRating } from "@/lib/db";

export interface LetterboxdEntry {
  tmdbId: number;
  title: string;
  year: number | null;
  rating: number | null;   // null = watched but unrated
  watchedDate: string | null;
  guid: string;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");
}

function extractTag(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`));
  return m ? decodeXmlEntities(m[1].trim()) : null;
}

/** Parse a Letterboxd RSS feed and return diary entries */
export function parseLetterboxdRss(xml: string): LetterboxdEntry[] {
  const items = xml.split("<item>").slice(1);
  const entries: LetterboxdEntry[] = [];

  for (const item of items) {
    const tmdbIdStr = extractTag(item, "tmdb:movieId");
    if (!tmdbIdStr) continue;

    const tmdbId = parseInt(tmdbIdStr, 10);
    if (isNaN(tmdbId)) continue;

    const title = extractTag(item, "letterboxd:filmTitle") ?? "Unknown";
    const yearStr = extractTag(item, "letterboxd:filmYear");
    const year = yearStr ? parseInt(yearStr, 10) : null;
    const ratingStr = extractTag(item, "letterboxd:memberRating");
    const rating = ratingStr ? parseFloat(ratingStr) : null;
    const watchedDate = extractTag(item, "letterboxd:watchedDate");
    const guid = extractTag(item, "guid") ?? `${tmdbId}-${watchedDate}`;

    entries.push({ tmdbId, title, year, rating, watchedDate, guid });
  }

  return entries;
}

export interface LetterboxdPreview {
  displayName: string;
  recentFilms: { title: string; year: string | null; rating: number | null; watchedDate: string | null }[];
}

/** Fetch just enough from the RSS to confirm identity */
export async function previewLetterboxd(username: string): Promise<LetterboxdPreview> {
  const url = `https://letterboxd.com/${encodeURIComponent(username)}/rss/`;
  const res = await fetch(url, {
    headers: { "User-Agent": "MovieClerk/1.0 (personal film tracker)" },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    if (res.status === 404) throw new Error(`Letterboxd user "${username}" not found.`);
    throw new Error(`Letterboxd RSS returned ${res.status}`);
  }

  const xml = await res.text();

  // Extract channel display name from <title> — format: "username's Letterboxd diary"
  const channelTitle = xml.match(/<channel>[\s\S]*?<title>([^<]+)<\/title>/)?.[1] ?? username;
  const displayName = decodeXmlEntities(channelTitle.replace(/'s Letterboxd diary.*$/i, "").trim());

  const items = xml.split("<item>").slice(1, 6); // top 5
  const recentFilms = items.map((item) => {
    const title = extractTag(item, "letterboxd:filmTitle") ?? extractTag(item, "title") ?? "Unknown";
    const year = extractTag(item, "letterboxd:filmYear");
    const ratingStr = extractTag(item, "letterboxd:memberRating");
    const rating = ratingStr ? parseFloat(ratingStr) : null;
    const watchedDate = extractTag(item, "letterboxd:watchedDate");
    return { title, year, rating, watchedDate };
  });

  return { displayName, recentFilms };
}

export interface SyncResult {
  added: number;
  updated: number;
  skipped: number;
  errors: number;
}

/** Fetch and sync a user's Letterboxd RSS diary into the local DB */
export async function syncLetterboxd(username: string): Promise<SyncResult> {
  const url = `https://letterboxd.com/${encodeURIComponent(username)}/rss/`;
  const res = await fetch(url, {
    headers: { "User-Agent": "MovieClerk/1.0 (personal film tracker)" },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    if (res.status === 404) throw new Error(`Letterboxd user "${username}" not found.`);
    throw new Error(`Letterboxd RSS returned ${res.status}`);
  }

  const xml = await res.text();
  const entries = parseLetterboxdRss(xml);

  const db = getDb();
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: 0 };

  for (const entry of entries) {
    if (entry.rating === null) {
      result.skipped++;
      continue; // skip unrated diary entries
    }

    try {
      // Ensure the movie row exists (minimal data — enriched lazily on visit)
      const existing = db.prepare("SELECT tmdb_id FROM movies WHERE tmdb_id = ?").get(entry.tmdbId);
      if (!existing) {
        upsertMovie({
          tmdb_id: entry.tmdbId,
          title: entry.title,
          year: entry.year,
          poster_path: null,
          backdrop_path: null,
          genres: [],
          cast: [],
          director: null,
          keywords: [],
          overview: null,
          runtime: null,
          vote_average: null,
          vote_count: null,
        });
      }

      // Check if rating already exists and is the same
      const existingRating = db
        .prepare("SELECT rating FROM user_ratings WHERE tmdb_id = ?")
        .get(entry.tmdbId) as { rating: number } | undefined;

      if (existingRating) {
        if (existingRating.rating === entry.rating) {
          result.skipped++;
        } else {
          upsertRating({ tmdb_id: entry.tmdbId, letterboxd_title: entry.title, rating: entry.rating, watched_date: entry.watchedDate });
          result.updated++;
        }
      } else {
        upsertRating({ tmdb_id: entry.tmdbId, letterboxd_title: entry.title, rating: entry.rating, watched_date: entry.watchedDate });
        result.added++;
      }
    } catch {
      result.errors++;
    }
  }

  return result;
}
