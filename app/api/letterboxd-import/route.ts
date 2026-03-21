import { NextRequest, NextResponse } from "next/server";
import { upsertMovie, upsertRating } from "@/lib/db";
import { searchMovie } from "@/lib/tmdb";

export const maxDuration = 300;

interface CsvRow {
  name: string;
  year: number | null;
  rating: number | null;
  date: string | null;
  rewatch: boolean;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Find column indices from header
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
  const col = (name: string) => header.indexOf(name);

  const iName = col("name");
  const iYear = col("year");
  const iRating = col("rating");
  const iDate = col("date");
  const iRewatch = col("rewatch"); // present in diary.csv, absent in ratings.csv

  if (iName === -1) return [];

  return lines.slice(1).flatMap((line) => {
    // Handle quoted fields
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === "," && !inQuotes) { fields.push(current.trim()); current = ""; }
      else { current += ch; }
    }
    fields.push(current.trim());

    const name = fields[iName]?.replace(/"/g, "").trim();
    if (!name) return [];

    const yearStr = fields[iYear]?.replace(/"/g, "").trim();
    const year = yearStr ? parseInt(yearStr, 10) : null;

    const ratingStr = iRating >= 0 ? fields[iRating]?.replace(/"/g, "").trim() : "";
    const rating = ratingStr ? parseFloat(ratingStr) : null;

    const date = iDate >= 0 ? fields[iDate]?.replace(/"/g, "").trim() || null : null;

    const rewatchStr = iRewatch >= 0 ? fields[iRewatch]?.replace(/"/g, "").trim().toLowerCase() : "";
    const rewatch = rewatchStr === "yes";

    return [{ name, year, rating, date, rewatch }];
  });
}

export async function POST(req: NextRequest) {
  let text: string;
  try {
    text = await req.text();
  } catch {
    return NextResponse.json({ error: "Could not read file content." }, { status: 400 });
  }

  const rows = parseCsv(text);
  if (!rows.length) {
    return NextResponse.json({ error: "No rows found. Make sure you uploaded ratings.csv." }, { status: 400 });
  }

  const toImport = rows.filter((r) => r.rating !== null && !isNaN(r.rating as number));
  if (!toImport.length) {
    return NextResponse.json({ error: "No rated films found in this file." }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const send = (e: object) => writer.write(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));

  (async () => {
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    const BATCH = 5;

    for (let i = 0; i < toImport.length; i += BATCH) {
      const batch = toImport.slice(i, i + BATCH);
      await Promise.allSettled(
        batch.map(async (row) => {
          try {
            const match = await searchMovie(row.name, row.year ?? undefined);
            if (!match) { skipped++; return; }
            upsertMovie({
              tmdb_id: match.id,
              title: match.title,
              year: match.release_date ? parseInt(match.release_date.slice(0, 4), 10) : row.year,
              poster_path: match.poster_path ?? null,
              backdrop_path: null,
              genres: [],
              cast: [],
              director: null,
              keywords: [],
              overview: match.overview ?? null,
              runtime: null,
              vote_average: match.vote_average ?? null,
              vote_count: null,
            });
            upsertRating({
              tmdb_id: match.id,
              letterboxd_title: row.name,
              rating: row.rating as number,
              watched_date: row.date,
              rewatch: row.rewatch,
            });
            imported++;
          } catch (err) {
            console.error(`[letterboxd-import] failed "${row.name}":`, err);
            errors++;
          }
        })
      );

      send({ type: "progress", done: Math.min(i + BATCH, toImport.length), total: toImport.length });

      if (i + BATCH < toImport.length) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    send({ type: "done", imported, skipped, errors, total: toImport.length });
    writer.close();
  })();

  return new Response(readable, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" },
  });
}
