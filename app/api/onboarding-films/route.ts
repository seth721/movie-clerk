import { NextResponse } from "next/server";
import { ONBOARDING_FILMS } from "@/lib/onboarding-films";
import { getMovieByTmdbId, upsertMovie } from "@/lib/db";
import { getMovieDetails, extractMovieData } from "@/lib/tmdb";

export const maxDuration = 30;

export async function GET() {
  const results = await Promise.allSettled(
    ONBOARDING_FILMS.map(async (film) => {
      // Check DB cache first
      const cached = getMovieByTmdbId(film.tmdb_id) as Record<string, unknown> | null;
      if (cached?.poster_path) {
        return { ...film, poster_path: cached.poster_path as string };
      }
      // Fetch from TMDB and cache
      const details = await getMovieDetails(film.tmdb_id);
      upsertMovie(extractMovieData(details));
      return { ...film, poster_path: details.poster_path ?? null };
    })
  );

  const films = results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { ...ONBOARDING_FILMS[i], poster_path: null }
  );

  return NextResponse.json({ films });
}
