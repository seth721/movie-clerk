import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  MONTHLY_THEMES,
  DIRECTOR_SPOTLIGHTS,
  getGrindhouseSet,
  FilmRef,
  SectionFilm,
} from "@/lib/monthly-sections";
import { searchMovie } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

async function resolveFilms(films: FilmRef[]): Promise<SectionFilm[]> {
  const results = await Promise.allSettled(
    films.map(async ({ title, year }) => {
      const hit = await searchMovie(title, year);
      if (!hit) return null;
      return {
        id: hit.id,
        title: hit.title,
        year,
        poster_path: hit.poster_path ?? null,
        overview: hit.overview ?? null,
        vote_average: hit.vote_average ?? null,
      } as SectionFilm;
    })
  );
  return results
    .filter(
      (r): r is PromiseFulfilledResult<SectionFilm> =>
        r.status === "fulfilled" && r.value !== null
    )
    .map((r) => r.value);
}

export async function GET(req: NextRequest) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const forceRefresh = req.nextUrl.searchParams.get("refresh") === "1";
  // v2 suffix so old cached Discover-based results are ignored
  const monthKey = `${now.getFullYear()}-${String(month).padStart(2, "0")}-v2`;

  const db = getDb();

  if (!forceRefresh) {
    const cached = db
      .prepare("SELECT data FROM monthly_sections_cache WHERE month_key = ?")
      .get(monthKey) as { data: string } | undefined;
    if (cached) {
      return NextResponse.json(JSON.parse(cached.data));
    }
  }

  const theme = MONTHLY_THEMES[month];
  const director = DIRECTOR_SPOTLIGHTS[month];
  const grindhouse = getGrindhouseSet(month);

  const [themeFilms, grindhouseFilms, directorFilms] = await Promise.all([
    resolveFilms(theme.films),
    resolveFilms(grindhouse.films),
    resolveFilms(director.films),
  ]);

  const payload = {
    monthKey,
    month,
    monthName: now.toLocaleString("en-US", { month: "long" }),
    year: now.getFullYear(),
    theme: {
      title: theme.title,
      emoji: theme.emoji,
      description: theme.description,
      films: themeFilms,
    },
    grindhouse: {
      title: grindhouse.title,
      emoji: grindhouse.emoji,
      description: grindhouse.description,
      films: grindhouseFilms,
    },
    director: {
      name: director.name,
      years: director.years,
      description: director.description,
      films: directorFilms,
    },
  };

  db.prepare(
    "INSERT OR REPLACE INTO monthly_sections_cache (month_key, data) VALUES (?, ?)"
  ).run(monthKey, JSON.stringify(payload));

  return NextResponse.json(payload);
}

// ── Email subscriber signup ──────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }
    const db = getDb();
    db.prepare(
      "INSERT INTO email_subscribers (email) VALUES (?) ON CONFLICT(email) DO UPDATE SET active = 1"
    ).run(email.toLowerCase().trim());
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
