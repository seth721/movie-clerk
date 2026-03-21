import { NextResponse } from "next/server";
import { getACFilms } from "@/lib/americancinematheque";
import { getCached, setCached } from "@/lib/memcache";

export const dynamic = "force-dynamic";

export async function GET() {
  const cached = getCached<object>("americancinematheque");
  if (cached) return NextResponse.json(cached);

  const films = await getACFilms();
  setCached("americancinematheque", { films }, 3600);
  return NextResponse.json({ films });
}
