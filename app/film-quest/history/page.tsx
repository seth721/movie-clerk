"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const PIXEL_GREEN = "#00e054";
const PIXEL_GOLD = "#f5c518";
const TMDB_IMG = "https://image.tmdb.org/t/p/w92";

interface QuestFilm {
  tmdb_id: number;
  title: string | null;
  year: number | null;
  poster_path: string | null;
  rating: number | null;
  chapter: string;
  completed_at: string;
}

interface SideQuestEntry {
  id: number;
  type: string;
  title: string;
  hook: string;
  status: string;
  films: QuestFilm[];
}

interface QuestRecord {
  id: number;
  director_name: string;
  quest_title: string;
  status: string;
  created_at: string;
  films: QuestFilm[];
  sideQuests: SideQuestEntry[];
  avgRating: number | null;
  filmsCompleted: number;
  totalFilms: number;
}

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <span style={{ color: PIXEL_GREEN, fontSize: 11, letterSpacing: 1 }}>
      {"★".repeat(full)}{half ? "½" : ""}
    </span>
  );
}

function FilmPoster({ film }: { film: QuestFilm }) {
  const [showChapter, setShowChapter] = useState(false);
  return (
    <div className="flex-shrink-0" style={{ width: 72 }}>
      <button
        onClick={() => setShowChapter((v) => !v)}
        className="relative block w-full rounded overflow-hidden transition-opacity hover:opacity-80"
        style={{ aspectRatio: "2/3", background: "#1a1a1a", border: `1px solid #2a2a2a` }}
        title={film.title ?? ""}
      >
        {film.poster_path ? (
          <img src={`${TMDB_IMG}${film.poster_path}`} alt={film.title ?? ""} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-lg">🎬</div>
        )}
        {film.rating != null && (
          <div
            className="absolute bottom-0.5 right-0.5 text-xs font-bold px-1 rounded"
            style={{ background: "rgba(0,0,0,0.85)", color: PIXEL_GREEN, fontSize: 9 }}
          >
            {film.rating}★
          </div>
        )}
      </button>
      <p className="text-center mt-1 leading-tight line-clamp-2" style={{ color: "#666", fontSize: 9 }}>
        {film.title}
      </p>
      {showChapter && film.chapter && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={() => setShowChapter(false)}
        >
          <div
            className="rounded-xl p-5 max-w-sm w-full"
            style={{ background: "#111", border: `1px solid ${PIXEL_GREEN}40` }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-bold mb-1" style={{ color: PIXEL_GREEN }}>
              {film.title}{film.year ? ` (${film.year})` : ""}
            </p>
            {film.rating != null && <Stars rating={film.rating} />}
            <p className="text-sm mt-2 leading-relaxed" style={{ color: "#ccc" }}>{film.chapter}</p>
            <button
              onClick={() => setShowChapter(false)}
              className="mt-4 text-xs"
              style={{ color: "#555" }}
            >
              Close ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestCard({ quest }: { quest: QuestRecord }) {
  const [expanded, setExpanded] = useState(false);
  const isCompleted = quest.status === "completed";
  const completedSideQuests = quest.sideQuests.filter((sq) => sq.status === "completed");

  return (
    <div
      className="rounded-2xl overflow-hidden mb-6"
      style={{
        background: "#0d0d0d",
        border: `1px solid ${isCompleted ? PIXEL_GREEN + "40" : "#2a2a2a"}`,
        fontFamily: "monospace",
      }}
    >
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded"
                style={{
                  background: isCompleted ? PIXEL_GREEN + "20" : "#2a2a2a",
                  color: isCompleted ? PIXEL_GREEN : "#666",
                  border: `1px solid ${isCompleted ? PIXEL_GREEN + "40" : "#333"}`,
                }}
              >
                {isCompleted ? "✓ COMPLETED" : "✗ ABANDONED"}
              </span>
              <span className="text-xs" style={{ color: "#444" }}>
                {new Date(quest.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
            <h2 className="text-lg font-bold mb-0.5" style={{ color: "#e2e8f0" }}>
              {quest.quest_title}
            </h2>
            <p className="text-sm" style={{ color: "#555" }}>
              {quest.director_name}
            </p>
          </div>

          {/* Stats */}
          <div className="text-right flex-shrink-0">
            <p className="text-2xl font-black" style={{ color: PIXEL_GREEN }}>
              {quest.filmsCompleted}
              <span className="text-sm font-normal" style={{ color: "#444" }}>/{quest.totalFilms}</span>
            </p>
            <p className="text-xs" style={{ color: "#444" }}>films</p>
            {quest.avgRating != null && (
              <p className="text-sm font-bold mt-1" style={{ color: PIXEL_GOLD }}>
                ★ {quest.avgRating.toFixed(1)} avg
              </p>
            )}
          </div>
        </div>

        {/* Film poster strip */}
        {quest.films.length > 0 && (
          <div className="flex gap-2 mt-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {quest.films.map((film) => (
              <FilmPoster key={film.tmdb_id} film={film} />
            ))}
          </div>
        )}

        {/* Side quest badges */}
        {completedSideQuests.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {completedSideQuests.map((sq) => (
              <span
                key={sq.id}
                className="text-xs px-2 py-1 rounded"
                style={{ background: "#1a1500", border: `1px solid ${PIXEL_GOLD}40`, color: PIXEL_GOLD }}
              >
                ⚡ {sq.title}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Expand toggle for chapter log */}
      {quest.films.some((f) => f.chapter) && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full px-5 py-2.5 text-xs text-left transition-colors"
          style={{
            background: "#111",
            borderTop: "1px solid #1a1a1a",
            color: "#555",
          }}
        >
          {expanded ? "▲ Hide chapter log" : "▼ Read the chapter log"}
        </button>
      )}

      {/* Chapter log */}
      {expanded && (
        <div className="px-5 py-4 space-y-4" style={{ borderTop: "1px solid #1a1a1a" }}>
          {quest.films.filter((f) => f.chapter).map((film) => (
            <div key={film.tmdb_id}>
              <p className="text-xs font-bold mb-1" style={{ color: PIXEL_GREEN }}>
                {film.title}{film.year ? ` (${film.year})` : ""}
                {film.rating != null && (
                  <span className="ml-2"><Stars rating={film.rating} /></span>
                )}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "#888" }}>{film.chapter}</p>
            </div>
          ))}

          {/* Side quest chapters */}
          {completedSideQuests.filter((sq) => sq.films.some((f) => f.chapter)).map((sq) => (
            <div key={sq.id}>
              <p className="text-xs font-bold mb-2" style={{ color: PIXEL_GOLD }}>
                ⚡ Side Quest: {sq.title}
              </p>
              {sq.films.filter((f) => f.chapter).map((film) => (
                <div key={film.tmdb_id} className="mb-3">
                  <p className="text-xs font-bold mb-1" style={{ color: PIXEL_GOLD + "aa" }}>
                    {film.title}{film.year ? ` (${film.year})` : ""}
                    {film.rating != null && (
                      <span className="ml-2"><Stars rating={film.rating} /></span>
                    )}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: "#888" }}>{film.chapter}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function QuestHistoryPage() {
  const [history, setHistory] = useState<QuestRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/film-quest/history")
      .then((r) => r.json())
      .then((d) => { setHistory(d.history ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 rounded-full border-4 animate-spin"
          style={{ borderColor: "#333", borderTopColor: PIXEL_GREEN }} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto" style={{ fontFamily: "monospace" }}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <Link
            href="/film-quest"
            className="text-xs px-3 py-1 rounded"
            style={{ background: "#1a1a1a", color: "#666", border: "1px solid #2a2a2a" }}
          >
            ← Back to Quest
          </Link>
        </div>
        <h1 className="text-3xl font-black mt-4 mb-1" style={{ color: PIXEL_GREEN }}>
          QUEST LOG
        </h1>
        <p className="text-sm" style={{ color: "#555" }}>
          {history.length} quest{history.length !== 1 ? "s" : ""} on record
          {history.filter((q) => q.status === "completed").length > 0 && (
            <span style={{ color: PIXEL_GREEN }}>
              {" · "}{history.filter((q) => q.status === "completed").length} completed
            </span>
          )}
        </p>
      </div>

      {history.length === 0 ? (
        <div
          className="text-center py-20 rounded-2xl"
          style={{ background: "#0d0d0d", border: "1px solid #1a1a1a" }}
        >
          <p className="text-4xl mb-3">📜</p>
          <p className="font-bold mb-1" style={{ color: "#e2e8f0" }}>No quests on record yet.</p>
          <p className="text-sm mb-5" style={{ color: "#555" }}>
            Complete your first Film Quest and it will appear here.
          </p>
          <Link
            href="/film-quest"
            className="px-5 py-2.5 rounded-lg text-sm font-bold"
            style={{ background: PIXEL_GREEN, color: "#000" }}
          >
            Start a Quest →
          </Link>
        </div>
      ) : (
        history.map((quest) => <QuestCard key={quest.id} quest={quest} />)
      )}
    </div>
  );
}
