import { NextRequest, NextResponse } from "next/server";
import {
  upsertMovie,
  upsertRating,
  removeRating,
  addToWatchlist,
  removeFromWatchlist,
  getWatchlistTmdbIds,
} from "@/lib/db";
import { getMovieDetails, extractMovieData } from "@/lib/tmdb";

export async function GET(req: NextRequest) {
  const tmdbId = parseInt(req.nextUrl.searchParams.get("tmdb_id") ?? "", 10);
  if (isNaN(tmdbId)) return NextResponse.json({ state: null });

  try {
    // Check watchlist
    const watchlistIds = getWatchlistTmdbIds();
    if (watchlistIds.has(tmdbId)) {
      return NextResponse.json({ state: { watchlist: true } });
    }

    // Check ratings — infer liked/disliked from the stored star value
    const { getDb } = await import("@/lib/db");
    const row = getDb()
      .prepare("SELECT rating FROM user_ratings WHERE tmdb_id = ?")
      .get(tmdbId) as { rating: number } | undefined;

    if (row) {
      return NextResponse.json({ state: { stars: row.rating } });
    }

    return NextResponse.json({ state: null });
  } catch {
    return NextResponse.json({ state: null });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    tmdb_id,
    title,
    year,
    poster_path,
    overview,
    vote_average,
    stars,    // number 0.5–5.0 — present for liked/disliked ratings
    reaction, // "watchlist" | "remove" only
  } = body;

  if (!tmdb_id || (stars == null && !reaction)) {
    return NextResponse.json(
      { error: "tmdb_id and either stars or reaction are required" },
      { status: 400 }
    );
  }

  try {
    if (reaction === "remove") {
      removeRating(tmdb_id);
      removeFromWatchlist(tmdb_id);
      return NextResponse.json({ ok: true });
    }

    // Always upsert basic movie data first (satisfies FK constraint)
    upsertMovie({
      tmdb_id,
      title: title ?? "Unknown",
      year: year ?? null,
      poster_path: poster_path ?? null,
      backdrop_path: null,
      genres: [],
      cast: [],
      director: null,
      keywords: [],
      overview: overview ?? null,
      runtime: null,
      vote_average: vote_average ?? null,
      vote_count: null,
    });

    if (stars != null) {
      // Numeric rating — remove from watchlist if it was there
      removeFromWatchlist(tmdb_id);
      const clampedStars = Math.round(Math.min(5, Math.max(0.5, Number(stars))) * 2) / 2;
      upsertRating({
        tmdb_id,
        letterboxd_title: title ?? "Unknown",
        rating: clampedStars,
        watched_date: null,
      });

      // Fire-and-forget: enrich with full TMDB details for better taste profiling
      getMovieDetails(tmdb_id)
        .then((details) => upsertMovie(extractMovieData(details)))
        .catch((err) =>
          console.warn(`Background TMDB fetch failed for ${tmdb_id}:`, err)
        );
    } else if (reaction === "watchlist") {
      removeRating(tmdb_id);
      addToWatchlist(tmdb_id);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Rate error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
