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
      // Check global + page-specific
      const { data } = await supabase
        .from("maintenance_settings")
        .select("*")
        .in("id", ["global", pageId]);

      if (!data) { setLoading(false); return; }

      const global = data.find(d => d.id === "global");
      const page = data.find(d => d.id === pageId);

      // Check if current user is in allowed list
      const isAllowed = (setting: any) => {
        if (!setting?.allowed_user_ids || setting.allowed_user_ids.length === 0) return false;
        return user && setting.allowed_user_ids.includes(user.id);
      };

      // Admin users bypass maintenance
      if (user) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        const isAdmin = roles?.some(r => r.role === "admin");
        if (isAdmin) { setLoading(false); return; }
      }

      // Global takes priority
      if (global?.is_enabled && !isAllowed(global)) {
        setState({
          isEnabled: true,
          title: global.title || "Site Under Maintenance",
          message: global.message || "Please check back soon.",
          estimatedEnd: global.estimated_end,
        });
      } else if (page?.is_enabled && !isAllowed(page)) {
        setState({
          isEnabled: true,
          title: page.title || "Under Maintenance",
          message: page.message || "Please check back soon.",
          estimatedEnd: page.estimated_end,
        });
      }

      setLoading(false);
    };
    check();
  }, [pageId, user]);

  return { ...state, loading };
};

export default useMaintenanceCheck;