"use client";

import { useState, useEffect } from "react";

export interface RatableFilm {
  id: number;
  title: string;
  release_date?: string | null;
  poster_path?: string | null;
  overview?: string | null;
  vote_average?: number | null;
}

export interface FilmState {
  stars?: number;
  watchlist?: boolean;
}

const STAR_LABELS: Record<number, string> = {
  0.5: "Awful", 1: "Bad", 1.5: "Poor", 2: "Below average",
  2.5: "Average", 3: "Good", 3.5: "Great", 4: "Really great",
  4.5: "Excellent", 5: "Amazing",
};

function HalfStarPicker({
  value,
  onChange,
  size = 16,
}: {
  value?: number;
  onChange: (v: number) => void;
  size?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value ?? 0;

  return (
    <div className="flex items-center" onMouseLeave={() => setHover(null)}>
      {([1, 2, 3, 4, 5] as const).map((s) => {
        const full = display >= s;
        const half = !full && display >= s - 0.5;
        return (
          <div key={s} className="relative" style={{ width: size, height: size }}>
            <span
              className="absolute inset-0 flex items-center justify-center select-none pointer-events-none"
              style={{ color: "#2a2a2a", fontSize: size - 1 }}
            >★</span>
            {(full || half) && (
              <span
                className="absolute inset-0 flex items-center justify-center select-none pointer-events-none overflow-hidden"
                style={{ color: "#f5c518", fontSize: size - 1, width: full ? "100%" : "50%" }}
              >★</span>
            )}
            <button
              className="absolute inset-y-0 left-0"
              style={{ width: "50%", background: "none", border: "none", cursor: "pointer" }}
              onMouseEnter={() => setHover(s - 0.5)}
              onClick={() => onChange(value === s - 0.5 ? 0 : s - 0.5)}
              title={STAR_LABELS[s - 0.5]}
            />
            <button
              className="absolute inset-y-0 right-0"
              style={{ width: "50%", background: "none", border: "none", cursor: "pointer" }}
              onMouseEnter={() => setHover(s)}
              onClick={() => onChange(value === s ? 0 : s)}
              title={STAR_LABELS[s]}
            />
          </div>
        );
      })}
    </div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────

export default function RatingWidget({
  film,
  compact = false,
  onRated,
  initialState,
}: {
  film: RatableFilm;
  compact?: boolean;
  onRated?: (state: FilmState | null) => void;
  initialState?: FilmState;
}) {
  const [state, setState] = useState<FilmState>(initialState ?? {});
  const [hoverLabel, setHoverLabel] = useState<string | null>(null);

  useEffect(() => {
    if (initialState !== undefined) return;
    fetch(`/api/rate?tmdb_id=${film.id}`)
      .then((r) => r.json())
      .then((d) => { if (d.state) setState(d.state); })
      .catch(() => {});
  }, [film.id, initialState]);

  const year = film.release_date ? parseInt(film.release_date.slice(0, 4), 10) : null;

  const payload = {
    tmdb_id: film.id,
    title: film.title,
    year,
    poster_path: film.poster_path,
    overview: film.overview,
    vote_average: film.vote_average,
  };

  const saveRate = (body: Record<string, unknown>) =>
    fetch("/api/rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, ...body }),
    }).catch(console.error);

  const setStars = (stars: number) => {
    if (stars === 0) {
      // clicking same star again = clear
      setState({});
      saveRate({ reaction: "remove" });
      onRated?.(null);
    } else {
      const next = { stars, watchlist: false };
      setState(next);
      saveRate({ stars });
      onRated?.(next);
    }
  };

  const toggleWatchlist = () => {
    if (state.watchlist) {
      setState({});
      saveRate({ reaction: "remove" });
      onRated?.(null);
    } else {
      const next = { watchlist: true };
      setState(next);
      saveRate({ reaction: "watchlist" });
      onRated?.(next);
    }
  };

  const { stars, watchlist } = state;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <HalfStarPicker
          value={stars}
          onChange={(v) => {
            setHoverLabel(null);
            setStars(v);
          }}
          size={15}
        />
        <button
          onClick={toggleWatchlist}
          title={watchlist ? "Remove from watchlist" : "Add to watchlist"}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            opacity: watchlist ? 1 : 0.3,
            color: watchlist ? "#2196f3" : "#888",
            lineHeight: 1,
            padding: "0 2px",
            flexShrink: 0,
          }}
        >
          {watchlist ? "🔖" : "🔖"}
        </button>
      </div>
    );
  }

  // Full layout
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <div className="flex flex-col gap-1">
          <div
            className="flex items-center gap-1"
            onMouseLeave={() => setHoverLabel(null)}
          >
            {([1, 2, 3, 4, 5] as const).map((s) => {
              const full = (stars ?? 0) >= s;
              const half = !full && (stars ?? 0) >= s - 0.5;
              return (
                <div key={s} className="relative" style={{ width: 24, height: 24 }}>
                  <span
                    className="absolute inset-0 flex items-center justify-center select-none pointer-events-none"
                    style={{ color: "#2a2a2a", fontSize: 22 }}
                  >★</span>
                  {(full || half) && (
                    <span
                      className="absolute inset-0 flex items-center justify-center select-none pointer-events-none overflow-hidden"
                      style={{ color: "#f5c518", fontSize: 22, width: full ? "100%" : "50%" }}
                    >★</span>
                  )}
                  <button
                    className="absolute inset-y-0 left-0"
                    style={{ width: "50%", background: "none", border: "none", cursor: "pointer" }}
                    onMouseEnter={() => setHoverLabel(STAR_LABELS[s - 0.5])}
                    onClick={() => setStars(stars === s - 0.5 ? 0 : s - 0.5)}
                  />
                  <button
                    className="absolute inset-y-0 right-0"
                    style={{ width: "50%", background: "none", border: "none", cursor: "pointer" }}
                    onMouseEnter={() => setHoverLabel(STAR_LABELS[s])}
                    onClick={() => setStars(stars === s ? 0 : s)}
                  />
                </div>
              );
            })}
          </div>
          <p style={{ color: hoverLabel ? "#f5c518" : stars ? "#666" : "#444", fontSize: 11, minHeight: 14 }}>
            {hoverLabel ?? (stars ? `${stars % 1 === 0 ? stars : stars.toFixed(1)}★ — ${STAR_LABELS[stars]}` : "Rate this film")}
          </p>
        </div>

        <button
          onClick={toggleWatchlist}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: watchlist ? "#0d1f3a" : "#1a1a1a",
            border: `2px solid ${watchlist ? "#2196f3" : "#2a2a2a"}`,
            color: watchlist ? "#2196f3" : "#666",
          }}
        >
          🔖 {watchlist ? "Watchlisted" : "Watchlist"}
        </button>
      </div>
    </div>
  );
}
