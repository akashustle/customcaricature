import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MaintenanceState {
  isEnabled: boolean;
  title: string;
  message: string;
  estimatedEnd: string | null;
}

// Module-level cache per pageId
const maintenanceCache = new Map<string, { state: MaintenanceState; ts: number }>();
const CACHE_TTL = 30_000; // 30s

export const useMaintenanceCheck = (pageId: string): MaintenanceState & { loading: boolean } => {
  const cached = maintenanceCache.get(pageId);
  const [state, setState] = useState<MaintenanceState>(
    cached && Date.now() - cached.ts < CACHE_TTL
      ? cached.state
      : { isEnabled: false, title: "Under Maintenance", message: "Please check back soon.", estimatedEnd: null }
  );
  const [loading, setLoading] = useState(!(cached && Date.now() - cached.ts < CACHE_TTL));
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

      const { data } = await supabase
        .from("maintenance_settings")
        .select("*")
        .in("id", ["global", pageId]);

      if (!data) { if (mounted) setLoading(false); return; }

      const global = data.find(d => d.id === "global");
      const page = data.find(d => d.id === pageId);

      // Check admin bypass via cached session (avoid extra auth call)
      const sessionData = await supabase.auth.getSession();
      const userId = sessionData.data.session?.user?.id;
      if (userId) {
        const { data: roles } = await supabase
          .from("user_roles").select("role").eq("user_id", userId);
        if (roles?.some(r => r.role === "admin")) {
          const result = { isEnabled: false, title: "", message: "", estimatedEnd: null };
          maintenanceCache.set(pageId, { state: result, ts: Date.now() });
          if (mounted) { setState(result); setLoading(false); }
          return;
        }
      }

      const isAllowed = (setting: any) => {
        if (!setting?.allowed_user_ids?.length) return false;
        return userId && setting.allowed_user_ids.includes(userId);
      };

      // Auto-disable expired maintenance
      const checkExpired = async (setting: any) => {
        if (!setting?.is_enabled) return false;
        if (setting?.estimated_end && new Date(setting.estimated_end).getTime() <= Date.now()) {
          await supabase.from("maintenance_settings").update({ is_enabled: false, updated_at: new Date().toISOString() } as any).eq("id", setting.id);
          return false;
        }
        return true;
      };

      const globalEnabled = await checkExpired(global);
      const pageEnabled = await checkExpired(page);

      let result: MaintenanceState = { isEnabled: false, title: "", message: "", estimatedEnd: null };

      if (globalEnabled && !isAllowed(global)) {
        result = { isEnabled: true, title: global?.title || "Site Under Maintenance", message: global?.message || "Please check back soon.", estimatedEnd: global?.estimated_end };
      } else if (pageEnabled && !isAllowed(page)) {
        result = { isEnabled: true, title: page?.title || "Under Maintenance", message: page?.message || "Please check back soon.", estimatedEnd: page?.estimated_end };
      }

      maintenanceCache.set(pageId, { state: result, ts: Date.now() });
      if (mounted) { setState(result); setLoading(false); }
    };

    check();

    // Reduced polling: 2 minutes instead of 60s
    const iv = setInterval(check, 120_000);

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

export default useMaintenanceCheck;
