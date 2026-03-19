"use client";

import { useState, useEffect, useRef } from "react";

const ZIP_KEY = "movieclerk_zip";

export default function ShowtimesSection({
  title,
  year,
}: {
  title: string;
  year: string | null;
}) {
  const [zip, setZip] = useState("");
  const [input, setInput] = useState("");
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(ZIP_KEY);
    if (saved) setZip(saved);
    else setEditing(true);
  }, []);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const save = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    localStorage.setItem(ZIP_KEY, trimmed);
    setZip(trimmed);
    setInput("");
    setEditing(false);
  };

  const fandangoUrl = `https://www.fandango.com/search?q=${encodeURIComponent(title)}&location=${zip}&mode=locality`;

  return (
    <div className="mt-10">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-bold">Showtimes</h2>
        {zip && !editing && (
          <button
            onClick={() => { setInput(zip); setEditing(true); }}
            className="text-xs px-2 py-1 rounded"
            style={{ background: "#1a1a1a", color: "#555", border: "1px solid #2a2a2a" }}
          >
            near {zip} ✎
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            maxLength={10}
            placeholder="Enter ZIP code"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            className="rounded-lg px-4 py-2.5 text-sm outline-none w-40"
            style={{
              background: "#1a1a1a",
              border: "1px solid #333",
              color: "#fff",
            }}
          />
          <button
            onClick={save}
            disabled={!input.trim()}
            className="px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            style={{
              background: input.trim() ? "#e50914" : "#2a2a2a",
              color: input.trim() ? "#fff" : "#555",
              cursor: input.trim() ? "pointer" : "default",
            }}
          >
            Go
          </button>
          {zip && (
            <button
              onClick={() => setEditing(false)}
              className="text-sm"
              style={{ color: "#555" }}
            >
              Cancel
            </button>
          )}
        </div>
      ) : (
        <a
          href={fandangoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 px-6 py-4 rounded-xl transition-opacity hover:opacity-80"
          style={{
            background: "#1a1a1a",
            border: "1px solid #2a2a2a",
            textDecoration: "none",
          }}
        >
          <span className="text-2xl">🎟️</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: "#fff" }}>
              Find tickets near {zip}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#555" }}>
              Opens Fandango · {title}{year ? ` (${year})` : ""}
            </p>
          </div>
          <span className="ml-2" style={{ color: "#555" }}>↗</span>
        </a>
      )}
    </div>
  );
}
