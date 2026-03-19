import { NextRequest, NextResponse } from "next/server";
import { addActorPreference, removeActorPreference, getActorPreferences, getTopActorsFromRatings } from "@/lib/db";

export async function GET() {
  const preferred = getActorPreferences();
  const suggestions = getTopActorsFromRatings(3.5, 30);
  return NextResponse.json({ preferred, suggestions });
}

export async function POST(req: NextRequest) {
  const { name, action } = await req.json();
  if (!name || !action) {
    return NextResponse.json({ error: "name and action required" }, { status: 400 });
  }
  if (action === "add") {
    addActorPreference(name);
  } else if (action === "remove") {
    removeActorPreference(name);
  }
  return NextResponse.json({ ok: true });
}
