import Link from "next/link";
import Image from "next/image";
import { scrapeNewBevSchedule } from "@/lib/newbeverly";
import { searchMovie } from "@/lib/tmdb";

export const revalidate = 3600;

export default async function NewBeverlyPage() {
  const events = await scrapeNewBevSchedule();

  const enriched = await Promise.all(
    events.map(async (event) => {
      const films = await Promise.all(
        event.titles.map(async (title) => {
          const result = await searchMovie(title).catch(() => null);
          return { title, tmdb: result ?? null };
        })
      );
      return { ...event, films };
    })
  );

  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const now = new Date();
  const isPast = (event: (typeof enriched)[0]) => {
    const monthIdx = monthNames.indexOf(event.month);
    const day = parseInt(event.date, 10);
    if (monthIdx === -1 || isNaN(day)) return false;
    const eventDate = new Date(now.getFullYear(), monthIdx, day);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return eventDate < today;
  };

  const grouped: Record<string, { upcoming: typeof enriched; past: typeof enriched }> = {};
  for (const event of enriched) {
    if (!grouped[event.month]) grouped[event.month] = { upcoming: [], past: [] };
    if (isPast(event)) grouped[event.month].past.push(event);
    else grouped[event.month].upcoming.push(event);
  }

  return (
    <div className="min-h-screen pb-20" style={{ background: "#0a0a0a" }}>
      {/* Sticky header */}
      <div className="sticky top-14 z-40 border-b" style={{ background: "#0a0a0a", borderColor: "#1e1e1e" }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-5">

          {/* New Bev flair badge */}
          <div
            className="flex-shrink-0 flex flex-col items-center justify-center rounded-xl px-4 py-2"
            style={{
              background: "linear-gradient(135deg, #1a0a0a 0%, #2a0a0a 100%)",
              border: "2px solid #e50914",
              minWidth: 90,
              textAlign: "center",
            }}
          >
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: "#e50914" }}>
              New Bev
            </span>
            <span className="text-xs font-semibold mt-0.5 leading-tight" style={{ color: "#aaa" }}>
              {new Date().toLocaleString("en-US", { month: "long" })}
            </span>
            <span className="text-xs font-bold" style={{ color: "#666" }}>
              {new Date().getFullYear()}
            </span>
          </div>

          {/* Title + address */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold leading-tight">The New Beverly Cinema</h1>
            <p className="text-xs mt-0.5" style={{ color: "#555" }}>
              7165 Beverly Blvd, Los Angeles · Repertory Programming
            </p>
          </div>

          <a
            href="https://podcasts.apple.com/us/podcast/pure-cinema-podcast/id1204885502"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 flex flex-col items-center justify-center rounded-xl px-4 py-2 hover:opacity-80 transition-opacity"
            style={{
              background: "linear-gradient(135deg, #0e0a1a 0%, #1a0a2a 100%)",
              border: "2px solid #7c3aed",
              minWidth: 90,
              textAlign: "center",
              textDecoration: "none",
            }}
          >
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: "#a855f7" }}>Pure Cinema</span>
            <span className="text-xs font-semibold mt-0.5 leading-tight" style={{ color: "#aaa" }}>Listen to the</span>
            <span className="text-xs font-semibold leading-tight" style={{ color: "#aaa" }}>Episode</span>
          </a>

          <a
            href="https://thenewbev.com/schedule/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 text-xs px-3 py-2 rounded-lg"
            style={{ background: "#1a1a1a", color: "#888", border: "1px solid #2a2a2a", textDecoration: "none" }}
          >
            thenewbev.com ↗
          </a>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-8">
        {Object.entries(grouped).map(([month, { upcoming, past }]) => (
          <div key={month} className="mb-12">
            <h2 className="text-lg font-bold mb-6 pb-2" style={{ borderBottom: "1px solid #1e1e1e", color: "#888" }}>
              {month}
            </h2>
            <div className="flex flex-col gap-3">
              {upcoming.map((event, i) => (
                <div
                  key={i}
                  className="flex gap-5 rounded-xl p-4"
                  style={{ background: "#111", border: "1px solid #1e1e1e" }}
                >
                  {/* Date block */}
                  <div
                    className="flex-shrink-0 flex flex-col items-center justify-center rounded-lg text-center"
                    style={{ width: 60, height: 60, background: "#1a1a1a", border: "1px solid #2a2a2a" }}
                  >
                    <span className="text-xs font-medium uppercase" style={{ color: "#555" }}>{event.day}</span>
                    <span className="text-2xl font-bold leading-tight">{event.date}</span>
                  </div>

                  {/* Films — poster + title each link to movie page */}
                  <div className="flex-1 min-w-0 flex flex-col gap-2">
                    {event.films.map((f, fi) => (
                      <div key={fi} className="flex items-center gap-3">
                        {f.tmdb ? (
                          <Link href={`/movie/${f.tmdb.id}`} className="flex-shrink-0 group">
                            {f.tmdb.poster_path ? (
                              <div className="relative rounded overflow-hidden group-hover:opacity-80 transition-opacity" style={{ width: 40, height: 60 }}>
                                <Image
                                  src={`https://image.tmdb.org/t/p/w92${f.tmdb.poster_path}`}
                                  alt={f.title}
                                  fill
                                  className="object-cover"
                                  sizes="40px"
                                />
                              </div>
                            ) : (
                              <div className="rounded flex items-center justify-center text-lg" style={{ width: 40, height: 60, background: "#1a1a1a" }}>🎬</div>
                            )}
                          </Link>
                        ) : (
                          <div className="rounded flex-shrink-0" style={{ width: 40, height: 60, background: "#1a1a1a" }} />
                        )}

                        <div className="min-w-0">
                          {f.tmdb ? (
                            <Link
                              href={`/movie/${f.tmdb.id}`}
                              className="text-sm font-semibold hover:underline block leading-snug"
                              style={{ color: "#fff" }}
                            >
                              {f.title}
                            </Link>
                          ) : (
                            <p className="text-sm font-semibold leading-snug" style={{ color: "#fff" }}>{f.title}</p>
                          )}
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {f.tmdb?.release_date && (
                              <span className="text-xs" style={{ color: "#555" }}>{f.tmdb.release_date.slice(0, 4)}</span>
                            )}
                            {f.tmdb?.vote_average != null && f.tmdb.vote_average > 0 && (
                              <span className="text-xs" style={{ color: "#888" }}>★ {f.tmdb.vote_average.toFixed(1)}</span>
                            )}
                            {fi === 0 && event.times.length > 0 && (
                              <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#1a1a1a", color: "#666", border: "1px solid #2a2a2a" }}>
                                {event.times[0]}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Double feature divider */}
                    {event.films.length > 1 && (
                      <p className="text-xs" style={{ color: "#333" }}>Double feature</p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex-shrink-0 self-center flex flex-col gap-2">
                    <a
                      href={event.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-3 py-2 rounded-lg hover:opacity-80 transition-opacity text-center"
                      style={{ background: "#1a1a1a", color: "#888", border: "1px solid #2a2a2a", textDecoration: "none", whiteSpace: "nowrap" }}
                    >
                      Tickets ↗
                    </a>
                    {event.films.find((f) => f.tmdb) && (
                      <Link
                        href={`/movie/${event.films.find((f) => f.tmdb)!.tmdb!.id}#where-to-watch`}
                        className="text-xs px-3 py-2 rounded-lg hover:opacity-80 transition-opacity text-center"
                        style={{ background: "#0a1a2a", color: "#4a9eff", border: "1px solid #1a3a5a", textDecoration: "none", whiteSpace: "nowrap" }}
                      >
                        Watch at Home
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {past.length > 0 && (
              <>
                <h3 className="text-sm font-semibold mt-8 mb-4 pb-2 uppercase tracking-wider" style={{ borderBottom: "1px solid #1a1a1a", color: "#444" }}>
                  Recently Played
                </h3>
                <div className="flex flex-col gap-3">
                  {past.map((event, i) => (
                    <div
                      key={i}
                      className="flex gap-5 rounded-xl p-4"
                      style={{ background: "#0e0e0e", border: "1px solid #1a1a1a", opacity: 0.7 }}
                    >
                      {/* Date block */}
                      <div
                        className="flex-shrink-0 flex flex-col items-center justify-center rounded-lg text-center"
                        style={{ width: 60, height: 60, background: "#141414", border: "1px solid #222" }}
                      >
                        <span className="text-xs font-medium uppercase" style={{ color: "#444" }}>{event.day}</span>
                        <span className="text-2xl font-bold leading-tight" style={{ color: "#666" }}>{event.date}</span>
                      </div>

                      {/* Films */}
                      <div className="flex-1 min-w-0 flex flex-col gap-2">
                        {event.films.map((f, fi) => (
                          <div key={fi} className="flex items-center gap-3">
                            {f.tmdb ? (
                              <Link href={`/movie/${f.tmdb.id}`} className="flex-shrink-0 group">
                                {f.tmdb.poster_path ? (
                                  <div className="relative rounded overflow-hidden group-hover:opacity-80 transition-opacity" style={{ width: 40, height: 60 }}>
                                    <Image
                                      src={`https://image.tmdb.org/t/p/w92${f.tmdb.poster_path}`}
                                      alt={f.title}
                                      fill
                                      className="object-cover"
                                      sizes="40px"
                                    />
                                  </div>
                                ) : (
                                  <div className="rounded flex items-center justify-center text-lg" style={{ width: 40, height: 60, background: "#1a1a1a" }}>🎬</div>
                                )}
                              </Link>
                            ) : (
                              <div className="rounded flex-shrink-0" style={{ width: 40, height: 60, background: "#141414" }} />
                            )}

                            <div className="min-w-0">
                              {f.tmdb ? (
                                <Link
                                  href={`/movie/${f.tmdb.id}`}
                                  className="text-sm font-semibold hover:underline block leading-snug"
                                  style={{ color: "#888" }}
                                >
                                  {f.title}
                                </Link>
                              ) : (
                                <p className="text-sm font-semibold leading-snug" style={{ color: "#888" }}>{f.title}</p>
                              )}
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {f.tmdb?.release_date && (
                                  <span className="text-xs" style={{ color: "#444" }}>{f.tmdb.release_date.slice(0, 4)}</span>
                                )}
                                {f.tmdb?.vote_average != null && f.tmdb.vote_average > 0 && (
                                  <span className="text-xs" style={{ color: "#555" }}>★ {f.tmdb.vote_average.toFixed(1)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {event.films.length > 1 && (
                          <p className="text-xs" style={{ color: "#333" }}>Double feature</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}

        {enriched.length === 0 && (
          <div className="text-center py-20" style={{ color: "#555" }}>
            <p>Could not load schedule. Check <a href="https://thenewbev.com/schedule/" target="_blank" rel="noopener noreferrer" style={{ color: "#888" }}>thenewbev.com</a> directly.</p>
          </div>
        )}
      </div>
    </div>
  );
}
