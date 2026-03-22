"use client";
import { useState, useEffect, useRef } from "react";

interface SyncState {
  username: string | null;
  lastSync: string | null;
  lastCount: number | null;
}

interface Preview {
  displayName: string;
  recentFilms: { title: string; year: string | null; rating: number | null; watchedDate: string | null }[];
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return <span style={{ color: "#444", fontSize: 11 }}>no rating</span>;
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <span style={{ color: "#00e054", fontSize: 11, letterSpacing: 1 }}>
      {"★".repeat(full)}{half ? "½" : ""}
    </span>
  );
}

export default function LetterboxdSync({ onSynced }: { onSynced?: (added: number) => void }) {
  const [state, setState] = useState<SyncState | null>(null);
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ added: number; updated: number } | null>(null);

  // CSV import state
  const [showImport, setShowImport] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/letterboxd-username")
      .then((r) => r.json())
      .then(setState)
      .catch(() => {});
  }, []);

  // Warn user not to navigate away during import
  useEffect(() => {
    if (!importing) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [importing]);

  const lookupPreview = async () => {
    if (!input.trim()) return;
    setPreviewing(true);
    setPreviewError(null);
    setPreview(null);
    try {
      const res = await fetch(`/api/letterboxd-preview?username=${encodeURIComponent(input.trim())}`);
      const data = await res.json();
      if (data.error) {
        setPreviewError(data.error.includes("not found") ? `No Letterboxd account found for "${input.trim()}"` : data.error);
      } else {
        setPreview(data);
      }
    } catch {
      setPreviewError("Couldn't reach Letterboxd. Check your connection.");
    } finally {
      setPreviewing(false);
    }
  };

  const confirmUsername = async () => {
    const clean = input.trim().replace(/^@/, "");
    await fetch("/api/letterboxd-username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: clean }),
    });
    setState((prev) => ({ ...prev!, username: clean }));
    setEditing(false);
    setPreview(null);
    setInput("");
  };

  const cancelEdit = () => {
    setEditing(false);
    setPreview(null);
    setPreviewError(null);
    setInput("");
  };

  const sync = async () => {
    setSyncing(true);
    setError(null);
    setSyncResult(null);
    try {
      const res = await fetch("/api/letterboxd-sync", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setSyncResult({ added: data.added, updated: data.updated });
        setState((prev) => ({
          ...prev!,
          lastSync: new Date().toISOString(),
          lastCount: data.added + data.updated,
        }));
        if (onSynced && (data.added + data.updated) > 0) {
          onSynced(data.added + data.updated);
        }
      }
    } catch {
      setError("Sync failed. Check your connection.");
    } finally {
      setSyncing(false);
    }
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportError(null);
    setImportResult(null);
    setImportProgress(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      try {
        const res = await fetch("/api/letterboxd-import", {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: text,
        });
        if (!res.body) throw new Error("No response stream");

        const streamReader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await streamReader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";
          for (const part of parts) {
            const line = part.replace(/^data: /, "").trim();
            if (!line) continue;
            try {
              const event = JSON.parse(line);
              if (event.type === "progress") {
                setImportProgress({ done: event.done, total: event.total });
              } else if (event.type === "done") {
                setImportResult({ imported: event.imported, skipped: event.skipped, errors: event.errors });
                if (onSynced && event.imported > 0) onSynced(event.imported);
              } else if (event.type === "error") {
                setImportError(event.message);
              }
            } catch { /* skip malformed events */ }
          }
        }
      } catch (err) {
        setImportError("Import failed: " + String(err));
      } finally {
        setImporting(false);
      }
    };
    reader.onerror = () => {
      setImportError("Could not read file.");
      setImporting(false);
    };
    reader.readAsText(file);
  };

  if (!state) return null;

  const { username, lastSync } = state;

  return (
    <div
      className="rounded-xl p-4 mb-6"
      style={{ background: "#0d0d0d", border: "1px solid #1a1a1a" }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Letterboxd logo mark */}
          <div
            className="flex-shrink-0 flex items-center justify-center rounded-full text-white font-black text-xs"
            style={{ width: 28, height: 28, background: "#00e054", fontSize: 11 }}
          >
            lb
          </div>

          {editing ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span style={{ color: "#666", fontSize: 13 }}>letterboxd.com/</span>
              <input
                autoFocus
                value={input}
                onChange={(e) => { setInput(e.target.value); setPreview(null); setPreviewError(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") lookupPreview(); if (e.key === "Escape") cancelEdit(); }}
                placeholder="username"
                className="bg-transparent outline-none text-sm"
                style={{ color: "#e2e8f0", borderBottom: "1px solid #333", width: 120 }}
              />
              <button
                onClick={lookupPreview}
                disabled={previewing || !input.trim()}
                className="text-xs px-2 py-0.5 rounded"
                style={{ background: "#1a3a1a", color: "#00e054", border: "1px solid #00e05430", opacity: previewing || !input.trim() ? 0.5 : 1 }}
              >
                {previewing ? "Looking up…" : "Look up"}
              </button>
              <button onClick={cancelEdit} className="text-xs" style={{ color: "#444" }}>Cancel</button>
            </div>
          ) : username ? (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium" style={{ color: "#e2e8f0" }}>@{username}</span>
                <button onClick={() => { setEditing(true); setInput(username); }} style={{ color: "#444", fontSize: 11 }}>✎</button>
              </div>
              {lastSync && (
                <p className="text-xs" style={{ color: "#444" }}>
                  Last synced {timeAgo(lastSync)}
                  {syncResult && syncResult.added + syncResult.updated > 0 && (
                    <span style={{ color: "#00e054" }}> · {syncResult.added} new{syncResult.updated > 0 ? `, ${syncResult.updated} updated` : ""}</span>
                  )}
                  {syncResult && syncResult.added + syncResult.updated === 0 && (
                    <span style={{ color: "#444" }}> · up to date</span>
                  )}
                </p>
              )}
              {!lastSync && <p className="text-xs" style={{ color: "#444" }}>Never synced</p>}
            </div>
          ) : (
            <div>
              <p className="text-sm" style={{ color: "#888" }}>Connect Letterboxd</p>
              <p className="text-xs" style={{ color: "#444" }}>Auto-sync your diary ratings</p>
            </div>
          )}
        </div>

        {!editing && (
          username ? (
            <button
              onClick={sync}
              disabled={syncing}
              className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
              style={{
                background: syncing ? "#0a1a0a" : "#0d1f0d",
                border: `1px solid ${syncing ? "#1a2a1a" : "#00e05440"}`,
                color: syncing ? "#2a4a2a" : "#00e054",
                cursor: syncing ? "not-allowed" : "pointer",
              }}
            >
              {syncing ? "Syncing..." : "Sync now"}
            </button>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium"
              style={{ background: "#0d1f0d", border: "1px solid #00e05440", color: "#00e054" }}
            >
              Connect
            </button>
          )
        )}
      </div>

      {/* Preview / confirmation */}
      {preview && editing && (
        <div className="mt-4 rounded-lg p-3" style={{ background: "#111", border: "1px solid #1e3a1e" }}>
          <p className="text-sm font-semibold mb-1" style={{ color: "#e2e8f0" }}>
            Is this you? <span style={{ color: "#00e054" }}>@{input.trim().replace(/^@/, "")}</span>
          </p>
          <p className="text-xs mb-3" style={{ color: "#666" }}>{preview.displayName} · Recent films:</p>
          <div className="space-y-1 mb-4">
            {preview.recentFilms.map((f, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="text-xs" style={{ color: "#aaa" }}>
                  {f.title}{f.year ? <span style={{ color: "#555" }}> ({f.year})</span> : ""}
                </span>
                <div className="flex items-center gap-2">
                  <StarRating rating={f.rating} />
                  {f.watchedDate && <span style={{ color: "#444", fontSize: 11 }}>{f.watchedDate}</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={confirmUsername}
              className="text-xs px-3 py-1 rounded font-medium"
              style={{ background: "#00e054", color: "#000" }}
            >
              Yes, that&apos;s me
            </button>
            <button
              onClick={() => { setPreview(null); setInput(""); }}
              className="text-xs px-3 py-1 rounded"
              style={{ background: "#1a1a1a", color: "#888", border: "1px solid #2a2a2a" }}
            >
              No, try again
            </button>
          </div>
        </div>
      )}

      {previewError && editing && (
        <p className="text-xs mt-2" style={{ color: "#e53e3e" }}>{previewError}</p>
      )}

      {error && <p className="text-xs mt-2" style={{ color: "#e53e3e" }}>{error}</p>}

      {/* CSV Import section */}
      <div className="mt-3 pt-3" style={{ borderTop: "1px solid #1a1a1a" }}>
        <button
          onClick={() => { setShowImport((v) => !v); setShowInstructions(false); }}
          className="text-xs"
          style={{ color: "#444", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          {showImport ? "▲ Hide" : "▼ Import from CSV"}
        </button>

        {showImport && (
          <div className="mt-3 space-y-3">
            {/* How to get the file */}
            <button
              onClick={() => setShowInstructions((v) => !v)}
              className="text-xs flex items-center gap-1"
              style={{ color: "#00e054", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              {showInstructions ? "▲" : "▼"} How to export from Letterboxd
            </button>

            {showInstructions && (
              <div className="rounded-lg p-3 space-y-2" style={{ background: "#0a1a0a", border: "1px solid #1a2a1a" }}>
                <p className="text-xs font-semibold" style={{ color: "#00e054" }}>Getting your ratings.csv</p>
                <ol className="space-y-1.5">
                  {[
                    <>Log in at <span style={{ color: "#00e054" }}>letterboxd.com</span></>,
                    <>Click your avatar → <strong style={{ color: "#ccc" }}>Settings</strong></>,
                    <>Scroll to the <strong style={{ color: "#ccc" }}>Data</strong> section and click <strong style={{ color: "#ccc" }}>Export your data</strong></>,
                    <>Letterboxd emails you a download link — click it to download a <strong style={{ color: "#ccc" }}>.zip</strong> file</>,
                    <>Unzip it and find <strong style={{ color: "#00e054" }}>ratings.csv</strong></>,
                    <>Upload that file below ↓</>,
                  ].map((step, i) => (
                    <li key={i} className="flex gap-2 text-xs" style={{ color: "#888" }}>
                      <span className="flex-shrink-0 font-bold" style={{ color: "#00e05480" }}>{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
                <p className="text-xs" style={{ color: "#444" }}>
                  The export can take a few minutes to arrive by email. Only <strong style={{ color: "#555" }}>ratings.csv</strong> is needed — not the full diary.
                </p>
              </div>
            )}

            {/* Stay-on-page warning */}
            {importing && (
              <div
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium"
                style={{ background: "#1a1200", border: "1px solid #f5c51840", color: "#f5c518" }}
              >
                <span>⚠️</span>
                <span>Import in progress — don&apos;t close this tab or navigate away</span>
              </div>
            )}

            {/* Upload button */}
            <div className="space-y-3">
              {!importing ? (
                <label
                  className="text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={{
                    background: "#0d1f0d",
                    border: "1px solid #00e05440",
                    color: "#00e054",
                    cursor: "pointer",
                    display: "inline-block",
                  }}
                >
                  Upload ratings.csv
                  <input
                    type="file"
                    accept=".csv"
                    style={{ display: "none" }}
                    onChange={handleCsvUpload}
                  />
                </label>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium" style={{ color: "#00e054" }}>
                      {importProgress
                        ? `Matching films… ${importProgress.done} / ${importProgress.total}`
                        : "Reading file…"}
                    </p>
                    {importProgress && (
                      <p className="text-xs" style={{ color: "#444" }}>
                        {Math.round((importProgress.done / importProgress.total) * 100)}%
                      </p>
                    )}
                  </div>
                  <div className="rounded-full overflow-hidden" style={{ background: "#1a1a1a", height: 6 }}>
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        background: "#00e054",
                        width: importProgress
                          ? `${(importProgress.done / importProgress.total) * 100}%`
                          : "5%",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {importError && (
              <p className="text-xs" style={{ color: "#e53e3e" }}>{importError}</p>
            )}
          </div>
        )}

        {/* Result — shown outside the collapsible so it's always visible */}
        {importResult && (
          <div className="mt-3 rounded-lg p-4" style={{ background: "#0a1a0a", border: "1px solid #00e05440" }}>
            <div className="flex items-center gap-2 mb-1">
              <span style={{ fontSize: 18 }}>✅</span>
              <p className="text-sm font-bold" style={{ color: "#00e054" }}>Upload Complete</p>
            </div>
            <p className="text-sm" style={{ color: "#ccc" }}>
              <strong style={{ color: "#00e054" }}>{importResult.imported}</strong> film{importResult.imported !== 1 ? "s" : ""} successfully imported into Movie Clerk.
            </p>
            {(importResult.skipped > 0 || importResult.errors > 0) && (
              <p className="text-xs mt-1" style={{ color: "#555" }}>
                {importResult.skipped > 0 && `${importResult.skipped} not matched on TMDB`}
                {importResult.skipped > 0 && importResult.errors > 0 && " · "}
                {importResult.errors > 0 && `${importResult.errors} errors`}
              </p>
            )}
            <p className="text-xs mt-2" style={{ color: "#444" }}>
              Head to Recommendations and regenerate to get picks based on your full history.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
