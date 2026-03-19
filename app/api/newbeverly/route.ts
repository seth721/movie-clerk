import { NextResponse } from "next/server";
import { getNewBevFilms } from "@/lib/newbeverly";
import { getCached, setCached } from "@/lib/memcache";

export const revalidate = 3600;

export async function GET() {
  const cached = getCached<object>("newbeverly");
  if (cached) return NextResponse.json(cached);

  try {
    const data = await getNewBevFilms();
    setCached("newbeverly", data, 3600);
    return NextResponse.json(data);
  } catch (err) {
    console.error("newbeverly error:", err);
    return NextResponse.json({ films: [], events: [] });
  }
}
