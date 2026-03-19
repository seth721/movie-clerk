import Image from "next/image";
import { TMDB_IMAGE_BASE } from "@/lib/tmdb";

interface MovieCardProps {
  tmdb_id: number;
  title: string;
  year?: number | null;
  poster_path?: string | null;
  genres?: string[];
  rating?: number;
  vote_average?: number | null;
  compact?: boolean;
}

function StarRating({ rating }: { rating: number }) {
  const stars = Math.round(rating * 2) / 2; // round to nearest 0.5
  return (
    <span className="star-rating font-mono text-sm">
      {"★".repeat(Math.floor(stars))}
      {stars % 1 ? "½" : ""}
      {" "}
      <span style={{ color: "#666" }}>
        {"★".repeat(5 - Math.ceil(stars))}
      </span>
    </span>
  );
}

export default function MovieCard({
  title,
  year,
  poster_path,
  genres,
  rating,
  vote_average,
  compact = false,
}: MovieCardProps) {
  const posterUrl = poster_path
    ? `${TMDB_IMAGE_BASE}/${compact ? "w185" : "w342"}${poster_path}`
    : null;

  if (compact) {
    return (
      <div
        className="flex gap-3 p-3 rounded-lg"
        style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
      >
        <div
          className="flex-shrink-0 rounded overflow-hidden"
          style={{ width: 50, height: 75, background: "#222" }}
        >
          {posterUrl ? (
            <Image src={posterUrl} alt={title} width={50} height={75} className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">🎬</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{title}</p>
          <p style={{ color: "#666" }} className="text-xs">
            {year ?? "—"}
          </p>
          {rating !== undefined && <StarRating rating={rating} />}
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden transition-transform hover:-translate-y-1"
      style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
    >
      <div style={{ aspectRatio: "2/3", background: "#222", position: "relative" }}>
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 200px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">🎬</div>
        )}
        {rating !== undefined && (
          <div
            className="absolute bottom-2 left-2 px-2 py-1 rounded text-xs font-bold"
            style={{ background: "rgba(0,0,0,0.85)", color: "#f5c518" }}
          >
            {rating}★
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="font-semibold text-sm leading-tight line-clamp-2">{title}</p>
        <p style={{ color: "#666" }} className="text-xs mt-1">
          {year ?? "—"}
          {vote_average != null && vote_average > 0 && (
            <span style={{ color: "#f5c518" }}> · {vote_average.toFixed(1)}/10</span>
          )}
        </p>
        {genres && genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {genres.slice(0, 2).map((g) => (
              <span
                key={g}
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: "#2a2a2a", color: "#aaa" }}
              >
                {g}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
