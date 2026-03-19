import { NextRequest } from "next/server";
import { upsertMovie, upsertRating } from "@/lib/db";
import { searchMovie, getMovieDetails, extractMovieData } from "@/lib/tmdb";
import { ImportResult } from "@/types";

export const maxDuration = 300;

// ── Letterboxd HTTP session ───────────────────────────────────────────────────
// We do a preflight to letterboxd.com first to get real session cookies,
// then attach them to every subsequent request. This gets us past Cloudflare.

let _sessionCookies = "";
let _cookieExpiry = 0;

async function getSessionCookies(): Promise<string> {
  if (_sessionCookies && Date.now() < _cookieExpiry) return _sessionCookies;

  const res = await fetch("https://letterboxd.com/", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "max-age=0",
      "Upgrade-Insecure-Requests": "1",
    },
    redirect: "follow",
  });

  // Node 20+ exposes getSetCookie(); fall back to the raw header string
  let cookies: string[] = [];
  try {
    cookies = (res.headers as unknown as { getSetCookie(): string[] }).getSetCookie();
  } catch {
    const raw = res.headers.get("set-cookie");
    if (raw) cookies = raw.split(/,(?=[^ ])/).map((c) => c.trim());
  }

  _sessionCookies = cookies.map((c) => c.split(";")[0]).join("; ");
  _cookieExpiry = Date.now() + 25 * 60 * 1000; // refresh every 25 min
  return _sessionCookies;
}

function buildHeaders(cookie: string): Record<string, string> {
  return {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    Connection: "keep-alive",
    Referer: "https://letterboxd.com/",
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "same-origin",
    "sec-fetch-user": "?1",
    "Upgrade-Insecure-Requests": "1",
    Cookie: cookie,
  };
}

// ── CSV helpers ───────────────────────────────────────────────────────────────

interface LetterboxdFilm {
  name: string;
  year?: number;
  rating: number;
}

/** Parse a Letterboxd ratings.csv export */
function parseLetterboxdCsv(text: string): LetterboxdFilm[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];

  // Find header row (Letterboxd exports sometimes have a preamble)
  const headerIdx = lines.findIndex((l) =>
    l.toLowerCase().includes("name") && l.toLowerCase().includes("rating")
  );
  if (headerIdx === -1) return [];

  const headers = lines[headerIdx].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
  const nameIdx = headers.findIndex((h) => h === "name");
  const yearIdx = headers.findIndex((h) => h === "year");
  const ratingIdx = headers.findIndex((h) => h === "rating");

  if (nameIdx === -1 || ratingIdx === -1) return [];

  const films: LetterboxdFilm[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    // Simple CSV split (handles quoted fields with commas)
    const cols = lines[i].match(/("(?:[^"]|"")*"|[^,]*)/g)?.map((c) =>
      c.replace(/^"|"$/g, "").replace(/""/g, '"').trim()
    ) ?? [];

    const name = cols[nameIdx];
    const ratingRaw = cols[ratingIdx];
    if (!name || !ratingRaw) continue;

    const rating = parseFloat(ratingRaw);
    if (!rating || rating <= 0) continue;

    const year = yearIdx !== -1 ? parseInt(cols[yearIdx] ?? "") : undefined;
    films.push({ name, year: isNaN(year!) ? undefined : year, rating });
  }
  return films;
}

// ── HTML scraping ─────────────────────────────────────────────────────────────

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

function parseRatingsPage(html: string): LetterboxdFilm[] {
  const films: LetterboxdFilm[] = [];
  const liRe = /<li[^>]*class="[^"]*poster-container[^"]*"[^>]*>([\s\S]*?)<\/li>/g;
  let m: RegExpExecArray | null;
  while ((m = liRe.exec(html)) !== null) {
    const block = m[1];
    const nameMatch = block.match(/data-film-name="([^"]+)"/) ?? block.match(/alt="([^"]+)"/);
    const yearMatch = block.match(/data-film-year="(\d{4})"/);
    const ratedMatch = block.match(/\brated-(\d{1,2})\b/);
    if (nameMatch && ratedMatch) {
      const ratingNum = parseInt(ratedMatch[1], 10);
      if (ratingNum > 0) {
        films.push({
          name: decodeHtmlEntities(nameMatch[1]),
          year: yearMatch ? parseInt(yearMatch[1], 10) : undefined,
          rating: ratingNum / 2,
        });
      }
    }
  }
  return films;
}

function hasNextPage(html: string): boolean {
  return /rel="next"/.test(html) || /<a[^>]*class="[^"]*\bnext\b[^"]*"/.test(html);
}

async function fetchLetterboxdRatings(
  username: string,
  onPage: (page: number, total: number) => void
): Promise<LetterboxdFilm[]> {
  const cookie = await getSessionCookies();
  const headers = buildHeaders(cookie);
  const all: LetterboxdFilm[] = [];

  for (let page = 1; page <= 40; page++) {
    const url =
      page === 1
        ? `https://letterboxd.com/${username}/films/ratings/`
        : `https://letterboxd.com/${username}/films/ratings/page/${page}/`;

    const res = await fetch(url, { headers, redirect: "follow" });

    if (res.status === 404) {
      throw new Error(
        `Letterboxd user "${username}" not found. ` +
          `Check the spelling — it's case-insensitive. ` +
          `If the problem persists, use the CSV export option below.`
      );
    }
    if (res.status === 403 || res.status === 429) {
      throw new Error(
        `Letterboxd blocked the request (HTTP ${res.status}). ` +
          `This can happen due to rate limiting or Cloudflare. ` +
          `Please use the CSV export option below instead — it takes 30 seconds.`
      );
    }
    if (!res.ok) {
      throw new Error(
        `Letterboxd returned HTTP ${res.status}. Try again in a moment, ` +
          `or use the CSV export option below.`
      );
    }

    const html = await res.text();

    if (
      html.includes("profile is private") ||
      html.includes("This member&#x27;s profile is private")
    ) {
      throw new Error(
        `"${username}"'s Letterboxd profile is set to private. ` +
          `Change it to public in Letterboxd → Settings → Profile, or use the CSV export option below.`
      );
    }

    const films = parseRatingsPage(html);
    if (films.length === 0) break;

    all.push(...films);
    onPage(page, all.length);

    if (!hasNextPage(html)) break;
    await new Promise((r) => setTimeout(r, 400));
  }

  return all;
}

// ── Shared TMDB import logic ──────────────────────────────────────────────────

async function importFilmsToDb(
  films: LetterboxdFilm[],
  send: (e: object) => void
): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, skipped: 0, failed: [], total: films.length };
  const BATCH = 5;

  for (let i = 0; i < films.length; i += BATCH) {
    const batch = films.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (film) => {
        try {
          const hit = await searchMovie(film.name, film.year);
          if (!hit) { result.failed.push(film.name); return; }
          const details = await getMovieDetails(hit.id);
          const movieData = extractMovieData(details);
          upsertMovie(movieData);
          upsertRating({ tmdb_id: movieData.tmdb_id, letterboxd_title: film.name, rating: film.rating, watched_date: null });
          result.imported++;
        } catch {
          result.failed.push(film.name);
        }
      })
    );
    if (i > 0 && i % 50 === 0) {
      send({ type: "progress", message: `Matched ${result.imported} / ${films.length} films…` });
    }
    if (i + BATCH < films.length) await new Promise((r) => setTimeout(r, 200));
  }

  return result;
}

// ── Route handlers ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";

  // ── CSV upload path ────────────────────────────────────────────────────────
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return new Response(JSON.stringify({ type: "error", message: "No file provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();
    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
    const writer = writable.getWriter();
    const send = (e: object) => writer.write(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));

    (async () => {
      try {
        send({ type: "progress", message: "Parsing CSV…" });
        const text = await file.text();
        const films = parseLetterboxdCsv(text);

        if (!films.length) {
          send({ type: "error", message: "No rated films found in CSV. Make sure you're uploading ratings.csv from Letterboxd." });
          return;
        }

        send({ type: "progress", message: `Found ${films.length} rated films — matching with TMDB…`, count: films.length });
        const result = await importFilmsToDb(films, send);
        send({ type: "done", result });
      } catch (err) {
        send({ type: "error", message: String(err) });
      } finally {
        writer.close();
      }
    })();

    return new Response(readable, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" },
    });
  }

  // ── Username scrape path ──────────────────────────────────────────────────
  const body = await req.json().catch(() => ({}));
  const username: string = (body.username ?? "").trim().toLowerCase();

  if (!username) {
    return new Response(JSON.stringify({ type: "error", message: "Username is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const send = (e: object) => writer.write(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));

  (async () => {
    try {
      send({ type: "progress", message: "Connecting to Letterboxd…" });

      const films = await fetchLetterboxdRatings(username, (page, count) => {
        send({ type: "progress", message: `Fetched page ${page} · ${count} films found so far`, count });
      });

      if (!films.length) {
        send({ type: "error", message: `No rated films found for "${username}". Make sure the profile is public and has at least one rating.` });
        return;
      }

      send({ type: "progress", message: `Found ${films.length} rated films — matching with TMDB…`, count: films.length });
      const result = await importFilmsToDb(films, send);
      result.username = username;
      send({ type: "done", result });
    } catch (err) {
      send({ type: "error", message: String(err) });
    } finally {
      writer.close();
    }
  })();

  return new Response(readable, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" },
  });
}
