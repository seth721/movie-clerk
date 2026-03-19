import { NextRequest, NextResponse } from "next/server";
import { saveRecFeedback } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { tmdb_id, feedback } = await req.json();
  if (!tmdb_id || !feedback) {
    return NextResponse.json({ error: "tmdb_id and feedback required" }, { status: 400 });
  }
  saveRecFeedback(tmdb_id, feedback);
  return NextResponse.json({ ok: true });
}
