import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { MONTHLY_THEMES, DIRECTOR_SPOTLIGHTS, GRINDHOUSE, SectionFilm } from "@/lib/monthly-sections";

export const dynamic = "force-dynamic";

const TMDB_BASE = "https://api.themoviedb.org/3";

async function tmdbDiscover(params: Record<string, string>): Promise<SectionFilm[]> {
  const url = new URL(`${TMDB_BASE}/discover/movie`);
  url.searchParams.set("api_key", process.env.TMDB_API_KEY!);
  url.searchParams.set("include_adult", "false");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`TMDB discover failed: ${res.status}`);
  const data = await res.json();
  return ((data.results ?? []) as Record<string, unknown>[]).slice(0, 10).map((m) => ({
    id: m.id as number,
    title: m.title as string,
    year: m.release_date ? parseInt((m.release_date as string).slice(0, 4)) : null,
    poster_path: (m.poster_path as string | null) ?? null,
    overview: (m.overview as string | null) ?? null,
    vote_average: (m.vote_average as number | null) ?? null,
  }));
}

async function tmdbDirectorFilms(personId: number): Promise<SectionFilm[]> {
  const url = new URL(`${TMDB_BASE}/person/${personId}/movie_credits`);
  url.searchParams.set("api_key", process.env.TMDB_API_KEY!);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`TMDB person ${personId} failed: ${res.status}`);
  const data = await res.json();
  const crew = (data.crew ?? []) as Record<string, unknown>[];
  return crew
    .filter((c) => c.job === "Director" && (c.vote_count as number) >= 500 && c.release_date)
    .sort((a, b) => (b.vote_count as number) - (a.vote_count as number))
    .slice(0, 10)
    .map((m) => ({
      id: m.id as number,
      title: m.title as string,
      year: m.release_date ? parseInt((m.release_date as string).slice(0, 4)) : null,
      poster_path: (m.poster_path as string | null) ?? null,
      overview: (m.overview as string | null) ?? null,
      vote_average: (m.vote_average as number | null) ?? null,
    }));
}

export async function GET() {
  const now = new Date();
  const month = now.getMonth() + 1; // 1–12
  const monthKey = `${now.getFullYear()}-${String(month).padStart(2, "0")}`;

  // ── Check cache ──────────────────────────────────────────────────────────────
  const db = getDb();
  const cached = db
    .prepare("SELECT data FROM monthly_sections_cache WHERE month_key = ?")
    .get(monthKey) as { data: string } | undefined;

  if (cached) {
    return NextResponse.json(JSON.parse(cached.data));
  }

  // ── Fetch fresh data ─────────────────────────────────────────────────────────
  const theme = MONTHLY_THEMES[month];
  const director = DIRECTOR_SPOTLIGHTS[month];

  // Grindhouse: rotate through pages 1–3 by month for variety
  const grindPage = String((month % 3) + 1);

  const [themeResult, grindhouseResult, directorResult] = await Promise.allSettled([
    tmdbDiscover({ ...theme.discover, page: "1" }),
    tmdbDiscover({ ...GRINDHOUSE.discover, page: grindPage }),
    tmdbDirectorFilms(director.tmdbPersonId),
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
      films: themeResult.status === "fulfilled" ? themeResult.value : [],
    },
    grindhouse: {
      title: GRINDHOUSE.title,
      emoji: GRINDHOUSE.emoji,
      description: GRINDHOUSE.description,
      films: grindhouseResult.status === "fulfilled" ? grindhouseResult.value : [],
    },
    director: {
      name: director.name,
      years: director.years,
      description: director.description,
      films: directorResult.status === "fulfilled" ? directorResult.value : [],
    },
  };

  // ── Cache for the month ──────────────────────────────────────────────────────
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
