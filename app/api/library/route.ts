import { NextResponse } from "next/server";
import { getAllRatings, getRatingCount } from "@/lib/db";

export async function GET() {
  try {
    const ratings = getAllRatings();
    const count = getRatingCount();
    return NextResponse.json({ ratings, count });
  } catch (err) {
    console.error("Library fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch library", detail: String(err) },
      { status: 500 }
    );
  }
}
