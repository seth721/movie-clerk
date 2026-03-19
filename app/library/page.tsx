"use client";

import { useState, useEffect } from "react";
import VhsShelf from "@/components/VhsShelf";
import Link from "next/link";

interface RatingRow {
  tmdb_id: number;
  title: string;
  year: number | null;
  poster_path: string | null;
  genres: string[];
  rating: number;
  watched_date: string | null;
}

type SortKey = "rating_desc" | "rating_asc" | "date_desc" | "title_asc";

export default function LibraryPage() {
  const [movies, setMovies] = useState<RatingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>("rating_desc");
  const [search, setSearch] = useState("");
  const [genreFilter, setGenreFilter] = useState("");

  useEffect(() => {
    fetch("/api/library")
      .then((r) => r.json())
      .then((d) => {
        setMovies(d.ratings ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Derive genre list
  const allGenres = Array.from(
    new Set(movies.flatMap((m) => m.genres ?? []))
  ).sort();

  // Filter + sort
  const filtered = movies
    .filter((m) => {
      const matchSearch = !search || m.title.toLowerCase().includes(search.toLowerCase());
      const matchGenre = !genreFilter || (m.genres ?? []).includes(genreFilter);
      return matchSearch && matchGenre;
    })
    .sort((a, b) => {
      switch (sort) {
        case "rating_desc": return b.rating - a.rating;
        case "rating_asc":  return a.rating - b.rating;
        case "date_desc":
          return (b.watched_date ?? "").localeCompare(a.watched_date ?? "");
        case "title_asc":   return a.title.localeCompare(b.title);
      }
    });

  // Rating distribution
  const dist = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5].map((r) => ({
    rating: r,
    count: movies.filter((m) => m.rating === r).length,
  }));
  const maxCount = Math.max(...dist.map((d) => d.count), 1);

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

  if (movies.length === 0) {
    return (
      <div className="text-center py-24">
        <p className="text-5xl mb-4">🎬</p>
        <h2 className="text-xl font-semibold mb-2">No films yet</h2>
        <p style={{ color: "#666" }} className="mb-6">
          Head to Discover, pick some genres, and rate films you&apos;ve seen
        </p>
        <Link
          href="/"
          className="px-6 py-3 rounded-lg font-semibold"
          style={{ background: "#e50914", color: "#fff" }}
        >
          Start Discovering
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Library</h1>
          <p style={{ color: "#666" }} className="mt-1">
            {movies.length} films rated
          </p>
        </div>
        <Link
          href="/recommendations"
          className="px-5 py-2.5 rounded-lg font-semibold text-sm"
          style={{ background: "#e50914", color: "#fff" }}
        >
          Get Recommendations →
        </Link>
      </div>

      {/* Rating distribution */}
      <div
        className="rounded-xl p-5 mb-8"
        style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
      >
        <p className="font-semibold mb-4 text-sm" style={{ color: "#aaa" }}>
          Rating Distribution
        </p>
        <div className="flex items-end gap-1.5 h-16">
          {dist.map(({ rating, count }) => (
            <div key={rating} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-sm transition-all"
                style={{
                  height: `${(count / maxCount) * 52}px`,
                  background: count > 0 ? "#e50914" : "#2a2a2a",
                  minHeight: count > 0 ? 4 : 2,
                  opacity: count > 0 ? 1 : 0.3,
                }}
                title={`${rating}★: ${count} films`}
              />
              <span style={{ color: "#444", fontSize: 10 }}>{rating}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <input
          type="text"
          placeholder="Search films…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-48 px-4 py-2 rounded-lg text-sm outline-none"
          style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#fff" }}
        />
        <select
          value={genreFilter}
          onChange={(e) => setGenreFilter(e.target.value)}
          className="px-4 py-2 rounded-lg text-sm outline-none"
          style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#fff" }}
        >
          <option value="">All genres</option>
          {allGenres.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="px-4 py-2 rounded-lg text-sm outline-none"
          style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#fff" }}
        >
          <option value="rating_desc">Rating ↓</option>
          <option value="rating_asc">Rating ↑</option>
          <option value="date_desc">Date watched ↓</option>
          <option value="title_asc">Title A–Z</option>
        </select>
      </div>

      <p style={{ color: "#555" }} className="text-sm mb-4">
        {filtered.length} film{filtered.length !== 1 ? "s" : ""}
      </p>

      {/* VHS Shelf */}
      <VhsShelf movies={filtered} />
    </div>
  );
}
