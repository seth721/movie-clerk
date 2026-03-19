import { NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";
import { syncLetterboxd } from "@/lib/letterboxd";

export const maxDuration = 60;

export async function POST() {
  const username = getSetting("letterboxd_username");
  if (!username) {
    return NextResponse.json({ error: "No Letterboxd username saved." }, { status: 400 });
  }

  try {
    const result = await syncLetterboxd(username);
    setSetting("letterboxd_last_sync", new Date().toISOString());
    setSetting("letterboxd_last_sync_count", String(result.added + result.updated));
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
