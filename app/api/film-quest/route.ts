import { NextRequest, NextResponse } from "next/server";
import {
  getActiveQuest,
  getQuestProgress,
  createQuest,
  addQuestProgress,
  completeQuest,
  abandonQuest,
  getWatchedTmdbIds,
} from "@/lib/db";
import { getDirectorFilmography } from "@/lib/tmdb";
import { generateQuestNarrative } from "@/lib/claude";

export const dynamic = "force-dynamic";

// GET — return active quest + progress
export async function GET() {
  try {
    const quest = getActiveQuest();
    if (!quest) return NextResponse.json({ quest: null });

    const progress = getQuestProgress(quest.id);
    const watchedIds = getWatchedTmdbIds();
    const completedIds = new Set(progress.map((p) => p.tmdb_id));

    return NextResponse.json({ quest, progress, completedIds: Array.from(completedIds), watchedIds: Array.from(watchedIds) });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST — create quest, complete a film, or abandon quest
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Create a new quest
    if (body.action === "create") {
      const { directorTmdbId, directorName } = body;
      const filmography = await getDirectorFilmography(directorTmdbId);
      const watchedIds = getWatchedTmdbIds();

      // Only include unseen films, sorted by release year
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

      // Generate opening narrative
      const opening = await generateQuestNarrative({
        type: "opening",
        directorName,
        questTitle,
        totalFilms: unseenFilms.length,
        nextFilm: unseenFilms[0]?.title ?? "",
      });

      return NextResponse.json({ questId, questTitle, opening, films: unseenFilms });
    }

    // Complete a film in the quest
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

    // Abandon quest
    if (body.action === "abandon") {
      abandonQuest(body.questId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
