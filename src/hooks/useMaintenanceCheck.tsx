import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface MaintenanceState {
  isEnabled: boolean;
  title: string;
  message: string;
  estimatedEnd: string | null;
}

export const useMaintenanceCheck = (pageId: string): MaintenanceState & { loading: boolean } => {
  const [state, setState] = useState<MaintenanceState>({
    isEnabled: false,
    title: "Under Maintenance",
    message: "Please check back soon.",
    estimatedEnd: null,
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase
        .from("maintenance_settings")
        .select("*")
        .in("id", ["global", pageId]);

      if (!data) { setLoading(false); return; }

      const global = data.find(d => d.id === "global");
      const page = data.find(d => d.id === pageId);

      const isAllowed = (setting: any) => {
        if (!setting?.allowed_user_ids || setting.allowed_user_ids.length === 0) return false;
        return user && setting.allowed_user_ids.includes(user.id);
      };

      // Admin bypass
      if (user) {
        const { data: roles } = await supabase
          .from("user_roles").select("role").eq("user_id", user.id);
        const isAdmin = roles?.some(r => r.role === "admin");
        if (isAdmin) { setLoading(false); return; }
      }

      // Check if estimated_end has passed — auto-disable immediately
      const checkAutoDisable = async (setting: any) => {
        if (!setting?.is_enabled) return false;
        if (setting?.estimated_end) {
          const end = new Date(setting.estimated_end);
          if (end.getTime() <= Date.now()) {
            await supabase.from("maintenance_settings").update({ is_enabled: false, updated_at: new Date().toISOString() } as any).eq("id", setting.id);
            return false;
          }
        }
        return true;
      };

      const globalEnabled = await checkAutoDisable(global);
      const pageEnabled = await checkAutoDisable(page);

      // Global takes priority — blocks ALL pages
      if (globalEnabled && !isAllowed(global)) {
        setState({
          isEnabled: true,
          title: global?.title || "Site Under Maintenance",
          message: global?.message || "Please check back soon.",
          estimatedEnd: global?.estimated_end,
        });
      } else if (pageEnabled && !isAllowed(page)) {
        setState({
          isEnabled: true,
          title: page?.title || "Under Maintenance",
          message: page?.message || "Please check back soon.",
          estimatedEnd: page?.estimated_end,
        });
      }

      setLoading(false);
    };
    check();

    // Re-check periodically for auto-disable
    const iv = setInterval(check, 30000);
    return () => clearInterval(iv);
  }, [pageId, user]);

  return { ...state, loading };
};

export default useMaintenanceCheck;
