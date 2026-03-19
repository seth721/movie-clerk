import { NextRequest, NextResponse } from "next/server";
import { previewLetterboxd } from "@/lib/letterboxd";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  if (!username) return NextResponse.json({ error: "username required" }, { status: 400 });

  try {
    const preview = await previewLetterboxd(username.trim().replace(/^@/, ""));
    return NextResponse.json(preview);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 404 });
  }
}
