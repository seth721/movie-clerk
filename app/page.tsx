"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import RatingWidget, { type FilmState } from "@/components/RatingWidget";
import MascotSpeechBubble from "@/components/MascotSpeechBubble";
import MovieClerkTitle from "@/components/MovieClerkTitle";

// ── Browse row types ──────────────────────────────────────────────────────────
interface BrowseFilm {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  original_language?: string;
  overview?: string;
}

interface BrowseData {
  theaters: BrowseFilm[];
  digital: BrowseFilm[];
  physical: BrowseFilm[];
  recommended: BrowseFilm[];
  newBeverly: BrowseFilm[];
  tara: BrowseFilm[];
  ac: BrowseFilm[];
}

// ── Horizontal scroll row ─────────────────────────────────────────────────────
function BrowseRow({
  title,
  subtitle,
  films,
  loading,
  titleHref,
  visitUrl,
  ratings,
}: {
  title: string;
  subtitle: string;
  films: BrowseFilm[];
  loading: boolean;
  titleHref?: string;
  visitUrl?: string;
  ratings?: Record<number, FilmState>;
}) {
  const rowRef = useRef<HTMLDivElement>(null);

  if (loading) {
    return (
      <div className="mb-10">
        <div className="mb-3">
          {titleHref ? (
            <Link href={titleHref} className="text-lg font-bold hover:underline" style={{ color: "#fff" }}>{title} ↗</Link>
          ) : (
            <h2 className="text-lg font-bold">{title}</h2>
          )}
          <p className="text-xs" style={{ color: "#555" }}>{subtitle}</p>
        </div>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 rounded-lg animate-pulse"
              style={{ width: 130, aspectRatio: "2/3", background: "#1a1a1a" }}
            />
          ))}
        </div>
      </div>
    );
  }

  // Empty state — show theater link card
  if (!loading && films.length === 0 && visitUrl) {
    return (
      <div className="mb-10">
        <div className="mb-3">
          {titleHref ? (
            <Link href={titleHref} className="text-lg font-bold hover:underline" style={{ color: "#fff" }}>{title} ↗</Link>
          ) : (
            <h2 className="text-lg font-bold">{title}</h2>
          )}
          <p className="text-xs" style={{ color: "#555" }}>{subtitle}</p>
        </div>
        <a
          href={visitUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ background: "#1a1a1a", color: "#aaa", border: "1px solid #2a2a2a" }}
        >
          See what&apos;s playing ↗
        </a>
      </div>
    );
  }

  return (
    <div className="mb-10">
      <div className="mb-3 flex items-baseline gap-3">
        <div>
          {titleHref ? (
            <Link href={titleHref} className="text-lg font-bold hover:underline" style={{ color: "#fff" }}>
              {title} ↗
            </Link>
          ) : (
            <h2 className="text-lg font-bold">{title}</h2>
          )}
          <p className="text-xs" style={{ color: "#555" }}>{subtitle}</p>
        </div>
      </div>
      <div
        ref={rowRef}
        className="flex gap-3"
        style={{
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          paddingBottom: 4,
        }}
      >
        {films.map((film) => {
          const posterUrl = film.poster_path
            ? `https://image.tmdb.org/t/p/w342${film.poster_path}`
            : null;
          const year = film.release_date?.slice(0, 4);

          return (
            <div
              key={film.id}
              className="flex-shrink-0 flex flex-col"
              style={{ width: 130, scrollSnapAlign: "start" }}
            >
              <Link href={`/movie/${film.id}`} className="block group">
                <div
                  className="rounded-lg overflow-hidden relative transition-transform group-hover:scale-105"
                  style={{
                    aspectRatio: "2/3",
                    background: "#1a1a1a",
                    border: "1px solid #1e1e1e",
                  }}
                >
                  {posterUrl ? (
                    <Image
                      src={posterUrl}
                      alt={film.title}
                      fill
                      sizes="130px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-3xl">🎬</div>
                  )}
                  {film.vote_average != null && film.vote_average > 0 && (
                    <div
                      className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-xs font-bold"
                      style={{ background: "rgba(0,0,0,0.8)", color: "#f5c518" }}
                    >
                      {film.vote_average.toFixed(1)}
                    </div>
                  )}
                </div>
              </Link>
              <p className="mt-1.5 text-xs font-medium leading-tight line-clamp-2">{film.title}</p>
              {year && <p className="text-xs mb-1.5" style={{ color: "#555" }}>{year}</p>}
              <RatingWidget
                film={{
                  id: film.id,
                  title: film.title,
                  release_date: film.release_date,
                  poster_path: film.poster_path,
                  overview: film.overview,
                  vote_average: film.vote_average,
                }}
                compact
                initialState={ratings ? ratings[film.id] : undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── TMDB genre catalogue ──────────────────────────────────────────────────────
const GENRES = [
  { id: 28,    name: "Action",      emoji: "💥", color: "#c0392b" },
  { id: 12,    name: "Adventure",   emoji: "🗺️",  color: "#d35400" },
  { id: 16,    name: "Animation",   emoji: "✨",  color: "#8e44ad" },
  { id: 35,    name: "Comedy",      emoji: "😂",  color: "#b7950b" },
  { id: 80,    name: "Crime",       emoji: "🔪",  color: "#616a6b" },
  { id: 99,    name: "Documentary", emoji: "🎥",  color: "#1a5276" },
  { id: 18,    name: "Drama",       emoji: "🎭",  color: "#117a65" },
  { id: 10751, name: "Family",      emoji: "👨‍👩‍👧", color: "#1e8449" },
  { id: 14,    name: "Fantasy",     emoji: "🧙",  color: "#6c3483" },
  { id: 36,    name: "History",     emoji: "⚔️",  color: "#7d6608" },
  { id: 27,    name: "Horror",      emoji: "👻",  color: "#1c2833" },
  { id: 10402, name: "Music",       emoji: "🎵",  color: "#943126" },
  { id: 9648,  name: "Mystery",     emoji: "🔍",  color: "#1a3a5c" },
  { id: 10749, name: "Romance",     emoji: "💕",  color: "#a93226" },
  { id: 878,   name: "Sci-Fi",      emoji: "🚀",  color: "#154360" },
  { id: 53,    name: "Thriller",    emoji: "😰",  color: "#2c3e50" },
  { id: 10752, name: "War",         emoji: "🪖",  color: "#4a4a2e" },
  { id: 37,    name: "Western",     emoji: "🤠",  color: "#6e4c2a" },
] as const;

type GenreId = (typeof GENRES)[number]["id"];


interface DiscoverFilm {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
  vote_average: number;
  overview: string;
}


// ── Component ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [step, setStep] = useState<"genres" | "rate">("genres");
  const [selectedGenres, setSelectedGenres] = useState<GenreId[]>([]);
  const [films, setFilms] = useState<DiscoverFilm[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingFilms, setLoadingFilms] = useState(false);
  const [filmStates, setFilmStates] = useState<Record<number, FilmState>>({});
  const [ratingCount, setRatingCount] = useState(0);
  const [allRatings, setAllRatings] = useState<Record<number, FilmState>>({});
  const [genreImages, setGenreImages] = useState<Record<number, { backdrop: string | null; title: string | null }>>({});
  const [browseData, setBrowseData] = useState<BrowseData>({ theaters: [], digital: [], physical: [], recommended: [], newBeverly: [], tara: [], ac: [] });
  const [browseLoading, setBrowseLoading] = useState(true);
  const [directors, setDirectors] = useState<{ tmdbPersonId: number; name: string; profile_path: string | null }[]>([]);
  const [selectedDirectors, setSelectedDirectors] = useState<Set<number>>(new Set());
  const [browseMode, setBrowseMode] = useState<"all" | "blockbuster" | "arthouse" | "repertory">("all");

  const filterFilms = (films: BrowseFilm[]) => {
    if (browseMode === "blockbuster") {
      return films.filter((f) => (f.popularity ?? 0) >= 30 || (f.vote_count ?? 0) >= 1000);
    }
    if (browseMode === "arthouse") {
      return films.filter((f) => {
        const rating = f.vote_average ?? 0;
        const pop = f.popularity ?? 999;
        const lang = f.original_language ?? "en";
        if (lang !== "en" && rating >= 6.5) return true;
        return rating >= 7.5 && pop < 40;
      });
    }
    if (browseMode === "repertory") {
      return films.filter((f) => {
        const year = f.release_date ? parseInt(f.release_date.slice(0, 4)) : 9999;
        return year < 1990 && (f.vote_average ?? 0) >= 7.0;
      });
    }
    return films;
  };

  // Fetch all ratings in one batch call on mount
  useEffect(() => {
    fetch("/api/ratings")
      .then((r) => r.json())
      .then((d: Record<number, FilmState>) => {
        setAllRatings(d);
        const ratedCount = Object.values(d).filter((v) => v.stars != null).length;
        setRatingCount(ratedCount);
      })
      .catch(() => {});
  }, []);

  // Fetch browse rows + cached recommendations + label catalogs on mount
  useEffect(() => {
    Promise.all([
      fetch("/api/browse").then((r) => r.json()),
      fetch("/api/recommendations").then((r) => r.json()).catch(() => ({ recommendations: [] })),
      fetch("/api/newbeverly").then((r) => r.json()).catch(() => ({ films: [] })),
      fetch("/api/tara").then((r) => r.json()).catch(() => ({ films: [] })),
      fetch("/api/americancinematheque").then((r) => r.json()).catch(() => ({ films: [] })),
    ])
      .then(([browse, recs, newbev, tara, ac]) => {
        setBrowseData({
          ...browse,
          recommended: (recs.recommendations ?? []).slice(0, 20).map((r: BrowseFilm & { tmdb_id?: number }) => ({ ...r, id: r.tmdb_id ?? r.id })),
          newBeverly: (newbev.films ?? []).map((f: BrowseFilm & { tmdb_id?: number }) => ({ ...f, id: f.tmdb_id ?? f.id })),
          tara: (tara.films ?? []).map((f: BrowseFilm & { tmdb_id?: number }) => ({ ...f, id: f.tmdb_id ?? f.id })),
          ac: (ac.films ?? []).map((f: BrowseFilm & { tmdb_id?: number }) => ({ ...f, id: f.tmdb_id ?? f.id })),
        });
        setBrowseLoading(false);
      })
      .catch(() => setBrowseLoading(false));
  }, []);

  // Fetch directors + saved preferences on mount
  useEffect(() => {
    Promise.all([
      fetch("/api/directors").then((r) => r.json()),
      fetch("/api/director-prefs").then((r) => r.json()),
    ])
      .then(([dirData, prefsData]) => {
        setDirectors(dirData.directors ?? []);
        const saved = new Set<number>(
          (prefsData.directors ?? []).map((d: { tmdb_person_id: number }) => d.tmdb_person_id)
        );
        setSelectedDirectors(saved);
      })
      .catch(() => {});
  }, []);

  // Fetch genre backdrop images on mount
  useEffect(() => {
    fetch("/api/genre-images")
      .then((r) => r.json())
      .then((d: { images: { genreId: number; backdrop_path: string | null; title: string | null }[] }) => {
        const map: Record<number, { backdrop: string | null; title: string | null }> = {};
        for (const item of d.images) {
          map[item.genreId] = { backdrop: item.backdrop_path, title: item.title };
        }
        setGenreImages(map);
      })
      .catch(() => {});
  }, []);

  // ── Director picker ───────────────────────────────────────────────────────────

  const toggleDirector = (tmdbPersonId: number, name: string) => {
    const isSelected = selectedDirectors.has(tmdbPersonId);
    setSelectedDirectors((prev) => {
      const next = new Set(prev);
      if (isSelected) next.delete(tmdbPersonId);
      else next.add(tmdbPersonId);
      return next;
    });
    fetch("/api/director-prefs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tmdb_person_id: tmdbPersonId,
        name,
        action: isSelected ? "remove" : "add",
      }),
    }).catch(() => {});
  };

  // ── Genre picker ─────────────────────────────────────────────────────────────

  const toggleGenre = (id: GenreId) =>
    setSelectedGenres((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );

  const loadFilms = useCallback(async (genreIds: GenreId[], pageNum: number) => {
    setLoadingFilms(true);
    try {
      const params = new URLSearchParams({
        genres: genreIds.join("|"),
        page: String(pageNum),
      });
      const res = await fetch(`/api/discover?${params}`);
      const data = await res.json();
      const incoming: DiscoverFilm[] = data.results ?? [];
      setFilms((prev) => (pageNum === 1 ? incoming : [...prev, ...incoming]));
      setHasMore(incoming.length === 20 && pageNum < 10);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFilms(false);
    }
  }, []);

  const startRating = () => {
    if (!selectedGenres.length) return;
    setStep("rate");
    setFilms([]);
    setPage(1);
    setFilmStates({});
    loadFilms(selectedGenres, 1);
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    loadFilms(selectedGenres, next);
  };

  const posterUrl = (path: string | null) =>
    path ? `https://image.tmdb.org/t/p/w342${path}` : null;



  // ── Step 1 — Genre picker ────────────────────────────────────────────────────

  if (step === "genres") {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 pt-8">
          <div className="flex justify-center mb-4">
            <MascotSpeechBubble size={110} />
          </div>
          <div className="flex justify-center mb-3">
            <MovieClerkTitle />
          </div>
          <p style={{ color: "#aaa" }} className="text-lg">
            Tell us what you love — we&apos;ll find your next favourite film
          </p>
        </div>

        {/* ── Browse mode toggle ── */}
        <div className="flex justify-center mb-6">
          <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid #2a2a2a", background: "#111" }}>
            {(["all", "blockbuster", "arthouse", "repertory"] as const).map((mode) => {
              const labels = { all: "All Movies", blockbuster: "Blockbusters", arthouse: "Arthouse", repertory: "Repertory" };
              const active = browseMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setBrowseMode(mode)}
                  className="px-5 py-2 text-sm font-medium transition-colors"
                  style={{
                    background: active ? "#e50914" : "transparent",
                    color: active ? "#fff" : "#777",
                    borderRight: mode !== "repertory" ? "1px solid #2a2a2a" : "none",
                  }}
                >
                  {labels[mode]}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Browse rows ── */}
        {browseMode !== "repertory" && (
          <>
            <BrowseRow
              title="In Theaters"
              subtitle="Currently showing at cinemas"
              films={filterFilms(browseData.theaters)}
              loading={browseLoading}
              ratings={allRatings}
            />
            <BrowseRow
              title="New on Digital"
              subtitle="Recently released on streaming & VOD"
              films={filterFilms(browseData.digital)}
              loading={browseLoading}
              ratings={allRatings}
            />
            <BrowseRow
              title="New on 4K / Blu-Ray"
              subtitle="Latest releases on physical media"
              films={filterFilms(browseData.physical)}
              loading={browseLoading}
              ratings={allRatings}
            />
            {browseData.recommended.length > 0 && (
              <BrowseRow
                title="🎬 Movie Clerk Recommends"
                subtitle="Picked for you based on your taste"
                films={filterFilms(browseData.recommended)}
                loading={browseLoading}
                ratings={allRatings}
              />
            )}
          </>
        )}

        {/* ── Repertory rows ── */}
        {browseMode === "repertory" && (
          <>
            {browseData.newBeverly.length > 0 && (
              <BrowseRow
                title="The New Beverly Cinema"
                subtitle="Now playing at 7165 Beverly Blvd, Los Angeles"
                films={browseData.newBeverly}
                loading={browseLoading}
                titleHref="/newbeverly"
                ratings={allRatings}
              />
            )}
            <BrowseRow
              title="American Cinematheque"
              subtitle="Egyptian Theatre & Los Feliz 3, Los Angeles"
              films={browseData.ac}
              loading={browseLoading}
              titleHref="https://americancinematheque.com/now-showing/"
              visitUrl="https://americancinematheque.com/now-showing/"
              ratings={allRatings}
            />
            <BrowseRow
              title="Plaza Theatre"
              subtitle="1049 Ponce de Leon Ave NE, Atlanta, GA"
              films={[]}
              loading={false}
              titleHref="https://plazaatlanta.com"
              visitUrl="https://plazaatlanta.com"
            />
          </>
        )}

        {/* ── Arthouse rows ── */}
        {browseMode === "arthouse" && (
          <BrowseRow
            title="Tara Cinema"
            subtitle="2345 Cheshire Bridge Rd NE, Atlanta, GA"
            films={browseData.tara}
            loading={browseLoading}
            titleHref="https://taraatlanta.com/home"
            visitUrl="https://taraatlanta.com/home"
            ratings={allRatings}
          />
        )}

        {/* New Beverly also shown in non-repertory modes */}
        {browseMode !== "repertory" && browseData.newBeverly.length > 0 && (
          <BrowseRow
            title="The New Beverly Cinema"
            subtitle="Now playing at 7165 Beverly Blvd, Los Angeles"
            films={browseData.newBeverly}
            loading={browseLoading}
            titleHref="/newbeverly"
            ratings={allRatings}
          />
        )}

        {/* Divider */}
        <div className="mb-8" style={{ borderTop: "1px solid #1e1e1e" }} />

        {/* ── Genre picker ── */}
        {/* Returning user banner */}
        {ratingCount > 0 && (
          <div
            className="mb-6 p-4 rounded-xl flex items-center justify-between gap-4"
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
          >
            <p style={{ color: "#aaa" }} className="text-sm">
              You have{" "}
              <strong style={{ color: "#fff" }}>{ratingCount} rated films</strong> — ready
              for recommendations?
            </p>
            <Link
              href="/recommendations"
              className="px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-opacity hover:opacity-90"
              style={{ background: "#e50914", color: "#fff" }}
            >
              Get Recommendations →
            </Link>
          </div>
        )}

        <div
          className="rounded-2xl p-7"
          style={{ background: "#111", border: "1px solid #2a2a2a", maxWidth: "56rem", margin: "0 auto" }}
        >
          <h2 className="font-bold text-xl mb-1">Pick your favourite genres</h2>
          <p style={{ color: "#666" }} className="text-sm mb-7">
            Select as many as you like — we&apos;ll show you top-rated films to react to
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-8">
            {GENRES.map(({ id, name, color }) => {
              const on = selectedGenres.includes(id);
              const img = genreImages[id];
              const backdropUrl = img?.backdrop
                ? `https://image.tmdb.org/t/p/w500${img.backdrop}`
                : null;

              return (
                <button
                  key={id}
                  onClick={() => toggleGenre(id)}
                  className="flex flex-col items-stretch text-left transition-all"
                  style={{ background: "none", border: "none", padding: 0 }}
                >
                  {/* Image */}
                  <div
                    className="relative overflow-hidden rounded-xl"
                    style={{
                      aspectRatio: "16/9",
                      border: `2px solid ${on ? color : "#2a2a2a"}`,
                      boxShadow: on ? `0 0 12px ${color}66` : "none",
                      background: color + "22",
                      transition: "border-color 0.15s, box-shadow 0.15s",
                    }}
                  >
                    {backdropUrl ? (
                      <Image
                        src={backdropUrl}
                        alt={name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                        className="object-cover"
                        style={{ opacity: on ? 1 : 0.7, transition: "opacity 0.15s" }}
                      />
                    ) : (
                      <div className="absolute inset-0" style={{ background: color + "33" }} />
                    )}

                    {/* Colour tint overlay when selected */}
                    {on && (
                      <div
                        className="absolute inset-0"
                        style={{ background: `${color}33`, transition: "opacity 0.15s" }}
                      />
                    )}

                    {/* Checkmark badge */}
                    {on && (
                      <div
                        className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-lg"
                        style={{ background: color, color: "#fff" }}
                      >
                        ✓
                      </div>
                    )}
                  </div>

                  {/* Genre name below */}
                  <p
                    className="mt-1.5 text-sm font-semibold px-0.5"
                    style={{ color: on ? "#fff" : "#888", transition: "color 0.15s" }}
                  >
                    {name}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <p
              style={{ color: selectedGenres.length > 0 ? "#888" : "#444" }}
              className="text-sm"
            >
              {selectedGenres.length === 0
                ? "Select at least one genre to continue"
                : `${selectedGenres.length} genre${selectedGenres.length !== 1 ? "s" : ""} selected`}
            </p>
            <button
              onClick={startRating}
              disabled={selectedGenres.length === 0}
              className="px-6 py-3 rounded-xl font-semibold text-sm disabled:opacity-25 transition-opacity hover:opacity-90"
              style={{ background: "#e50914", color: "#fff" }}
            >
              Find Films →
            </button>
          </div>
        </div>

        {/* ── Director picker ── */}
        <div
          className="rounded-2xl p-7 mt-4"
          style={{ background: "#111", border: "1px solid #2a2a2a", maxWidth: "56rem", margin: "1rem auto 0" }}
        >
          <h2 className="font-bold text-xl mb-1">Favourite directors</h2>
          <p style={{ color: "#666" }} className="text-sm mb-6">
            Select directors whose films you enjoy — we&apos;ll boost their work in your recommendations
          </p>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {directors.map(({ tmdbPersonId, name, profile_path }) => {
              const on = selectedDirectors.has(tmdbPersonId);
              const photoUrl = profile_path
                ? `https://image.tmdb.org/t/p/w185${profile_path}`
                : null;

              return (
                <button
                  key={tmdbPersonId}
                  onClick={() => toggleDirector(tmdbPersonId, name)}
                  className="flex flex-col items-center gap-2 transition-all"
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
                >
                  <div
                    className="relative overflow-hidden rounded-full w-full"
                    style={{
                      aspectRatio: "1/1",
                      border: `3px solid ${on ? "#e50914" : "#2a2a2a"}`,
                      boxShadow: on ? "0 0 14px rgba(229,9,20,0.5)" : "none",
                      background: "#1a1a1a",
                      transition: "border-color 0.15s, box-shadow 0.15s",
                    }}
                  >
                    {photoUrl ? (
                      <Image
                        src={photoUrl}
                        alt={name}
                        fill
                        sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 17vw"
                        className="object-cover"
                        style={{ opacity: on ? 1 : 0.65, transition: "opacity 0.15s" }}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-2xl">🎬</div>
                    )}
                    {on && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-full"
                        style={{ background: "rgba(229,9,20,0.25)" }}>
                        <span className="text-white text-lg font-bold">✓</span>
                      </div>
                    )}
                  </div>
                  <p
                    className="text-xs font-medium text-center leading-tight"
                    style={{ color: on ? "#fff" : "#777", transition: "color 0.15s" }}
                  >
                    {name}
                  </p>
                </button>
              );
            })}
          </div>

          {selectedDirectors.size > 0 && (
            <p className="mt-5 text-xs" style={{ color: "#555" }}>
              {selectedDirectors.size} director{selectedDirectors.size !== 1 ? "s" : ""} selected — their films will be prioritised in recommendations
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Step 2 — Rate films ──────────────────────────────────────────────────────

  const canGetRecs = ratingCount >= 5;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-4 py-4 mb-2">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setStep("genres")}
            className="text-sm transition-colors hover:text-white flex-shrink-0"
            style={{ color: "#555" }}
          >
            ← Genres
          </button>
          <div className="flex flex-wrap gap-1.5 min-w-0">
            {selectedGenres.map((id) => {
              const g = GENRES.find((x) => x.id === id);
              return g ? (
                <span
                  key={id}
                  className="text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap"
                  style={{
                    background: g.color + "28",
                    color: "#ccc",
                    border: `1px solid ${g.color}55`,
                  }}
                >
                  {g.emoji} {g.name}
                </span>
              ) : null;
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {ratingCount > 0 && (
            <span style={{ color: "#555" }} className="text-sm whitespace-nowrap">
              {ratingCount} rated
            </span>
          )}
          <Link
            href="/recommendations"
            onClick={(e) => !canGetRecs && e.preventDefault()}
            className="px-5 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-opacity"
            style={{
              background: canGetRecs ? "#e50914" : "#222",
              color: canGetRecs ? "#fff" : "#444",
              cursor: canGetRecs ? "pointer" : "default",
            }}
          >
            Recommendations →
          </Link>
        </div>
      </div>

      {/* Progress hint */}
      <p className="text-center text-xs mb-6" style={{ color: "#444" }}>
        {!canGetRecs
          ? `Rate ${5 - ratingCount} more film${5 - ratingCount !== 1 ? "s" : ""} to unlock recommendations`
          : "Keep rating to improve accuracy, or get your recommendations now"}
      </p>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mb-6 text-xs" style={{ color: "#555" }}>
        <span>👍 Liked &nbsp; 👎 Didn&apos;t like &nbsp; 🔖 Want to watch</span>
        <span style={{ color: "#3a3a3a" }}>|</span>
        <span style={{ color: "#f5c518" }}>★</span>
        <span>Add stars to refine recommendations</span>
      </div>

      {/* Film grid */}
      {loadingFilms && films.length === 0 ? (
        <div className="flex items-center justify-center py-32">
          <div
            className="w-10 h-10 rounded-full border-4 animate-spin"
            style={{ borderColor: "#222", borderTopColor: "#e50914" }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {films.map((film) => {
            const state = filmStates[film.id];
            const stars = state?.stars;
            const watchlist = state?.watchlist;
            const url = posterUrl(film.poster_path);
            const year = film.release_date?.slice(0, 4) ?? "";

            const borderColor = stars != null
              ? "#4caf50"
              : watchlist
              ? "#2196f3"
              : "#1e1e1e";

            return (
              <div key={film.id} className="flex flex-col">
                {/* Poster */}
                <Link href={`/movie/${film.id}`} className="block group">
                <div
                  className="rounded-lg overflow-hidden relative flex-shrink-0"
                  style={{
                    aspectRatio: "2/3",
                    border: `2px solid ${borderColor}`,
                    background: "#1a1a1a",
                    transition: "border-color 0.12s",
                  }}
                >
                  {url ? (
                    <Image
                      src={url}
                      alt={film.title}
                      fill
                      sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 17vw"
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-3xl">
                      🎬
                    </div>
                  )}
                  {/* Badge */}
                  {watchlist && (
                    <div
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-lg"
                      style={{ background: "#2196f3" }}
                    >
                      🔖
                    </div>
                  )}
                  {/* Star badge overlay when starred */}
                  {stars && (
                    <div
                      className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-xs font-bold shadow"
                      style={{ background: "rgba(0,0,0,0.75)", color: "#f5c518" }}
                    >
                      {stars % 1 === 0 ? stars : stars.toFixed(1)}★
                    </div>
                  )}
                </div>
                </Link>

                {/* Title */}
                <div className="mt-1.5 mb-1 px-0.5">
                  <p className="text-xs font-medium leading-tight line-clamp-2">{film.title}</p>
                  <p className="text-xs" style={{ color: "#555" }}>{year}</p>
                </div>

                {/* Rating */}
                <RatingWidget
                  film={{
                    id: film.id,
                    title: film.title,
                    release_date: film.release_date,
                    poster_path: film.poster_path,
                    overview: film.overview,
                    vote_average: film.vote_average,
                  }}
                  compact
                  initialState={state}
                  onRated={(next) => {
                    if (!next) {
                      const wasRated = stars != null;
                      setFilmStates((prev) => { const n = { ...prev }; delete n[film.id]; return n; });
                      setAllRatings((prev) => { const n = { ...prev }; delete n[film.id]; return n; });
                      if (wasRated) setRatingCount((c) => Math.max(0, c - 1));
                    } else {
                      const wasRated = stars != null;
                      setFilmStates((prev) => ({ ...prev, [film.id]: next }));
                      setAllRatings((prev) => ({ ...prev, [film.id]: next }));
                      if (!wasRated && next.stars != null) setRatingCount((c) => c + 1);
                      if (wasRated && next.watchlist) setRatingCount((c) => Math.max(0, c - 1));
                    }
                  }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Load more */}
      {films.length > 0 && (
        <div className="text-center mt-10">
          {hasMore ? (
            <button
              onClick={loadMore}
              disabled={loadingFilms}
              className="px-8 py-3 rounded-xl text-sm font-medium transition-opacity disabled:opacity-50 hover:opacity-80"
              style={{ background: "#1a1a1a", color: "#888", border: "1px solid #2a2a2a" }}
            >
              {loadingFilms ? "Loading…" : "Load more films"}
            </button>
          ) : (
            <p style={{ color: "#333" }} className="text-sm">All films shown</p>
          )}
        </div>
      )}

      {/* Sticky bottom CTA once unlocked */}
      {canGetRecs && (
        <div
          className="sticky bottom-4 mt-8 p-4 rounded-2xl flex items-center justify-between gap-4 shadow-2xl"
          style={{ background: "#0f1a0f", border: "1px solid #2a4a2a" }}
        >
          <p className="text-sm font-medium" style={{ color: "#4caf50" }}>
            ✓ {ratingCount} film{ratingCount !== 1 ? "s" : ""} rated
          </p>
          <Link
            href="/recommendations"
            className="px-6 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
            style={{ background: "#e50914", color: "#fff" }}
          >
            Get My Recommendations →
          </Link>
        </div>
      )}
    </div>
  );
}
