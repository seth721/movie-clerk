import { NextResponse } from "next/server";
import { getNowPlaying, getNewOnDigital, getNewOnPhysical } from "@/lib/tmdb";
import { getCached, setCached } from "@/lib/memcache";

export const revalidate = 3600;

export async function GET() {
  const cached = getCached<object>("browse");
  if (cached) return NextResponse.json(cached);

  const [theaters, digital, physical] = await Promise.allSettled([
    getNowPlaying(),
    getNewOnDigital(),
    getNewOnPhysical(),
  ]);

  const data = {
    theaters: theaters.status === "fulfilled" ? theaters.value.results : [],
    digital: digital.status === "fulfilled" ? digital.value.results : [],
    physical: physical.status === "fulfilled" ? physical.value.results : [],
  };

  setCached("browse", data, 3600);
  return NextResponse.json(data);
}
