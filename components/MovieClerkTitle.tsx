"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const STYLES = [
  {
    movie: "Pulp Fiction", year: "1994", tmdbId: 680,
    fontFamily: "'Bebas Neue', sans-serif",
    fontWeight: 400, fontStyle: "normal",
    letterSpacing: "0.12em", textTransform: "uppercase" as const,
    movieColor: "#e8c840", clerkColor: "#fff",
  },
  {
    movie: "Casablanca", year: "1942", tmdbId: 289,
    fontFamily: "'Cinzel', serif",
    fontWeight: 900, fontStyle: "normal",
    letterSpacing: "0.1em", textTransform: "uppercase" as const,
    movieColor: "#d4af37", clerkColor: "#f0e6c8",
  },
  {
    movie: "Taxi Driver", year: "1976", tmdbId: 103,
    fontFamily: "'Special Elite', cursive",
    fontWeight: 400, fontStyle: "normal",
    letterSpacing: "0.04em", textTransform: "none" as const,
    movieColor: "#ff4444", clerkColor: "#ddd",
  },
  {
    movie: "Raging Bull", year: "1980", tmdbId: 8204,
    fontFamily: "'Oswald', sans-serif",
    fontWeight: 700, fontStyle: "italic",
    letterSpacing: "0.06em", textTransform: "uppercase" as const,
    movieColor: "#fff", clerkColor: "#ccc",
  },
  {
    movie: "Jackie Brown", year: "1997", tmdbId: 6023,
    fontFamily: "'Alfa Slab One', serif",
    fontWeight: 400, fontStyle: "normal",
    letterSpacing: "0.02em", textTransform: "none" as const,
    movieColor: "#f97316", clerkColor: "#fbbf24",
  },
  {
    movie: "Clerks", year: "1994", tmdbId: 3175,
    fontFamily: "'Permanent Marker', cursive",
    fontWeight: 400, fontStyle: "normal",
    letterSpacing: "0.02em", textTransform: "none" as const,
    movieColor: "#fff", clerkColor: "#ccc",
  },
  {
    movie: "The Godfather", year: "1972", tmdbId: 238,
    fontFamily: "'IM Fell English SC', serif",
    fontWeight: 400, fontStyle: "italic",
    letterSpacing: "0.05em", textTransform: "none" as const,
    movieColor: "#d4af37", clerkColor: "#c8b89a",
  },
  {
    movie: "Goodfellas", year: "1990", tmdbId: 769,
    fontFamily: "'Libre Baskerville', serif",
    fontWeight: 700, fontStyle: "italic",
    letterSpacing: "0.03em", textTransform: "none" as const,
    movieColor: "#e50914", clerkColor: "#fff",
  },
  {
    movie: "Blade Runner", year: "1982", tmdbId: 78,
    fontFamily: "'Orbitron', sans-serif",
    fontWeight: 900, fontStyle: "normal",
    letterSpacing: "0.15em", textTransform: "uppercase" as const,
    movieColor: "#00d4ff", clerkColor: "#a78bfa",
  },
  {
    movie: "Apocalypse Now", year: "1979", tmdbId: 28,
    fontFamily: "'Rubik Dirt', cursive",
    fontWeight: 400, fontStyle: "normal",
    letterSpacing: "0.04em", textTransform: "none" as const,
    movieColor: "#f97316", clerkColor: "#fde68a",
  },
  {
    movie: "Tron", year: "1982", tmdbId: 2062,
    fontFamily: "'Monoton', cursive",
    fontWeight: 400, fontStyle: "normal",
    letterSpacing: "0.1em", textTransform: "uppercase" as const,
    movieColor: "#22d3ee", clerkColor: "#6ee7f7",
  },
  {
    movie: "Boogie Nights", year: "1997", tmdbId: 4011,
    fontFamily: "'Boogaloo', cursive",
    fontWeight: 400, fontStyle: "normal",
    letterSpacing: "0.05em", textTransform: "none" as const,
    movieColor: "#fb923c", clerkColor: "#fcd34d",
  },
];

export default function MovieClerkTitle() {
  const [style, setStyle] = useState(STYLES[0]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const picked = STYLES[Math.floor(Math.random() * STYLES.length)];
    setVisible(false);
    const t = setTimeout(() => {
      setStyle(picked);
      setVisible(true);
    }, 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative inline-block">
      <Link href={`/movie/${style.tmdbId}`} style={{ textDecoration: "none" }}>
        <h1
          className="text-5xl md:text-7xl leading-none transition-opacity duration-300 cursor-pointer"
          style={{
            fontFamily: style.fontFamily,
            fontWeight: style.fontWeight,
            fontStyle: style.fontStyle,
            letterSpacing: style.letterSpacing,
            textTransform: style.textTransform,
            opacity: visible ? 1 : 0,
          }}
        >
          <span style={{ color: style.movieColor }}>Movie</span>
          {" "}
          <span style={{ color: style.clerkColor }}>Clerk</span>
        </h1>
      </Link>
    </div>
  );
}
