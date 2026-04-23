import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Per-key cache so multiple components requesting the same key share a single fetch.
const cache = new Map<string, any>();
const inflight = new Map<string, Promise<any>>();

const fetchKey = async (key: string) => {
  if (cache.has(key)) return cache.get(key);
  if (inflight.has(key)) return inflight.get(key);
  const p = (async () => {
    const { data } = await supabase
      .from("admin_site_settings")
      .select("value")
      .eq("id", key)
      .maybeSingle();
    cache.set(key, data?.value ?? null);
    inflight.delete(key);
    return data?.value ?? null;
  })();
  inflight.set(key, p);
  return p;
};

/**
 * Lightweight hook for reading any single editable JSON setting from admin_site_settings.
 * Subscribes to realtime updates so admin edits propagate instantly.
 */
export function useSiteSetting<T = any>(key: string, fallback: T): T {
  const [value, setValue] = useState<T>((cache.get(key) as T) ?? fallback);

  useEffect(() => {
    let mounted = true;
    fetchKey(key).then((v) => {
      if (mounted && v) setValue(v as T);
    });
    const ch = supabase
      .channel(`site-setting-${key}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_site_settings", filter: `id=eq.${key}` },
        (payload: any) => {
          const v = payload.new?.value;
          if (v) {
            cache.set(key, v);
            if (mounted) setValue(v);
          }
        }
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [key]);

  return value;
}
