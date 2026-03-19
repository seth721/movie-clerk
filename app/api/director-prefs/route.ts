import { NextRequest, NextResponse } from "next/server";
import { addDirectorPreference, removeDirectorPreference, getDirectorPreferences } from "@/lib/db";

export async function GET() {
  const prefs = getDirectorPreferences();
  return NextResponse.json({ directors: prefs });
}

export async function POST(req: NextRequest) {
  const { tmdb_person_id, name, action } = await req.json();
  if (!tmdb_person_id || !action) {
    return NextResponse.json({ error: "tmdb_person_id and action required" }, { status: 400 });
  }
  if (action === "add") {
    addDirectorPreference(tmdb_person_id, name ?? "Unknown");
  } else if (action === "remove") {
    removeDirectorPreference(tmdb_person_id);
  }
  return NextResponse.json({ ok: true });
}
