import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MaintenanceState {
  isEnabled: boolean;
  title: string;
  message: string;
  estimatedEnd: string | null;
}

const DEFAULT_STATE: MaintenanceState = {
  isEnabled: false,
  title: "Under Maintenance",
  message: "Please check back soon.",
  estimatedEnd: null,
};

// Module-level cache per pageId — shared across all hook instances
const maintenanceCache = new Map<string, { state: MaintenanceState; ts: number }>();
const CACHE_TTL = 30_000;
// Track in-flight fetches to avoid duplicates
const inflightFetches = new Map<string, Promise<MaintenanceState>>();

export const useMaintenanceCheck = (pageId: string): MaintenanceState & { loading: boolean } => {
  const cached = maintenanceCache.get(pageId);
  const hasFreshCache = cached && Date.now() - cached.ts < CACHE_TTL;

  // Start with cached value or default (non-blocking — defaults to NOT in maintenance)
  const [state, setState] = useState<MaintenanceState>(hasFreshCache ? cached.state : DEFAULT_STATE);
  const [loading, setLoading] = useState(!hasFreshCache);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      // Check cache first
      const c = maintenanceCache.get(pageId);
      if (c && Date.now() - c.ts < CACHE_TTL) {
        if (mounted) { setState(c.state); setLoading(false); }
        return;
      }

      // Deduplicate in-flight fetches
      let fetchPromise = inflightFetches.get(pageId);
      if (!fetchPromise) {
        fetchPromise = fetchMaintenanceState(pageId);
        inflightFetches.set(pageId, fetchPromise);
        fetchPromise.finally(() => inflightFetches.delete(pageId));
      }

      const result = await fetchPromise;
      if (mounted) { setState(result); setLoading(false); }
    };

    check();

    // Reduced polling: 5 minutes (was 2 min) — realtime handles instant updates
    const iv = setInterval(check, 300_000);

    if (!channelRef.current) {
      channelRef.current = supabase
        .channel(`maintenance-${pageId}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "maintenance_settings" }, () => {
          maintenanceCache.delete(pageId);
          check();
        })
        .subscribe();
    }

    return () => {
      mounted = false;
      clearInterval(iv);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [pageId]);

  return { ...state, loading };
};

/** Fetches maintenance state without blocking render */
async function fetchMaintenanceState(pageId: string): Promise<MaintenanceState> {
  try {
    const { data } = await supabase
      .from("maintenance_settings")
      .select("*")
      .in("id", ["global", pageId]);

    if (!data) return DEFAULT_STATE;

    const global = data.find(d => d.id === "global");
    const page = data.find(d => d.id === pageId);

    // Use cached session (no network call) for admin bypass
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    if (userId) {
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", userId);
      if (roles?.some(r => r.role === "admin")) {
        const result = DEFAULT_STATE;
        maintenanceCache.set(pageId, { state: result, ts: Date.now() });
        return result;
      }
    }

    const isAllowed = (setting: any) => {
      if (!setting?.allowed_user_ids?.length) return false;
      return userId && setting.allowed_user_ids.includes(userId);
    };

    // Auto-disable expired maintenance (fire-and-forget)
    const isStillEnabled = (setting: any): boolean => {
      if (!setting?.is_enabled) return false;
      if (setting?.estimated_end && new Date(setting.estimated_end).getTime() <= Date.now()) {
        // Fire-and-forget — don't await
        supabase.from("maintenance_settings").update({
          is_enabled: false,
          updated_at: new Date().toISOString(),
        } as any).eq("id", setting.id).then(() => {});
        return false;
      }
      return true;
    };

    const globalEnabled = isStillEnabled(global);
    const pageEnabled = isStillEnabled(page);

    let result: MaintenanceState = DEFAULT_STATE;

    if (globalEnabled && !isAllowed(global)) {
      result = {
        isEnabled: true,
        title: global?.title || "Site Under Maintenance",
        message: global?.message || "Please check back soon.",
        estimatedEnd: global?.estimated_end,
      };
    } else if (pageEnabled && !isAllowed(page)) {
      result = {
        isEnabled: true,
        title: page?.title || "Under Maintenance",
        message: page?.message || "Please check back soon.",
        estimatedEnd: page?.estimated_end,
      };
    }

    maintenanceCache.set(pageId, { state: result, ts: Date.now() });
    return result;
  } catch {
    return DEFAULT_STATE;
  }
}

export default useMaintenanceCheck;
