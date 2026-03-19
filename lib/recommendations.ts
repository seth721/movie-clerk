import { TasteProfile } from "@/types";

interface RatedMovieRow {
  tmdb_id: number;
  title: string;
  year?: number | null;
  rating: number;
  rewatch?: number | null; // 1 = rewatch, 0/null = first watch
  genres: string[];
  cast: string[];
  director: string | null;
  keywords: string[];
  vote_count?: number | null;
  runtime?: number | null;
  original_language?: string | null;
}

/**
 * Build a weighted taste profile from a user's rated films.
 * Ratings are shifted by 2.5 so 5★ = +2.5, 2.5★ = 0, 0.5★ = -2.0
 */
export function buildTasteProfile(
  ratings: RatedMovieRow[],
  preferredDirectors: { name: string }[] = [],
  preferredActors: { name: string }[] = []
): TasteProfile {
  const genres: Record<string, number> = {};
  const directors: Record<string, number> = {};
  const actors: Record<string, number> = {};
  const keywords: Record<string, number> = {};

  const MIDPOINT = 2.5;

  for (const movie of ratings) {
    // Rewatches signal deeper love — amplify their weight
    const rewatchMultiplier = movie.rewatch ? 1.5 : 1.0;
    const weight = (movie.rating - MIDPOINT) * rewatchMultiplier;

    for (const g of movie.genres) {
      genres[g] = (genres[g] ?? 0) + weight;
    }
    if (movie.director) {
      directors[movie.director] = (directors[movie.director] ?? 0) + weight * 1.5;
    }
    for (const a of movie.cast) {
      actors[a] = (actors[a] ?? 0) + weight;
    }
    for (const k of movie.keywords) {
      keywords[k] = (keywords[k] ?? 0) + weight * 0.5;
    }
  }

  // Explicitly preferred directors get a strong fixed boost
  for (const { name } of preferredDirectors) {
    directors[name] = (directors[name] ?? 0) + 4.0;
  }
  // Explicitly preferred actors get a strong fixed boost
  for (const { name } of preferredActors) {
    actors[name] = (actors[name] ?? 0) + 3.0;
  }

  // ── Decade affinity ──────────────────────────────────────────────────────
  // Average sentiment per decade (not sum), so a user with 30 films from the
  // 2000s doesn't automatically "love" that era more than one with 5 films.
  const decadeBuckets: Record<string, { total: number; count: number }> = {};
  for (const movie of ratings) {
    if (movie.year) {
      const decade = `${Math.floor(movie.year / 10) * 10}s`;
      if (!decadeBuckets[decade]) decadeBuckets[decade] = { total: 0, count: 0 };
      decadeBuckets[decade].total += movie.rating - MIDPOINT;
      decadeBuckets[decade].count += 1;
    }
  }
  const decades: Record<string, number> = {};
  for (const [d, { total, count }] of Object.entries(decadeBuckets)) {
    // Only include decades with ≥3 films to avoid noise
    if (count >= 3) decades[d] = total / count;
  }

  // ── Mainstream calibration ───────────────────────────────────────────────
  const lovedWithVotes = ratings.filter((r) => r.rating >= 4 && (r.vote_count ?? 0) > 0);
  const avgVoteCountOfLoved =
    lovedWithVotes.length > 0
      ? lovedWithVotes.reduce((s, r) => s + (r.vote_count ?? 0), 0) / lovedWithVotes.length
      : 50_000;
  // Normalize: ≤5k = arthouse (0.0), ≥300k = mainstream (1.0)
  const mainstreamScore = Math.min(1, Math.max(0, (avgVoteCountOfLoved - 5_000) / 295_000));

  // ── Runtime preference ───────────────────────────────────────────────────
  const lovedWithRuntime = ratings.filter((r) => r.rating >= 4 && (r.runtime ?? 0) > 0);
  const avgRuntime =
    lovedWithRuntime.length >= 3
      ? lovedWithRuntime.reduce((s, r) => s + (r.runtime ?? 0), 0) / lovedWithRuntime.length
      : null;

  // ── Foreign film preference ───────────────────────────────────────────────
  const lovedWithLang = ratings.filter((r) => r.rating >= 4 && r.original_language);
  const foreignFilmPct =
    lovedWithLang.length > 0
      ? lovedWithLang.filter((r) => r.original_language !== "en").length / lovedWithLang.length
      : 0;

  const avgRating =
    ratings.length > 0
      ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length
      : 0;

  const sorted = [...ratings].sort((a, b) => b.rating - a.rating);
  const topRated = sorted
    .filter((r) => r.rating >= 4)
    .slice(0, 15)
    .map((r) => ({ title: r.title, rating: r.rating, year: r.year, rewatch: !!r.rewatch }));

  // Expand negative signals: include more films and lower threshold (≤2.5)
  const lowestRated = sorted
    .filter((r) => r.rating <= 2.5)
    .slice(-15)
    .reverse()
    .map((r) => ({ title: r.title, rating: r.rating, year: r.year, rewatch: false }));

  return {
    genres,
    directors,
    actors,
    keywords,
    decades,
    mainstreamScore,
    avgRuntime,
    foreignFilmPct,
    avgRating,
    totalRated: ratings.length,
    topRated,
    lowestRated,
  };
}

/**
 * Score a candidate movie against the taste profile.
 */
export function scoreCandidate(
  candidate: {
    tmdb_id: number;
    title: string;
    year?: number | null;
    genres: string[];
    cast: string[];
    director: string | null;
    keywords: string[];
    vote_average: number | null;
    vote_count: number | null;
    runtime?: number | null;
    original_language?: string | null;
  },
  profile: TasteProfile,
  sourceWeight: number = 1
): number {
  let score = 0;

  for (const g of candidate.genres) {
    score += profile.genres[g] ?? 0;
  }
  if (candidate.director && profile.directors[candidate.director]) {
    score += profile.directors[candidate.director];
  }
  for (const a of candidate.cast) {
    score += (profile.actors[a] ?? 0) * 0.8;
  }
  for (const k of candidate.keywords) {
    score += (profile.keywords[k] ?? 0) * 0.4;
  }

  // Decade affinity bonus/penalty
  if (candidate.year) {
    const decade = `${Math.floor(candidate.year / 10) * 10}s`;
    const decadeAffinity = profile.decades[decade] ?? 0;
    score += decadeAffinity * 1.2;
  }

  // Mainstream calibration: skew toward popular vs obscure based on user taste
  const vc = candidate.vote_count ?? 0;
  const va = candidate.vote_average ?? 0;
  if (profile.mainstreamScore > 0.6) {
    // Mainstream fan — reward well-known films
    if (vc > 100_000 && va > 6.5) score += (profile.mainstreamScore - 0.6) * 3;
  } else if (profile.mainstreamScore < 0.4) {
    // Arthouse fan — penalise blockbusters, reward obscure gems
    if (vc > 500_000) score -= (0.4 - profile.mainstreamScore) * 2;
    if (vc < 20_000 && va > 6.5) score += (0.4 - profile.mainstreamScore) * 2;
  }

  // Runtime preference — penalise films that are far outside the user's sweet spot
  if (profile.avgRuntime && candidate.runtime) {
    const diff = Math.abs(candidate.runtime - profile.avgRuntime);
    if (diff > 45) score -= (diff - 45) / 30; // gentle penalty beyond 45 min variance
  }

  // Foreign film preference
  const isEnglish = !candidate.original_language || candidate.original_language === "en";
  if (profile.foreignFilmPct > 0.35 && !isEnglish) {
    score += profile.foreignFilmPct * 1.5; // boost foreign films for arthouse fans
  } else if (profile.foreignFilmPct < 0.1 && !isEnglish) {
    score -= 0.5; // mild penalty for non-English films for viewers who rarely watch them
  }

  // Baseline quality floor (avoid genuinely bad films)
  if (vc > 500 && va > 6) {
    score += (va - 6) * 0.3;
  }

  return score * sourceWeight;
}

/**
 * Format the taste profile as a readable string for Claude's system prompt.
 */
export function formatProfileForClaude(profile: TasteProfile): string {
  const topGenres = Object.entries(profile.genres)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([g, w]) => `${g} (${w > 0 ? "+" : ""}${w.toFixed(1)})`);

  const dislikedGenres = Object.entries(profile.genres)
    .filter(([, w]) => w < -0.5)
    .sort(([, a], [, b]) => a - b)
    .slice(0, 5)
    .map(([g, w]) => `${g} (${w.toFixed(1)})`);

  const topDirectors = Object.entries(profile.directors)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([d, w]) => `${d} (${w > 0 ? "+" : ""}${w.toFixed(1)})`);

  const topActors = Object.entries(profile.actors)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([a, w]) => `${a} (${w > 0 ? "+" : ""}${w.toFixed(1)})`);

  const topKeywords = Object.entries(profile.keywords)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([k]) => k);

  // Decade preferences
  const decadeEntries = Object.entries(profile.decades).sort(([, a], [, b]) => b - a);
  const lovedDecades = decadeEntries
    .filter(([, avg]) => avg > 0.1)
    .map(([d, avg]) => `${d} (avg +${avg.toFixed(1)})`);
  const dislikedDecades = decadeEntries
    .filter(([, avg]) => avg < -0.1)
    .map(([d, avg]) => `${d} (avg ${avg.toFixed(1)})`);

  // Runtime preference
  const runtimeNote = profile.avgRuntime
    ? `Their 4★+ films average ${Math.round(profile.avgRuntime)} minutes — ${
        profile.avgRuntime < 95
          ? "they gravitate toward shorter films"
          : profile.avgRuntime > 140
          ? "they enjoy longer, epic-length films"
          : "they are comfortable with standard feature lengths"
      }.`
    : null;

  // Language preference
  const foreignPct = Math.round(profile.foreignFilmPct * 100);
  const languageNote =
    foreignPct > 35
      ? `${foreignPct}% of their loved films are non-English — actively seek out and include foreign-language films.`
      : foreignPct > 15
      ? `${foreignPct}% of their loved films are non-English — open to foreign-language films.`
      : `Only ${foreignPct}% of their loved films are non-English — primarily watches English-language films.`;

  // Mainstream label
  const mainstreamLabel =
    profile.mainstreamScore > 0.65
      ? "mainstream blockbusters (high TMDB vote counts)"
      : profile.mainstreamScore < 0.35
      ? "arthouse, indie, and foreign films (low TMDB vote counts)"
      : "a mix of mainstream and indie/arthouse";

  return `
## Taste Profile (${profile.totalRated} films rated, avg ${profile.avgRating.toFixed(1)}★)

**Runtime preference:** ${runtimeNote ?? "Not enough data yet."}
**Language preference:** ${languageNote}

**Film era preferences:**
${lovedDecades.length ? `Tends to love: ${lovedDecades.join(", ")}` : ""}
${dislikedDecades.length ? `Tends to dislike: ${dislikedDecades.join(", ")}` : ""}

**Audience calibration:** This viewer gravitates toward ${mainstreamLabel}.

**Favourite genres:** ${topGenres.join(", ") || "none identified"}
**Genres they dislike:** ${dislikedGenres.join(", ") || "none identified"}

**Favourite directors:** ${topDirectors.join(", ") || "none identified"}
**Frequently enjoyed actors:** ${topActors.join(", ") || "none identified"}
**Recurring themes/keywords they enjoy:** ${topKeywords.join(", ") || "none identified"}

**Films they loved (4★+) — ♻ = rewatched (stronger signal):**
${profile.topRated.map((f) => `- ${f.title}${f.year ? ` (${f.year})` : ""} — ${f.rating}★${f.rewatch ? " ♻" : ""}`).join("\n") || "none"}

**Films they rated poorly (≤2.5★) — AVOID recommending anything tonally or thematically similar to these:**
${profile.lowestRated.map((f) => `- ${f.title}${f.year ? ` (${f.year})` : ""} — ${f.rating}★`).join("\n") || "none"}
`.trim();
}
