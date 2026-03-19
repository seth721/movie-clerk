import { NextRequest, NextResponse } from "next/server";
import { getPhysicalReleases } from "@/lib/bluray";

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get("title");
  const yearStr = req.nextUrl.searchParams.get("year");

  if (!title || !yearStr) return NextResponse.json({ releases: [] });

  const year = parseInt(yearStr, 10);
  if (isNaN(year)) return NextResponse.json({ releases: [] });

  const releases = await getPhysicalReleases(title, year);
  return NextResponse.json({ releases });
}
