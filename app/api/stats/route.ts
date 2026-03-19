import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();

  // ── Basic counts ────────────────────────────────────────────────────────────
  const { total } = db
    .prepare("SELECT COUNT(*) as total FROM user_ratings")
    .get() as { total: number };

  const { avg } = db
    .prepare("SELECT ROUND(AVG(rating), 2) as avg FROM user_ratings")
    .get() as { avg: number | null };

  const { rewatches } = db
    .prepare("SELECT COUNT(*) as rewatches FROM user_ratings WHERE rewatch = 1")
    .get() as { rewatches: number };

  const { watchlist } = db
    .prepare("SELECT COUNT(*) as watchlist FROM watchlist")
    .get() as { watchlist: number };

  // ── Rating distribution (0.5–5.0 in 0.5 steps) ─────────────────────────────
  const distRows = db
    .prepare("SELECT rating, COUNT(*) as count FROM user_ratings GROUP BY rating ORDER BY rating ASC")
    .all() as { rating: number; count: number }[];
  const ratingDist: Record<string, number> = {};
  for (const r of distRows) ratingDist[String(r.rating)] = r.count;

  // ── Pull all rated films for JS aggregation ──────────────────────────────────
  const rows = db
    .prepare(
      `SELECT r.rating, m.year, m.genres, m.cast, m.director,
              m.runtime, m.vote_average, m.original_language
       FROM user_ratings r
       JOIN movies m ON m.tmdb_id = r.tmdb_id`
    )
    .all() as {
      rating: number;
      year: number | null;
      genres: string;
      cast: string;
      director: string | null;
      runtime: number | null;
      vote_average: number | null;
      original_language: string | null;
    }[];

  // ── Decade breakdown ─────────────────────────────────────────────────────────
  const decadeMap: Record<number, { total: number; count: number }> = {};
  for (const r of rows) {
    if (!r.year) continue;
    const decade = Math.floor(r.year / 10) * 10;
    if (!decadeMap[decade]) decadeMap[decade] = { total: 0, count: 0 };
    decadeMap[decade].total += r.rating;
    decadeMap[decade].count++;
  }
  const decades = Object.entries(decadeMap)
    .filter(([, v]) => v.count >= 2)
    .map(([d, v]) => ({
      decade: Number(d),
      avg: Math.round((v.total / v.count) * 100) / 100,
      count: v.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // ── Genre breakdown ──────────────────────────────────────────────────────────
  const genreMap: Record<string, { total: number; count: number }> = {};
  for (const r of rows) {
    let genres: string[] = [];
    try { genres = JSON.parse(r.genres || "[]"); } catch { /* skip */ }
    for (const g of genres) {
      if (!genreMap[g]) genreMap[g] = { total: 0, count: 0 };
      genreMap[g].total += r.rating;
      genreMap[g].count++;
    }
  }
  const topGenres = Object.entries(genreMap)
    .filter(([, v]) => v.count >= 2)
    .map(([genre, v]) => ({
      genre,
      avg: Math.round((v.total / v.count) * 100) / 100,
      count: v.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // ── Top directors (by rated film count) ─────────────────────────────────────
  const directorMap: Record<string, { total: number; count: number }> = {};
  for (const r of rows) {
    if (!r.director) continue;
    if (!directorMap[r.director]) directorMap[r.director] = { total: 0, count: 0 };
    directorMap[r.director].total += r.rating;
    directorMap[r.director].count++;
  }
  const topDirectors = Object.entries(directorMap)
    .filter(([, v]) => v.count >= 2)
    .map(([name, v]) => ({
      name,
      avg: Math.round((v.total / v.count) * 100) / 100,
      count: v.count,
    }))
    .sort((a, b) => b.count - a.count || b.avg - a.avg)
    .slice(0, 8);

  // ── Top actors (appearing in highest-rated films) ────────────────────────────
  const actorMap: Record<string, { total: number; count: number }> = {};
  for (const r of rows) {
    if (r.rating < 4) continue; // only loved films
    let cast: string[] = [];
    try { cast = JSON.parse(r.cast || "[]"); } catch { /* skip */ }
    for (const actor of cast.slice(0, 5)) { // top-billed only
      if (!actorMap[actor]) actorMap[actor] = { total: 0, count: 0 };
      actorMap[actor].total += r.rating;
      actorMap[actor].count++;
    }
  }
  const topActors = Object.entries(actorMap)
    .filter(([, v]) => v.count >= 2)
    .map(([name, v]) => ({
      name,
      avg: Math.round((v.total / v.count) * 100) / 100,
      count: v.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // ── Foreign film % ───────────────────────────────────────────────────────────
  const withLanguage = rows.filter((r) => r.original_language);
  const foreignCount = withLanguage.filter((r) => r.original_language !== "en").length;
  const foreignPct =
    withLanguage.length >= 5
      ? Math.round((foreignCount / withLanguage.length) * 100)
      : null;

  // ── Avg runtime of loved films (≥4★) ────────────────────────────────────────
  const lovedWithRuntime = rows.filter((r) => r.rating >= 4 && r.runtime);
  const avgRuntimeLoved =
    lovedWithRuntime.length > 0
      ? Math.round(
          lovedWithRuntime.reduce((s, r) => s + (r.runtime ?? 0), 0) /
            lovedWithRuntime.length
        )
      : null;

  // ── Generosity score vs TMDB ─────────────────────────────────────────────────
  const withBoth = rows.filter((r) => r.vote_average && r.rating);
  let generosityDelta: number | null = null;
  if (withBoth.length >= 5) {
    const userAvg = withBoth.reduce((s, r) => s + r.rating, 0) / withBoth.length;
    const tmdbAvg =
      withBoth.reduce((s, r) => s + (r.vote_average ?? 0) / 2, 0) / withBoth.length;
    generosityDelta = Math.round((userAvg - tmdbAvg) * 10) / 10;
  }

  // ── Most-rated release year ──────────────────────────────────────────────────
  const yearMap: Record<number, number> = {};
  for (const r of rows) {
    if (r.year) yearMap[r.year] = (yearMap[r.year] ?? 0) + 1;
  }
  const topYear =
    Object.keys(yearMap).length > 0
      ? Number(Object.entries(yearMap).sort(([, a], [, b]) => b - a)[0][0])
      : null;

  return NextResponse.json({
    total,
    avgRating: avg,
    rewatches,
    watchlist,
    ratingDist,
    decades,
    topGenres,
    topDirectors,
    topActors,
    foreignPct,
    avgRuntimeLoved,
    generosityDelta,
    topYear,
  });
}
