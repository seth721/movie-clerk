import { NextRequest, NextResponse } from "next/server";
import {
  getActiveQuest,
  getQuestProgress,
  createQuest,
  addQuestProgress,
  completeQuest,
  abandonQuest,
  getWatchedTmdbIds,
  saveSideQuests,
  getSideQuests,
  updateSideQuestStatus,
  addSideQuestProgress,
  getSideQuestProgress,
} from "@/lib/db";
import { getDirectorFilmography, searchMovie } from "@/lib/tmdb";
import { generateQuestNarrative, generateSideQuests } from "@/lib/claude";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// GET — return active quest + progress + side quests
export async function GET() {
  try {
    const quest = getActiveQuest();
    if (!quest) return NextResponse.json({ quest: null });

    const progress = getQuestProgress(quest.id);
    const sideQuests = getSideQuests(quest.id);
    const sideQuestProgress = Object.fromEntries(
      sideQuests.map((sq) => [sq.id, getSideQuestProgress(sq.id)])
    );
    const watchedIds = getWatchedTmdbIds();
    const completedIds = new Set(progress.map((p) => p.tmdb_id));

    return NextResponse.json({
      quest,
      progress,
      sideQuests,
      sideQuestProgress,
      completedIds: Array.from(completedIds),
      watchedIds: Array.from(watchedIds),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST — create quest, complete a film, side quest actions, or abandon
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── Create a new quest ───────────────────────────────────────────────────
    if (body.action === "create") {
      const { directorTmdbId, directorName } = body;
      const filmography = await getDirectorFilmography(directorTmdbId);
      const watchedIds = getWatchedTmdbIds();

      const unseenFilms = filmography
        .filter((f) => !watchedIds.has(f.id))
        .sort((a, b) => (a.release_date ?? "").localeCompare(b.release_date ?? ""));

      if (unseenFilms.length === 0) {
        return NextResponse.json({ error: "You've already seen all of this director's films!" }, { status: 400 });
      }

      const questTitle = `${directorName} Chronicles`;
      const questId = createQuest({
        director_tmdb_id: directorTmdbId,
        director_name: directorName,
        quest_title: questTitle,
        film_ids: unseenFilms.map((f) => f.id),
        status: "active",
      });

      // Generate opening narrative + side quests in parallel
      const [opening, sideQuestSuggestions] = await Promise.all([
        generateQuestNarrative({
          type: "opening",
          directorName,
          questTitle,
          totalFilms: unseenFilms.length,
          nextFilm: unseenFilms[0]?.title ?? "",
        }),
        generateSideQuests(directorName, unseenFilms.map((f) => f.title)),
      ]);

      // Resolve each side quest film via TMDB search
      const resolvedSideQuests = await Promise.all(
        sideQuestSuggestions.map(async (sq) => {
          const resolvedFilms = await Promise.all(
            sq.films.map(async (f) => {
              try {
                const hit = await searchMovie(f.title, f.year);
                return hit ? { tmdb_id: hit.id, title: hit.title, poster_path: hit.poster_path ?? null, year: f.year } : null;
              } catch {
                return null;
              }
            })
          );
          const validFilms = resolvedFilms.filter(Boolean) as { tmdb_id: number; title: string; poster_path: string | null; year: number }[];
          if (validFilms.length === 0) return null;
          return { ...sq, resolvedFilms: validFilms };
        })
      );

      const validSideQuests = resolvedSideQuests.filter(Boolean) as NonNullable<typeof resolvedSideQuests[0]>[];

      // Save side quests to DB
      if (validSideQuests.length > 0) {
        saveSideQuests(
          validSideQuests.map((sq) => ({
            quest_id: questId,
            type: sq.type,
            title: sq.title,
            hook: sq.hook,
            film_ids: sq.resolvedFilms.map((f) => f.tmdb_id),
            film_titles: sq.resolvedFilms.map((f) => f.title),
            status: "available" as const,
            milestone: sq.milestone,
          }))
        );
      }

      return NextResponse.json({
        questId,
        questTitle,
        opening,
        films: unseenFilms,
        sideQuests: validSideQuests,
      });
    }

    // ── Complete a main quest film ────────────────────────────────────────────
    if (body.action === "complete_film") {
      const { questId, tmdbId, filmTitle, filmYear, rating, filmsRemaining, directorName } = body;

      const chapter = await generateQuestNarrative({
        type: "chapter",
        directorName,
        filmTitle,
        filmYear,
        rating,
        filmsRemaining,
        nextFilm: body.nextFilm ?? null,
      });

      addQuestProgress(questId, tmdbId, chapter);

      if (filmsRemaining === 0) {
        completeQuest(questId);
        const finale = await generateQuestNarrative({
          type: "finale",
          directorName,
          questTitle: body.questTitle,
        });
        return NextResponse.json({ chapter, finale, questComplete: true });
      }

      return NextResponse.json({ chapter, questComplete: false });
    }

    // ── Accept a side quest ───────────────────────────────────────────────────
    if (body.action === "accept_side_quest") {
      updateSideQuestStatus(body.sideQuestId, "active");
      return NextResponse.json({ success: true });
    }

    // ── Skip a side quest ─────────────────────────────────────────────────────
    if (body.action === "skip_side_quest") {
      updateSideQuestStatus(body.sideQuestId, "skipped");
      return NextResponse.json({ success: true });
    }

    // ── Complete a side quest film ────────────────────────────────────────────
    if (body.action === "complete_side_film") {
      const { sideQuestId, tmdbId, filmTitle, filmYear, rating, directorName, sideQuestTitle, filmsRemainingInSideQuest } = body;

      const chapter = await generateQuestNarrative({
        type: "chapter",
        directorName,
        filmTitle,
        filmYear,
        rating,
        filmsRemaining: filmsRemainingInSideQuest,
        nextFilm: body.nextFilm ?? null,
      });

      addSideQuestProgress(sideQuestId, tmdbId, chapter);

      if (filmsRemainingInSideQuest === 0) {
        updateSideQuestStatus(sideQuestId, "completed");
        const finale = await generateQuestNarrative({
          type: "finale",
          directorName,
          questTitle: sideQuestTitle,
        });
        return NextResponse.json({ chapter, finale, sideQuestComplete: true });
      }

      return NextResponse.json({ chapter, sideQuestComplete: false });
    }

    // ── Abandon quest ─────────────────────────────────────────────────────────
    if (body.action === "abandon") {
      abandonQuest(body.questId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
