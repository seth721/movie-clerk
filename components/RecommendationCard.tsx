"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { TMDB_IMAGE_BASE } from "@/lib/tmdb";
import RatingWidget from "@/components/RatingWidget";

interface RecommendationCardProps {
  rank: number;
  tmdb_id: number;
  title: string;
  year?: number | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string | null;
  genres?: string[];
  director?: string | null;
  cast?: string[];
  vote_average?: number | null;
  score: number;
  explanation: string;
  onDismiss?: () => void;
}

export default function RecommendationCard({
  rank,
  tmdb_id,
  title,
  year,
  poster_path,
  genres,
  director,
  cast,
  vote_average,
  score,
  explanation,
  onDismiss,
}: RecommendationCardProps) {
  const [dismissing, setDismissing] = useState(false);

  const posterUrl = poster_path ? `${TMDB_IMAGE_BASE}/w342${poster_path}` : null;
  const confidencePct = Math.round(score * 100);

  const handleRated = () => {
    if (!onDismiss) return;
    setDismissing(true);
    setTimeout(onDismiss, 400);
  };

  const handleNotForMe = async () => {
    await fetch("/api/rec-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmdb_id, feedback: "not_for_me" }),
    });
    handleRated();
  };

  return (
    <div
      className="rounded-xl overflow-hidden flex gap-0"
      style={{
        background: "#1a1a1a",
        border: "1px solid #2a2a2a",
        transition: "opacity 0.4s ease, transform 0.4s ease, max-height 0.4s ease",
        opacity: dismissing ? 0 : 1,
        transform: dismissing ? "translateX(-16px) scale(0.98)" : "translateX(0) scale(1)",
        maxHeight: dismissing ? 0 : 300,
        overflow: "hidden",
      }}
    >
      {/* Rank badge */}
      <div
        className="flex-shrink-0 flex items-center justify-center font-bold text-2xl"
        style={{
          width: 52,
          background: rank <= 3 ? "#e50914" : "#222",
          color: rank <= 3 ? "#fff" : "#555",
        }}
      >
        {rank}
      </div>

      {/* Poster + rating widget */}
      <div className="flex-shrink-0 relative" style={{ width: 110, height: 165, alignSelf: "center", margin: "12px 0" }}>
        <Link href={`/movie/${tmdb_id}`} className="block group">
          <div style={{ position: "relative", width: 110, height: 165, overflow: "hidden" }}>
            {posterUrl ? (
              <Image
                src={posterUrl}
                alt={title}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                sizes="110px"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-4xl"
                style={{ background: "#222" }}
              >
                🎬
              </div>
            )}
          </div>
        </Link>
        {/* Star rating overlaid on bottom of poster */}
        <div
          className="absolute bottom-0 left-0 right-0 flex justify-center px-1 py-1.5"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
        >
          <RatingWidget
            film={{ id: tmdb_id, title, poster_path, vote_average }}
            compact
            onRated={(next) => { if (next?.stars) handleRated(); }}
          />
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 p-4 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <h3 className="font-bold text-base leading-tight">
              <Link href={`/movie/${tmdb_id}`} className="hover:underline">
                {title}
              </Link>
              {year && <span style={{ color: "#666", fontWeight: 400 }}> ({year})</span>}
            </h3>
            {director && (
              <p style={{ color: "#888" }} className="text-xs mt-0.5">
                dir. {director}
              </p>
            )}
          </div>
          <div className="flex-shrink-0 text-right">
            {vote_average != null && vote_average > 0 && (
              <p style={{ color: "#f5c518" }} className="text-sm font-semibold">
                {vote_average.toFixed(1)}/10
              </p>
            )}
            <div
              className="text-xs mt-1 px-2 py-0.5 rounded-full text-center"
              style={{
                background: confidencePct >= 80 ? "#1a3a1a" : confidencePct >= 60 ? "#2a2a1a" : "#2a1a1a",
                color: confidencePct >= 80 ? "#4caf50" : confidencePct >= 60 ? "#ff9800" : "#f44336",
                border: `1px solid ${confidencePct >= 80 ? "#2d5a2d" : confidencePct >= 60 ? "#4a3d0a" : "#4a1a1a"}`,
              }}
            >
              {confidencePct}% match
            </div>
          </div>
        </div>

        {/* Genres + Cast */}
        <div className="flex flex-wrap gap-1 mb-2 mt-2">
          {(genres ?? []).slice(0, 3).map((g) => (
            <span
              key={g}
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "#2a2a2a", color: "#aaa" }}
            >
              {g}
            </span>
          ))}
          {cast && cast.length > 0 && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "#1a1a2a", color: "#8888cc" }}
            >
              {cast.slice(0, 2).join(", ")}
            </span>
          )}
        </div>

        {/* Claude's explanation */}
        <div
          className="rounded-lg p-3 text-sm"
          style={{
            background: "#111",
            border: "1px solid #e5091420",
            borderLeft: "3px solid #e50914",
            color: "#ccc",
            lineHeight: "1.5",
          }}
        >
          <span style={{ color: "#e50914", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Why you&apos;ll love it
          </span>
          <p className="mt-1">{explanation}</p>
        </div>

        {/* Not for me */}
        <div className="mt-2 flex justify-end">
          <button
            onClick={handleNotForMe}
            className="text-xs transition-colors"
            style={{ color: "#444", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#888")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#444")}
          >
            Not for me ×
          </button>
        </div>
      </div>
    </div>
  );
}
