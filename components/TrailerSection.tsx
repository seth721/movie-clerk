"use client";
import { useState } from "react";

interface Video {
  key: string;
  name: string;
  type: string;
  official: boolean;
  published_at: string;
}

interface TrailerSectionProps {
  videos: Video[];
}

// Sort order: Official Trailer → Trailer → Teaser → Clip → Featurette → BTS → Interview → other
function sortVideos(videos: Video[]): Video[] {
  const rank = (v: Video) => {
    if (v.type === "Trailer" && v.official) return 0;
    if (v.type === "Trailer") return 1;
    if (v.type === "Teaser" && v.official) return 2;
    if (v.type === "Teaser") return 3;
    if (v.type === "Clip") return 4;
    if (v.type === "Featurette") return 5;
    if (v.type === "Behind the Scenes") return 6;
    if (v.type === "Interview") return 7;
    return 8;
  };
  return [...videos].sort((a, b) => rank(a) - rank(b));
}

function typeLabel(type: string): string {
  if (type === "Behind the Scenes") return "Behind the Scenes";
  return type;
}

function typeColor(type: string): string {
  if (type === "Trailer") return "#e50914";
  if (type === "Teaser") return "#f97316";
  if (type === "Clip") return "#3b82f6";
  if (type === "Featurette") return "#8b5cf6";
  if (type === "Behind the Scenes") return "#10b981";
  if (type === "Interview") return "#f59e0b";
  return "#6b7280";
}

export default function TrailerSection({ videos }: TrailerSectionProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [activeName, setActiveName] = useState<string>("");

  if (!videos.length) return null;

  const sorted = sortVideos(videos);
  const activeVideo = sorted.find((v) => v.key === activeKey);

  return (
    <div className="mb-8">
      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#555" }}>
        Videos
      </p>

      {/* Horizontal scroll row */}
      <div
        className="flex gap-3"
        style={{
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          paddingBottom: 4,
        }}
      >
        {sorted.map((video) => {
          const thumb = `https://img.youtube.com/vi/${video.key}/mqdefault.jpg`;
          return (
            <button
              key={video.key}
              onClick={() => { setActiveKey(video.key); setActiveName(video.name); }}
              className="flex-shrink-0 flex flex-col text-left group"
              style={{ width: 200, scrollSnapAlign: "start", background: "none", border: "none", padding: 0, cursor: "pointer" }}
            >
              {/* Thumbnail */}
              <div
                className="relative overflow-hidden rounded-lg"
                style={{
                  width: 200,
                  aspectRatio: "16/9",
                  background: "#111",
                  border: "1px solid #2a2a2a",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumb}
                  alt={video.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.key}/hqdefault.jpg`;
                  }}
                />
                {/* Dark overlay */}
                <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.3)" }} />
                {/* Play button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="flex items-center justify-center rounded-full transition-all group-hover:scale-110"
                    style={{
                      width: 36,
                      height: 36,
                      background: "rgba(229,9,20,0.85)",
                      boxShadow: "0 2px 12px rgba(229,9,20,0.5)",
                    }}
                  >
                    <div
                      style={{
                        width: 0, height: 0,
                        borderTop: "7px solid transparent",
                        borderBottom: "7px solid transparent",
                        borderLeft: "12px solid white",
                        marginLeft: 3,
                      }}
                    />
                  </div>
                </div>
                {/* Type badge */}
                <div
                  className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-xs font-bold"
                  style={{ background: typeColor(video.type), color: "#fff", fontSize: 10 }}
                >
                  {typeLabel(video.type)}
                </div>
              </div>

              {/* Label */}
              <p
                className="mt-1.5 text-xs leading-tight line-clamp-2"
                style={{ color: "#aaa", maxWidth: 200 }}
              >
                {video.name}
              </p>
            </button>
          );
        })}
      </div>

      {/* Lightbox modal */}
      {activeKey && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.92)" }}
          onClick={() => setActiveKey(null)}
        >
          <div
            className="relative w-full mx-4"
            style={{ maxWidth: 900 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setActiveKey(null)}
              className="absolute -top-10 right-0 text-sm font-medium transition-opacity hover:opacity-70"
              style={{ color: "#aaa", background: "none", border: "none", cursor: "pointer" }}
            >
              ✕ Close
            </button>

            {/* Player */}
            <div
              className="relative overflow-hidden rounded-xl"
              style={{ aspectRatio: "16/9", background: "#000" }}
            >
              <iframe
                src={`https://www.youtube.com/embed/${activeKey}?autoplay=1&rel=0`}
                title={activeVideo?.name ?? activeKey}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
                style={{ border: "none" }}
              />
            </div>

            {/* Video name */}
            <p className="mt-3 text-sm font-medium" style={{ color: "#ccc" }}>
              {activeVideo?.name}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
