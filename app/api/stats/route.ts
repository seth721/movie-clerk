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
      `SELECT r.rating, r.watched_date, m.title, m.year, m.genres, m.cast, m.director,
              m.runtime, m.vote_average, m.vote_count, m.original_language
       FROM user_ratings r
       JOIN movies m ON m.tmdb_id = r.tmdb_id`
    )
    .all() as {
      rating: number;
      watched_date: string | null;
      title: string;
      year: number | null;
      genres: string;
      cast: string;
      director: string | null;
      runtime: number | null;
      vote_average: number | null;
      vote_count: number | null;
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

  // ── Sweet spot decade (highest avg, min 5 films) ─────────────────────────────
  const sweetSpotDecade = Object.entries(decadeMap)
    .filter(([, v]) => v.count >= 5)
    .map(([d, v]) => ({
      decade: Number(d),
      avg: Math.round((v.total / v.count) * 100) / 100,
      count: v.count,
    }))
    .sort((a, b) => b.avg - a.avg)[0] ?? null;

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
    if (r.rating < 4) continue;
    let cast: string[] = [];
    try { cast = JSON.parse(r.cast || "[]"); } catch { /* skip */ }
    for (const actor of cast.slice(0, 5)) {
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

  // ── Contrarian picks (biggest gap vs TMDB consensus) ────────────────────────
  // vote_count >= 500 ensures there's a real consensus to compare against
  const contrarian = rows
    .filter((r) => r.vote_average != null && r.vote_count != null && r.vote_count >= 500)
    .map((r) => {
      const tmdbNorm = Math.round((r.vote_average! / 2) * 10) / 10; // /10 → /5
      const delta = Math.round((r.rating - tmdbNorm) * 10) / 10;
      return { title: r.title, year: r.year, userRating: r.rating, tmdbRating: tmdbNorm, delta };
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 5);

  // ── Hidden gems (loved but few people have seen them) ────────────────────────
  const hiddenGems = rows
    .filter((r) => r.rating >= 4 && r.vote_count != null && r.vote_count < 8000 && r.vote_count > 50)
    .map((r) => ({ title: r.title, year: r.year, userRating: r.rating, voteCount: r.vote_count! }))
    .sort((a, b) => b.userRating - a.userRating || a.voteCount - b.voteCount)
    .slice(0, 6);

  // ── Yearly watch activity (by calendar year watched) ─────────────────────────
  const watchYearMap: Record<number, number> = {};
  for (const r of rows) {
    if (!r.watched_date) continue;
    const yr = parseInt(r.watched_date.slice(0, 4), 10);
    if (!isNaN(yr) && yr >= 2000 && yr <= 2030) {
      watchYearMap[yr] = (watchYearMap[yr] ?? 0) + 1;
    }
  }
  const yearActivity = Object.entries(watchYearMap)
    .map(([y, count]) => ({ year: Number(y), count }))
    .sort((a, b) => a.year - b.year)
    .slice(-8); // show last 8 years max

  // ── First and most recent watch ───────────────────────────────────────────────
  const withDates = rows
    .filter((r) => r.watched_date)
    .sort((a, b) => (a.watched_date ?? "").localeCompare(b.watched_date ?? ""));
  const firstWatch = withDates.length > 0
    ? { title: withDates[0].title, year: withDates[0].year, watchedDate: withDates[0].watched_date }
    : null;
  const latestWatch = withDates.length > 0
    ? { title: withDates[withDates.length - 1].title, year: withDates[withDates.length - 1].year, watchedDate: withDates[withDates.length - 1].watched_date }
    : null;

  return NextResponse.json({
    total,
    avgRating: avg,
    rewatches,
    watchlist,
    ratingDist,
    decades,
    sweetSpotDecade,
    topGenres,
    topDirectors,
    topActors,
    foreignPct,
    avgRuntimeLoved,
    generosityDelta,
    topYear,
    contrarian,
    hiddenGems,
    yearActivity,
    firstWatch,
    latestWatch,
  });
}
