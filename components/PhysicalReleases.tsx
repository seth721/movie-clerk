import { getPhysicalReleases, type PhysicalRelease } from "@/lib/bluray";

const FORMAT_COLORS: Record<string, string> = {
  "4K Ultra HD": "#a855f7",
  "Blu-ray": "#2196f3",
  "DVD": "#888",
};

const FORMAT_BADGES: Record<string, string> = {
  "4K Ultra HD": "4K UHD",
  "Blu-ray": "Blu-ray",
  "DVD": "DVD",
};

export default async function PhysicalReleases({
  title,
  year,
}: {
  title: string;
  year: string | null;
}) {
  if (!year) return null;

  const yearNum = parseInt(year, 10);
  if (isNaN(yearNum)) return null;

  const releases = await getPhysicalReleases(title, yearNum);
  if (!releases.length) return null;

  return (
    <div className="mt-10">
      <h2 className="text-xl font-bold mb-4">Physical Releases</h2>
      <div className="flex flex-wrap gap-3">
        {releases.map((r: PhysicalRelease) => {
          const color = FORMAT_COLORS[r.format] ?? "#666";
          const badge = FORMAT_BADGES[r.format] ?? r.format;
          return (
            <a
              key={r.url}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 rounded-xl px-4 py-3 hover:opacity-80 transition-opacity"
              style={{ background: "#111", border: "1px solid #2a2a2a", textDecoration: "none", minWidth: 180 }}
            >
              <span
                className="flex-shrink-0 rounded text-xs font-black px-2 py-1 mt-0.5"
                style={{ background: color + "22", color, border: `1px solid ${color}44` }}
              >
                {badge}
              </span>
              <div>
                {r.label && (
                  <p className="text-sm font-semibold leading-snug" style={{ color: "#ddd" }}>
                    {r.label}
                  </p>
                )}
                {r.releaseDate && (
                  <p className="text-xs mt-0.5" style={{ color: "#555" }}>
                    {r.releaseDate}
                  </p>
                )}
                {!r.label && !r.releaseDate && (
                  <p className="text-sm font-semibold" style={{ color: "#ddd" }}>
                    {r.format}
                  </p>
                )}
                <p className="text-xs mt-1" style={{ color: "#444" }}>
                  blu-ray.com ↗
                </p>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
