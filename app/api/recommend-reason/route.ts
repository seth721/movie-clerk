import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const tmdbId = parseInt(searchParams.get("tmdb_id") ?? "", 10);
  const title = searchParams.get("title") ?? "";
  const director = searchParams.get("director") ?? "";
  const genres = (searchParams.get("genres") ?? "").split(",").filter(Boolean);
  const keywords = (searchParams.get("keywords") ?? "").split(",").filter(Boolean);

  if (isNaN(tmdbId)) return NextResponse.json({ recommended: false });

  try {
    const db = getDb();

    // Need at least 3 ratings to make a meaningful judgement
    const { count } = db
      .prepare("SELECT COUNT(*) as count FROM user_ratings")
      .get() as { count: number };
    if (count < 3) return NextResponse.json({ recommended: false });

    // Get user's liked movies with their metadata
    const likedRows = db
      .prepare(
        `SELECT r.rating, m.title, m.year, m.director, m.genres, m.keywords
         FROM user_ratings r
         JOIN movies m ON m.tmdb_id = r.tmdb_id
         WHERE r.rating >= 3.5
         ORDER BY r.rating DESC
         LIMIT 30`
      )
      .all() as {
        rating: number;
        title: string;
        year: number;
        director: string | null;
        genres: string;
        keywords: string;
      }[];

    if (!likedRows.length) return NextResponse.json({ recommended: false });

    const liked = likedRows.map((r) => ({
      ...r,
      genres: JSON.parse(r.genres || "[]") as string[],
      keywords: JSON.parse(r.keywords || "[]") as string[],
    }));

    // Score this movie against the taste profile
    let score = 0;
    const matchReasons: string[] = [];

    // Director match — strongest signal
    if (director) {
      const directorRatings = liked.filter((m) => m.director === director);
      if (directorRatings.length > 0) {
        const avgRating =
          directorRatings.reduce((s, m) => s + m.rating, 0) / directorRatings.length;
        if (avgRating >= 4.0) {
          score += 5;
          matchReasons.push(`director:${director}`);
        } else if (avgRating >= 3.5) {
          score += 3;
          matchReasons.push(`director:${director}`);
        }
      }
    }

    // Genre overlap
    const genreFreq: Record<string, number> = {};
    for (const m of liked) {
      for (const g of m.genres) {
        genreFreq[g] = (genreFreq[g] ?? 0) + m.rating;
      }
    }
    const topGenres = Object.entries(genreFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([g]) => g);

    const matchedGenres = genres.filter((g) => topGenres.includes(g));
    score += matchedGenres.length * 2;
    if (matchedGenres.length > 0) matchReasons.push(`genres:${matchedGenres.join(",")}`);

    // Keyword overlap
    const keywordFreq: Record<string, number> = {};
    for (const m of liked) {
      for (const k of m.keywords) {
        keywordFreq[k] = (keywordFreq[k] ?? 0) + 1;
      }
    }
    const topKeywords = Object.entries(keywordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([k]) => k);
    const matchedKeywords = keywords.filter((k) => topKeywords.includes(k));
    score += Math.min(matchedKeywords.length, 5);

    // Not a strong enough fit
    if (score < 5) return NextResponse.json({ recommended: false });

    // Generate a punchy reason with Claude
    const topLiked = liked.slice(0, 8).map((m) => `"${m.title}" (${m.rating}★)`).join(", ");
    const prompt = `You are a passionate, slightly opinionated video store clerk recommending a film to a customer.

The customer's top-rated films: ${topLiked}
Film being recommended: "${title}"${director ? ` directed by ${director}` : ""}${genres.length ? `, genres: ${genres.join(", ")}` : ""}

Write ONE punchy sentence (max 18 words) explaining why this film suits their taste. Be specific — reference their actual rated films or the director if relevant. Sound enthusiastic but not sycophantic. No quotes around your response.`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 80,
      messages: [{ role: "user", content: prompt }],
    });

    const reason =
      message.content[0].type === "text" ? message.content[0].text.trim() : null;

    return NextResponse.json({ recommended: true, reason });
  } catch (err) {
    console.error("recommend-reason error:", err);
    return NextResponse.json({ recommended: false });
  }
}
