import { useEffect } from "react";
import { initWebPush } from "@/lib/webpush";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useWebPush = () => {
  const { user } = useAuth();

  useEffect(() => {
    const init = async () => {
      // Check if web push is enabled in admin settings
      const { data } = await supabase
        .from("admin_site_settings")
        .select("value")
        .eq("id", "webpush_config")
        .maybeSingle();

      const config = data?.value as any;
      if (config?.enabled === false) return;

      // Initialize immediately — no delay, triggers browser prompt
      initWebPush(user?.id);
    };
    init();
  }, [user]);
};
