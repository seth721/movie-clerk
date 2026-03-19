import { NextRequest, NextResponse } from "next/server";
import { CRITERION, KINO_LORBER } from "@/lib/labels";
import { searchMovie } from "@/lib/tmdb";

export const revalidate = 86400; // cache 24 hours

async function resolveLabel(films: { title: string; year: number }[]) {
  const results = await Promise.all(
    films.map((f) =>
      searchMovie(f.title, f.year).catch(() => null)
    )
  );
  return results.filter(Boolean);
}

export async function GET(req: NextRequest) {
  const label = req.nextUrl.searchParams.get("label");

  if (label === "criterion") {
    const films = await resolveLabel(CRITERION);
    return NextResponse.json({ films });
  }
  if (label === "kino") {
    const films = await resolveLabel(KINO_LORBER);
    return NextResponse.json({ films });
  }

  return NextResponse.json({ films: [] });
}
