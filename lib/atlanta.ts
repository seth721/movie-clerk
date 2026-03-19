import { searchMovie } from "@/lib/tmdb";

export interface AtlantaFilm {
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  release_date?: string;
  vote_average?: number;
  overview?: string;
  screeningTitle: string;
  theaterUrl: string;
}

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

function stripYear(title: string): string {
  // Remove trailing "(2024)" style year from title
  return title.replace(/\s*\(\d{4}\)\s*$/, "").trim();
}

export async function getTaraFilms(): Promise<AtlantaFilm[]> {
  try {
    const res = await fetch("https://taraatlanta.com/home", {
      headers: HEADERS,
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const html = await res.text();

    // Extract unique movie titles from /movie/ links
    const titleRegex = /<a[^>]+href="https?:\/\/(?:www\.)?taraatlanta\.com\/movie\/[^"]*"[^>]*>([^<]{3,80})<\/a>/gi;
    const rawTitles: string[] = [];
    const seen = new Set<string>();
    let match;

    while ((match = titleRegex.exec(html)) !== null) {
      const raw = match[1].trim();
      const title = stripYear(raw);
      const key = title.toLowerCase();
      if (title.length > 2 && !seen.has(key)) {
        seen.add(key);
        rawTitles.push(title);
      }
    }

    if (!rawTitles.length) return [];

    // Resolve to TMDB
    const films: AtlantaFilm[] = [];
    for (const title of rawTitles) {
      const result = await searchMovie(title).catch(() => null);
      if (!result) continue;
      films.push({
        tmdb_id: result.id,
        title: result.title,
        poster_path: result.poster_path ?? null,
        release_date: result.release_date,
        vote_average: result.vote_average,
        overview: result.overview,
        screeningTitle: title,
        theaterUrl: "https://taraatlanta.com/home",
      });
    }

    return films;
  } catch {
    return [];
  }
}
