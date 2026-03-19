import { NextResponse } from "next/server";
import { getDb, getWatchlistTmdbIds } from "@/lib/db";
import type { FilmState } from "@/components/RatingWidget";

// GET /api/ratings
// Returns all user ratings + watchlist in one response.
// Shape: { [tmdb_id]: FilmState }
export async function GET() {
  try {
    const rows = getDb()
      .prepare("SELECT tmdb_id, rating FROM user_ratings")
      .all() as { tmdb_id: number; rating: number }[];

    const watchlist = getWatchlistTmdbIds();
    const result: Record<number, FilmState> = {};

    for (const row of rows) {
      result[row.tmdb_id] = { stars: row.rating };
    }

    for (const id of watchlist) {
      result[id] = { watchlist: true };
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("ratings batch error:", err);
    return NextResponse.json({});
  }
}
