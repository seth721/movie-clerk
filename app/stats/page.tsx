"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Stats {
  total: number;
  avgRating: number | null;
  rewatches: number;
  watchlist: number;
  ratingDist: Record<string, number>;
  decades: { decade: number; avg: number; count: number }[];
  sweetSpotDecade: { decade: number; avg: number; count: number } | null;
  topGenres: { genre: string; avg: number; count: number }[];
  topDirectors: { name: string; avg: number; count: number }[];
  topActors: { name: string; avg: number; count: number }[];
  foreignPct: number | null;
  avgRuntimeLoved: number | null;
  generosityDelta: number | null;
  topYear: number | null;
  contrarian: { title: string; year: number | null; userRating: number; tmdbRating: number; delta: number }[];
  hiddenGems: { title: string; year: number | null; userRating: number; voteCount: number }[];
  yearActivity: { year: number; count: number }[];
  firstWatch: { title: string; year: number | null; watchedDate: string | null } | null;
  latestWatch: { title: string; year: number | null; watchedDate: string | null } | null;
}

const STAR_STEPS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

function StatTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-1"
      style={{
        background: accent ? "rgba(229,9,20,0.08)" : "#111",
        border: `1px solid ${accent ? "#e5091440" : "#1e1e1e"}`,
      }}
    >
      <p className="text-xs uppercase tracking-widest" style={{ color: "#555" }}>
        {label}
      </p>
      <p className="text-3xl font-black" style={{ color: accent ? "#e50914" : "#f1f5f9" }}>
        {value}
      </p>
      {sub && <p className="text-xs" style={{ color: "#4a5568" }}>{sub}</p>}
    </div>
  );
}

function BarRow({
  label,
  count,
  max,
  avg,
  sub,
}: {
  label: string;
  count: number;
  max: number;
  avg?: number;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-3 group">
      <div className="w-24 text-xs text-right shrink-0" style={{ color: "#888" }}>
        {label}
      </div>
      <div className="flex-1 relative" style={{ height: 22 }}>
        <div
          className="absolute inset-y-0 left-0 rounded-sm transition-all duration-700"
          style={{
            width: `${Math.max(2, (count / max) * 100)}%`,
            background: "linear-gradient(90deg, #e50914, #ff4444)",
          }}
        />
        <div className="absolute inset-y-0 left-0 flex items-center px-2">
          <span className="text-xs font-semibold" style={{ color: "#fff", mixBlendMode: "difference" }}>
            {count}
          </span>
        </div>
      </div>
      <div className="w-14 text-xs text-right shrink-0" style={{ color: "#4a5568" }}>
        {avg != null ? `★ ${avg.toFixed(1)}` : sub ?? ""}
      </div>
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <span style={{ color: "#e50914", letterSpacing: 1 }}>
      {"★".repeat(full)}{half ? "½" : ""}
    </span>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
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

  if (!stats || stats.total === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-24">
        <p className="text-5xl mb-4">📊</p>
        <h1 className="text-2xl font-bold mb-2">Nothing to count yet.</h1>
        <p className="text-sm mb-6" style={{ color: "#555" }}>
          Rate some films and the clerk will keep track.
        </p>
        <Link href="/onboarding" className="px-5 py-2.5 rounded-lg font-semibold text-sm"
          style={{ background: "#e50914", color: "#fff" }}>
          Rate films to get started →
        </Link>
      </div>
    );
  }

  const maxDist = Math.max(...STAR_STEPS.map((s) => stats.ratingDist[String(s)] ?? 0), 1);
  const maxGenre = Math.max(...stats.topGenres.map((g) => g.count), 1);
  const maxDecade = Math.max(...stats.decades.map((d) => d.count), 1);
  const maxDirector = Math.max(...stats.topDirectors.map((d) => d.count), 1);
  const maxYearActivity = Math.max(...(stats.yearActivity?.map((y) => y.count) ?? []), 1);

  const generosityLabel = stats.generosityDelta != null
    ? stats.generosityDelta > 0.3
      ? "You're generous — you rate above the crowd."
      : stats.generosityDelta < -0.3
        ? "Tough crowd. You rate harder than most."
        : "You rate in line with the consensus."
    : null;

  const runtimeLabel = stats.avgRuntimeLoved != null
    ? stats.avgRuntimeLoved > 130
      ? "You like them long."
      : stats.avgRuntimeLoved < 95
        ? "You prefer the lean ones."
        : "You land right in the middle, runtime-wise."
    : null;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-1">Your Numbers</h1>
        <p className="text-sm" style={{ color: "#555" }}>
          Everything the clerk has on file.
        </p>
      </div>

      {/* Hero + key tiles */}
      <div className="grid gap-4 mb-10" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr" }}>
        <StatTile
          label="Films rated"
          value={stats.total.toLocaleString()}
          sub={stats.topYear ? `Most from ${stats.topYear}` : undefined}
          accent
        />
        <StatTile
          label="Avg rating"
          value={stats.avgRating != null ? `★ ${stats.avgRating.toFixed(1)}` : "—"}
          sub={
            stats.generosityDelta != null
              ? stats.generosityDelta > 0
                ? `+${stats.generosityDelta} vs TMDB`
                : `${stats.generosityDelta} vs TMDB`
              : undefined
          }
        />
        <StatTile
          label="Rewatches"
          value={stats.rewatches.toString()}
          sub="True love"
        />
        <StatTile
          label="Watchlist"
          value={stats.watchlist.toString()}
          sub="Films to get to"
        />
      </div>

      {/* Rating distribution */}
      <div className="rounded-2xl p-6 mb-6" style={{ background: "#111", border: "1px solid #1e1e1e" }}>
        <h2 className="font-bold mb-5" style={{ color: "#e2e8f0" }}>Rating Distribution</h2>
        <div className="space-y-2">
          {STAR_STEPS.map((s) => {
            const count = stats.ratingDist[String(s)] ?? 0;
            return (
              <BarRow
                key={s}
                label={`${"★".repeat(Math.ceil(s))}${s % 1 !== 0 ? "½" : ""} ${s}`}
                count={count}
                max={maxDist}
              />
            );
          })}
        </div>
      </div>

      {/* Genres + Decades — two columns */}
      <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {/* Top genres */}
        <div className="rounded-2xl p-6" style={{ background: "#111", border: "1px solid #1e1e1e" }}>
          <h2 className="font-bold mb-5" style={{ color: "#e2e8f0" }}>Top Genres</h2>
          {stats.topGenres.length > 0 ? (
            <div className="space-y-2">
              {stats.topGenres.map((g) => (
                <BarRow
                  key={g.genre}
                  label={g.genre}
                  count={g.count}
                  max={maxGenre}
                  avg={g.avg}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "#4a5568" }}>Not enough data yet.</p>
          )}
        </div>

        {/* Decades */}
        <div className="rounded-2xl p-6" style={{ background: "#111", border: "1px solid #1e1e1e" }}>
          <h2 className="font-bold mb-5" style={{ color: "#e2e8f0" }}>By Decade</h2>
          {stats.decades.length > 0 ? (
            <div className="space-y-2">
              {stats.decades.map((d) => (
                <BarRow
                  key={d.decade}
                  label={`${d.decade}s`}
                  count={d.count}
                  max={maxDecade}
                  avg={d.avg}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "#4a5568" }}>Not enough data yet.</p>
          )}
        </div>
      </div>

      {/* Yearly watch activity */}
      {stats.yearActivity && stats.yearActivity.length > 1 && (
        <div className="rounded-2xl p-6 mb-6" style={{ background: "#111", border: "1px solid #1e1e1e" }}>
          <h2 className="font-bold mb-5" style={{ color: "#e2e8f0" }}>Watches by Year</h2>
          <div className="flex items-end gap-2" style={{ height: 80 }}>
            {stats.yearActivity.map(({ year, count }) => (
              <div key={year} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-sm transition-all duration-700"
                  style={{
                    height: `${Math.max(4, (count / maxYearActivity) * 64)}px`,
                    background: "linear-gradient(180deg, #e50914, #7a0009)",
                  }}
                  title={`${year}: ${count} films`}
                />
                <span style={{ color: "#444", fontSize: 10 }}>{year}</span>
                <span style={{ color: "#666", fontSize: 10 }}>{count}</span>
              </div>
            ))}
          </div>
          {stats.firstWatch && stats.latestWatch && (
            <div className="flex justify-between mt-4 pt-4" style={{ borderTop: "1px solid #1a1a1a" }}>
              <div>
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#444" }}>First logged</p>
                <p className="text-sm font-medium" style={{ color: "#e2e8f0" }}>{stats.firstWatch.title}</p>
                <p className="text-xs" style={{ color: "#555" }}>
                  {stats.firstWatch.year} · {stats.firstWatch.watchedDate?.slice(0, 10)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#444" }}>Most recent</p>
                <p className="text-sm font-medium" style={{ color: "#e2e8f0" }}>{stats.latestWatch.title}</p>
                <p className="text-xs" style={{ color: "#555" }}>
                  {stats.latestWatch.year} · {stats.latestWatch.watchedDate?.slice(0, 10)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top directors */}
      {stats.topDirectors.length > 0 && (
        <div className="rounded-2xl p-6 mb-6" style={{ background: "#111", border: "1px solid #1e1e1e" }}>
          <h2 className="font-bold mb-5" style={{ color: "#e2e8f0" }}>Directors You Keep Coming Back To</h2>
          <div className="space-y-2">
            {stats.topDirectors.map((d) => (
              <BarRow
                key={d.name}
                label={d.name}
                count={d.count}
                max={maxDirector}
                avg={d.avg}
              />
            ))}
          </div>
        </div>
      )}

      {/* Contrarian picks + Hidden gems — two columns */}
      {(stats.contrarian?.length > 0 || stats.hiddenGems?.length > 0) && (
        <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {/* Contrarian picks */}
          {stats.contrarian?.length > 0 && (
            <div className="rounded-2xl p-6" style={{ background: "#111", border: "1px solid #1e1e1e" }}>
              <h2 className="font-bold mb-1" style={{ color: "#e2e8f0" }}>You vs. The Crowd</h2>
              <p className="text-xs mb-5" style={{ color: "#4a5568" }}>Where your taste diverges most from consensus</p>
              <div className="space-y-4">
                {stats.contrarian.map((c) => (
                  <div key={c.title} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "#e2e8f0" }}>{c.title}</p>
                      <p className="text-xs" style={{ color: "#555" }}>{c.year}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="text-xs" style={{ color: "#555" }}>You</span>
                        <Stars rating={c.userRating} />
                      </div>
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="text-xs" style={{ color: "#555" }}>TMDB</span>
                        <span className="text-xs" style={{ color: "#4a5568" }}>★ {c.tmdbRating.toFixed(1)}</span>
                      </div>
                      <p
                        className="text-xs font-bold mt-0.5"
                        style={{ color: c.delta > 0 ? "#22c55e" : "#e53e3e" }}
                      >
                        {c.delta > 0 ? `+${c.delta}` : c.delta}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hidden gems */}
          {stats.hiddenGems?.length > 0 && (
            <div className="rounded-2xl p-6" style={{ background: "#111", border: "1px solid #1e1e1e" }}>
              <h2 className="font-bold mb-1" style={{ color: "#e2e8f0" }}>Hidden Gems</h2>
              <p className="text-xs mb-5" style={{ color: "#4a5568" }}>Films you loved that few others have seen</p>
              <div className="space-y-4">
                {stats.hiddenGems.map((g) => (
                  <div key={g.title} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "#e2e8f0" }}>{g.title}</p>
                      <p className="text-xs" style={{ color: "#555" }}>{g.year}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <Stars rating={g.userRating} />
                      <p className="text-xs mt-0.5" style={{ color: "#4a5568" }}>
                        {g.voteCount.toLocaleString()} votes
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top actors */}
      {stats.topActors.length > 0 && (
        <div className="rounded-2xl p-6 mb-6" style={{ background: "#111", border: "1px solid #1e1e1e" }}>
          <h2 className="font-bold mb-5" style={{ color: "#e2e8f0" }}>Actors in Your Favourite Films</h2>
          <div className="flex flex-wrap gap-2">
            {stats.topActors.map((a) => (
              <span
                key={a.name}
                className="px-3 py-1.5 rounded-full text-sm"
                style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#cbd5e1" }}
              >
                {a.name}
                <span className="ml-2 text-xs" style={{ color: "#555" }}>×{a.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Fun facts row */}
      <div className="grid gap-4 mb-10" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        {stats.sweetSpotDecade && (
          <div className="rounded-xl p-5" style={{ background: "#111", border: "1px solid #1e1e1e" }}>
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#555" }}>Sweet spot</p>
            <p className="text-3xl font-black mb-1" style={{ color: "#f1f5f9" }}>{stats.sweetSpotDecade.decade}s</p>
            <p className="text-xs" style={{ color: "#4a5568" }}>
              ★ {stats.sweetSpotDecade.avg.toFixed(2)} avg · {stats.sweetSpotDecade.count} films
            </p>
          </div>
        )}
        {stats.foreignPct != null && (
          <div className="rounded-xl p-5" style={{ background: "#111", border: "1px solid #1e1e1e" }}>
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#555" }}>Foreign films</p>
            <p className="text-3xl font-black mb-1" style={{ color: "#f1f5f9" }}>{stats.foreignPct}%</p>
            <p className="text-xs" style={{ color: "#4a5568" }}>
              {stats.foreignPct > 40
                ? "Subtitles are no obstacle."
                : stats.foreignPct > 20
                  ? "A healthy appetite for world cinema."
                  : "Room to explore beyond English."}
            </p>
          </div>
        )}
        {stats.avgRuntimeLoved != null && (
          <div className="rounded-xl p-5" style={{ background: "#111", border: "1px solid #1e1e1e" }}>
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#555" }}>Avg runtime (loved)</p>
            <p className="text-3xl font-black mb-1" style={{ color: "#f1f5f9" }}>
              {Math.floor(stats.avgRuntimeLoved / 60)}h {stats.avgRuntimeLoved % 60}m
            </p>
            <p className="text-xs" style={{ color: "#4a5568" }}>{runtimeLabel}</p>
          </div>
        )}
        {generosityLabel && (
          <div className="rounded-xl p-5" style={{ background: "#111", border: "1px solid #1e1e1e" }}>
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#555" }}>vs the crowd</p>
            <p className="text-3xl font-black mb-1" style={{ color: "#f1f5f9" }}>
              {stats.generosityDelta != null
                ? (stats.generosityDelta > 0 ? "+" : "") + stats.generosityDelta
                : "—"}
              <span className="text-base font-normal ml-1" style={{ color: "#4a5568" }}>★</span>
            </p>
            <p className="text-xs" style={{ color: "#4a5568" }}>{generosityLabel}</p>
          </div>
        )}
      </div>
    </div>
  );
}
