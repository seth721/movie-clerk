import { searchMovie } from "@/lib/tmdb";

export interface NewBevEvent {
  day: string;    // e.g. "Wed"
  month: string;  // e.g. "March"
  date: string;   // e.g. "18"
  times: string[];
  titles: string[];
  image: string | null;
  url: string;
}

export interface NewBevFilm {
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  release_date?: string;
  vote_average?: number;
  overview?: string;
  // New Bev specific
  screeningTitle: string;   // original title from New Bev
  nextDate: string;         // e.g. "Wed, March 18"
  nextTime: string;
  ticketUrl: string;
}

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

function decodeHtml(str: string): string {
  return str
    .replace(/&#8217;/g, "'")
    .replace(/&#038;/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#[0-9]+;/g, "")
    .trim();
}

export async function scrapeNewBevSchedule(): Promise<NewBevEvent[]> {
  const res = await fetch("https://thenewbev.com/schedule/", { headers: HEADERS });
  if (!res.ok) return [];
  const html = await res.text();

  const events: NewBevEvent[] = [];

  // Match each event-card article
  const articleRegex = /<article[^>]+class="[^"]*event-card[^"]*"[^>]*>([\s\S]*?)<\/article>/g;
  let articleMatch;

  while ((articleMatch = articleRegex.exec(html)) !== null) {
    const block = articleMatch[1];

    const href = block.match(/href="([^"]+)"/)?.[1] ?? "";
    const imgSrc = block.match(/<img[^>]+src="([^"]+)"/)?.[1] ?? null;

    const day = decodeHtml(block.match(/event-card__day">(.*?)<\/span>/)?.[1] ?? "").replace(",", "").trim();
    const month = decodeHtml(block.match(/event-card__month">(.*?)<\/span>/)?.[1] ?? "").trim();
    const date = decodeHtml(block.match(/event-card__numb">(.*?)<\/span>/)?.[1] ?? "").trim();

    const timeMatches = [...block.matchAll(/<time[^>]*class="event-card__time">(.*?)<\/time>/g)];
    const times = timeMatches.map((m) => decodeHtml(m[1]).trim());

    const titleBlock = block.match(/event-card__title">([\s\S]*?)<\/h4>/)?.[1] ?? "";
    const rawTitle = decodeHtml(titleBlock.replace(/<br\s*\/?>/gi, " / ").replace(/<[^>]+>/g, " "));
    const titles = rawTitle
      .split(/\s*\/\s*/)
      .map((t) => t.trim())
      .filter(Boolean);

    if (titles.length && href) {
      events.push({ day, month, date, times, titles, image: imgSrc, url: href });
    }
  }

  return events;
}

export async function getNewBevFilms(): Promise<{ films: NewBevFilm[]; events: NewBevEvent[] }> {
  const events = await scrapeNewBevSchedule();
  if (!events.length) return { films: [], events: [] };

  // Collect unique film titles to search on TMDB
  const seen = new Map<string, NewBevFilm>();

  for (const event of events) {
    for (const title of event.titles) {
      if (seen.has(title.toLowerCase())) continue;

      const result = await searchMovie(title).catch(() => null);
      if (!result) continue;

      seen.set(title.toLowerCase(), {
        tmdb_id: result.id,
        title: result.title,
        poster_path: result.poster_path ?? null,
        release_date: result.release_date,
        vote_average: result.vote_average,
        overview: result.overview,
        screeningTitle: title,
        nextDate: `${event.day}, ${event.month} ${event.date}`,
        nextTime: event.times[0] ?? "",
        ticketUrl: event.url,
      });
    }
  }

  return { films: Array.from(seen.values()), events };
}
