export interface PhysicalRelease {
  title: string;
  format: "4K Ultra HD" | "Blu-ray" | "DVD";
  label: string | null;
  releaseDate: string | null;
  url: string;
}

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Connection: "keep-alive",
};

function detectFormat(text: string, url = ""): PhysicalRelease["format"] {
  const t = (text + " " + url).toLowerCase();
  if (t.includes("4k") || t.includes("uhd") || t.includes("ultra hd")) return "4K Ultra HD";
  if (t.includes("blu-ray") || t.includes("bluray") || t.includes("blu ray")) return "Blu-ray";
  return "DVD";
}

function normalizeTitle(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function searchBluray(
  title: string,
  year: number
): Promise<{ url: string; linkText: string }[]> {
  const query = encodeURIComponent(`${title} ${year}`);
  const searchUrl = `https://www.blu-ray.com/search/?quicksearch=1&quicksearch_keyword=${query}&section=bluraymovies`;

  const res = await fetch(searchUrl, { headers: HEADERS });
  if (!res.ok) return [];

  const html = await res.text();

  // Results use <a href="..." title="Movie Title (year)"> with an img inside
  const linkRegex =
    /<a[^>]+href="(https?:\/\/www\.blu-ray\.com\/movies\/([^"]+)\/(\d+)\/)"[^>]+title="([^"]+)"[^>]*>/gi;
  const results: { url: string; linkText: string }[] = [];
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const [, url, , , titleAttr] = match;
    const text = titleAttr.trim();
    if (
      text.includes(String(year)) &&
      !url.includes("/reviews/") &&
      !url.includes("/news/") &&
      !url.includes("Collection")
    ) {
      results.push({ url, linkText: text });
    }
  }

  return results;
}

async function fetchReleaseDetails(
  url: string
): Promise<{ label: string | null; releaseDate: string | null }> {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) return { label: null, releaseDate: null };

  const html = await res.text();

  let label: string | null = null;
  let releaseDate: string | null = null;

  // Primary pattern: <a class="grey" href="...?studioid=...">Studio Name</a>
  const studioMatch = html.match(
    /<a[^>]+href="[^"]*studioid=\d+[^"]*"[^>]*>([^<]{2,60})<\/a>/i
  );
  if (studioMatch) {
    label = studioMatch[1].trim();
  }

  // Release date — appears as a grey link: <a class="grey noline" ... title="Movie Title Release Date Month Day, Year" ...>Mon DD, YYYY</a>
  const dateMatch = html.match(
    /title="[^"]*Release Date ([A-Z][a-z]+ \d{1,2},? \d{4})"[^>]*>([^<]+)<\/a>/i
  );
  if (dateMatch) {
    releaseDate = dateMatch[1].trim();
  }

  return { label, releaseDate };
}

export async function getPhysicalReleases(
  title: string,
  year: number
): Promise<PhysicalRelease[]> {
  try {
    const searchResults = await searchBluray(title, year);
    if (!searchResults.length) return [];

    const normTitle = normalizeTitle(title);

    const scored = searchResults
      .map((r) => {
        const norm = normalizeTitle(r.linkText);
        const titleMatch = norm.includes(normTitle) ? 1 : 0;
        const is4K = r.linkText.toLowerCase().includes("4k") ? 2 : 0;
        const isBluray = r.linkText.toLowerCase().includes("blu-ray") ? 1 : 0;
        return { ...r, score: titleMatch * 10 + is4K + isBluray };
      })
      .filter((r) => r.score >= 10) // must have a real title match
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    const releases: PhysicalRelease[] = [];
    const seen = new Set<string>();

    for (const result of scored.slice(0, 3)) {
      const format = detectFormat(result.linkText, result.url);
      if (seen.has(format)) continue;
      seen.add(format);

      const { label, releaseDate } = await fetchReleaseDetails(result.url);
      releases.push({
        title: result.linkText,
        format,
        label,
        releaseDate,
        url: result.url,
      });
    }

    return releases;
  } catch (err) {
    console.error("getPhysicalReleases error:", err);
    return [];
  }
}
