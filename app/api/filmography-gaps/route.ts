import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { searchPerson, getDirectorFilmography } from "@/lib/tmdb";

export const maxDuration = 30;

export async function GET() {
  const db = getDb();

  // Find directors the user has rated ≥2 films, sorted by avg rating desc
  const directorRows = db
    .prepare(
      `SELECT m.director, COUNT(*) as count, AVG(r.rating) as avg_rating
       FROM user_ratings r
       JOIN movies m ON m.tmdb_id = r.tmdb_id
       WHERE m.director IS NOT NULL AND m.director != ''
       GROUP BY m.director
       HAVING count >= 2 AND avg_rating >= 3.5
       ORDER BY avg_rating DESC, count DESC
       LIMIT 6`
    )
    .all() as { director: string; count: number; avg_rating: number }[];

  if (directorRows.length === 0) {
    return NextResponse.json({ gaps: [] });
  }

  // Get all films the user has already seen
  const seenIds = new Set(
    (db.prepare("SELECT tmdb_id FROM user_ratings").all() as { tmdb_id: number }[]).map(
      (r) => r.tmdb_id
    )
  );

  const gaps = await Promise.allSettled(
    directorRows.map(async (row) => {
      // Look up TMDB person ID for this director
      const person = await searchPerson(row.director);
      if (!person) return null;

      // Get their significant filmography
      const credits = await getDirectorFilmography(person.id);
      if (credits.length === 0) return null;

      const total = credits.length;
      const seen = credits.filter((c) => seenIds.has(c.id)).length;
      const unseen = credits
        .filter((c) => !seenIds.has(c.id))
        .sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))
        .slice(0, 6); // show top 6 unseen by rating

      // Only surface if there are actually unseen films
      if (unseen.length === 0) return null;

      return {
        director: row.director,
        person_id: person.id,
        rated_count: row.count,
        avg_rating: Math.round(row.avg_rating * 100) / 100,
        seen_of_total: seen,
        total_significant: total,
        unseen_films: unseen.map((c) => ({
          tmdb_id: c.id,
          title: c.title,
          year: c.release_date ? parseInt(c.release_date.split("-")[0]) : null,
          poster_path: c.poster_path ?? null,
          vote_average: c.vote_average ?? null,
        })),
      };
    })
  );

  const result = gaps
    .filter((r) => r.status === "fulfilled" && r.value !== null)
    .map((r) => (r as PromiseFulfilledResult<NonNullable<typeof gaps[0] extends PromiseFulfilledResult<infer T> ? T : never>>).value)
    .slice(0, 4); // show top 4 directors

  return NextResponse.json({ gaps: result });
}
