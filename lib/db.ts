import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "movies.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  // Ensure data directory exists
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  initSchema(db);
  return db;
}

function initSchema(db: Database.Database) {
  // Migrate existing taste_dna table to add persona_name column
  try { db.exec(`ALTER TABLE taste_dna ADD COLUMN persona_name TEXT`); } catch { /* already exists */ }
  // Migrate user_ratings to add rewatch flag
  try { db.exec(`ALTER TABLE user_ratings ADD COLUMN rewatch INTEGER DEFAULT 0`); } catch { /* already exists */ }
  // Migrate movies to add original_language
  try { db.exec(`ALTER TABLE movies ADD COLUMN original_language TEXT`); } catch { /* already exists */ }

  db.exec(`
    CREATE TABLE IF NOT EXISTS movies (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      tmdb_id       INTEGER UNIQUE NOT NULL,
      title         TEXT NOT NULL,
      year          INTEGER,
      poster_path   TEXT,
      backdrop_path TEXT,
      genres        TEXT DEFAULT '[]',
      cast          TEXT DEFAULT '[]',
      director      TEXT,
      keywords      TEXT DEFAULT '[]',
      overview      TEXT,
      runtime       INTEGER,
      vote_average  REAL,
      vote_count    INTEGER,
      fetched_at    TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_ratings (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      tmdb_id          INTEGER NOT NULL,
      letterboxd_title TEXT NOT NULL,
      rating           REAL NOT NULL,
      watched_date     TEXT,
      imported_at      TEXT DEFAULT (datetime('now')),
      UNIQUE(tmdb_id),
      FOREIGN KEY (tmdb_id) REFERENCES movies(tmdb_id)
    );

    CREATE TABLE IF NOT EXISTS recommendations (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      tmdb_id      INTEGER NOT NULL UNIQUE,
      score        REAL NOT NULL,
      explanation  TEXT NOT NULL,
      rank         INTEGER NOT NULL,
      generated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (tmdb_id) REFERENCES movies(tmdb_id)
    );

    CREATE TABLE IF NOT EXISTS watchlist (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      tmdb_id  INTEGER UNIQUE NOT NULL,
      added_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (tmdb_id) REFERENCES movies(tmdb_id)
    );

    CREATE TABLE IF NOT EXISTS director_preferences (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      tmdb_person_id INTEGER UNIQUE NOT NULL,
      name           TEXT NOT NULL,
      added_at       TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS actor_preferences (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      name     TEXT UNIQUE NOT NULL,
      added_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rec_feedback (
      tmdb_id    INTEGER PRIMARY KEY,
      feedback   TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Add logo_path column if it doesn't exist yet
    CREATE TABLE IF NOT EXISTS movie_logos (
      tmdb_id   INTEGER PRIMARY KEY,
      logo_path TEXT,
      fetched_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS awards_cache (
      tmdb_id    INTEGER PRIMARY KEY,
      data       TEXT NOT NULL,
      cached_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS taste_dna (
      id           INTEGER PRIMARY KEY CHECK (id = 1),
      dna_text     TEXT NOT NULL,
      persona_name TEXT,
      rating_count INTEGER NOT NULL,
      generated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- Migrate: add persona_name if missing
    -- (SQLite doesn't support IF NOT EXISTS on ALTER, so we wrap in app code below)
    CREATE TABLE IF NOT EXISTS film_quests (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      director_tmdb_id  INTEGER NOT NULL,
      director_name     TEXT NOT NULL,
      quest_title       TEXT NOT NULL,
      film_ids          TEXT NOT NULL DEFAULT '[]',
      status            TEXT NOT NULL DEFAULT 'active',
      created_at        TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS quest_progress (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      quest_id    INTEGER NOT NULL,
      tmdb_id     INTEGER NOT NULL,
      chapter     TEXT NOT NULL,
      completed_at TEXT DEFAULT (datetime('now')),
      UNIQUE(quest_id, tmdb_id),
      FOREIGN KEY (quest_id) REFERENCES film_quests(id)
    );

    CREATE INDEX IF NOT EXISTS idx_user_ratings_tmdb ON user_ratings(tmdb_id);
    CREATE INDEX IF NOT EXISTS idx_recommendations_rank ON recommendations(rank);
    CREATE INDEX IF NOT EXISTS idx_watchlist_tmdb ON watchlist(tmdb_id);
  `);
}

// ── Movies ──────────────────────────────────────────────────────────────────

export function upsertMovie(movie: {
  tmdb_id: number;
  title: string;
  year?: number | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  genres?: string[];
  cast?: string[];
  director?: string | null;
  keywords?: string[];
  overview?: string | null;
  runtime?: number | null;
  vote_average?: number | null;
  vote_count?: number | null;
  original_language?: string | null;
}) {
  const stmt = getDb().prepare(`
    INSERT INTO movies (tmdb_id, title, year, poster_path, backdrop_path, genres, cast, director, keywords, overview, runtime, vote_average, vote_count, original_language)
    VALUES (@tmdb_id, @title, @year, @poster_path, @backdrop_path, @genres, @cast, @director, @keywords, @overview, @runtime, @vote_average, @vote_count, @original_language)
    ON CONFLICT(tmdb_id) DO UPDATE SET
      title             = excluded.title,
      year              = excluded.year,
      poster_path       = excluded.poster_path,
      backdrop_path     = excluded.backdrop_path,
      genres            = excluded.genres,
      cast              = excluded.cast,
      director          = excluded.director,
      keywords          = excluded.keywords,
      overview          = excluded.overview,
      runtime           = excluded.runtime,
      vote_average      = excluded.vote_average,
      vote_count        = excluded.vote_count,
      original_language = excluded.original_language,
      fetched_at        = datetime('now')
  `);
  stmt.run({
    ...movie,
    genres: JSON.stringify(movie.genres ?? []),
    cast: JSON.stringify(movie.cast ?? []),
    keywords: JSON.stringify(movie.keywords ?? []),
  });
}

export function getMovieByTmdbId(tmdbId: number) {
  const row = getDb()
    .prepare("SELECT * FROM movies WHERE tmdb_id = ?")
    .get(tmdbId) as Record<string, unknown> | undefined;
  if (!row) return null;
  return parseMovieRow(row);
}

function parseMovieRow(row: Record<string, unknown>) {
  return {
    ...row,
    genres: JSON.parse((row.genres as string) || "[]"),
    cast: JSON.parse((row.cast as string) || "[]"),
    keywords: JSON.parse((row.keywords as string) || "[]"),
  };
}

// ── User Ratings ─────────────────────────────────────────────────────────────

export function upsertRating(rating: {
  tmdb_id: number;
  letterboxd_title: string;
  rating: number;
  watched_date?: string | null;
  rewatch?: boolean;
}) {
  getDb()
    .prepare(
      `INSERT INTO user_ratings (tmdb_id, letterboxd_title, rating, watched_date, rewatch)
       VALUES (@tmdb_id, @letterboxd_title, @rating, @watched_date, @rewatch)
       ON CONFLICT(tmdb_id) DO UPDATE SET
         rating       = excluded.rating,
         watched_date = excluded.watched_date,
         rewatch      = excluded.rewatch`
    )
    .run({ ...rating, rewatch: rating.rewatch ? 1 : 0 });
}

export function getAllRatings() {
  const rows = getDb()
    .prepare(
      `SELECT r.*, m.title, m.year, m.poster_path, m.genres, m.cast, m.director, m.keywords,
              m.vote_count, m.runtime, m.original_language, r.rewatch
       FROM user_ratings r
       JOIN movies m ON m.tmdb_id = r.tmdb_id
       ORDER BY r.rating DESC, r.watched_date DESC`
    )
    .all() as Record<string, unknown>[];
  return rows.map((row) => ({
    ...row,
    genres: JSON.parse((row.genres as string) || "[]"),
    cast: JSON.parse((row.cast as string) || "[]"),
    keywords: JSON.parse((row.keywords as string) || "[]"),
  }));
}

export function getRatingCount(): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) as count FROM user_ratings")
    .get() as { count: number };
  return row.count;
}

export function getWatchedTmdbIds(): Set<number> {
  const rows = getDb()
    .prepare("SELECT tmdb_id FROM user_ratings")
    .all() as { tmdb_id: number }[];
  return new Set(rows.map((r) => r.tmdb_id));
}

// ── Recommendations ──────────────────────────────────────────────────────────

export function saveRecommendations(
  recs: { tmdb_id: number; score: number; explanation: string; rank: number }[]
) {
  const db = getDb();
  const clear = db.prepare("DELETE FROM recommendations");
  const insert = db.prepare(`
    INSERT INTO recommendations (tmdb_id, score, explanation, rank)
    VALUES (@tmdb_id, @score, @explanation, @rank)
  `);
  const transaction = db.transaction(() => {
    clear.run();
    for (const rec of recs) {
      insert.run(rec);
    }
  });
  transaction();
}

export function getRecommendations() {
  const rows = getDb()
    .prepare(
      `SELECT rec.*, m.title, m.year, m.poster_path, m.backdrop_path, m.overview,
              m.genres, m.cast, m.director, m.vote_average, m.runtime
       FROM recommendations rec
       JOIN movies m ON m.tmdb_id = rec.tmdb_id
       ORDER BY rec.rank ASC`
    )
    .all() as Record<string, unknown>[];
  return rows.map((row) => ({
    ...row,
    genres: JSON.parse((row.genres as string) || "[]"),
    cast: JSON.parse((row.cast as string) || "[]"),
  }));
}

export function getRecommendationCount(): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) as count FROM recommendations")
    .get() as { count: number };
  return row.count;
}

// ── Watchlist ─────────────────────────────────────────────────────────────────

export function addToWatchlist(tmdbId: number) {
  getDb()
    .prepare(
      "INSERT OR IGNORE INTO watchlist (tmdb_id) VALUES (?)"
    )
    .run(tmdbId);
}

export function removeFromWatchlist(tmdbId: number) {
  getDb()
    .prepare("DELETE FROM watchlist WHERE tmdb_id = ?")
    .run(tmdbId);
}

export function getWatchlist() {
  const rows = getDb()
    .prepare(
      `SELECT w.tmdb_id, w.added_at, m.title, m.year, m.poster_path,
              m.overview, m.vote_average, m.genres
       FROM watchlist w
       JOIN movies m ON m.tmdb_id = w.tmdb_id
       ORDER BY w.added_at DESC`
    )
    .all() as Record<string, unknown>[];
  return rows.map((row) => ({
    ...row,
    genres: JSON.parse((row.genres as string) || "[]"),
  }));
}

export function getWatchlistTmdbIds(): Set<number> {
  const rows = getDb()
    .prepare("SELECT tmdb_id FROM watchlist")
    .all() as { tmdb_id: number }[];
  return new Set(rows.map((r) => r.tmdb_id));
}

// ── Director preferences ──────────────────────────────────────────────────────

export function addDirectorPreference(tmdbPersonId: number, name: string) {
  getDb()
    .prepare("INSERT OR IGNORE INTO director_preferences (tmdb_person_id, name) VALUES (?, ?)")
    .run(tmdbPersonId, name);
}

export function removeDirectorPreference(tmdbPersonId: number) {
  getDb()
    .prepare("DELETE FROM director_preferences WHERE tmdb_person_id = ?")
    .run(tmdbPersonId);
}

export function getDirectorPreferences(): { tmdb_person_id: number; name: string }[] {
  return getDb()
    .prepare("SELECT tmdb_person_id, name FROM director_preferences ORDER BY added_at ASC")
    .all() as { tmdb_person_id: number; name: string }[];
}

// ── Recommendation feedback ───────────────────────────────────────────────────

export function saveRecFeedback(tmdbId: number, feedback: string) {
  getDb()
    .prepare("INSERT OR REPLACE INTO rec_feedback (tmdb_id, feedback, created_at) VALUES (?, ?, datetime('now'))")
    .run(tmdbId, feedback);
}

export function getFeedbackExclusions(): Set<number> {
  const rows = getDb()
    .prepare("SELECT tmdb_id FROM rec_feedback WHERE feedback = 'not_for_me'")
    .all() as { tmdb_id: number }[];
  return new Set(rows.map((r) => r.tmdb_id));
}

// ── Actor preferences ─────────────────────────────────────────────────────────

export function addActorPreference(name: string) {
  getDb()
    .prepare("INSERT OR IGNORE INTO actor_preferences (name) VALUES (?)")
    .run(name);
}

export function removeActorPreference(name: string) {
  getDb()
    .prepare("DELETE FROM actor_preferences WHERE name = ?")
    .run(name);
}

export function getActorPreferences(): { name: string }[] {
  return getDb()
    .prepare("SELECT name FROM actor_preferences ORDER BY added_at ASC")
    .all() as { name: string }[];
}

export function getTopActorsFromRatings(minRating = 3.5, limit = 30): { name: string; count: number }[] {
  const rows = getDb()
    .prepare(`SELECT m.cast FROM user_ratings r JOIN movies m ON m.tmdb_id = r.tmdb_id WHERE r.rating >= ?`)
    .all(minRating) as { cast: string }[];

  const counts: Record<string, number> = {};
  for (const row of rows) {
    try {
      const actors: string[] = JSON.parse(row.cast || "[]");
      for (const actor of actors) {
        if (actor) counts[actor] = (counts[actor] ?? 0) + 1;
      }
    } catch { /* skip */ }
  }
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

// ── Rating removal ────────────────────────────────────────────────────────────

export function removeRating(tmdbId: number) {
  getDb()
    .prepare("DELETE FROM user_ratings WHERE tmdb_id = ?")
    .run(tmdbId);
}

// ── Movie logos ───────────────────────────────────────────────────────────────

export function getCachedLogos(tmdbIds: number[]): Map<number, string | null> {
  if (!tmdbIds.length) return new Map();
  const placeholders = tmdbIds.map(() => "?").join(",");
  const rows = getDb()
    .prepare(`SELECT tmdb_id, logo_path FROM movie_logos WHERE tmdb_id IN (${placeholders})`)
    .all(...tmdbIds) as { tmdb_id: number; logo_path: string | null }[];
  return new Map(rows.map((r) => [r.tmdb_id, r.logo_path]));
}

export function saveLogo(tmdbId: number, logoPath: string | null) {
  getDb()
    .prepare("INSERT OR REPLACE INTO movie_logos (tmdb_id, logo_path, fetched_at) VALUES (?, ?, datetime('now'))")
    .run(tmdbId, logoPath);
}

// ── Taste DNA ─────────────────────────────────────────────────────────────────

export function getTasteDna(): { dna_text: string; persona_name: string | null; rating_count: number; generated_at: string } | null {
  return getDb()
    .prepare("SELECT dna_text, persona_name, rating_count, generated_at FROM taste_dna WHERE id = 1")
    .get() as { dna_text: string; persona_name: string | null; rating_count: number; generated_at: string } | null;
}

export function saveTasteDna(dnaText: string, ratingCount: number, personaName?: string) {
  getDb()
    .prepare(`
      INSERT INTO taste_dna (id, dna_text, persona_name, rating_count, generated_at)
      VALUES (1, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        dna_text = excluded.dna_text,
        persona_name = excluded.persona_name,
        rating_count = excluded.rating_count,
        generated_at = excluded.generated_at
    `)
    .run(dnaText, personaName ?? null, ratingCount);
}

// ── Settings ──────────────────────────────────────────────────────────────────

export function getSetting(key: string): string | null {
  // Ensure table exists (safe to call multiple times)
  getDb().exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
  const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string) {
  getDb().exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
  getDb().prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value);
}

// ── Film Quests ───────────────────────────────────────────────────────────────

export interface FilmQuest {
  id: number;
  director_tmdb_id: number;
  director_name: string;
  quest_title: string;
  film_ids: number[];
  status: "active" | "completed";
  created_at: string;
}

export interface QuestProgress {
  id: number;
  quest_id: number;
  tmdb_id: number;
  chapter: string;
  completed_at: string;
}

export function createQuest(quest: Omit<FilmQuest, "id" | "created_at">): number {
  const result = getDb().prepare(`
    INSERT INTO film_quests (director_tmdb_id, director_name, quest_title, film_ids, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(quest.director_tmdb_id, quest.director_name, quest.quest_title, JSON.stringify(quest.film_ids), quest.status);
  return result.lastInsertRowid as number;
}

export function getActiveQuest(): FilmQuest | null {
  const row = getDb().prepare(`SELECT * FROM film_quests WHERE status = 'active' ORDER BY created_at DESC LIMIT 1`).get() as Record<string, unknown> | undefined;
  if (!row) return null;
  return { ...row, film_ids: JSON.parse(row.film_ids as string) } as FilmQuest;
}

export function getQuestProgress(questId: number): QuestProgress[] {
  return getDb().prepare(`SELECT * FROM quest_progress WHERE quest_id = ? ORDER BY completed_at ASC`).all(questId) as QuestProgress[];
}

export function addQuestProgress(questId: number, tmdbId: number, chapter: string) {
  getDb().prepare(`
    INSERT OR REPLACE INTO quest_progress (quest_id, tmdb_id, chapter) VALUES (?, ?, ?)
  `).run(questId, tmdbId, chapter);
}

export function completeQuest(questId: number) {
  getDb().prepare(`UPDATE film_quests SET status = 'completed' WHERE id = ?`).run(questId);
}

export function abandonQuest(questId: number) {
  getDb().prepare(`UPDATE film_quests SET status = 'abandoned' WHERE id = ?`).run(questId);
}
