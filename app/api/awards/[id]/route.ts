import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import fs from "fs";
import path from "path";

function readEnvKey(key: string): string {
  // process.env may be overridden by the parent process (e.g. Claude Code sets ANTHROPIC_API_KEY="")
  // Read directly from .env.local as a reliable fallback
  const envVal = process.env[key];
  if (envVal) return envVal;
  try {
    const envFile = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
    const match = envFile.match(new RegExp(`^${key}=(.+)$`, "m"));
    return match ? match[1].trim() : "";
  } catch {
    return "";
  }
}

export interface AwardEntry {
  ceremony: string;
  year: number;
  categories: string[];
}

export interface AwardsData {
  wins: AwardEntry[];
  nominations: AwardEntry[];
}

const EMPTY: AwardsData = { wins: [], nominations: [] };

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tmdbId = parseInt(id, 10);
  if (isNaN(tmdbId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const db = getDb();
  const url = new URL(req.url);
  const bust = url.searchParams.get("bust") === "1";

  // Cache check (skip if bust=1, or if cached result was empty)
  if (!bust) {
    const cached = db
      .prepare("SELECT data FROM awards_cache WHERE tmdb_id = ?")
      .get(tmdbId) as { data: string } | undefined;
    if (cached) {
      const parsed = JSON.parse(cached.data) as AwardsData;
      if (parsed.wins.length > 0 || parsed.nominations.length > 0) {
        return NextResponse.json(parsed);
      }
    }
  }

  // Title + year from query params
  let movieTitle = url.searchParams.get("title") ?? "";
  let movieYear  = url.searchParams.get("year")  ?? "";
  const omdbSummary = url.searchParams.get("summary") ?? "";

  if (!movieTitle) {
    const row = db
      .prepare("SELECT title, year FROM movies WHERE tmdb_id = ?")
      .get(tmdbId) as { title: string; year: number } | undefined;
    if (!row) return NextResponse.json(EMPTY);
    movieTitle = row.title;
    movieYear  = String(row.year);
  }

  const apiKey = readEnvKey("ANTHROPIC_API_KEY");
  if (!apiKey) {
    console.error("[awards] ANTHROPIC_API_KEY not found");
    return NextResponse.json(EMPTY);
  }

  const prompt = `List the award wins and nominations for the film "${movieTitle}" (${movieYear}).
${omdbSummary ? `OMDb summary for reference: "${omdbSummary}"` : ""}

Return ONLY valid JSON in this exact format, no other text:
{
  "wins": [
    { "ceremony": "Academy Awards", "year": 1995, "categories": ["Best Picture", "Best Director"] }
  ],
  "nominations": [
    { "ceremony": "Academy Awards", "year": 1995, "categories": ["Best Actor in a Leading Role"] }
  ]
}

Rules:
- Group by ceremony and year
- Include all major ceremonies: Oscars, Golden Globes, BAFTA, SAG Awards, Critics Choice, DGA, WGA, PGA, Cannes, Venice, Berlin, Sundance, Independent Spirit, etc.
- Only include awards you are confident about — do not guess or invent
- If unsure, return { "wins": [], "nominations": [] }`;

  try {
    // Call Anthropic REST API directly via fetch
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[awards] Anthropic error:", res.status, errText.slice(0, 200));
      return NextResponse.json(EMPTY);
    }

    const json = await res.json();
    const text: string = json.content?.[0]?.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[awards] No JSON in response:", text.slice(0, 200));
      return NextResponse.json(EMPTY);
    }

    const data: AwardsData = JSON.parse(jsonMatch[0]);

    // Cache it
    db.prepare(
      "INSERT OR REPLACE INTO awards_cache (tmdb_id, data, cached_at) VALUES (?, ?, datetime('now'))"
    ).run(tmdbId, JSON.stringify(data));

    return NextResponse.json(data);
  } catch (err) {
    console.error("[awards] fetch error:", err);
    return NextResponse.json(EMPTY);
  }
}
