import { NextResponse } from "next/server";
import {
  getAllRatings,
  getWatchedTmdbIds,
  getMovieByTmdbId,
  upsertMovie,
  saveRecommendations,
  getRecommendations,
  getDirectorPreferences,
  getActorPreferences,
  getFeedbackExclusions,
  getTasteDna,
} from "@/lib/db";
import { getRelatedMovies, getMovieDetails, extractMovieData } from "@/lib/tmdb";
import { buildTasteProfile, scoreCandidate } from "@/lib/recommendations";
import { getRankedRecommendations } from "@/lib/claude";

export const maxDuration = 300;

export async function GET() {
  try {
    const recs = getRecommendations();
    return NextResponse.json({ recommendations: recs });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch recommendations", detail: String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const mood: string | null = body.mood ?? null;

    // 1. Load all rated movies
    const ratings = getAllRatings() as {
      tmdb_id: number;
      title: string;
      year: number | null;
      rating: number;
      rewatch: number | null;
      genres: string[];
      cast: string[];
      director: string | null;
      keywords: string[];
      vote_count: number | null;
      runtime: number | null;
      original_language: string | null;
    }[];

    if (ratings.length < 5) {
      return NextResponse.json(
        { error: "Import at least 5 rated films before generating recommendations." },
        { status: 400 }
      );
    }

    // 2. Build taste profile (incorporating explicitly preferred directors + actors)
    const preferredDirectors = getDirectorPreferences();
    const preferredActors = getActorPreferences();
    const profile = buildTasteProfile(ratings, preferredDirectors, preferredActors);

    // 3. Fetch related movies for top seeds — all in parallel
    const watchedIds = getWatchedTmdbIds();
    const excludedIds = getFeedbackExclusions();
    const seeds = [...ratings].sort((a, b) => b.rating - a.rating).slice(0, 10);

    const seedResults = await Promise.allSettled(
      seeds.map((seed) =>
        getRelatedMovies(seed.tmdb_id).then((related) => ({
          related,
          sourceWeight: (seed.rating - 2.5) / 2.5 + 1,
        }))
      )
    );

    const candidateMap = new Map<
      number,
      { stub: Awaited<ReturnType<typeof getRelatedMovies>>[number]; sourceWeight: number }
    >();
    for (const result of seedResults) {
      if (result.status === "fulfilled") {
        for (const movie of result.value.related) {
          if (!watchedIds.has(movie.id) && !excludedIds.has(movie.id) && !candidateMap.has(movie.id)) {
            candidateMap.set(movie.id, {
              stub: movie,
              sourceWeight: result.value.sourceWeight,
            });
          }
        }
      }
    }

    // 4. Enrich candidates — use DB cache first, only fetch missing from TMDB
    const candidateIds = Array.from(candidateMap.keys()).slice(0, 100);

    const cached: ReturnType<typeof extractMovieData>[] = [];
    const toFetch: number[] = [];

    for (const id of candidateIds) {
      const row = getMovieByTmdbId(id);
      // Consider cached if it has genre data (i.e. was fully enriched)
      if (row && (row.genres as string[]).length > 0) {
        cached.push(row as ReturnType<typeof extractMovieData>);
      } else {
        toFetch.push(id);
      }
    }

    // Fetch missing details all in parallel (no artificial delays)
    const fetched: ReturnType<typeof extractMovieData>[] = [];
    if (toFetch.length > 0) {
      const fetchResults = await Promise.allSettled(
        toFetch.map((id) => getMovieDetails(id))
      );
      for (const result of fetchResults) {
        if (result.status === "fulfilled") {
          const data = extractMovieData(result.value);
          upsertMovie(data);
          fetched.push(data);
        }
      }
    }

    // 5. Score all candidates
    const allCandidates = [...cached, ...fetched];
    const scoredCandidates = allCandidates.map((data) => {
      const entry = candidateMap.get(data.tmdb_id)!;
      return { ...data, content_score: scoreCandidate(data, profile, entry.sourceWeight) };
    });
    scoredCandidates.sort((a, b) => b.content_score - a.content_score);

    // 6. Claude ranks the top candidates (use taste DNA if available for richer context)
    const tasteDna = getTasteDna();
    const claudeRecs = await getRankedRecommendations(scoredCandidates, profile, 15, tasteDna?.dna_text, mood ?? undefined);

    // 7. Persist and return — filter to IDs we actually have in the movies table
    const validCandidateIds = new Set(allCandidates.map((c) => c.tmdb_id));
    const validRecs = claudeRecs.filter((r) => validCandidateIds.has(r.tmdb_id));

    if (validRecs.length === 0) {
      return NextResponse.json(
        { error: "Claude returned no valid recommendations. Try regenerating." },
        { status: 500 }
      );
    }

    saveRecommendations(
      validRecs.map((r) => ({
        tmdb_id: r.tmdb_id,
        score: r.score,
        explanation: r.explanation,
        rank: r.rank,
      }))
    );

    const saved = getRecommendations();
    return NextResponse.json({ recommendations: saved, generated: claudeRecs.length });
  } catch (err) {
    console.error("Recommendation generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate recommendations", detail: String(err) },
      { status: 500 }
    );
  }
}
