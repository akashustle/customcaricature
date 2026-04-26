/**
 * In-memory request cache with de-duplication.
 *
 * Two problems this solves:
 *   1. Multiple components / hooks fetching the same key in the same tick
 *      → only the first network call is fired; the rest await its promise.
 *   2. Switching tabs in the dashboard re-mounts components and triggers
 *      identical queries again → we serve the cached value synchronously
 *      (within `staleMs`) and never show shimmer placeholders again.
 *
 * Designed to wrap raw `supabase.from(...).select(...)` calls without forcing
 * a full migration to react-query — components keep their existing useState
 * patterns but never re-fetch unnecessarily.
 */

type Entry<T> = {
  data: T;
  fetchedAt: number;
};

const cache = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

const DEFAULT_STALE_MS = 60_000; // 1 minute — tabs feel instant on revisit

export interface CachedFetchOptions {
  /** How long the cached value is considered fresh (ms). */
  staleMs?: number;
  /** Force a network round-trip even if cached. */
  force?: boolean;
}

export const cachedFetch = async <T>(
  key: string,
  loader: () => Promise<T>,
  opts: CachedFetchOptions = {},
): Promise<T> => {
  const staleMs = opts.staleMs ?? DEFAULT_STALE_MS;
  const now = Date.now();
  const hit = cache.get(key) as Entry<T> | undefined;

  if (!opts.force && hit && now - hit.fetchedAt < staleMs) {
    return hit.data;
  }

  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing && !opts.force) return existing;

  const promise = (async () => {
    try {
      const data = await loader();
      cache.set(key, { data, fetchedAt: Date.now() });
      return data;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
};

/** Synchronously read a cached value without firing a request. */
export const peekCache = <T>(key: string): T | undefined => {
  const hit = cache.get(key) as Entry<T> | undefined;
  return hit?.data;
};

/** Invalidate one key (or every key with the given prefix). */
export const invalidateCache = (keyOrPrefix: string, prefix = false) => {
  if (!prefix) {
    cache.delete(keyOrPrefix);
    inflight.delete(keyOrPrefix);
    return;
  }
  for (const k of Array.from(cache.keys())) {
    if (k.startsWith(keyOrPrefix)) cache.delete(k);
  }
  for (const k of Array.from(inflight.keys())) {
    if (k.startsWith(keyOrPrefix)) inflight.delete(k);
  }
};

/** Manually warm a cache entry (used by route prefetcher). */
export const seedCache = <T>(key: string, data: T) => {
  cache.set(key, { data, fetchedAt: Date.now() });
};
