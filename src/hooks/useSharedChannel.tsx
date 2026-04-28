import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shared Supabase realtime channel manager.
 *
 * Multiple components subscribing to the same `(schema, table, event)` triple
 * are de-duplicated into ONE Supabase channel + websocket frame. Each component
 * receives its own callback. The channel is torn down only when the last
 * subscriber unmounts. This dramatically reduces redundant subscriptions
 * across pages where many hooks listen to the same content tables
 * (admin_site_settings, homepage_blocks, content_blocks, pricing, etc.).
 *
 * Limitation: filters (e.g. `user_id=eq.X`) are not pooled — each unique
 * filter still gets its own channel, which is the correct behaviour.
 */

type Listener = (payload: any) => void;

interface PoolEntry {
  channel: ReturnType<typeof supabase.channel>;
  listeners: Set<Listener>;
  refCount: number;
}

const POOL = new Map<string, PoolEntry>();

const buildKey = (
  table: string,
  event: "INSERT" | "UPDATE" | "DELETE" | "*",
  schema: string,
  filter?: string,
) => `${schema}.${table}.${event}.${filter ?? ""}`;

interface UseSharedChannelOptions {
  table: string;
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  schema?: string;
  filter?: string;
  /** Optional dependency array — re-subscribes when these change */
  deps?: any[];
}

export function useSharedChannel(
  callback: Listener,
  { table, event = "*", schema = "public", filter, deps = [] }: UseSharedChannelOptions,
) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    const key = buildKey(table, event, schema, filter);
    let entry = POOL.get(key);

    const stableListener: Listener = (payload) => {
      try {
        cbRef.current(payload);
      } catch (err) {
        // never let a single listener break the broadcast loop
        // eslint-disable-next-line no-console
        console.warn("[useSharedChannel] listener threw", err);
      }
    };

    if (!entry) {
      const listeners = new Set<Listener>();
      const channel = supabase
        .channel(`shared:${key}`)
        .on(
          "postgres_changes" as any,
          { event, schema, table, ...(filter ? { filter } : {}) },
          (payload: any) => {
            listeners.forEach((l) => l(payload));
          },
        )
        .subscribe();

      entry = { channel, listeners, refCount: 0 };
      POOL.set(key, entry);
    }

    entry.listeners.add(stableListener);
    entry.refCount += 1;

    return () => {
      const e = POOL.get(key);
      if (!e) return;
      e.listeners.delete(stableListener);
      e.refCount -= 1;
      if (e.refCount <= 0) {
        try {
          supabase.removeChannel(e.channel);
        } catch {
          /* noop */
        }
        POOL.delete(key);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, event, schema, filter, ...deps]);
}

/** For debugging — exposes current pool size */
export const getSharedChannelStats = () => ({
  channels: POOL.size,
  totalListeners: Array.from(POOL.values()).reduce((n, e) => n + e.listeners.size, 0),
});
