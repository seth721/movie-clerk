import { NextResponse } from "next/server";
import {
  getCompletedQuests,
  getQuestProgressWithFilms,
  getSideQuests,
  getSideQuestProgressWithFilms,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const quests = getCompletedQuests();

    const history = quests.map((quest) => {
      const films = getQuestProgressWithFilms(quest.id);
      const sideQuests = getSideQuests(quest.id).map((sq) => ({
        id: sq.id,
        type: sq.type,
        title: sq.title,
        hook: sq.hook,
        status: sq.status,
        films: getSideQuestProgressWithFilms(sq.id),
      }));

      const avgRating =
        films.length > 0 && films.some((f) => f.rating != null)
          ? Math.round(
              (films.filter((f) => f.rating != null).reduce((s, f) => s + (f.rating ?? 0), 0) /
                films.filter((f) => f.rating != null).length) *
                10
            ) / 10
          : null;

      return {
        id: quest.id,
        director_name: quest.director_name,
        quest_title: quest.quest_title,
        status: quest.status,
        created_at: quest.created_at,
        films,
        sideQuests,
        avgRating,
        filmsCompleted: films.length,
        totalFilms: quest.film_ids.length,
      };
    });

    return NextResponse.json({ history });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
