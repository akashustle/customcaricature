import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// Module-level cache
let cachedContent: Record<string, any> | null = null;
let contentFetchPromise: Promise<Record<string, any>> | null = null;
let lastContentFetch = 0;
const CACHE_TTL = 30_000;

const KEYS = [
  "homepage_hero", "homepage_video", "homepage_social_proof",
  "homepage_what_you_get", "homepage_why_us", "homepage_use_cases",
  "homepage_smart_help", "homepage_sticky_cta", "homepage_urgency",
  "homepage_instant_quote", "homepage_sections", "homepage_funnel_config"
];

const fetchContentOnce = async (): Promise<Record<string, any>> => {
  const now = Date.now();
  if (cachedContent && now - lastContentFetch < CACHE_TTL) return cachedContent;
  if (contentFetchPromise) return contentFetchPromise;

  contentFetchPromise = (async () => {
    try {
      const { data } = await supabase
        .from("admin_site_settings")
        .select("id, value")
        .in("id", KEYS);
      const map: Record<string, any> = {};
      if (data) data.forEach((row: any) => { map[row.id] = row.value; });
      cachedContent = map;
      lastContentFetch = Date.now();
      return map;
    } finally {
      contentFetchPromise = null;
    }
  })();
  return contentFetchPromise;
};

export const useHomepageContent = () => {
  const [content, setContent] = useState<Record<string, any>>(cachedContent || {});
  const [loading, setLoading] = useState(!cachedContent);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;
    fetchContentOnce().then(c => {
      if (mounted) { setContent(c); setLoading(false); }
    });

    if (!channelRef.current) {
      channelRef.current = supabase
        .channel("homepage-content-rt")
        .on("postgres_changes", { event: "*", schema: "public", table: "admin_site_settings" }, () => {
          lastContentFetch = 0;
          cachedContent = null;
          fetchContentOnce().then(c => { if (mounted) setContent(c); });
        })
        .subscribe();
    }

    return () => {
      mounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  const refetch = async () => {
    lastContentFetch = 0;
    cachedContent = null;
    const c = await fetchContentOnce();
    setContent(c);
  };

  return { content, loading, refetch };
};
