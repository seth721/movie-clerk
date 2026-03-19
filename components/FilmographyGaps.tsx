"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { TMDB_IMAGE_BASE } from "@/lib/tmdb";

interface UnseenFilm {
  tmdb_id: number;
  title: string;
  year: number | null;
  poster_path: string | null;
  vote_average: number | null;
}

interface DirectorGap {
  director: string;
  rated_count: number;
  avg_rating: number;
  seen_of_total: number;
  total_significant: number;
  unseen_films: UnseenFilm[];
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{ height: 4, background: "#1e1e1e" }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: pct === 100 ? "#4caf50" : "#e50914",
          }}
        />
      </div>
      <span className="text-xs shrink-0" style={{ color: "#555" }}>
        {value}/{max}
      </span>
    </div>
  );
}

export default function FilmographyGaps() {
  const [gaps, setGaps] = useState<DirectorGap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Kick off enrichment in background — fire and forget, don't block UI
      fetch("/api/enrich-movies", { method: "POST", body: "" }).catch(() => null);

      // Load whatever gaps we have now
      const res = await fetch("/api/filmography-gaps").catch(() => null);
      const data = res ? await res.json().catch(() => null) : null;
      if (!cancelled) {
        setGaps(data?.gaps ?? []);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div
        className="rounded-2xl p-6 mb-8 animate-pulse"
        style={{ background: "#111", border: "1px solid #1e1e1e" }}
      >
        <div className="h-5 w-48 rounded mb-4" style={{ background: "#1e1e1e" }} />
        <div className="h-32 rounded" style={{ background: "#1a1a1a" }} />
      </div>
    );
  }

  if (gaps.length === 0) return null;

  return (
    <div
      className="rounded-2xl p-6 mb-8"
      style={{ background: "#111", border: "1px solid #1e1e1e" }}
    >
      {/* Header */}
      <div className="mb-6">
        <h2 className="font-bold text-lg mb-1" style={{ color: "#e2e8f0" }}>
          Fill the Gaps
        </h2>
        <p className="text-sm" style={{ color: "#555" }}>
          Directors you love — films you haven&apos;t seen yet.
        </p>
      </div>

      <div className="space-y-8">
        {gaps.map((gap) => (
          <div key={gap.director}>
            {/* Director row */}
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="font-semibold" style={{ color: "#e2e8f0" }}>
                  {gap.director}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#555" }}>
                  You&apos;ve rated {gap.rated_count} of their films ★{gap.avg_rating.toFixed(1)} avg
                </p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full" style={{ background: "#1a1a1a", color: "#666" }}>
                {gap.seen_of_total} of {gap.total_significant} seen
              </span>
            </div>

            {/* Progress bar */}
            <div className="mb-4">
              <ProgressBar value={gap.seen_of_total} max={gap.total_significant} />
            </div>

            {/* Unseen film posters */}
            <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {gap.unseen_films.map((film) => {
                const posterUrl = film.poster_path
                  ? `${TMDB_IMAGE_BASE}/w185${film.poster_path}`
                  : null;
                return (
                  <Link
                    key={film.tmdb_id}
                    href={`/movie/${film.tmdb_id}`}
                    className="shrink-0 group"
                    style={{ width: 80 }}
                  >
                    <div
                      className="relative rounded-lg overflow-hidden mb-1.5 transition-transform group-hover:scale-105"
                      style={{
                        width: 80,
                        height: 120,
                        background: "#1a1a1a",
                        border: "1px solid #2a2a2a",
                      }}
                    >
                      {posterUrl ? (
                        <Image
                          src={posterUrl}
                          alt={film.title}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-2xl">
                          🎬
                        </div>
                      )}
                      {/* Vote avg badge */}
                      {film.vote_average != null && film.vote_average > 0 && (
                        <div
                          className="absolute top-1 right-1 text-xs font-bold px-1 rounded"
                          style={{ background: "rgba(0,0,0,0.8)", color: "#e50914", fontSize: 10 }}
                        >
                          ★{film.vote_average.toFixed(1)}
                        </div>
                      )}
                    </div>
                    <p
                      className="text-xs leading-tight line-clamp-2"
                      style={{ color: "#888" }}
                    >
                      {film.title}
                      {film.year && (
                        <span style={{ color: "#444" }}> {film.year}</span>
                      )}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
