import { ImageResponse } from "next/og";
import { getTasteDna } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const dna = getTasteDna();

  if (!dna?.persona_name) {
    return new Response("No persona generated yet", { status: 404 });
  }

  const persona = dna.persona_name;
  const firstPara = dna.dna_text.split("\n\n")[0] ?? "";
  // Trim to ~160 chars for the card
  const snippet = firstPara.length > 160 ? firstPara.slice(0, 157) + "…" : firstPara;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #080810 0%, #0d1117 60%, #111827 100%)",
          padding: "56px 64px",
          fontFamily: "sans-serif",
          color: "#fff",
          position: "relative",
        }}
      >
        {/* Subtle top-right glow */}
        <div
          style={{
            position: "absolute",
            top: -80,
            right: -80,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(229,9,20,0.12) 0%, transparent 70%)",
          }}
        />

        {/* Top row — branding */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: "#e50914",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            Movie Clerk
          </div>
          <div style={{ width: 1, height: 16, background: "#333" }} />
          <div style={{ fontSize: 15, color: "#555", letterSpacing: "0.05em" }}>
            Film Persona
          </div>
        </div>

        {/* Centre — persona name + snippet */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#4a5568",
            }}
          >
            You are
          </div>
          <div
            style={{
              fontSize: persona.length > 20 ? 64 : 80,
              fontWeight: 900,
              lineHeight: 1.0,
              color: "#f1f5f9",
              letterSpacing: "-1px",
            }}
          >
            {persona}
          </div>
          {snippet && (
            <div
              style={{
                fontSize: 22,
                color: "#94a3b8",
                lineHeight: 1.55,
                maxWidth: 900,
                fontWeight: 400,
              }}
            >
              {snippet}
            </div>
          )}
        </div>

        {/* Bottom row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 16, color: "#374151" }}>movieclerk.app</div>
          <div
            style={{
              fontSize: 14,
              color: "#e50914",
              letterSpacing: "0.1em",
              fontWeight: 600,
            }}
          >
            {dna.rating_count} films rated
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
