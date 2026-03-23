import { useEffect, useRef } from "react";
import { initWebPush } from "@/lib/webpush";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useWebPush = () => {
  const initRef = useRef(false);
  const { user } = useAuth();

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      // Check if built-in web push is enabled
      const { data } = await supabase
        .from("admin_site_settings")
        .select("value")
        .eq("id", "webpush_config")
        .maybeSingle();

      const config = data?.value as any;
      if (config?.enabled === false) return; // Default enabled

      // Delay to not block initial load
      setTimeout(() => initWebPush(user?.id), 3000);
    };
    init();
  }, [user]);
};
