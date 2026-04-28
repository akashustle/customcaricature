import { useCallback, useEffect, useRef, useState } from "react";
import { cacheGet, cacheSet } from "@/lib/offline-cache";

/**
 * useOfflineCache — drop-in cache layer for any Supabase fetch.
 *
 * Usage:
 *   const { data, loading, fromCache, refresh } = useOfflineCache(
 *     "admin:events:upcoming",
 *     async () => {
 *       const { data, error } = await supabase.from("event_bookings").select("*");
 *       if (error) throw error;
 *       return data;
 *     }
 *   );
 *
 * Behavior:
 *   1. Mount → instantly hydrates from IndexedDB if cache exists (zero spinner).
 *   2. Then triggers network fetch in background.
 *   3. On success → updates state + persists to IndexedDB.
 *   4. On failure (offline) → keeps cached data, sets `fromCache=true`.
 */
export function useOfflineCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts: { enabled?: boolean } = {},
) {
  const enabled = opts.enabled !== false;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const fresh = await fetcherRef.current();
      setData(fresh);
      setFromCache(false);
      setError(null);
      cacheSet(key, fresh);
    } catch (e) {
      setError(e as Error);
      // keep cached data visible, just mark as stale
      const cached = await cacheGet<T>(key);
      if (cached) {
        setData(cached.value);
        setFromCache(true);
      }
    } finally {
      setLoading(false);
    }
  }, [key, enabled]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      const cached = await cacheGet<T>(key);
      if (cached && !cancelled) {
        setData(cached.value);
        setFromCache(true);
        setLoading(false);
      }
      refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [key, enabled, refresh]);

  return { data, loading, fromCache, error, refresh };
}
