export interface OmdbRatings {
  rottenTomatoes: string | null;
  metacritic: string | null;
  awards: string | null;
}

export async function getOmdbRatings(imdbId: string): Promise<OmdbRatings> {
  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey) return { rottenTomatoes: null, metacritic: null, awards: null };

  try {
    const res = await fetch(
      `https://www.omdbapi.com/?i=${imdbId}&apikey=${apiKey}`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return { rottenTomatoes: null, metacritic: null, awards: null };

    const data = await res.json();
    if (data.Response === "False") return { rottenTomatoes: null, metacritic: null, awards: null };

    const ratings: { Source: string; Value: string }[] = data.Ratings ?? [];
    const rt = ratings.find((r) => r.Source === "Rotten Tomatoes")?.Value ?? null;
    const mc = ratings.find((r) => r.Source === "Metacritic")?.Value ?? null;
    const awards = data.Awards && data.Awards !== "N/A" ? data.Awards : null;

    return {
      rottenTomatoes: rt,
      metacritic: mc ? mc.replace("/100", "") : null,
      awards,
    };
  } catch {
    return { rottenTomatoes: null, metacritic: null, awards: null };
  }
}
