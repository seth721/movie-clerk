// Simple module-level in-memory cache with TTL.
// In production Next.js handles caching via `revalidate`, but in dev mode
// every request re-runs the route. This cache prevents scrapers from hitting
// external sites on every page load during development.

interface CacheEntry {
  data: unknown;
  expires: number;
}

const store = new Map<string, CacheEntry>();

export function getCached<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry || Date.now() > entry.expires) return null;
  return entry.data as T;
}

export function setCached(key: string, data: unknown, ttlSeconds: number): void {
  store.set(key, { data, expires: Date.now() + ttlSeconds * 1000 });
}
