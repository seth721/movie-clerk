import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getMovieDetails, extractMovieData } from "@/lib/tmdb";
import { upsertMovie as dbUpsertMovie } from "@/lib/db";

export const maxDuration = 60;

/**
 * Enriches movies that are missing director/genre/cast data.
 * Processes the top-rated un-enriched films first (highest value for taste profiling).
 * Call with ?batch=N to control how many to process (default 30).
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const batch = Math.min(50, parseInt(url.searchParams.get("batch") ?? "30", 10));

  const db = getDb();

  // Find movies missing director, ordered by rating desc so we enrich the most-loved films first
  const toEnrich = db
    .prepare(
      `SELECT m.tmdb_id
       FROM movies m
       JOIN user_ratings r ON r.tmdb_id = m.tmdb_id
       WHERE m.director IS NULL OR m.director = ''
       ORDER BY r.rating DESC
       LIMIT ?`
    )
    .all(batch) as { tmdb_id: number }[];

  if (toEnrich.length === 0) {
    return NextResponse.json({ enriched: 0, remaining: 0 });
  }

  // Count total remaining for progress reporting
  const { remaining } = db
    .prepare(
      `SELECT COUNT(*) as remaining FROM movies m
       JOIN user_ratings r ON r.tmdb_id = m.tmdb_id
       WHERE m.director IS NULL OR m.director = ''`
    )
    .get() as { remaining: number };

  let enriched = 0;
  const errors: number[] = [];

  for (const { tmdb_id } of toEnrich) {
    try {
      const details = await getMovieDetails(tmdb_id);
      const data = extractMovieData(details);
      dbUpsertMovie(data);
      enriched++;
      // Small delay to be polite to TMDB API
      await new Promise((r) => setTimeout(r, 150));
    } catch {
      errors.push(tmdb_id);
    }
  }

  return NextResponse.json({
    enriched,
    remaining: Math.max(0, remaining - enriched),
    errors: errors.length,
  });
}

export async function GET() {
  const db = getDb();
  const { total } = db
    .prepare("SELECT COUNT(*) as total FROM user_ratings")
    .get() as { total: number };
  const { missing } = db
    .prepare(
      `SELECT COUNT(*) as missing FROM movies m
       JOIN user_ratings r ON r.tmdb_id = m.tmdb_id
       WHERE m.director IS NULL OR m.director = ''`
    )
    .get() as { missing: number };
  return NextResponse.json({ total, missing, enriched: total - missing });
}
