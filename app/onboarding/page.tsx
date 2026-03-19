"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { TMDB_IMAGE_BASE } from "@/lib/tmdb";

interface OnboardingFilm {
  tmdb_id: number;
  title: string;
  year: number;
  poster_path: string | null;
}

const STAR_OPTIONS = [1, 2, 3, 4, 5];

export default function OnboardingPage() {
  const [films, setFilms] = useState<OnboardingFilm[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState<Record<number, number | "skip">>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetch("/api/onboarding-films")
      .then((r) => r.json())
      .then((d) => { setFilms(d.films); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const ratedCount = Object.values(ratings).filter((v) => v !== "skip").length;
  const MIN_TO_UNLOCK = 5;

  const rate = async (film: OnboardingFilm, stars: number) => {
    const prev = ratings[film.tmdb_id];
    // Toggle off if clicking the same star
    if (prev === stars) {
      setRatings((r) => { const n = { ...r }; delete n[film.tmdb_id]; return n; });
      await fetch("/api/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdb_id: film.tmdb_id, title: film.title, year: film.year, reaction: "remove" }),
      });
      return;
    }

    setRatings((r) => ({ ...r, [film.tmdb_id]: stars }));
    setSaving((s) => ({ ...s, [film.tmdb_id]: true }));
    await fetch("/api/rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmdb_id: film.tmdb_id, title: film.title, year: film.year, stars }),
    });
    setSaving((s) => ({ ...s, [film.tmdb_id]: false }));
  };

  const skip = (tmdbId: number) => {
    setRatings((r) => ({ ...r, [tmdbId]: "skip" }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 rounded-full border-4 animate-spin"
          style={{ borderColor: "#333", borderTopColor: "#e50914" }} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Quick — what have you seen?</h1>
        <p style={{ color: "#666" }} className="text-sm">
          Rate what you know. The clerk needs at least {MIN_TO_UNLOCK} films to get a read on you.
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: "#aaa" }}>
            {ratedCount} logged
          </span>
          <span className="text-sm" style={{ color: ratedCount >= MIN_TO_UNLOCK ? "#4caf50" : "#666" }}>
            {ratedCount >= MIN_TO_UNLOCK ? "✓ Good to go" : `${MIN_TO_UNLOCK - ratedCount} more and the clerk is ready`}
          </span>
        </div>
        <div className="rounded-full overflow-hidden" style={{ height: 4, background: "#222" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, (ratedCount / MIN_TO_UNLOCK) * 100)}%`,
              background: ratedCount >= MIN_TO_UNLOCK ? "#4caf50" : "#e50914",
            }}
          />
        </div>
      </div>

      {/* Film grid */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
        {films.map((film) => {
          const filmRating = ratings[film.tmdb_id];
          const isSkipped = filmRating === "skip";
          const stars = typeof filmRating === "number" ? filmRating : 0;
          const posterUrl = film.poster_path ? `${TMDB_IMAGE_BASE}/w342${film.poster_path}` : null;

          return (
            <div
              key={film.tmdb_id}
              className="flex flex-col"
              style={{ opacity: isSkipped ? 0.35 : 1, transition: "opacity 0.2s" }}
            >
              {/* Poster */}
              <Link href={`/movie/${film.tmdb_id}`} target="_blank">
                <div
                  className="relative rounded-lg overflow-hidden mb-2"
                  style={{
                    aspectRatio: "2/3",
                    background: "#1a1a1a",
                    border: stars > 0 ? "2px solid #e50914" : "2px solid #2a2a2a",
                    transition: "border-color 0.2s",
                  }}
                >
                  {posterUrl ? (
                    <Image src={posterUrl} alt={film.title} fill sizes="140px" className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-3xl">🎬</div>
                  )}
                  {saving[film.tmdb_id] && (
                    <div className="absolute inset-0 flex items-center justify-center"
                      style={{ background: "rgba(0,0,0,0.5)" }}>
                      <div className="w-5 h-5 rounded-full border-2 animate-spin"
                        style={{ borderColor: "#ffffff40", borderTopColor: "#fff" }} />
                    </div>
                  )}
                </div>
              </Link>

              {/* Title */}
              <p className="text-xs font-medium leading-tight mb-1.5 line-clamp-2" style={{ color: "#ccc" }}>
                {film.title}
                <span style={{ color: "#555" }}> ({film.year})</span>
              </p>

              {/* Stars */}
              {!isSkipped && (
                <div className="flex gap-0.5 mb-1">
                  {STAR_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => rate(film, s)}
                      className="flex-1 text-center transition-transform hover:scale-110"
                      style={{
                        fontSize: 18,
                        lineHeight: 1,
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: s <= stars ? "#e50914" : "#333",
                        padding: "2px 0",
                      }}
                    >
                      ★
                    </button>
                  ))}
                </div>
              )}

              {/* Haven't seen / undo skip */}
              <button
                onClick={() => isSkipped
                  ? setRatings((r) => { const n = { ...r }; delete n[film.tmdb_id]; return n; })
                  : skip(film.tmdb_id)
                }
                className="text-xs transition-colors"
                style={{ color: "#444", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}
              >
                {isSkipped ? "↩ Undo" : "Haven't seen it"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Sticky CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 p-4 flex items-center justify-between gap-4"
        style={{ background: "rgba(10,10,10,0.95)", borderTop: "1px solid #1a1a1a", backdropFilter: "blur(12px)" }}
      >
        <p className="text-sm" style={{ color: "#555" }}>
          {ratedCount >= MIN_TO_UNLOCK
            ? "The clerk is ready. Let's see what we can find."
            : `${MIN_TO_UNLOCK - ratedCount} more film${MIN_TO_UNLOCK - ratedCount !== 1 ? "s" : ""} and we're open for business.`}
        </p>
        <div className="flex gap-3 flex-shrink-0">
          <Link
            href="/recommendations"
            className="text-sm px-4 py-2 rounded-lg"
            style={{ color: "#555", background: "#1a1a1a" }}
          >
            I&apos;ll rate on Discover
          </Link>
          {ratedCount >= MIN_TO_UNLOCK && (
            <Link
              href="/recommendations"
              className="text-sm px-5 py-2 rounded-lg font-semibold"
              style={{ background: "#e50914", color: "#fff" }}
            >
              Open for business →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
