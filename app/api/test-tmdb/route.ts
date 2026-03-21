import { NextResponse } from "next/server";
import { searchMovie } from "@/lib/tmdb";

export async function GET() {
  try {
    const result = await searchMovie("The Godfather", 1972);
    return NextResponse.json({
      keyPresent: !!process.env.TMDB_API_KEY,
      keyLength: process.env.TMDB_API_KEY?.length ?? 0,
      result: result ? { id: result.id, title: result.title } : null,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err), keyPresent: !!process.env.TMDB_API_KEY });
  }
}
