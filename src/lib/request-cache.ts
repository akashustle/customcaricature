/**
 * Offline-first request cache with de-duplication and burst detection.
 *
 * Layers:
 *   1. In-memory Map     → instant synchronous reads (peekCache).
 *   2. localStorage      → survives reloads & flaky networks (offline-first).
 *   3. Inflight Map      → de-dupes concurrent loaders for the same key.
 *   4. Burst counter     → reports when a key is hit too often per minute,
 *                          surfaced through error-reporter for diagnostics.
 *
 * Components keep their existing `useState` patterns and never need to
 * migrate to react-query — they just wrap their loaders in `cachedFetch`.
 */

import { reportBurst } from "./error-reporter";

type Entry<T> = {
  data: T;
  fetchedAt: number;
};

const cache = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

const DEFAULT_STALE_MS = 60_000; // 1 minute — tabs feel instant on revisit
const PERSIST_PREFIX = "ccc:cache:";
const PERSIST_TTL_MS = 24 * 60 * 60 * 1000; // 1 day on disk
const MAX_PERSIST_BYTES = 250_000; // refuse to write huge payloads

// ---- Burst detection ----------------------------------------------------
const burstCounters = new Map<string, { count: number; windowStart: number }>();
const BURST_WINDOW_MS = 60_000;
const BURST_THRESHOLD = 8;

const trackBurst = (key: string) => {
  const now = Date.now();
  const c = burstCounters.get(key);
  if (!c || now - c.windowStart > BURST_WINDOW_MS) {
    burstCounters.set(key, { count: 1, windowStart: now });
    return;
  }
  c.count += 1;
  if (c.count === BURST_THRESHOLD) {
    reportBurst(key, c.count, BURST_WINDOW_MS);
  }
};

// ---- localStorage helpers ----------------------------------------------
const safeWrite = (key: string, value: Entry<unknown>) => {
  if (typeof window === "undefined") return;
  try {
    const payload = JSON.stringify(value);
    if (payload.length > MAX_PERSIST_BYTES) return;
    localStorage.setItem(PERSIST_PREFIX + key, payload);
  } catch {
    // Quota exceeded or unavailable — fail silently
  }
};

const safeRead = <T>(key: string): Entry<T> | undefined => {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(PERSIST_PREFIX + key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Entry<T>;
    if (Date.now() - parsed.fetchedAt > PERSIST_TTL_MS) {
      localStorage.removeItem(PERSIST_PREFIX + key);
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
};

const safeDelete = (key: string) => {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(PERSIST_PREFIX + key); } catch { /* ignore */ }
};

// ---- Public API ---------------------------------------------------------
export interface CachedFetchOptions {
  /** How long the cached value is considered fresh (ms). */
  staleMs?: number;
  /** Force a network round-trip even if cached. */
  force?: boolean;
  /** Persist to localStorage (default true). Disable for very large payloads. */
  persist?: boolean;
}

export const cachedFetch = async <T>(
  key: string,
  loader: () => Promise<T>,
  opts: CachedFetchOptions = {},
): Promise<T> => {
  const staleMs = opts.staleMs ?? DEFAULT_STALE_MS;
  const persist = opts.persist !== false;
  const now = Date.now();

  // Hydrate memory cache from disk if needed
  let hit = cache.get(key) as Entry<T> | undefined;
  if (!hit && persist) {
    const persisted = safeRead<T>(key);
    if (persisted) {
      cache.set(key, persisted);
      hit = persisted;
    }
  }

  if (!opts.force && hit && now - hit.fetchedAt < staleMs) {
    return hit.data;
  }

  trackBurst(key);

  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing && !opts.force) return existing;

  const promise = (async () => {
    try {
      const data = await loader();
      const entry = { data, fetchedAt: Date.now() };
      cache.set(key, entry);
      if (persist) safeWrite(key, entry);
      return data;
    } catch (err) {
      // On network failure, fall back to stale persisted value if available.
      const stale = (cache.get(key) as Entry<T> | undefined) ?? safeRead<T>(key);
      if (stale) return stale.data;
      throw err;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
};

/** Synchronously read a cached value (memory first, then disk). */
export const peekCache = <T>(key: string): T | undefined => {
  const memHit = cache.get(key) as Entry<T> | undefined;
  if (memHit) return memHit.data;
  const diskHit = safeRead<T>(key);
  if (diskHit) {
    cache.set(key, diskHit);
    return diskHit.data;
  }
  return undefined;
};

/** Invalidate one key (or every key with the given prefix). */
export const invalidateCache = (keyOrPrefix: string, prefix = false) => {
  if (!prefix) {
    cache.delete(keyOrPrefix);
    inflight.delete(keyOrPrefix);
    safeDelete(keyOrPrefix);
    return;
  }
  for (const k of Array.from(cache.keys())) {
    if (k.startsWith(keyOrPrefix)) {
      cache.delete(k);
      safeDelete(k);
    }
  }
  for (const k of Array.from(inflight.keys())) {
    if (k.startsWith(keyOrPrefix)) inflight.delete(k);
  }
  // Also sweep persisted keys not yet pulled into memory
  if (typeof window !== "undefined") {
    try {
      const full = PERSIST_PREFIX + keyOrPrefix;
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith(full)) localStorage.removeItem(k);
      }
    } catch { /* ignore */ }
  }
};

/** Manually warm a cache entry (used by route prefetcher). */
export const seedCache = <T>(key: string, data: T) => {
  const entry = { data, fetchedAt: Date.now() };
  cache.set(key, entry);
  safeWrite(key, entry);
};
