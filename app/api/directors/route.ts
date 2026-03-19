import { NextResponse } from "next/server";
import { CURATED_DIRECTORS } from "@/lib/directors";

const TMDB_BASE = "https://api.themoviedb.org/3";

export const revalidate = 86400; // cache for 24 hours

export async function GET() {
  const results = await Promise.allSettled(
    CURATED_DIRECTORS.map(async ({ tmdbPersonId, name }) => {
      const res = await fetch(
        `${TMDB_BASE}/person/${tmdbPersonId}?api_key=${process.env.TMDB_API_KEY}`,
        { next: { revalidate: 86400 } }
      );
      if (!res.ok) return { tmdbPersonId, name, profile_path: null };
      const data = await res.json() as { profile_path?: string | null };
      return { tmdbPersonId, name, profile_path: data.profile_path ?? null };
    })
  );

  const directors = results
    .filter((r) => r.status === "fulfilled")
    .map((r) => (r as PromiseFulfilledResult<{ tmdbPersonId: number; name: string; profile_path: string | null }>).value);

  return NextResponse.json({ directors });
}
