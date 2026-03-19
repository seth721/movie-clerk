import Image from "next/image";
import Link from "next/link";
import { getMovieDetails, getWatchProviders, getMovieVideos, type WatchProvider } from "@/lib/tmdb";
import { notFound } from "next/navigation";
import { getOmdbRatings } from "@/lib/omdb";
import { scrapeNewBevSchedule } from "@/lib/newbeverly";
import RatingWidget from "@/components/RatingWidget";
import PhysicalReleases from "@/components/PhysicalReleases";
import ShowtimesSection from "@/components/ShowtimesSection";
import MovieClerkRecommendation from "@/components/MovieClerkRecommendation";
import TrailerSection from "@/components/TrailerSection";
import AwardsSection from "@/components/AwardsSection";

export default async function MoviePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tmdbId = parseInt(id, 10);
  if (isNaN(tmdbId)) notFound();

  let movie;
  let providers;
  try {
    [movie, providers] = await Promise.all([
      getMovieDetails(tmdbId),
      getWatchProviders(tmdbId).catch(() => null),
    ]);
  } catch {
    notFound();
  }

  const [omdb, newBevEvents, videos] = await Promise.all([
    movie.imdb_id
      ? getOmdbRatings(movie.imdb_id).catch(() => ({ rottenTomatoes: null, metacritic: null, awards: null }))
      : Promise.resolve({ rottenTomatoes: null, metacritic: null, awards: null }),
    scrapeNewBevSchedule().catch(() => []),
    getMovieVideos(tmdbId).catch(() => []),
  ]);

  // Only YouTube videos, deduplicated by key
  const ytVideos = videos
    .filter((v) => v.site === "YouTube")
    .filter((v, i, arr) => arr.findIndex((x) => x.key === v.key) === i);

  const newBevScreenings = newBevEvents.filter((e) =>
    e.titles.some((t) => t.toLowerCase().includes(movie.title.toLowerCase()) || movie.title.toLowerCase().includes(t.toLowerCase()))
  );

  const backdropUrl = movie.backdrop_path
    ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
    : null;
  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : null;

  const director = movie.credits?.crew?.find((c) => c.job === "Director");
  const writers = movie.credits?.crew
    ?.filter((c) => c.job === "Screenplay" || c.job === "Writer" || c.job === "Story")
    .slice(0, 3) ?? [];
  const cast = (movie.credits?.cast ?? []).slice(0, 12);
  const studios = (movie.production_companies ?? []).slice(0, 4);

  const year = movie.release_date?.slice(0, 4);
  const releaseFormatted = movie.release_date
    ? new Date(movie.release_date + "T00:00:00").toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
      })
    : null;

  const runtime = movie.runtime
    ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
    : null;

  const formatMoney = (n: number) => {
    if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
    if (n >= 1_000_000) return `$${Math.round(n / 1_000_000)}M`;
    return `$${n.toLocaleString()}`;
  };

  const rtScore = omdb.rottenTomatoes;
  const rtNum = rtScore ? parseInt(rtScore) : null;
  const rtColor = rtNum == null ? "#888" : rtNum >= 60 ? "#fa320a" : "#00b020";

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a" }}>
      {/* ── Hero backdrop ── */}
      <div className="relative w-full" style={{ height: "55vh", minHeight: 320 }}>
        {backdropUrl ? (
          <Image
            src={backdropUrl}
            alt={movie.title}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        ) : (
          <div className="absolute inset-0" style={{ background: "#111" }} />
        )}
        {/* Gradient overlays */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to right, rgba(10,10,10,0.95) 30%, rgba(10,10,10,0.3) 70%, rgba(10,10,10,0.6) 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to top, rgba(10,10,10,1) 0%, rgba(10,10,10,0) 60%)",
          }}
        />

        {/* Back button */}
        <div className="absolute top-6 left-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            style={{ background: "rgba(0,0,0,0.6)", color: "#ccc", backdropFilter: "blur(8px)" }}
          >
            ← Back
          </Link>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-6xl mx-auto px-6 -mt-48 relative z-10 pb-20">
        <div className="flex gap-8 items-start">

          {/* Poster */}
          {posterUrl && (
            <div
              className="flex-shrink-0 rounded-xl overflow-hidden hidden md:block shadow-2xl"
              style={{ width: 220, border: "2px solid #2a2a2a" }}
            >
              <div className="relative" style={{ aspectRatio: "2/3" }}>
                <Image src={posterUrl} alt={movie.title} fill className="object-cover" sizes="220px" />
              </div>
            </div>
          )}

          {/* Info */}
          <div className="flex-1 pt-32 md:pt-8">
            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-2">
              {movie.title}
              {year && <span className="text-3xl font-normal ml-3" style={{ color: "#666" }}>({year})</span>}
            </h1>

            {/* New Bev flair */}
            {newBevScreenings.length > 0 && (() => {
              const ev = newBevScreenings[0];
              return (
                <a
                  href="https://thenewbev.com/schedule/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-lg no-underline"
                  style={{ background: "linear-gradient(135deg, #1a0a0a 0%, #2a0a0a 100%)", border: "2px solid #e50914", textDecoration: "none" }}
                >
                  <span className="text-xs font-black uppercase tracking-widest" style={{ color: "#e50914" }}>New Bev</span>
                  <span className="text-xs font-semibold" style={{ color: "#aaa" }}>
                    {ev.month} {new Date().getFullYear()}
                  </span>
                  <span className="text-xs" style={{ color: "#666" }}>↗</span>
                </a>
              );
            })()}

            {movie.tagline && (
              <p className="text-lg italic mb-4" style={{ color: "#888" }}>
                &ldquo;{movie.tagline}&rdquo;
              </p>
            )}

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {movie.vote_average != null && movie.vote_average > 0 && (
                <span
                  className="px-3 py-1 rounded-lg text-sm font-bold"
                  style={{ background: "#1a1a1a", color: "#f5c518", border: "1px solid #2a2a2a" }}
                >
                  ★ {movie.vote_average.toFixed(1)}
                  {movie.vote_count != null && (
                    <span className="font-normal ml-1.5" style={{ color: "#666" }}>
                      ({movie.vote_count.toLocaleString()} votes)
                    </span>
                  )}
                </span>
              )}
              {rtScore && (
                <span
                  className="px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-1.5"
                  style={{ background: "#1a1a1a", color: rtColor, border: "1px solid #2a2a2a" }}
                >
                  <span>{rtNum != null && rtNum >= 60 ? "🍅" : "🦠"}</span>
                  {rtScore}
                </span>
              )}
              {runtime && (
                <span className="text-sm" style={{ color: "#888" }}>{runtime}</span>
              )}
              {releaseFormatted && (
                <span className="text-sm" style={{ color: "#888" }}>{releaseFormatted}</span>
              )}
            </div>

            {/* Box office */}
            {(movie.budget != null && movie.budget > 0) || (movie.revenue != null && movie.revenue > 0) ? (
              <div className="flex flex-wrap gap-4 mb-6">
                {movie.budget != null && movie.budget > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: "#555" }}>Budget</p>
                    <p className="text-sm font-medium">{formatMoney(movie.budget)}</p>
                  </div>
                )}
                {movie.revenue != null && movie.revenue > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: "#555" }}>Box Office</p>
                    <p className="text-sm font-medium">{formatMoney(movie.revenue)}</p>
                  </div>
                )}
              </div>
            ) : null}

            {/* Genres */}
            {(movie.genres ?? []).length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {movie.genres!.map((g) => (
                  <span
                    key={g.id}
                    className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{ background: "#1e1e1e", color: "#bbb", border: "1px solid #2a2a2a" }}
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            )}

            {/* Awards */}
            {omdb.awards && (
              <AwardsSection
                tmdbId={movie.id}
                title={movie.title}
                year={year ?? null}
                omdbSummary={omdb.awards}
              />
            )}

            {/* Synopsis */}
            {movie.overview && (
              <p className="text-base leading-relaxed mb-6" style={{ color: "#ccc", maxWidth: "65ch" }}>
                {movie.overview}
              </p>
            )}

            {/* Videos */}
            <TrailerSection videos={ytVideos} />

            {/* Movie Clerk recommendation */}
            <MovieClerkRecommendation
              tmdbId={movie.id}
              title={movie.title}
              director={director?.name}
              genres={(movie.genres ?? []).map((g) => g.name)}
              keywords={(movie.keywords?.keywords ?? []).map((k) => k.name).slice(0, 15)}
            />

            {/* Rating */}
            <div className="mb-8">
              <RatingWidget
                film={{
                  id: movie.id,
                  title: movie.title,
                  release_date: movie.release_date,
                  poster_path: movie.poster_path,
                  overview: movie.overview,
                  vote_average: movie.vote_average,
                }}
              />
            </div>

            {/* Showtimes */}
            <ShowtimesSection title={movie.title} year={year ?? null} />

            {/* Key crew */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8" style={{ maxWidth: "50ch" }}>
              {director && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#555" }}>Director</p>
                  <p className="text-sm font-medium">{director.name}</p>
                </div>
              )}
              {writers.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#555" }}>
                    {writers.length > 1 ? "Writers" : "Writer"}
                  </p>
                  <p className="text-sm font-medium">{writers.map((w) => w.name).join(", ")}</p>
                </div>
              )}
              {studios.length > 0 && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#555" }}>
                    {studios.length > 1 ? "Studios" : "Studio"}
                  </p>
                  <p className="text-sm font-medium">{studios.map((s) => s.name).join(", ")}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Where to watch ── */}
        {providers && (providers.flatrate?.length || providers.rent?.length || providers.buy?.length) ? (
          <div id="where-to-watch" className="mt-10">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-bold">Where to Watch</h2>
              {providers.link && (
                <a
                  href={providers.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-2 py-1 rounded"
                  style={{ background: "#1a1a1a", color: "#555", border: "1px solid #2a2a2a" }}
                >
                  Powered by JustWatch ↗
                </a>
              )}
            </div>

            <div className="flex flex-col gap-4">
              {[
                { label: "Stream", providers: providers.flatrate, color: "#4caf50" },
                { label: "Rent", providers: providers.rent, color: "#ff9800" },
                { label: "Buy", providers: providers.buy, color: "#2196f3" },
              ]
                .filter((row) => row.providers?.length)
                .map(({ label, providers: list, color }) => (
                  <div key={label} className="flex items-center gap-4">
                    <span
                      className="text-xs font-bold uppercase tracking-wider flex-shrink-0"
                      style={{ color, width: 40 }}
                    >
                      {label}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {(list as WatchProvider[]).map((p) => (
                        <a
                          key={p.provider_id}
                          href={providers!.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`Watch on ${p.provider_name}`}
                          className="relative rounded-lg overflow-hidden flex-shrink-0 transition-transform hover:scale-110"
                          style={{ width: 44, height: 44, border: "1px solid #2a2a2a", display: "block" }}
                        >
                          <Image
                            src={`https://image.tmdb.org/t/p/original${p.logo_path}`}
                            alt={p.provider_name}
                            fill
                            sizes="44px"
                            className="object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ) : null}

        {/* ── Physical releases ── */}
        <PhysicalReleases title={movie.title} year={year ?? null} />

        {/* ── Cast ── */}
        {cast.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-bold mb-4">Cast</h2>
            <div
              className="flex gap-4"
              style={{
                overflowX: "auto",
                scrollSnapType: "x mandatory",
                scrollbarWidth: "none",
                paddingBottom: 8,
              }}
            >
              {cast.map((member) => {
                const photoUrl = member.profile_path
                  ? `https://image.tmdb.org/t/p/w185${member.profile_path}`
                  : null;
                return (
                  <div
                    key={member.id}
                    className="flex-shrink-0 flex flex-col"
                    style={{ width: 100, scrollSnapAlign: "start" }}
                  >
                    <div
                      className="rounded-lg overflow-hidden relative mb-2"
                      style={{ aspectRatio: "2/3", background: "#1a1a1a", border: "1px solid #222" }}
                    >
                      {photoUrl ? (
                        <Image
                          src={photoUrl}
                          alt={member.name}
                          fill
                          sizes="100px"
                          className="object-cover object-top"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-2xl">👤</div>
                      )}
                    </div>
                    <p className="text-xs font-semibold leading-tight line-clamp-2">{member.name}</p>
                    {member.character && (
                      <p className="text-xs leading-tight line-clamp-2" style={{ color: "#555" }}>
                        {member.character}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
