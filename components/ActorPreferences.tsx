"use client";
import { useState, useEffect } from "react";

interface ActorPrefsState {
  preferred: { name: string }[];
  suggestions: { name: string; count: number }[];
}

export default function ActorPreferences() {
  const [state, setState] = useState<ActorPrefsState | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/actor-prefs")
      .then((r) => r.json())
      .then(setState)
      .catch(() => {});
  }, []);

  if (!state) return null;

  const preferredNames = new Set(state.preferred.map((p) => p.name));

  const toggle = async (name: string) => {
    const action = preferredNames.has(name) ? "remove" : "add";
    setLoading(true);
    await fetch("/api/actor-prefs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, action }),
    });
    const fresh = await fetch("/api/actor-prefs").then((r) => r.json());
    setState(fresh);
    setLoading(false);
  };

  // Show preferred first, then suggestions not already preferred
  const unpinned = state.suggestions.filter((s) => !preferredNames.has(s.name));

  if (state.suggestions.length === 0) return null;

  return (
    <div
      className="rounded-2xl p-5 mb-6"
      style={{
        background: "linear-gradient(135deg, #0d0d0d 0%, #111827 100%)",
        border: "1px solid #1e2a3a",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span style={{ fontSize: 16 }}>🎭</span>
        <h2 className="font-bold text-sm" style={{ color: "#e2e8f0" }}>Favourite Actors</h2>
        <span className="text-xs" style={{ color: "#4a5568" }}>· pin to boost in recommendations</span>
      </div>

      {/* Pinned actors */}
      {state.preferred.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {state.preferred.map((a) => (
            <button
              key={a.name}
              onClick={() => toggle(a.name)}
              disabled={loading}
              className="text-xs px-3 py-1 rounded-full font-medium transition-all"
              style={{
                background: "#1e3a5a",
                border: "1px solid #2d6a9f",
                color: "#60a5fa",
                cursor: "pointer",
              }}
            >
              ★ {a.name} ×
            </button>
          ))}
        </div>
      )}

      {/* Suggestions */}
      <div className="flex flex-wrap gap-2">
        {unpinned.slice(0, 20).map((a) => (
          <button
            key={a.name}
            onClick={() => toggle(a.name)}
            disabled={loading}
            className="text-xs px-3 py-1 rounded-full transition-all"
            style={{
              background: "#1a1a2e",
              border: "1px solid #2a2a4a",
              color: "#94a3b8",
              cursor: "pointer",
            }}
          >
            {a.name}
          </button>
        ))}
      </div>
    </div>
  );
}
