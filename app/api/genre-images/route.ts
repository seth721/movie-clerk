import { NextResponse } from "next/server";
import { discoverMovies } from "@/lib/tmdb";

const GENRE_IDS = [28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 10402, 9648, 10749, 878, 53, 10752, 37];

export const revalidate = 3600; // cache for 1 hour

export async function GET() {
  const results = await Promise.allSettled(
    GENRE_IDS.map(async (id) => {
      const data = await discoverMovies(String(id), 1);
      const top = data.results?.[0];
      return {
        genreId: id,
        backdrop_path: top?.backdrop_path ?? null,
        poster_path: top?.poster_path ?? null,
        title: top?.title ?? null,
      };
    })
  );

  const images = results
    .filter((r) => r.status === "fulfilled")
    .map((r) => (r as PromiseFulfilledResult<{ genreId: number; backdrop_path: string | null; poster_path: string | null; title: string | null }>).value);

  return NextResponse.json({ images });
}
