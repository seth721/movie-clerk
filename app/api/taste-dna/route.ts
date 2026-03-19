import { NextResponse } from "next/server";
import { getAllRatings, getTasteDna, saveTasteDna, getDb } from "@/lib/db";
import { generateTasteDna } from "@/lib/claude";

export const maxDuration = 120;

// GET — return cached film persona (or null if not generated yet)
export async function GET() {
  const dna = getTasteDna();
  const count = (getDb().prepare("SELECT COUNT(*) as c FROM user_ratings").get() as { c: number }).c;
  return NextResponse.json({
    dna: dna?.dna_text ?? null,
    persona: dna?.persona_name ?? null,
    rating_count: count,
    stale: dna ? dna.rating_count !== count : true,
  });
}

// POST — regenerate film persona
export async function POST() {
  try {
    const ratings = getAllRatings() as unknown as {
      tmdb_id: number;
      title: string;
      year: number | null;
      rating: number;
      genres: string[];
      director: string | null;
    }[];

    if (ratings.length < 5) {
      return NextResponse.json({ error: "Rate at least 5 films first." }, { status: 400 });
    }

    const result = await generateTasteDna(ratings);
    saveTasteDna(result.dna, ratings.length, result.persona);

    return NextResponse.json({ dna: result.dna, persona: result.persona, rating_count: ratings.length });
  } catch (err) {
    console.error("Film Persona error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
