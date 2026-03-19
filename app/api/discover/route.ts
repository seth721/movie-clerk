import { NextRequest, NextResponse } from "next/server";
import { discoverMovies } from "@/lib/tmdb";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const genres = searchParams.get("genres") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1", 10);

  if (!genres) {
    return NextResponse.json({ error: "genres parameter required" }, { status: 400 });
  }

  try {
    const data = await discoverMovies(genres, page);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Discover error:", err);
    return NextResponse.json(
      { error: "Failed to fetch films", detail: String(err) },
      { status: 500 }
    );
  }
}
