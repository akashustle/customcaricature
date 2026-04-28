import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSharedChannel } from "@/hooks/useSharedChannel";

export type HomepageBlock = {
  id: string;
  block_type: string;
  variant: string | null;
  title: string | null;
  content: Record<string, any>;
  is_visible: boolean;
  sort_order: number;
  updated_at: string;
};

let cache: HomepageBlock[] | null = null;
let lastFetch = 0;
const TTL = 30_000;
let inflight: Promise<HomepageBlock[]> | null = null;

const fetchOnce = async (): Promise<HomepageBlock[]> => {
  const now = Date.now();
  if (cache && now - lastFetch < TTL) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { data } = await supabase
        .from("homepage_blocks")
        .select("*")
        .order("sort_order", { ascending: true });
      cache = (data || []) as HomepageBlock[];
      lastFetch = Date.now();
      return cache;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
};

export const invalidateHomepageBlocks = () => {
  cache = null;
  lastFetch = 0;
};

export const useHomepageBlocks = (opts?: { onlyVisible?: boolean }) => {
  const [blocks, setBlocks] = useState<HomepageBlock[]>(cache || []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let mounted = true;
    fetchOnce().then(b => {
      if (mounted) {
        setBlocks(b);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  useSharedChannel(() => {
    invalidateHomepageBlocks();
    fetchOnce().then(b => setBlocks(b));
  }, { table: "homepage_blocks" });

  const refetch = async () => {
    invalidateHomepageBlocks();
    const b = await fetchOnce();
    setBlocks(b);
  };

  const filtered = opts?.onlyVisible ? blocks.filter(b => b.is_visible) : blocks;
  return { blocks: filtered, loading, refetch };
};
