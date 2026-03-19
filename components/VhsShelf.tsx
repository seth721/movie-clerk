"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

interface Movie {
  tmdb_id: number;
  title: string;
  year: number | null;
  poster_path: string | null;
  rating: number;
}

// Each tape gets a unique label palette (header colour + label bg + text colour)
const PALETTES = [
  { header: "#c0001a", label: "#f5f0e8", text: "#1a1a1a", stripe: "#e8002a" }, // classic red
  { header: "#00338a", label: "#e8f0f8", text: "#1a1a1a", stripe: "#0044bb" }, // studio blue
  { header: "#1a6b00", label: "#eaf5e8", text: "#1a1a1a", stripe: "#228800" }, // green
  { header: "#7a4400", label: "#f8f0e0", text: "#1a1a1a", stripe: "#a05800" }, // orange/brown
  { header: "#4a0080", label: "#f0e8f8", text: "#1a1a1a", stripe: "#6600aa" }, // purple
  { header: "#007a7a", label: "#e0f5f5", text: "#1a1a1a", stripe: "#009999" }, // teal
  { header: "#2a2a2a", label: "#f0f0f0", text: "#1a1a1a", stripe: "#444"    }, // b&w
  { header: "#8a6800", label: "#faf5e0", text: "#1a1a1a", stripe: "#b88800" }, // gold
  { header: "#8a0050", label: "#f8e8f0", text: "#1a1a1a", stripe: "#bb0066" }, // magenta
  { header: "#003a6b", label: "#e8f0f8", text: "#1a1a1a", stripe: "#005090" }, // navy
];

function getPalette(title: string) {
  let h = 0;
  for (const c of title) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return PALETTES[h % PALETTES.length];
}

// ── Hover wrapper — spine sits on shelf, front cover floats up on hover ───────
function VhsTape({ movie, logoPath }: { movie: Movie; logoPath?: string | null }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        position: "relative",
        width: 52,
        height: 210,
        flexShrink: 0,
        // Elevate this stacking context above siblings so the popup clears them
        zIndex: hovered ? 100 : 1,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Spine — stays on shelf, dims slightly when front cover is showing */}
      <div style={{
        opacity: hovered ? 0.5 : 1,
        transform: hovered ? "translateY(6px)" : "translateY(0)",
        transition: "opacity 0.2s, transform 0.25s cubic-bezier(0.2,0,0,1)",
      }}>
        <VhsSpine movie={movie} logoPath={logoPath} />
      </div>

      {/* Front cover — rises up out of the shelf slot on hover */}
      <div style={{
        position: "absolute",
        // Sit just above the top of the spine, centered horizontally
        bottom: "102%",
        left: "50%",
        transform: hovered
          ? "translateX(-50%) translateY(0) scale(1)"
          : "translateX(-50%) translateY(24px) scale(0.92)",
        opacity: hovered ? 1 : 0,
        transition: "opacity 0.22s, transform 0.28s cubic-bezier(0.2,0,0,1)",
        pointerEvents: hovered ? "auto" : "none",
        filter: "drop-shadow(0 12px 32px rgba(0,0,0,0.9))",
      }}>
        <VhsFront movie={movie} />
      </div>
    </div>
  );
}

// ── Spine ─────────────────────────────────────────────────────────────────────
function VhsSpine({ movie, logoPath }: { movie: Movie; logoPath?: string | null }) {
  const p = getPalette(movie.title);
  const logoUrl = logoPath
    ? `https://image.tmdb.org/t/p/w300${logoPath}`
    : null;

  return (
    <Link
      href={`/movie/${movie.tmdb_id}`}
      title={`${movie.title}${movie.year ? ` (${movie.year})` : ""} · ${movie.rating}★`}
    >
      <div
        className="relative"
        style={{ width: 52, height: 210 }}
      >
        {/* Outer plastic casing */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to right, #111 0%, #222 30%, #1c1c1c 70%, #0e0e0e 100%)",
            border: "1px solid #3a3a3a",
            borderRadius: 3,
            boxShadow: "2px 3px 10px rgba(0,0,0,0.8), inset -2px 0 4px rgba(0,0,0,0.5)",
          }}
        />

        {/* Plastic ridge lines top & bottom */}
        <div className="absolute left-0 right-0" style={{ top: 5, height: 2, background: "rgba(255,255,255,0.04)", borderRadius: 1 }} />
        <div className="absolute left-0 right-0" style={{ top: 8, height: 1, background: "rgba(255,255,255,0.02)" }} />
        <div className="absolute left-0 right-0" style={{ bottom: 5, height: 2, background: "rgba(255,255,255,0.04)", borderRadius: 1 }} />
        <div className="absolute left-0 right-0" style={{ bottom: 8, height: 1, background: "rgba(255,255,255,0.02)" }} />

        {/* Label — inset from the casing edges */}
        <div
          className="absolute overflow-hidden"
          style={{
            top: 12, bottom: 12, left: 6, right: 6,
            background: p.label,
            borderRadius: 2,
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.15)",
          }}
        >
          {/* Coloured header band at top of label */}
          <div
            style={{
              position: "absolute",
              top: 0, left: 0, right: 0,
              height: 28,
              background: `linear-gradient(to bottom, ${p.stripe}, ${p.header})`,
            }}
          />

          {/* Thin accent line below header */}
          <div style={{ position: "absolute", top: 28, left: 0, right: 0, height: 2, background: p.header, opacity: 0.4 }} />

          {/* Movie title — logo image or text fallback, rotated bottom-to-top */}
          <div
            style={{
              position: "absolute",
              top: 34, bottom: 22, left: 0, right: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              // Establish a clipping stacking context so transforms can't escape
              overflow: "hidden",
              isolation: "isolate",
            }}
          >
            {logoUrl ? (
              /*
               * KEY: size the WRAPPER to the POST-ROTATION visual dimensions
               * (30px wide × 120px tall) so it occupies the right layout space.
               * The <img> inside is absolutely centred at its natural size
               * (120×30) then rotated -90deg — visually 30×120, contained.
               */
              <div style={{
                position: "relative",
                width: 30,
                height: 120,
                flexShrink: 0,
                overflow: "hidden",
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt={movie.title}
                  style={{
                    position: "absolute",
                    width: 120,
                    height: 30,
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%) rotate(-90deg)",
                    objectFit: "contain",
                    filter: "brightness(0) saturate(100%)",
                    opacity: 0.85,
                  }}
                />
              </div>
            ) : (
              <span
                style={{
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                  // Scale font size down for longer titles so they fit the spine
                  fontSize: movie.title.length <= 12 ? 11
                          : movie.title.length <= 20 ? 9
                          : movie.title.length <= 28 ? 7.5
                          : 6,
                  fontWeight: 900,
                  color: p.text,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  lineHeight: 1.15,
                  fontFamily: "'Arial Black', 'Arial', sans-serif",
                  // Hard-clip to the available height (130px body − a little padding)
                  maxHeight: 120,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                }}
              >
                {movie.title}
              </span>
            )}
          </div>

          {/* Year at bottom of label */}
          {movie.year && (
            <div
              style={{
                position: "absolute",
                bottom: 3, left: 0, right: 0,
                textAlign: "center",
                fontSize: 8,
                fontWeight: 700,
                color: p.text,
                opacity: 0.55,
                letterSpacing: "0.04em",
              }}
            >
              {movie.year}
            </div>
          )}
        </div>

        {/* Rating stars — on the plastic casing below label */}
        <div
          className="absolute left-0 right-0 flex justify-center"
          style={{ bottom: 3 }}
        >
          <span style={{ fontSize: 7, color: movie.rating >= 4 ? "#f5c518" : "#555", letterSpacing: 1 }}>
            {"★".repeat(Math.round(movie.rating))}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── Front-facing tape ─────────────────────────────────────────────────────────
function VhsFront({ movie }: { movie: Movie }) {
  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w185${movie.poster_path}`
    : null;
  const p = getPalette(movie.title);

  return (
    <Link
      href={`/movie/${movie.tmdb_id}`}
      title={`${movie.title}${movie.year ? ` (${movie.year})` : ""} · ${movie.rating}★`}
    >
      <div
        className="relative"
        style={{ width: 118, height: 210 }}
      >
        {/* Outer VHS casing */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            background: "#111",
            border: "1px solid #484848",
            borderRadius: 3,
            boxShadow: "4px 4px 14px rgba(0,0,0,0.9), inset 0 0 0 1px rgba(255,255,255,0.05)",
          }}
        >
          {/* Poster (top 78%) */}
          <div className="relative" style={{ height: "78%" }}>
            {posterUrl ? (
              <Image src={posterUrl} alt={movie.title} fill className="object-cover" sizes="118px" />
            ) : (
              <div
                className="w-full h-full flex items-end justify-start p-2"
                style={{ background: `linear-gradient(135deg, ${p.header}, #111)` }}
              >
                <span style={{ color: "#fff", fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1.2 }}>
                  {movie.title}
                </span>
              </div>
            )}
            {/* Rating badge */}
            <div
              className="absolute top-2 right-2 px-1.5 py-0.5 rounded font-bold"
              style={{ background: "rgba(0,0,0,0.85)", color: "#f5c518", fontSize: 10, backdropFilter: "blur(4px)" }}
            >
              {movie.rating}★
            </div>
          </div>

          {/* Cassette housing — bottom 22% */}
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{ height: "22%", background: "#0d0d0d", borderTop: "2px solid #2a2a2a" }}
          >
            {/* Plastic ridges */}
            <div style={{ position: "absolute", top: 4, left: 6, right: 6, height: 1, background: "rgba(255,255,255,0.06)", borderRadius: 1 }} />

            {/* Cassette window */}
            <div
              style={{
                position: "absolute",
                top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                width: 68, height: 18,
                borderRadius: 9,
                border: "1.5px solid #3a3a3a",
                background: "#080808",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-around",
                padding: "0 12px",
              }}
            >
              {/* Left reel */}
              <div style={{ position: "relative", width: 10, height: 10 }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1.5px solid #4a4a4a", background: "#111" }} />
                <div style={{ position: "absolute", inset: 3, borderRadius: "50%", background: "#3a3a3a" }} />
              </div>
              {/* Tape bridge */}
              <div style={{ flex: 1, height: 2, background: "#2a2a2a", margin: "0 2px" }} />
              {/* Right reel */}
              <div style={{ position: "relative", width: 10, height: 10 }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1.5px solid #4a4a4a", background: "#111" }} />
                <div style={{ position: "absolute", inset: 3, borderRadius: "50%", background: "#3a3a3a" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Shelf board ───────────────────────────────────────────────────────────────
function ShelfBoard() {
  return (
    <div style={{
      height: 20,
      background: "linear-gradient(to bottom, #8b6035 0%, #6b4820 50%, #4a3015 100%)",
      borderTop: "2px solid #a87848",
      borderBottom: "3px solid #281808",
      boxShadow: "0 8px 20px rgba(0,0,0,0.8)",
      position: "relative",
    }}>
      {/* Wood grain hint */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(0,0,0,0.04) 40px, rgba(0,0,0,0.04) 42px)", opacity: 0.5 }} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
const SHELF_SIZE = 16;

export default function VhsShelf({ movies }: { movies: Movie[] }) {
  const [facingOut, setFacingOut] = useState<Set<number>>(new Set());
  const [logos, setLogos] = useState<Record<number, string | null>>({});

  // Randomly decide which tapes face out (changes on each page load)
  useEffect(() => {
    const next = new Set<number>();
    for (const m of movies) {
      if (Math.random() < 0.16) next.add(m.tmdb_id);
    }
    setFacingOut(next);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch logos for all movies
  useEffect(() => {
    if (!movies.length) return;
    const ids = movies.map((m) => m.tmdb_id).join(",");
    fetch(`/api/movie-logos?ids=${ids}`)
      .then((r) => r.json())
      .then((data: Record<string, string | null>) => {
        // Keys come back as strings from JSON
        const mapped: Record<number, string | null> = {};
        for (const [k, v] of Object.entries(data)) {
          mapped[Number(k)] = v;
        }
        setLogos(mapped);
      })
      .catch(() => {/* silently degrade to text */});
  }, [movies]);

  if (!movies.length) return null;

  const shelves: Movie[][] = [];
  for (let i = 0; i < movies.length; i += SHELF_SIZE) {
    shelves.push(movies.slice(i, i + SHELF_SIZE));
  }

  return (
    <div style={{ borderRadius: 6 }}>
      {shelves.map((shelf, si) => (
        <div key={si} className="mb-3">
          <div
            className="flex items-end gap-0.5 px-4 pt-4"
            style={{
              background: "linear-gradient(to bottom, #080808 0%, #0f0f0f 100%)",
              minHeight: 240,
              overflow: "visible",
            }}
          >
            {shelf.map((movie) =>
              facingOut.has(movie.tmdb_id)
                ? <VhsFront key={movie.tmdb_id} movie={movie} />
                : <VhsTape key={movie.tmdb_id} movie={movie} logoPath={logos[movie.tmdb_id]} />
            )}
          </div>
          <ShelfBoard />
        </div>
      ))}
    </div>
  );
}
