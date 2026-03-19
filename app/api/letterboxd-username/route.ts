import { NextRequest, NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";

export async function GET() {
  const username = getSetting("letterboxd_username");
  const lastSync = getSetting("letterboxd_last_sync");
  const lastCount = getSetting("letterboxd_last_sync_count");
  return NextResponse.json({ username, lastSync, lastCount: lastCount ? parseInt(lastCount) : null });
}

export async function POST(req: NextRequest) {
  const { username } = await req.json();
  if (!username || typeof username !== "string") {
    return NextResponse.json({ error: "username required" }, { status: 400 });
  }
  setSetting("letterboxd_username", username.trim().replace(/^@/, ""));
  return NextResponse.json({ ok: true });
}
