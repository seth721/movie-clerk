import { searchMovie } from "@/lib/tmdb";

export interface ACFilm {
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  release_date?: string;
  vote_average?: number;
  overview?: string;
  screeningTitle: string;
  screeningDate: string;   // e.g. "Fri Apr 3, 2026"
  screeningTime: string;   // e.g. "7:30 PM"
  venue: string;           // e.g. "Los Feliz 3" or "Egyptian Theatre"
  ticketUrl: string;
}

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

const BASE = "https://www.americancinematheque.com";

// Convert "floating-clouds-4-3-26" → { title: "Floating Clouds", date: "Apr 3, 2026" }
function parseSlug(slug: string): { title: string; date: string } | null {
  // Strip trailing date like -4-3-26 or -10-15-26
  const dateMatch = slug.match(/^(.+?)-(\d{1,2})-(\d{1,2})-(\d{2})$/);
  if (!dateMatch) return null;

  const titleSlug = dateMatch[1];
  const month = parseInt(dateMatch[2]);
  const day = parseInt(dateMatch[3]);
  const year = 2000 + parseInt(dateMatch[4]);

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthName = monthNames[month - 1] ?? "";
  const date = `${monthName} ${day}, ${year}`;

  // Slug to title case
  const title = titleSlug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return { title, date };
}

// Extract unique /now-showing/ hrefs from an HTML string (handles relative and absolute URLs)
function extractNowShowingLinks(html: string): Array<{ href: string; slug: string; anchorTitle: string }> {
  const results: Array<{ href: string; slug: string; anchorTitle: string }> = [];
  const seen = new Set<string>();

  // Match both relative (/now-showing/slug/) and absolute (https://...americancinematheque.com/now-showing/slug/)
  const linkRegex = /href="((?:https?:\/\/(?:www\.)?americancinematheque\.com)?\/now-showing\/([^/"?]+)\/?)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = linkRegex.exec(html)) !== null) {
    const rawHref = m[1];
    const slug = m[2];
    const anchorText = m[3].replace(/<[^>]+>/g, "").trim();

    // Skip nav/filter links (no date in slug)
    if (!slug.match(/-\d{1,2}-\d{1,2}-\d{2}$/)) continue;

    if (!seen.has(slug)) {
      seen.add(slug);
      const href = rawHref.startsWith("http") ? rawHref : `${BASE}${rawHref}`;
      // Extract title from "Read More about FILM TITLE" pattern
      const titleMatch = anchorText.match(/Read More about\s+(.+)/i);
      const anchorTitle = titleMatch ? titleMatch[1].trim() : anchorText;
      results.push({ href, slug, anchorTitle });
    }
  }
  return results;
}

// Extract /series/ hrefs from the homepage (handles relative and absolute)
function extractSeriesLinks(html: string): string[] {
  const results: string[] = [];
  const seen = new Set<string>();
  const regex = /href="((?:https?:\/\/(?:www\.)?americancinematheque\.com)?\/series\/([^/"?]+)\/?)"[^>]*>/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    const rawHref = m[1];
    const href = rawHref.startsWith("http") ? rawHref : `${BASE}${rawHref}`;
    if (!seen.has(href)) {
      seen.add(href);
      results.push(href);
    }
  }
  return results;
}

// Is this date in the future (or today)?
function isUpcoming(dateStr: string): boolean {
  if (!dateStr) return true;
  try {
    const d = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d >= today;
  } catch {
    return true;
  }
}

export async function getACFilms(): Promise<ACFilm[]> {
  try {
    // 1. Fetch homepage to discover series and direct event links
    const homeRes = await fetch(`${BASE}/`, { headers: HEADERS });
    if (!homeRes.ok) return [];
    const homeHtml = await homeRes.text();

    const seriesUrls = extractSeriesLinks(homeHtml);
    const directLinks = extractNowShowingLinks(homeHtml);

    // 2. Scrape each series page for event links
    const allLinks = [...directLinks];
    await Promise.all(
      seriesUrls.slice(0, 12).map(async (url) => {
        try {
          const res = await fetch(url, { headers: HEADERS });
          if (!res.ok) return;
          const html = await res.text();
          const links = extractNowShowingLinks(html);
          allLinks.push(...links);
        } catch {
          // skip failed series
        }
      })
    );

    // 3. Deduplicate by slug
    const bySlug = new Map<string, { href: string; slug: string; anchorTitle: string }>();
    for (const link of allLinks) {
      if (!bySlug.has(link.slug)) bySlug.set(link.slug, link);
    }

    // 4. Parse titles and dates, filter to upcoming
    const upcoming: Array<{ title: string; displayTitle: string; date: string; slug: string; href: string }> = [];
    for (const { href, slug, anchorTitle } of bySlug.values()) {
      const parsed = parseSlug(slug);
      if (!parsed) continue;
      if (!isUpcoming(parsed.date)) continue;

      // Prefer anchor title (exact case) over slug-derived title
      const displayTitle = anchorTitle && anchorTitle.length > 2 ? anchorTitle : parsed.title;
      // Use slug-derived title for TMDB search (cleaner)
      upcoming.push({ title: parsed.title, displayTitle, date: parsed.date, slug, href });
    }

    // Sort by date
    upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 5. Resolve to TMDB (deduplicate by normalized title)
    const films: ACFilm[] = [];
    const seenTitles = new Set<string>();

    for (const item of upcoming.slice(0, 40)) {
      const key = item.title.toLowerCase();
      if (seenTitles.has(key)) continue;
      seenTitles.add(key);

      const result = await searchMovie(item.title).catch(() => null);
      if (!result) continue;

      films.push({
        tmdb_id: result.id,
        title: result.title,
        poster_path: result.poster_path ?? null,
        release_date: result.release_date,
        vote_average: result.vote_average,
        overview: result.overview,
        screeningTitle: item.displayTitle,
        screeningDate: item.date,
        screeningTime: "",
        venue: "American Cinematheque",
        ticketUrl: item.href,
      });
    }

    return films;
  } catch {
    return [];
  }
}
