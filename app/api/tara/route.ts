import { NextResponse } from "next/server";
import { getTaraFilms } from "@/lib/atlanta";
import { getCached, setCached } from "@/lib/memcache";

export const dynamic = "force-dynamic";

export async function GET() {
  const cached = getCached<object>("tara");
  if (cached) return NextResponse.json(cached);

  const films = await getTaraFilms();
  setCached("tara", { films }, 3600);
  return NextResponse.json({ films });
}
