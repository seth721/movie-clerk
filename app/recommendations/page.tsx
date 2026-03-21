"use client";

import { useState, useEffect, useCallback } from "react";
import RecommendationCard from "@/components/RecommendationCard";
import TasteDna from "@/components/TasteDna";
import LetterboxdSync from "@/components/LetterboxdSync";
import ActorPreferences from "@/components/ActorPreferences";
import FilmographyGaps from "@/components/FilmographyGaps";
import Link from "next/link";

interface RecRow {
  rank: number;
  tmdb_id: number;
  title: string;
  year: number | null;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string | null;
  genres: string[];
  director: string | null;
  cast: string[];
  vote_average: number | null;
  score: number;
  explanation: string;
  generated_at: string;
}

// How many cards to show at once before pulling from the queue
const VISIBLE_COUNT = 10;
const GEN_STEPS = ["Pulling your file", "Scouring the catalog", "Making the shortlist", "Writing your ticket"];

export default function RecommendationsPage() {
  const [allRecs, setAllRecs] = useState<RecRow[]>([]);
  const [visibleIds, setVisibleIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genStepIdx, setGenStepIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [genTime, setGenTime] = useState<string | null>(null);
  const [mood, setMood] = useState("");

  const fetchRecs = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await fetch("/api/recommendations");
      const data = await res.json();
      const list: RecRow[] = data.recommendations ?? [];
      setAllRecs(list);
      setVisibleIds(list.slice(0, VISIBLE_COUNT).map((r) => r.tmdb_id));
      if (list.length > 0) setGenTime(list[0].generated_at);
    } catch {
      // ignore
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  const dismiss = useCallback((tmdbId: number) => {
    setVisibleIds((prev) => {
      const without = prev.filter((id) => id !== tmdbId);
      // Find the next rec from allRecs not currently shown
      const shownSet = new Set(prev);
      setAllRecs((all) => {
        const next = all.find((r) => !shownSet.has(r.tmdb_id));
        if (next) {
          // schedule outside of this render cycle
          setTimeout(() => setVisibleIds((v) => [...v.filter((id) => id !== tmdbId), next.tmdb_id]), 0);
        }
        return all;
      });
      return without;
    });
  }, []);

  useEffect(() => {
    fetchRecs(true);
  }, [fetchRecs]);

  const generate = useCallback(async () => {
    setGenerating(true);
    setGenProgress(0);
    setGenStepIdx(0);
    setError(null);

    // Animate progress bar over ~45s (typical generation time)
    const startTime = Date.now();
    const totalMs = 45000;
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(92, (elapsed / totalMs) * 100);
      setGenProgress(pct);
      setGenStepIdx(Math.min(GEN_STEPS.length - 1, Math.floor((pct / 92) * GEN_STEPS.length)));
    }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps

    try {
      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood: mood.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate");
      const list: RecRow[] = data.recommendations ?? [];
      clearInterval(timer);
      setGenProgress(100);
      setTimeout(() => {
        setAllRecs(list);
        setVisibleIds(list.slice(0, VISIBLE_COUNT).map((r) => r.tmdb_id));
        if (list.length > 0) setGenTime(list[0].generated_at);
        setGenerating(false);
      }, 400);
    } catch (err) {
      clearInterval(timer);
      setError(String(err));
      setGenerating(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className="w-10 h-10 rounded-full border-4 animate-spin"
          style={{ borderColor: "#333", borderTopColor: "#e50914" }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <LetterboxdSync onSynced={() => fetchRecs()} />
      <TasteDna />
      <FilmographyGaps />
      <ActorPreferences />

      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h1 className="text-3xl font-bold">What&apos;s On Tonight</h1>
            {genTime && (
              <p style={{ color: "#555" }} className="text-sm mt-1">
                Last pulled {new Date(genTime).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit"
                })}
              </p>
            )}
          </div>
          <button
            onClick={generate}
            disabled={generating}
            className="flex-shrink-0 px-5 py-2.5 rounded-lg font-semibold text-sm disabled:opacity-60 transition-opacity hover:opacity-90"
            style={{ background: "#e50914", color: "#fff" }}
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded-full border-2 animate-spin inline-block"
                  style={{ borderColor: "#ffffff40", borderTopColor: "#fff" }}
                />
                Checking the stacks…
              </span>
            ) : allRecs.length > 0 ? (
              "Pull a Fresh Batch"
            ) : (
              "Open for Business"
            )}
          </button>
        </div>

        {/* Mood input */}
        <div className="relative">
          <input
            type="text"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !generating && generate()}
            placeholder="Tell the clerk what you&apos;re after tonight… (something bleak, a 70s road movie, a good cry…)"
            maxLength={200}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
            style={{
              background: "#111",
              border: "1px solid #2a2a2a",
              color: "#e2e8f0",
              caretColor: "#e50914",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#e5091460")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a2a")}
          />
          {mood && (
            <button
              onClick={() => setMood("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
              style={{ color: "#555", background: "none", border: "none", cursor: "pointer" }}
            >
              ×
            </button>
          )}
        </div>
        {mood && (
          <p className="text-xs mt-1.5" style={{ color: "#4a5568" }}>
            Got it. The clerk will factor that in.
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          className="mb-6 p-4 rounded-lg text-sm"
          style={{
            background: "#2a0a0a",
            border: "1px solid #e50914",
            color: "#ff6666",
          }}
        >
          <span className="font-semibold">The clerk hit a snag.</span> {error}
        </div>
      )}

      {/* Generating state */}
      {generating && (
        <div
          className="mb-8 p-6 rounded-xl"
          style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold" style={{ color: "#e2e8f0" }}>
              The clerk is digging through the back catalog…
            </p>
            <span className="text-sm font-mono" style={{ color: "#e50914" }}>
              {Math.round(genProgress)}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="rounded-full overflow-hidden mb-4" style={{ background: "#2a2a2a", height: 8 }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ background: "#e50914", width: `${genProgress}%` }}
            />
          </div>

          {/* Steps */}
          <div className="flex gap-2 flex-wrap">
            {GEN_STEPS.map((step, i) => (
              <span
                key={step}
                className="text-xs px-3 py-1 rounded-full transition-all duration-300"
                style={{
                  background: i <= genStepIdx ? "#2a0a0a" : "#1a1a1a",
                  color: i <= genStepIdx ? "#e50914" : "#444",
                  border: `1px solid ${i <= genStepIdx ? "#e5091440" : "#2a2a2a"}`,
                }}
              >
                {i < genStepIdx ? "✓ " : i === genStepIdx ? "→ " : ""}{step}
              </span>
            ))}
          </div>

          <p className="text-xs mt-3" style={{ color: "#444" }}>
            Pulling your file, scouring the stacks, making the shortlist. This takes a moment.
          </p>
        </div>
      )}

      {/* Empty state */}
      {!generating && allRecs.length === 0 && (
        <div
          className="text-center py-16 rounded-xl"
          style={{ background: "#111", border: "2px dashed #2a2a2a" }}
        >
          <p className="text-5xl mb-4">📼</p>
          <h2 className="text-xl font-semibold mb-2">Nothing on the shelf yet.</h2>
          <p style={{ color: "#666" }} className="text-sm mb-6 max-w-sm mx-auto">
            The clerk needs something to work with. Rate at least 5 films and we&apos;ll take it from there.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/onboarding"
              className="px-5 py-2.5 rounded-lg font-semibold text-sm"
              style={{ background: "#e50914", color: "#fff" }}
            >
              Rate 24 films to get started →
            </Link>
            <Link
              href="/"
              className="px-5 py-2.5 rounded-lg text-sm"
              style={{ background: "#1a1a1a", color: "#aaa", border: "1px solid #2a2a2a" }}
            >
              Browse the Discover page
            </Link>
          </div>
        </div>
      )}

      {/* Recommendations list */}
      {!generating && allRecs.length > 0 && (
        <div className="space-y-4">
          {visibleIds.map((id) => {
            const rec = allRecs.find((r) => r.tmdb_id === id);
            if (!rec) return null;
            return (
              <RecommendationCard
                key={rec.tmdb_id}
                {...rec}
                onDismiss={() => dismiss(rec.tmdb_id)}
              />
            );
          })}
          {visibleIds.length === 0 && (
            <div
              className="text-center py-16 rounded-xl"
              style={{ background: "#111", border: "2px dashed #2a2a2a" }}
            >
              <p className="text-4xl mb-3">📼</p>
              <p className="font-semibold mb-1">You&apos;ve cleared the shelf.</p>
              <p style={{ color: "#555" }} className="text-sm">Pull a fresh batch and we&apos;ll find more.</p>
            </div>
          )}
          <div
            className="mt-8 p-4 rounded-lg text-center text-sm"
            style={{ background: "#111", color: "#444" }}
          >
            {visibleIds.length} of {allRecs.length} titles from the catalog · Curated by Movie Clerk
          </div>
        </div>
      )}
    </div>
  );
}
