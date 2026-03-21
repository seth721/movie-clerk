import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { TasteProfile, Recommendation } from "@/types";
import { formatProfileForClaude } from "./recommendations";

// process.env.ANTHROPIC_API_KEY is blanked by the Claude Code dev environment.
// Read it lazily from .env.local so it still works in development.
function readApiKey(): string {
  const envVal = process.env.ANTHROPIC_API_KEY;
  if (envVal) return envVal;
  try {
    const envFile = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
    const match = envFile.match(/^ANTHROPIC_API_KEY=(.+)$/m);
    return match ? match[1].trim() : "";
  } catch {
    return "";
  }
}

function getClient() {
  return new Anthropic({ apiKey: readApiKey() });
}

interface CandidateMovie {
  tmdb_id: number;
  title: string;
  year: number | null;
  overview: string | null;
  genres: string[];
  director: string | null;
  cast: string[];
  vote_average: number | null;
  vote_count: number | null;
  content_score: number; // pre-computed content score
}

interface ClaudeRecommendation {
  tmdb_id: number;
  rank: number;
  score: number;
  explanation: string;
}

/**
 * Ask Claude to rank and explain recommendations from a candidate pool.
 * Uses streaming + adaptive thinking (Opus 4.6).
 */
export async function getRankedRecommendations(
  candidates: CandidateMovie[],
  profile: TasteProfile,
  count: number = 20,
  tasteDna?: string,
  mood?: string
): Promise<ClaudeRecommendation[]> {
  // Film Persona DNA is the primary signal; the structured profile adds specifics
  const profileText = tasteDna
    ? `# VIEWER FILM PERSONA (primary signal — weight this heavily)\n\n${tasteDna}\n\n---\n\n# SUPPLEMENTARY TASTE DATA\n\n${formatProfileForClaude(profile)}`
    : formatProfileForClaude(profile);

  // Format candidates as a numbered list for Claude
  const candidateList = candidates
    .slice(0, 40) // limit context size
    .map(
      (c, i) =>
        `${i + 1}. [ID:${c.tmdb_id}] ${c.title}${c.year ? ` (${c.year})` : ""}
   Genres: ${c.genres.join(", ") || "unknown"}
   Director: ${c.director || "unknown"}
   Stars: ${c.cast.slice(0, 3).join(", ") || "unknown"}
   TMDB rating: ${c.vote_average?.toFixed(1) ?? "?"}/10 (${c.vote_count?.toLocaleString() ?? "?"} votes)
   Synopsis: ${(c.overview ?? "No synopsis available.").slice(0, 150)}
   Content match score: ${c.content_score.toFixed(2)}`
    )
    .join("\n\n");

  const moodBlock = mood
    ? `\n\n# TONIGHT'S MOOD (override — prioritise this above everything else)\n\nThe viewer has told you what they're in the mood for right now: "${mood}"\n\nLet this heavily influence your selection and ranking. Films that satisfy this mood should rank higher even if they score slightly lower on the long-term taste profile.`
    : "";

  const systemPrompt = `You are a world-class film critic and personal recommendation engine. Your job is to study a viewer's complete taste profile and select the films they are most likely to love.

SELECTION RULES:
- DO NOT recommend films tonally, thematically, or stylistically similar to anything in the "rated poorly" list.
- Respect era preferences — avoid decades they consistently rate low.
- Respect the mainstream/arthouse calibration precisely.

EXPLANATION RULES — these are non-negotiable:
- ALWAYS open with a direct, named reference to a specific film or filmmaker from their actual rated list. Use their ratings as evidence. Examples of strong openers: "Given your 5★ for Mulholland Drive...", "You rewatched GoodFellas, which tells us...", "Your 4.5★ for Parasite and consistent love of Bong Joon-ho..."
- The connection must be EARNED — explain the specific reason their love of Film X predicts they'll love this recommendation (shared themes, director lineage, tonal overlap, structural similarity).
- Write in second person ("you", "your"). Be direct and confident.
- Never hedge with "you might enjoy" or "if you like". State it.
- Never mention TMDB ratings, vote counts, or algorithmic scores in the explanation.
- 3–4 sentences. First sentence names the personal connection. Remaining sentences deepen it.

EXAMPLE OF A GREAT EXPLANATION:
"Given your 5★ for Mulholland Drive and your rewatch of Blue Velvet, the uncanny dread running through this film should feel immediately familiar — it operates in the same register of beautiful surfaces concealing psychological violence. The director has cited Lynch explicitly, and the film's fractured timeline and dream-logic editing show it. Your consistent love of films that withhold easy resolution makes this the natural next watch."

EXAMPLE OF A BAD EXPLANATION (never write like this):
"This acclaimed thriller has strong performances and a gripping plot that fans of crime films tend to enjoy. Its critical acclaim makes it a solid recommendation for viewers who appreciate quality cinema."

${profileText}${moodBlock}

You MUST respond with valid JSON only — no markdown, no prose outside the JSON.`;

  const userPrompt = `From the ${candidates.length} candidate films below, select the ${count} best recommendations for this viewer. Rank them from most to least recommended.

For each pick, write a 3–4 sentence explanation that:
1. Opens by naming a specific film or director from their rated list and stating the direct connection
2. Deepens the connection — shared themes, tonal overlap, directorial lineage, structural parallels
3. Makes clear why THIS viewer specifically (not film fans in general) will respond to it${mood ? `\n4. If relevant, ties it to their mood tonight: "${mood}"` : ""}

Confidence score: 0.0–1.0

CANDIDATE FILMS:
${candidateList}

Respond with this exact JSON structure:
{
  "recommendations": [
    {
      "tmdb_id": <number>,
      "rank": <1-${count}>,
      "score": <0.0-1.0>,
      "explanation": "<3-4 sentence personal explanation opening with a specific film/director reference>"
    }
  ]
}`;

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  // Parse JSON — strip any accidental markdown fences
  const rawText = textBlock.text.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");

  const parsed = JSON.parse(rawText) as {
    recommendations: ClaudeRecommendation[];
  };

  return parsed.recommendations
    .filter((r) => r.tmdb_id && r.explanation)
    .sort((a, b) => a.rank - b.rank);
}

// ── Film Quest Narrative ──────────────────────────────────────────────────────

type QuestNarrativeInput =
  | { type: "opening"; directorName: string; questTitle: string; totalFilms: number; nextFilm: string }
  | { type: "chapter"; directorName: string; filmTitle: string; filmYear?: number | null; rating: number; filmsRemaining: number; nextFilm: string | null }
  | { type: "finale"; directorName: string; questTitle: string };

export async function generateQuestNarrative(input: QuestNarrativeInput): Promise<string> {
  let prompt = "";

  if (input.type === "opening") {
    prompt = `You are the Movie Clerk — a wisecracking, film-obsessed clerk in a 16-bit video store RPG. Write the opening narration for a film quest.

Quest: "${input.questTitle}"
Director: ${input.directorName}
Films to watch: ${input.totalFilms}
First film: ${input.nextFilm}

Write 2-3 sentences of text adventure narration in second person. Lean into the 16-bit RPG aesthetic — like a quest being issued. Reference the director's style or reputation. End by sending the player toward the first film.

Keep it punchy, playful, in character. No quotes around the response.`;
  }

  if (input.type === "chapter") {
    const stars = "★".repeat(Math.floor(input.rating)) + (input.rating % 1 >= 0.5 ? "½" : "");
    prompt = `You are the Movie Clerk — a wisecracking, film-obsessed clerk in a 16-bit video store RPG. Write a chapter beat for a film quest.

Film just watched: ${input.filmTitle}${input.filmYear ? ` (${input.filmYear})` : ""}
Rating given: ${stars} (${input.rating}/5)
Films remaining: ${input.filmsRemaining}
${input.nextFilm ? `Next film: ${input.nextFilm}` : "This was the last film."}

Write 2-3 sentences of text adventure narration in second person. Acknowledge the film they just watched in a way that reflects their rating (high rating = impressed clerk, low rating = the clerk shrugs). If there's a next film, hint at what awaits.

Keep it punchy, in 16-bit RPG voice. No quotes around the response.`;
  }

  if (input.type === "finale") {
    prompt = `You are the Movie Clerk — a wisecracking, film-obsessed clerk in a 16-bit video store RPG. Write the finale narration for a completed film quest.

Quest completed: "${input.questTitle}"
Director: ${input.directorName}

Write 2-3 sentences celebrating the completed quest. RPG victory screen energy. The clerk is impressed. Make it feel earned.

No quotes around the response.`;
  }

  const response = await getClient().messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") return "";
  return text.text.trim();
}

// ── Taste DNA ─────────────────────────────────────────────────────────────────

interface RatedFilmForDna {
  title: string;
  year: number | null;
  rating: number;
  genres: string[];
  director: string | null;
}

export interface FilmPersona {
  persona: string;   // e.g. "Stanley Kubrick", "Travis Bickle", "Cate Blanchett"
  dna: string;       // flowing prose paragraphs
}

/**
 * Generate a Film Persona (persona name + written taste profile) from the user's ratings.
 */
export async function generateTasteDna(ratings: RatedFilmForDna[]): Promise<FilmPersona> {
  const sorted = [...ratings].sort((a, b) => b.rating - a.rating);

  const filmList = sorted
    .map((r) => {
      const stars = "★".repeat(Math.floor(r.rating)) + (r.rating % 1 >= 0.5 ? "½" : "");
      const meta = [r.director, r.genres.slice(0, 2).join("/")].filter(Boolean).join(" · ");
      return `${r.title}${r.year ? ` (${r.year})` : ""} — ${stars}${meta ? `  [${meta}]` : ""}`;
    })
    .join("\n");

  const prompt = `You are a perceptive film critic who has been handed someone's complete film diary. Study their ratings carefully and write their Film Persona.

Here are all ${ratings.length} films they've rated (sorted highest to lowest):

${filmList}

Return a JSON object with exactly two fields:

1. "persona": A single name — a real director, real actor, or famous fictional film character — that best captures the soul of this person's taste. It should feel like a revelation, not just a description. Examples: "Stanley Kubrick", "Travis Bickle", "Wong Kar-wai", "Marge Gunderson", "Pauline Kael". Pick the single most fitting name — no explanation, just the name.

2. "dna": 3–4 paragraphs of flowing prose that captures:
   - Their core cinematic sensibility — what moves them, what they respond to
   - Patterns in what they love vs. dislike — thematic, stylistic, tonal, directorial
   - The texture of their taste — era, language, pace, mood
   - What they're probably looking for when they sit down to watch a film

   Rules for the prose:
   - Write in second person ("You gravitate toward...", "Your highest ratings reveal...")
   - Be specific — reference actual films and directors from their list
   - Be insightful and a little bold
   - No bullet points, no headers. Flowing prose only.
   - Separate paragraphs with a blank line.

Return only valid JSON. No markdown, no extra text.`;

  const response = await getClient().messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1400,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("No response from Claude");

  const raw = text.text.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
  const parsed = JSON.parse(raw) as { persona: string; dna: string };
  return { persona: parsed.persona.trim(), dna: parsed.dna.trim() };
}
