"use client";

import { useEffect, useState } from "react";
import MovieClerkMascot from "@/components/MovieClerkMascot";

export default function MovieClerkRecommendation({
  tmdbId,
  title,
  director,
  genres,
  keywords,
}: {
  tmdbId: number;
  title: string;
  director?: string;
  genres?: string[];
  keywords?: string[];
}) {
  const [state, setState] = useState<"loading" | "show" | "hide">("loading");
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({
      tmdb_id: String(tmdbId),
      title,
      director: director ?? "",
      genres: (genres ?? []).join(","),
      keywords: (keywords ?? []).join(","),
    });

    fetch(`/api/recommend-reason?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.recommended && d.reason) {
          setReason(d.reason);
          setState("show");
        } else {
          setState("hide");
        }
      })
      .catch(() => setState("hide"));
  }, [tmdbId, title, director, genres, keywords]);

  if (state !== "show" || !reason) return null;

  return (
    <div
      className="flex items-end gap-4 rounded-2xl px-5 py-4 mb-8"
      style={{
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        border: "1px solid #e5091422",
      }}
    >
      {/* Mascot */}
      <div className="flex-shrink-0">
        <MovieClerkMascot size={64} />
      </div>

      {/* Speech bubble */}
      <div className="relative pb-1">
        {/* Tail pointing left toward mascot */}
        <div
          className="absolute"
          style={{
            bottom: 18,
            left: -10,
            width: 0,
            height: 0,
            borderTop: "8px solid transparent",
            borderBottom: "8px solid transparent",
            borderRight: "10px solid #e50914",
          }}
        />
        <div
          className="rounded-2xl px-4 py-3"
          style={{ background: "#1a1a1a", border: "1px solid #e50914", maxWidth: 420 }}
        >
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#e50914" }}>
            🎬 Movie Clerk Recommends
          </p>
          <p className="text-sm leading-snug" style={{ color: "#ccc" }}>
            {reason}
          </p>
        </div>
      </div>
    </div>
  );
}
