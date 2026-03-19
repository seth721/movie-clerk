"use client";
import { useState, useEffect } from "react";

interface PersonaState {
  dna: string | null;
  persona: string | null;
  stale: boolean;
  rating_count: number;
}

export default function TasteDna() {
  const [state, setState] = useState<PersonaState | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [sharing, setSharing] = useState(false);

  const sharePersona = async () => {
    setSharing(true);
    try {
      const cardUrl = "/api/persona-card";
      if (typeof navigator !== "undefined" && navigator.share) {
        const res = await fetch(cardUrl);
        const blob = await res.blob();
        const file = new File([blob], "my-film-persona.png", { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: `My Film Persona: ${state?.persona}` });
          return;
        }
      }
      // Fallback: open image in new tab
      window.open(cardUrl, "_blank");
    } catch { /* user cancelled */ } finally {
      setSharing(false);
    }
  };

  useEffect(() => {
    fetch("/api/taste-dna")
      .then((r) => r.json())
      .then(setState)
      .catch(() => {});
  }, []);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/taste-dna", { method: "POST" });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setState({ dna: data.dna, persona: data.persona, stale: false, rating_count: data.rating_count });
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  if (!state) return null;

  const { dna, persona, stale, rating_count } = state;
  const paragraphs = dna ? dna.split("\n\n").filter(Boolean) : [];

  return (
    <div
      className="rounded-2xl p-6 mb-10"
      style={{
        background: "linear-gradient(135deg, #0d0d0d 0%, #111827 100%)",
        border: "1px solid #1e2a3a",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle glow */}
      <div style={{
        position: "absolute", top: -60, right: -60,
        width: 200, height: 200,
        background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 18 }}>🎬</span>
          <h2 className="font-bold text-lg" style={{ color: "#e2e8f0" }}>Your Film Persona</h2>
          {dna && (
            <span className="text-xs" style={{ color: "#4a5568" }}>
              · {rating_count} film{rating_count !== 1 ? "s" : ""}{stale ? " · outdated" : ""}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {dna && (
            <button
              onClick={sharePersona}
              disabled={sharing}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
              style={{
                background: "#1a1a1a",
                border: "1px solid #2a2a2a",
                color: sharing ? "#4a5568" : "#94a3b8",
                cursor: sharing ? "not-allowed" : "pointer",
              }}
            >
              {sharing ? "…" : "↗ Share"}
            </button>
          )}
          {rating_count >= 5 && (
            <button
              onClick={generate}
              disabled={generating}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
              style={{
                background: generating ? "#1a1a2e" : "#1e2a4a",
                border: "1px solid #2d3f6b",
                color: generating ? "#4a5568" : "#818cf8",
                cursor: generating ? "not-allowed" : "pointer",
              }}
            >
              {generating ? "Analyzing..." : dna ? (stale ? "↻ Update" : "↻ Regenerate") : "Generate"}
            </button>
          )}
        </div>
      </div>

      {/* Generating skeleton */}
      {generating && (
        <div className="space-y-3">
          <div className="animate-pulse rounded-lg h-10 w-48" style={{ background: "#1a2035" }} />
          <div className="space-y-2 mt-4">
            {[100, 90, 95, 70].map((w, i) => (
              <div key={i} className="animate-pulse rounded" style={{ height: 13, width: `${w}%`, background: "#1a2035" }} />
            ))}
          </div>
          <p className="text-xs mt-2" style={{ color: "#4a5568" }}>The clerk is reading your file…</p>
        </div>
      )}

      {/* Persona + prose */}
      {!generating && dna && (
        <div>
          {/* "You are ___" headline */}
          {persona && (
            <div className="mb-4">
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#4a5568" }}>You are</p>
              <p className="font-black leading-none" style={{ fontSize: 32, color: "#e2e8f0", letterSpacing: "-0.5px" }}>
                {persona}
              </p>
            </div>
          )}

          {/* Prose paragraphs */}
          {paragraphs.map((para, i) => (
            <p
              key={i}
              className="text-sm leading-relaxed mb-3 last:mb-0"
              style={{
                color: i === 0 ? "#cbd5e1" : "#94a3b8",
                display: expanded || i < 2 ? "block" : "none",
              }}
            >
              {para}
            </p>
          ))}

          {paragraphs.length > 2 && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="text-xs mt-1"
              style={{ color: "#818cf8", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              {expanded ? "↑ Show less" : "↓ Read more"}
            </button>
          )}
        </div>
      )}

      {/* Empty states */}
      {!generating && !dna && rating_count >= 5 && (
        <p className="text-sm" style={{ color: "#4a5568" }}>
          The clerk has enough to work with. Hit Generate and we&apos;ll have your number.
        </p>
      )}
      {!generating && !dna && rating_count < 5 && (
        <p className="text-sm" style={{ color: "#4a5568" }}>
          Rate {5 - rating_count} more film{5 - rating_count !== 1 ? "s" : ""} and the clerk will have you figured out.
        </p>
      )}

      {error && <p className="text-xs mt-2" style={{ color: "#e53e3e" }}>The clerk got confused. {error}</p>}
    </div>
  );
}
