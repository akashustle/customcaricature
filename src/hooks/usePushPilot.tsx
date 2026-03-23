import { useEffect, useRef } from "react";
import { initPushPilot } from "@/lib/pushpilot";
import { supabase } from "@/integrations/supabase/client";

export const usePushPilot = () => {
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      // Check if PushPilot is enabled in admin settings
      const { data } = await supabase
        .from("admin_site_settings")
        .select("value")
        .eq("id", "pushpilot_config")
        .maybeSingle();

      const config = data?.value as any;
      if (config?.enabled !== false) {
        // Default enabled unless explicitly disabled
        setTimeout(() => initPushPilot(), 3000);
      }
    };
    init();
  }, []);
};
