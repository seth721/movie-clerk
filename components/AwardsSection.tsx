"use client";
import { useState, useEffect } from "react";

interface AwardEntry {
  ceremony: string;
  year: number;
  categories: string[];
}

interface AwardsData {
  wins: AwardEntry[];
  nominations: AwardEntry[];
}

interface AwardsSectionProps {
  tmdbId: number;
  title: string;
  year: string | null;
  omdbSummary: string;   // raw OMDb string for the collapsed summary line
}

function parseCounts(raw: string): { wins: number; nominations: number } {
  let wins = 0;
  let nominations = 0;
  const wonMajor = raw.match(/Won (\d+)/i);
  if (wonMajor) wins += parseInt(wonMajor[1]);
  const winsMatch = raw.match(/(?:Another )?(\d+) wins?/i);
  if (winsMatch) wins += parseInt(winsMatch[1]);
  const nomMajor = raw.match(/Nominated for (\d+)/i);
  if (nomMajor) nominations += parseInt(nomMajor[1]);
  const nomMatch = raw.match(/(\d+) nominations?/i);
  if (nomMatch) nominations += parseInt(nomMatch[1]);
  return { wins, nominations };
}

export default function AwardsSection({ tmdbId, title, year, omdbSummary }: AwardsSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState<AwardsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const { wins, nominations } = parseCounts(omdbSummary);

  // Fetch detail only when first expanded
  useEffect(() => {
    if (!expanded || fetched) return;
    setLoading(true);
    setFetched(true);
    const params = new URLSearchParams({
      summary: omdbSummary,
      title,
      year: year ?? "",
    });
    fetch(`/api/awards/${tmdbId}?${params}`)
      .then((r) => r.json())
      .then((d: AwardsData) => setData(d))
      .catch(() => setData({ wins: [], nominations: [] }))
      .finally(() => setLoading(false));
  }, [expanded, fetched, tmdbId, omdbSummary]);

  return (
    <div
      className="mb-6 rounded-xl overflow-hidden"
      style={{ background: "#1a1600", border: "1px solid #3a3000" }}
    >
      {/* Collapsed header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-opacity hover:opacity-80"
        style={{ background: "none", border: "none", cursor: "pointer" }}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg flex-shrink-0">🏆</span>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            {wins > 0 && (
              <span className="text-sm font-bold" style={{ color: "#d4af37" }}>
                {wins} {wins === 1 ? "win" : "wins"}
              </span>
            )}
            {nominations > 0 && (
              <span className="text-sm font-medium" style={{ color: "#a08a30" }}>
                {nominations} {nominations === 1 ? "nomination" : "nominations"}
              </span>
            )}
            {wins === 0 && nominations === 0 && (
              <span className="text-sm font-medium" style={{ color: "#d4af37" }}>Awards</span>
            )}
          </div>
        </div>
        <span
          className="flex-shrink-0 text-xs transition-transform duration-200"
          style={{
            color: "#6b5a10",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            display: "inline-block",
          }}
        >
          ▼
        </span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-5" style={{ borderTop: "1px solid #3a3000" }}>
          {loading ? (
            <div className="flex items-center gap-2 py-4">
              <div
                className="w-4 h-4 rounded-full border-2 animate-spin flex-shrink-0"
                style={{ borderColor: "#3a3000", borderTopColor: "#d4af37" }}
              />
              <span className="text-xs" style={{ color: "#6b5a10" }}>Looking up awards…</span>
            </div>
          ) : data && (data.wins.length > 0 || data.nominations.length > 0) ? (
            <div className="pt-4 space-y-5">
              {/* Wins */}
              {data.wins.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#d4af37" }}>
                    🏆 Won
                  </p>
                  <div className="space-y-3">
                    {data.wins.map((entry, i) => (
                      <div key={i}>
                        <p className="text-xs font-semibold mb-1" style={{ color: "#a08a30" }}>
                          {entry.ceremony} {entry.year}
                        </p>
                        <ul className="space-y-0.5">
                          {entry.categories.map((cat, j) => (
                            <li key={j} className="text-sm flex items-start gap-2" style={{ color: "#e8d080" }}>
                              <span className="flex-shrink-0 mt-0.5" style={{ color: "#d4af37" }}>✦</span>
                              {cat}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Divider between wins and noms */}
              {data.wins.length > 0 && data.nominations.length > 0 && (
                <div style={{ borderTop: "1px solid #3a3000" }} />
              )}

              {/* Nominations */}
              {data.nominations.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#a08a30" }}>
                    Nominated
                  </p>
                  <div className="space-y-3">
                    {data.nominations.map((entry, i) => (
                      <div key={i}>
                        <p className="text-xs font-semibold mb-1" style={{ color: "#6b5a10" }}>
                          {entry.ceremony} {entry.year}
                        </p>
                        <ul className="space-y-0.5">
                          {entry.categories.map((cat, j) => (
                            <li key={j} className="text-sm flex items-start gap-2" style={{ color: "#9a8540" }}>
                              <span className="flex-shrink-0 mt-0.5" style={{ color: "#6b5a10" }}>◦</span>
                              {cat}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Fallback to raw OMDb string */
            <p className="text-sm leading-relaxed pt-3" style={{ color: "#c9a227" }}>
              {omdbSummary}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
