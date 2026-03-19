import { NextResponse } from "next/server";
import { getCachedLogos, saveLogo } from "@/lib/db";
import { getMovieLogoPath } from "@/lib/tmdb";

// GET /api/movie-logos?ids=1,2,3
export async function GET(req: Request) {
  const url = new URL(req.url);
  const idsParam = url.searchParams.get("ids") ?? "";
  if (!idsParam) return NextResponse.json({});

  const ids = idsParam
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n));

  if (!ids.length) return NextResponse.json({});

  // Check cache first
  const cached = getCachedLogos(ids);
  const result: Record<number, string | null> = {};
  const missing: number[] = [];

  for (const id of ids) {
    if (cached.has(id)) {
      result[id] = cached.get(id) ?? null;
    } else {
      missing.push(id);
    }
  }

  // Fetch missing logos from TMDB (in parallel, up to 10 at a time)
  const BATCH = 10;
  for (let i = 0; i < missing.length; i += BATCH) {
    const chunk = missing.slice(i, i + BATCH);
    const fetched = await Promise.allSettled(
      chunk.map((id) => getMovieLogoPath(id).then((path) => ({ id, path })))
    );
    for (const r of fetched) {
      if (r.status === "fulfilled") {
        const { id, path } = r.value;
        result[id] = path;
        saveLogo(id, path);
      }
    }
  }

  return NextResponse.json(result);
}
