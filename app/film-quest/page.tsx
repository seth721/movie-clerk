"use client";
import { useState, useEffect } from "react";
import Image from "next/image";

interface Director {
  director: string;
  person_id: number;
  rated_count: number;
  avg_rating: number;
  seen_of_total: number;
  total_significant: number;
  unseen_films: { tmdb_id: number; title: string; year: number | null; poster_path: string | null; vote_average: number | null }[];
}

interface QuestFilm {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
  overview?: string | null;
  vote_average?: number | null;
}

interface ActiveQuest {
  id: number;
  director_tmdb_id: number;
  director_name: string;
  quest_title: string;
  film_ids: number[];
  status: string;
}

interface QuestProgressEntry {
  tmdb_id: number;
  chapter: string;
  completed_at: string;
  isSideQuest?: boolean;
  sideQuestTitle?: string;
}

interface SideQuest {
  id: number;
  quest_id: number;
  type: string;
  title: string;
  hook: string;
  film_ids: number[];
  film_titles: string[];
  status: "available" | "active" | "completed" | "skipped";
  milestone: number;
}

interface SideQuestProgressEntry {
  side_quest_id: number;
  tmdb_id: number;
  chapter: string;
  completed_at: string;
}

type View = "loading" | "select" | "inventory" | "active";

const PIXEL_GREEN = "#00e054";
const PIXEL_GOLD = "#f5c518";
const PIXEL_DIM = "#1a3a1a";

const TYPE_LABELS: Record<string, string> = {
  influence: "⚡ The Influence",
  detour: "🌀 The Detour",
  endorsement: "❤️ The Endorsement",
  apprentice: "🎓 The Apprentice",
};

function StarRater({ onRate, disabled }: { onRate: (rating: number) => void; disabled?: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          disabled={disabled}
          onClick={() => onRate(s)}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(null)}
          className="text-lg transition-colors"
          style={{ color: (hover ?? 0) >= s ? PIXEL_GREEN : "#333", cursor: disabled ? "not-allowed" : "pointer", background: "none", border: "none", padding: "0 1px" }}
        >★</button>
      ))}
    </div>
  );
}

function PixelBar({ value, max, color = PIXEL_GREEN }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full rounded" style={{ background: "#111", border: "1px solid #222", height: 12 }}>
      <div className="h-full rounded transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function QuestCard({ director, onSelect }: { director: Director; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="w-full text-left rounded-xl p-4 transition-all hover:scale-[1.01]"
      style={{ background: "#0d0d0d", border: `1px solid ${PIXEL_DIM}`, cursor: "pointer" }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-xs font-bold mb-1" style={{ color: PIXEL_GREEN, fontFamily: "monospace", letterSpacing: 2 }}>▶ QUEST AVAILABLE</p>
          <h3 className="text-lg font-bold" style={{ color: "#fff" }}>{director.director} Chronicles</h3>
          <p className="text-xs mt-0.5" style={{ color: "#555" }}>
            You've seen {director.seen_of_total} of {director.total_significant} films · avg {director.avg_rating}★
          </p>
        </div>
        <div className="flex-shrink-0 text-xs px-3 py-1.5 rounded font-bold" style={{ background: PIXEL_DIM, color: PIXEL_GREEN, border: `1px solid ${PIXEL_GREEN}40`, fontFamily: "monospace" }}>
          {director.unseen_films.length} remaining
        </div>
      </div>
      <PixelBar value={director.seen_of_total} max={director.total_significant} />
      <div className="flex gap-2 mt-3 overflow-hidden">
        {director.unseen_films.slice(0, 5).map((f) => (
          <div key={f.tmdb_id} className="flex-shrink-0 rounded overflow-hidden" style={{ width: 44, height: 66, background: "#111" }}>
            {f.poster_path && <Image src={`https://image.tmdb.org/t/p/w92${f.poster_path}`} alt={f.title} width={44} height={66} className="object-cover w-full h-full" />}
          </div>
        ))}
        {director.unseen_films.length > 5 && (
          <div className="flex-shrink-0 rounded flex items-center justify-center text-xs" style={{ width: 44, height: 66, background: "#111", color: "#444" }}>+{director.unseen_films.length - 5}</div>
        )}
      </div>
    </button>
  );
}

function SideQuestCard({
  sideQuest,
  onAccept,
  onSkip,
}: {
  sideQuest: SideQuest;
  onAccept: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="rounded-xl p-4 mb-4" style={{ background: "#0f0a00", border: `2px solid ${PIXEL_GOLD}60` }}>
      <div className="flex items-start gap-2 mb-2">
        <span style={{ color: PIXEL_GOLD, fontSize: 18 }}>⚡</span>
        <div>
          <p className="text-xs font-bold" style={{ color: PIXEL_GOLD, fontFamily: "monospace", letterSpacing: 2 }}>SIDE QUEST AVAILABLE</p>
          <p className="text-sm font-bold mt-0.5" style={{ color: "#fff" }}>
            {TYPE_LABELS[sideQuest.type] ?? sideQuest.type} — {sideQuest.title}
          </p>
        </div>
      </div>
      <p className="text-xs mb-3 leading-relaxed" style={{ color: "#888", fontFamily: "monospace" }}>{sideQuest.hook}</p>
      <div className="flex gap-2 mb-3">
        {sideQuest.film_titles.map((title, i) => (
          <span key={i} className="text-xs px-2 py-0.5 rounded" style={{ background: "#1a1200", color: PIXEL_GOLD, border: `1px solid ${PIXEL_GOLD}30` }}>
            {i + 1}. {title}
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={onAccept} className="text-xs px-3 py-1.5 rounded font-bold" style={{ background: PIXEL_GOLD, color: "#000" }}>
          Accept Quest
        </button>
        <button onClick={onSkip} className="text-xs px-3 py-1.5 rounded" style={{ background: "#1a1a1a", color: "#555", border: "1px solid #222" }}>
          Skip
        </button>
      </div>
    </div>
  );
}

function ActiveSideQuestPanel({
  sideQuest,
  questFilms,
  sideQuestProgress,
  completing,
  onComplete,
}: {
  sideQuest: SideQuest;
  questFilms: QuestFilm[];
  sideQuestProgress: SideQuestProgressEntry[];
  completing: number | null;
  onComplete: (tmdbId: number, title: string, year: number | null, rating: number) => void;
}) {
  const completedSideIds = new Set(sideQuestProgress.map((p) => p.tmdb_id));
  const nextId = sideQuest.film_ids.find((id) => !completedSideIds.has(id));
  const nextFilm = questFilms.find((f) => f.id === nextId);

  return (
    <div className="rounded-xl p-4 mb-4" style={{ background: "#0f0a00", border: `1px solid ${PIXEL_GOLD}40` }}>
      <p className="text-xs font-bold mb-1" style={{ color: PIXEL_GOLD, fontFamily: "monospace", letterSpacing: 2 }}>
        ⚡ ACTIVE SIDE QUEST — {sideQuest.title}
      </p>
      <PixelBar value={completedSideIds.size} max={sideQuest.film_ids.length} color={PIXEL_GOLD} />
      <p className="text-xs mt-1 mb-3" style={{ color: "#666", fontFamily: "monospace" }}>
        {completedSideIds.size}/{sideQuest.film_ids.length} films
      </p>

      {/* Completed side quest entries */}
      {sideQuestProgress.map((entry) => {
        const f = questFilms.find((f) => f.id === entry.tmdb_id);
        return (
          <div key={entry.tmdb_id} className="mb-2 rounded p-2" style={{ background: "#0a0800" }}>
            <p className="text-xs font-semibold mb-0.5" style={{ color: PIXEL_GOLD }}>✓ {f?.title ?? `Film #${entry.tmdb_id}`}</p>
            <p className="text-xs" style={{ color: "#666", fontFamily: "monospace" }}>{entry.chapter}</p>
          </div>
        );
      })}

      {/* Next film to watch */}
      {nextFilm && (
        <div className="flex items-center gap-3 rounded-lg p-3 mt-2" style={{ background: "#1a1000", border: `1px solid ${PIXEL_GOLD}30` }}>
          {nextFilm.poster_path && (
            <div className="flex-shrink-0 rounded overflow-hidden" style={{ width: 36, height: 54 }}>
              <Image src={`https://image.tmdb.org/t/p/w92${nextFilm.poster_path}`} alt={nextFilm.title} width={36} height={54} className="object-cover w-full h-full" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs mb-0.5" style={{ color: PIXEL_GOLD, fontFamily: "monospace" }}>▶ SIDE QUEST NEXT</p>
            <p className="text-sm font-medium" style={{ color: "#fff" }}>{nextFilm.title}</p>
            {nextFilm.release_date && <p className="text-xs" style={{ color: "#444" }}>{nextFilm.release_date.slice(0, 4)}</p>}
          </div>
          <div className="flex-shrink-0">
            <StarRater
              disabled={completing === nextFilm.id}
              onRate={(rating) => {
                const year = nextFilm.release_date ? parseInt(nextFilm.release_date.slice(0, 4)) : null;
                onComplete(nextFilm.id, nextFilm.title, year, rating);
              }}
            />
            {completing === nextFilm.id && <p className="text-xs mt-1 text-center font-mono animate-pulse" style={{ color: PIXEL_GOLD }}>saving...</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FilmQuestPage() {
  const [view, setView] = useState<View>("loading");
  const [directors, setDirectors] = useState<Director[]>([]);
  const [selectedDirector, setSelectedDirector] = useState<Director | null>(null);
  const [activeQuest, setActiveQuest] = useState<ActiveQuest | null>(null);
  const [questFilms, setQuestFilms] = useState<QuestFilm[]>([]);
  const [progress, setProgress] = useState<QuestProgressEntry[]>([]);
  const [sideQuests, setSideQuests] = useState<SideQuest[]>([]);
  const [sideQuestProgress, setSideQuestProgress] = useState<Record<number, SideQuestProgressEntry[]>>({});
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
  const [opening, setOpening] = useState<string>("");
  const [inventoryRatings, setInventoryRatings] = useState<Record<number, number>>({});
  const [starting, setStarting] = useState(false);
  const [completing, setCompleting] = useState<number | null>(null);
  const [finale, setFinale] = useState<string | null>(null);
  const [sideQuestFinale, setSideQuestFinale] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const questRes = await fetch("/api/film-quest").then((r) => r.json());
      if (questRes.quest) {
        setActiveQuest(questRes.quest);
        setProgress(questRes.progress ?? []);
        setSideQuests(questRes.sideQuests ?? []);
        setSideQuestProgress(questRes.sideQuestProgress ?? {});
        setCompletedIds(new Set(questRes.completedIds ?? []));
        setView("active");
        return;
      }
      const gapsRes = await fetch("/api/filmography-gaps").then((r) => r.json());
      setDirectors(gapsRes.gaps ?? []);
      setView("select");
    };
    init().catch(() => setView("select"));
  }, []);

  const selectDirector = (director: Director) => {
    setSelectedDirector(director);
    setView("inventory");
  };

  const startQuest = async () => {
    if (!selectedDirector) return;
    setStarting(true);
    setError(null);
    try {
      await Promise.all(
        Object.entries(inventoryRatings).map(([tmdbId, rating]) =>
          fetch("/api/rate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tmdb_id: parseInt(tmdbId), rating }),
          })
        )
      );

      const res = await fetch("/api/film-quest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", directorTmdbId: selectedDirector.person_id, directorName: selectedDirector.director }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }

      setActiveQuest({ id: data.questId, director_tmdb_id: selectedDirector.person_id, director_name: selectedDirector.director, quest_title: data.questTitle, film_ids: data.films.map((f: QuestFilm) => f.id), status: "active" });
      setQuestFilms(data.films);
      setOpening(data.opening);
      setSideQuests(data.sideQuests?.map((sq: { type: string; title: string; hook: string; resolvedFilms: { tmdb_id: number; title: string }[]; milestone: number }, idx: number) => ({
        id: idx + 1, // temp IDs until we reload
        quest_id: data.questId,
        type: sq.type,
        title: sq.title,
        hook: sq.hook,
        film_ids: sq.resolvedFilms.map((f: { tmdb_id: number }) => f.tmdb_id),
        film_titles: sq.resolvedFilms.map((f: { title: string }) => f.title),
        status: "available" as const,
        milestone: sq.milestone,
      })) ?? []);
      setProgress([]);
      setCompletedIds(new Set());
      setView("active");

      // Reload to get proper DB IDs for side quests
      setTimeout(async () => {
        const freshRes = await fetch("/api/film-quest").then((r) => r.json());
        if (freshRes.sideQuests) setSideQuests(freshRes.sideQuests);
      }, 1000);
    } catch (err) {
      setError(String(err));
    } finally {
      setStarting(false);
    }
  };

  const completeMainFilm = async (film: QuestFilm, rating: number) => {
    if (!activeQuest || completing !== null) return;
    setCompleting(film.id);
    try {
      const newCompleted = completedIds.size + 1;
      const filmsRemaining = activeQuest.film_ids.length - newCompleted;
      const nextFilmId = activeQuest.film_ids[newCompleted];
      const nextFilm = questFilms.find((f) => f.id === nextFilmId);

      const res = await fetch("/api/film-quest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete_film", questId: activeQuest.id, tmdbId: film.id, filmTitle: film.title, filmYear: film.release_date ? parseInt(film.release_date.slice(0, 4)) : null, rating, filmsRemaining, nextFilm: nextFilm?.title ?? null, directorName: activeQuest.director_name, questTitle: activeQuest.quest_title }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }

      setProgress((prev) => [...prev, { tmdb_id: film.id, chapter: data.chapter, completed_at: new Date().toISOString() }]);
      setCompletedIds((prev) => new Set([...prev, film.id]));

      if (data.questComplete) {
        setFinale(data.finale);
        setActiveQuest((q) => q ? { ...q, status: "completed" } : q);
      }

      // Check if any side quests should unlock at this milestone
      const newCount = completedIds.size + 1;
      setSideQuests((prev) => prev.map((sq) => sq.status === "available" && sq.milestone <= newCount ? sq : sq));
    } catch (err) {
      setError(String(err));
    } finally {
      setCompleting(null);
    }
  };

  const completeSideFilm = async (sideQuest: SideQuest, tmdbId: number, title: string, year: number | null, rating: number) => {
    if (completing !== null) return;
    setCompleting(tmdbId);
    try {
      const currentProgress = sideQuestProgress[sideQuest.id] ?? [];
      const completedSideCount = currentProgress.length + 1;
      const filmsRemainingInSideQuest = sideQuest.film_ids.length - completedSideCount;
      const nextId = sideQuest.film_ids[completedSideCount];
      const nextFilm = questFilms.find((f) => f.id === nextId);

      const res = await fetch("/api/film-quest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete_side_film", sideQuestId: sideQuest.id, tmdbId, filmTitle: title, filmYear: year, rating, filmsRemainingInSideQuest, nextFilm: nextFilm?.title ?? null, directorName: activeQuest?.director_name, sideQuestTitle: sideQuest.title }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }

      setSideQuestProgress((prev) => ({
        ...prev,
        [sideQuest.id]: [...(prev[sideQuest.id] ?? []), { side_quest_id: sideQuest.id, tmdb_id: tmdbId, chapter: data.chapter, completed_at: new Date().toISOString() }],
      }));

      if (data.sideQuestComplete) {
        setSideQuests((prev) => prev.map((sq) => sq.id === sideQuest.id ? { ...sq, status: "completed" } : sq));
        setSideQuestFinale((prev) => ({ ...prev, [sideQuest.id]: data.finale }));
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setCompleting(null);
    }
  };

  const handleSideQuestAccept = async (sideQuest: SideQuest) => {
    // Fetch film details for side quest films if not already in questFilms
    const missingIds = sideQuest.film_ids.filter((id) => !questFilms.find((f) => f.id === id));
    if (missingIds.length > 0) {
      const details = await Promise.all(
        missingIds.map((id) => fetch(`/api/browse?tmdb_id=${id}`).then((r) => r.json()).catch(() => null))
      );
      // Just use titles from film_titles if we can't fetch details
      const stubs: QuestFilm[] = sideQuest.film_ids.map((id, i) => ({ id, title: sideQuest.film_titles[i] ?? `Film ${i + 1}` }));
      setQuestFilms((prev) => {
        const existingIds = new Set(prev.map((f) => f.id));
        return [...prev, ...stubs.filter((s) => !existingIds.has(s.id))];
      });
      void details;
    }
    await fetch("/api/film-quest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept_side_quest", sideQuestId: sideQuest.id }),
    });
    setSideQuests((prev) => prev.map((sq) => sq.id === sideQuest.id ? { ...sq, status: "active" } : sq));
  };

  const handleSideQuestSkip = async (sideQuest: SideQuest) => {
    await fetch("/api/film-quest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "skip_side_quest", sideQuestId: sideQuest.id }),
    });
    setSideQuests((prev) => prev.map((sq) => sq.id === sideQuest.id ? { ...sq, status: "skipped" } : sq));
  };

  const abandonQuest = async () => {
    if (!activeQuest) return;
    await fetch("/api/film-quest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "abandon", questId: activeQuest.id }) });
    setActiveQuest(null);
    setView("select");
    const gapsRes = await fetch("/api/filmography-gaps").then((r) => r.json());
    setDirectors(gapsRes.gaps ?? []);
  };

  // ── LOADING ─────────────────────────────────────────────────────────────────
  if (view === "loading") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm font-mono animate-pulse" style={{ color: PIXEL_GREEN }}>▶ LOADING QUESTS...</p>
      </div>
    );
  }

  // ── QUEST SELECTION ─────────────────────────────────────────────────────────
  if (view === "select") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <p className="text-xs font-bold mb-2" style={{ color: PIXEL_GREEN, fontFamily: "monospace", letterSpacing: 3 }}>▓▒░ FILM QUEST ░▒▓</p>
          <h1 className="text-3xl font-bold mb-2">Select Your Quest</h1>
          <p className="text-sm" style={{ color: "#555" }}>Choose a director. Work through their filmography. Earn your stripes.</p>
        </div>
        {directors.length === 0 ? (
          <div className="rounded-xl p-6 text-center" style={{ background: "#0d0d0d", border: "1px solid #1a1a1a" }}>
            <p className="text-sm" style={{ color: "#555" }}>No quests available yet. Import more films and rate at least 2 films by a director to unlock quests.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {directors.map((d) => <QuestCard key={d.person_id} director={d} onSelect={() => selectDirector(d)} />)}
          </div>
        )}
      </div>
    );
  }

  // ── INVENTORY CHECK ─────────────────────────────────────────────────────────
  if (view === "inventory" && selectedDirector) {
    return (
      <div className="max-w-2xl mx-auto">
        <button onClick={() => setView("select")} className="text-xs mb-6 flex items-center gap-1" style={{ color: "#444" }}>← Back</button>
        <div className="mb-6 rounded-xl p-5" style={{ background: "#0d0d0d", border: `1px solid ${PIXEL_GREEN}30` }}>
          <p className="text-xs font-bold mb-1" style={{ color: PIXEL_GREEN, fontFamily: "monospace", letterSpacing: 2 }}>▶ INVENTORY CHECK</p>
          <h2 className="text-xl font-bold mb-1">{selectedDirector.director} Chronicles</h2>
          <p className="text-sm" style={{ color: "#888" }}>
            Before we send you out there — have you seen any of these already? Rate them now so the clerk knows what he&apos;s working with.
          </p>
        </div>
        <div className="space-y-3 mb-6">
          {selectedDirector.unseen_films.map((film) => (
            <div key={film.tmdb_id} className="flex items-center gap-3 rounded-lg p-3" style={{ background: "#0d0d0d", border: "1px solid #1a1a1a" }}>
              <div className="flex-shrink-0 rounded overflow-hidden" style={{ width: 40, height: 60, background: "#111" }}>
                {film.poster_path && <Image src={`https://image.tmdb.org/t/p/w92${film.poster_path}`} alt={film.title} width={40} height={60} className="object-cover w-full h-full" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "#e2e8f0" }}>{film.title}</p>
                {film.year && <p className="text-xs" style={{ color: "#555" }}>{film.year}</p>}
              </div>
              <div className="flex-shrink-0 flex items-center gap-1">
                {inventoryRatings[film.tmdb_id] && <span className="text-xs font-mono" style={{ color: PIXEL_GREEN }}>{inventoryRatings[film.tmdb_id]}★</span>}
                <StarRater onRate={(rating) => setInventoryRatings((prev) => ({ ...prev, [film.tmdb_id]: rating }))} />
              </div>
            </div>
          ))}
        </div>
        {error && <p className="text-xs mb-4" style={{ color: "#e53e3e" }}>{error}</p>}
        <button
          onClick={startQuest}
          disabled={starting}
          className="w-full py-3 rounded-xl font-bold text-sm transition-opacity hover:opacity-90"
          style={{ background: PIXEL_GREEN, color: "#000", opacity: starting ? 0.6 : 1 }}
        >
          {starting ? "▶ GENERATING QUEST + SIDE QUESTS..." : "▶ BEGIN QUEST"}
        </button>
      </div>
    );
  }

  // ── ACTIVE QUEST ─────────────────────────────────────────────────────────────
  if (view === "active" && activeQuest) {
    const completedCount = completedIds.size;
    const totalFilms = activeQuest.film_ids.length;
    const isComplete = activeQuest.status === "completed" || !!finale;

    // Side quests unlocked at current milestone
    const unlockedSideQuests = sideQuests.filter(
      (sq) => sq.status === "available" && sq.milestone <= completedCount
    );
    const activeSideQuests = sideQuests.filter((sq) => sq.status === "active");

    return (
      <div className="max-w-2xl mx-auto">
        {/* Quest header */}
        <div className="mb-6 rounded-xl p-5" style={{ background: "#0d0d0d", border: `1px solid ${PIXEL_GREEN}30` }}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-xs font-bold mb-1" style={{ color: PIXEL_GREEN, fontFamily: "monospace", letterSpacing: 2 }}>
                {isComplete ? "▓ QUEST COMPLETE" : "▶ ACTIVE QUEST"}
              </p>
              <h2 className="text-xl font-bold" style={{ color: "#fff" }}>{activeQuest.quest_title}</h2>
            </div>
            <p className="text-sm font-mono flex-shrink-0" style={{ color: PIXEL_GREEN }}>{completedCount}/{totalFilms}</p>
          </div>
          <PixelBar value={completedCount} max={totalFilms} />
          {sideQuests.filter((sq) => sq.status === "completed").length > 0 && (
            <p className="text-xs mt-2 font-mono" style={{ color: PIXEL_GOLD }}>
              ⚡ {sideQuests.filter((sq) => sq.status === "completed").length} side quest{sideQuests.filter((sq) => sq.status === "completed").length !== 1 ? "s" : ""} completed
            </p>
          )}
        </div>

        {/* Opening narration */}
        {opening && (
          <div className="mb-6 rounded-lg p-4" style={{ background: "#050f05", border: `1px solid ${PIXEL_GREEN}20` }}>
            <p className="text-xs font-mono mb-2" style={{ color: PIXEL_GREEN }}>▶ CLERK SAYS:</p>
            <p className="text-sm leading-relaxed" style={{ color: "#aaa", fontFamily: "monospace" }}>{opening}</p>
          </div>
        )}

        {/* Finale */}
        {finale && (
          <div className="mb-6 rounded-lg p-4" style={{ background: "#0a1f0a", border: `1px solid ${PIXEL_GREEN}` }}>
            <p className="text-xs font-mono mb-2" style={{ color: PIXEL_GREEN }}>🏆 QUEST COMPLETE:</p>
            <p className="text-sm leading-relaxed font-mono" style={{ color: PIXEL_GREEN }}>{finale}</p>
          </div>
        )}

        {/* Unlocked side quests waiting for decision */}
        {unlockedSideQuests.map((sq) => (
          <SideQuestCard
            key={sq.id}
            sideQuest={sq}
            onAccept={() => handleSideQuestAccept(sq)}
            onSkip={() => handleSideQuestSkip(sq)}
          />
        ))}

        {/* Active side quests */}
        {activeSideQuests.map((sq) => (
          <div key={sq.id}>
            <ActiveSideQuestPanel
              sideQuest={sq}
              questFilms={questFilms}
              sideQuestProgress={sideQuestProgress[sq.id] ?? []}
              completing={completing}
              onComplete={(tmdbId, title, year, rating) => completeSideFilm(sq, tmdbId, title, year, rating)}
            />
            {sideQuestFinale[sq.id] && (
              <div className="mb-4 rounded-lg p-4" style={{ background: "#1a1000", border: `1px solid ${PIXEL_GOLD}` }}>
                <p className="text-xs font-mono mb-2" style={{ color: PIXEL_GOLD }}>⚡ SIDE QUEST COMPLETE:</p>
                <p className="text-sm font-mono leading-relaxed" style={{ color: PIXEL_GOLD }}>{sideQuestFinale[sq.id]}</p>
              </div>
            )}
          </div>
        ))}

        {/* Quest log */}
        {progress.length > 0 && (
          <div className="mb-6 space-y-3">
            <p className="text-xs font-bold" style={{ color: "#444", fontFamily: "monospace", letterSpacing: 2 }}>QUEST LOG</p>
            {progress.map((entry) => {
              const film = questFilms.find((f) => f.id === entry.tmdb_id);
              return (
                <div key={entry.tmdb_id} className="rounded-lg p-3" style={{ background: "#0d0d0d", border: "1px solid #1a1a1a" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ color: PIXEL_GREEN, fontSize: 10 }}>✓</span>
                    <p className="text-xs font-semibold" style={{ color: "#ccc" }}>{film?.title ?? `Film #${entry.tmdb_id}`}</p>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "#666", fontFamily: "monospace" }}>{entry.chapter}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Films remaining */}
        {!isComplete && (
          <div className="space-y-3 mb-6">
            <p className="text-xs font-bold" style={{ color: "#444", fontFamily: "monospace", letterSpacing: 2 }}>UP NEXT</p>
            {activeQuest.film_ids
              .filter((id) => !completedIds.has(id))
              .slice(0, 3)
              .map((filmId, idx) => {
                const film = questFilms.find((f) => f.id === filmId);
                if (!film) return null;
                const isNext = idx === 0;
                const hasActiveSideQuest = activeSideQuests.length > 0;
                return (
                  <div key={filmId} className="rounded-lg p-3" style={{ background: isNext ? "#0a1a0a" : "#0d0d0d", border: `1px solid ${isNext ? PIXEL_GREEN + "40" : "#1a1a1a"}`, opacity: isNext && hasActiveSideQuest ? 0.5 : 1 }}>
                    <div className="flex items-center gap-3">
                      {film.poster_path && (
                        <div className="flex-shrink-0 rounded overflow-hidden" style={{ width: 36, height: 54, background: "#111" }}>
                          <Image src={`https://image.tmdb.org/t/p/w92${film.poster_path}`} alt={film.title} width={36} height={54} className="object-cover w-full h-full" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        {isNext && <p className="text-xs mb-0.5" style={{ color: hasActiveSideQuest ? "#666" : PIXEL_GREEN, fontFamily: "monospace" }}>{hasActiveSideQuest ? "PAUSED — finish side quest first" : "▶ YOUR NEXT QUEST"}</p>}
                        <p className="text-sm font-medium" style={{ color: isNext ? "#fff" : "#888" }}>{film.title}</p>
                        {film.release_date && <p className="text-xs" style={{ color: "#444" }}>{film.release_date.slice(0, 4)}</p>}
                      </div>
                      {isNext && !hasActiveSideQuest && (
                        <div className="flex-shrink-0">
                          <StarRater
                            disabled={completing === film.id}
                            onRate={(rating) => completeMainFilm(film, rating)}
                          />
                          {completing === film.id && <p className="text-xs mt-1 text-center font-mono animate-pulse" style={{ color: PIXEL_GREEN }}>saving...</p>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {error && <p className="text-xs mb-4" style={{ color: "#e53e3e" }}>{error}</p>}

        <div className="flex gap-3">
          {isComplete ? (
            <button onClick={abandonQuest} className="flex-1 py-2.5 rounded-lg font-bold text-sm" style={{ background: PIXEL_GREEN, color: "#000" }}>▶ Start New Quest</button>
          ) : (
            <button onClick={abandonQuest} className="text-xs py-2 px-4 rounded-lg" style={{ background: "#1a1a1a", color: "#555", border: "1px solid #222" }}>Abandon Quest</button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
