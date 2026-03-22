"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const TMDB_IMG = "https://image.tmdb.org/t/p/w185";

interface SectionFilm {
  id: number;
  title: string;
  year: number | null;
  poster_path: string | null;
  overview: string | null;
  vote_average: number | null;
}

interface Section {
  title: string;
  emoji: string;
  description: string;
  films: SectionFilm[];
}

interface DirectorSection {
  name: string;
  years: string;
  description: string;
  films: SectionFilm[];
}

interface MonthlySections {
  monthKey: string;
  month: number;
  monthName: string;
  year: number;
  theme: Section;
  grindhouse: Section;
  director: DirectorSection;
}

function FilmCard({ film }: { film: SectionFilm }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link href={`/movie/${film.id}`} className="flex-shrink-0 group" style={{ width: 120 }}>
      <div
        className="relative rounded-lg overflow-hidden transition-transform duration-200"
        style={{ aspectRatio: "2/3", background: "#1a1a1a" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {film.poster_path ? (
          <img
            src={`${TMDB_IMG}${film.poster_path}`}
            alt={film.title}
            className="w-full h-full object-cover transition-opacity duration-200"
            style={{ opacity: hovered ? 0.3 : 1 }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center p-2 text-center"
            style={{ color: "#444", fontSize: 11 }}
          >
            {film.title}
          </div>
        )}

        {/* Hover overlay */}
        {hovered && film.overview && (
          <div
            className="absolute inset-0 p-2 flex flex-col justify-end"
            style={{ background: "rgba(0,0,0,0.85)" }}
          >
            <p className="text-xs leading-snug line-clamp-5" style={{ color: "#e2e8f0" }}>
              {film.overview}
            </p>
            {film.vote_average != null && (
              <p className="text-xs mt-1 font-bold" style={{ color: "#e50914" }}>
                ★ {film.vote_average.toFixed(1)}
              </p>
            )}
          </div>
        )}
      </div>
      <div className="mt-1.5 px-0.5">
        <p
          className="text-xs font-medium leading-tight line-clamp-2 group-hover:text-white transition-colors"
          style={{ color: "#aaa" }}
        >
          {film.title}
        </p>
        {film.year && (
          <p className="text-xs mt-0.5" style={{ color: "#555" }}>
            {film.year}
          </p>
        )}
      </div>
    </Link>
  );
}

function ShelfSection({
  title,
  emoji,
  description,
  films,
  accentColor,
  labelColor,
}: {
  title: string;
  emoji: string;
  description: string;
  films: SectionFilm[];
  accentColor: string;
  labelColor: string;
}) {
  return (
    <div className="mb-12">
      {/* Shelf divider card */}
      <div
        className="rounded-xl p-5 mb-5"
        style={{ background: accentColor, border: `1px solid ${labelColor}30` }}
      >
        <div className="flex items-start gap-3">
          <span style={{ fontSize: 28 }}>{emoji}</span>
          <div>
            <h2 className="text-xl font-black tracking-tight mb-2" style={{ color: labelColor }}>
              {title}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "#aaa", maxWidth: 640 }}>
              {description}
            </p>
          </div>
        </div>
      </div>

      {/* Film shelf — horizontal scroll */}
      {films.length > 0 ? (
        <div
          className="flex gap-3 overflow-x-auto pb-3"
          style={{ scrollbarWidth: "none" }}
        >
          {films.map((film) => (
            <FilmCard key={film.id} film={film} />
          ))}
        </div>
      ) : (
        <p className="text-sm" style={{ color: "#444" }}>
          Films loading…
        </p>
      )}
    </div>
  );
}

function DirectorShelf({ director }: { director: DirectorSection }) {
  return (
    <div className="mb-12">
      {/* Shelf divider card — gold treatment */}
      <div
        className="rounded-xl p-5 mb-5"
        style={{ background: "#1a1500", border: "1px solid #f5c51830" }}
      >
        <div className="flex items-start gap-3">
          <span style={{ fontSize: 28 }}>🎬</span>
          <div>
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#f5c51880" }}>
              Director Spotlight
            </p>
            <h2 className="text-xl font-black tracking-tight mb-0.5" style={{ color: "#f5c518" }}>
              {director.name}
            </h2>
            <p className="text-xs mb-2" style={{ color: "#666" }}>
              {director.years}
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "#aaa", maxWidth: 640 }}>
              {director.description}
            </p>
          </div>
        </div>
      </div>

      {director.films.length > 0 ? (
        <div
          className="flex gap-3 overflow-x-auto pb-3"
          style={{ scrollbarWidth: "none" }}
        >
          {director.films.map((film) => (
            <FilmCard key={film.id} film={film} />
          ))}
        </div>
      ) : (
        <p className="text-sm" style={{ color: "#444" }}>Films loading…</p>
      )}
    </div>
  );
}

export default function MonthlyPage() {
  const [data, setData] = useState<MonthlySections | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [subStatus, setSubStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  useEffect(() => {
    fetch("/api/monthly-sections")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const subscribe = async () => {
    if (!email.includes("@")) return;
    setSubStatus("sending");
    try {
      const res = await fetch("/api/monthly-sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSubStatus(res.ok ? "done" : "error");
    } catch {
      setSubStatus("error");
    }
  };

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

  if (!data) {
    return (
      <div className="text-center py-24">
        <p className="text-5xl mb-4">📼</p>
        <p className="text-lg font-semibold">Couldn't reach the stacks.</p>
        <p className="text-sm mt-2" style={{ color: "#555" }}>Check your connection and try again.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Page header */}
      <div className="mb-10">
        <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "#555" }}>
          Now Showing
        </p>
        <h1 className="text-4xl font-black tracking-tight mb-1">
          The Stacks
        </h1>
        <p className="text-lg font-semibold mb-1" style={{ color: "#e50914" }}>
          {data.monthName} {data.year}
        </p>
        <div
          className="h-px w-full my-4"
          style={{ background: "linear-gradient(90deg, #e50914, transparent)" }}
        />
        <p className="text-sm" style={{ color: "#555" }}>
          Three curated shelves. Refreshes the 1st of every month.
        </p>
      </div>

      {/* Monthly theme section */}
      <ShelfSection
        title={data.theme.title}
        emoji={data.theme.emoji}
        description={data.theme.description}
        films={data.theme.films}
        accentColor="#1a0a0a"
        labelColor="#e50914"
      />

      {/* Grindhouse Corner */}
      <ShelfSection
        title={data.grindhouse.title}
        emoji={data.grindhouse.emoji}
        description={data.grindhouse.description}
        films={data.grindhouse.films}
        accentColor="#1a0800"
        labelColor="#ff6a00"
      />

      {/* Director Spotlight */}
      <DirectorShelf director={data.director} />

      {/* Email signup */}
      <div
        className="rounded-2xl p-6 mt-4"
        style={{ background: "#111", border: "1px solid #1e1e1e" }}
      >
        <p className="font-bold mb-1">Get the monthly update</p>
        <p className="text-sm mb-4" style={{ color: "#555" }}>
          We'll email you when the stacks refresh on the 1st.
        </p>

        {subStatus === "done" ? (
          <p className="text-sm font-medium" style={{ color: "#22c55e" }}>
            ✓ You're on the list.
          </p>
        ) : (
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && subscribe()}
              className="flex-1 px-4 py-2 rounded-lg text-sm outline-none"
              style={{
                background: "#1a1a1a",
                border: "1px solid #2a2a2a",
                color: "#e2e8f0",
              }}
            />
            <button
              onClick={subscribe}
              disabled={subStatus === "sending" || !email.includes("@")}
              className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: "#e50914", color: "#fff" }}
            >
              {subStatus === "sending" ? "…" : "Notify me"}
            </button>
          </div>
        )}
        {subStatus === "error" && (
          <p className="text-xs mt-2" style={{ color: "#e53e3e" }}>
            Something went wrong. Try again.
          </p>
        )}
      </div>
    </div>
  );
}
