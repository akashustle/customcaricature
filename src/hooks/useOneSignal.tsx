import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { initOneSignal, setOneSignalExternalId, removeOneSignalExternalId, promptOneSignalPush, setOneSignalTags } from "@/lib/onesignal";

export const useOneSignal = () => {
  const { user } = useAuth();
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      // Check if OneSignal is enabled in admin settings
      const { data } = await supabase
        .from("admin_site_settings")
        .select("value")
        .eq("id", "onesignal_config")
        .maybeSingle();

      let appId = "";
      if (data?.value) {
        const config = data.value as any;
        // Only init if explicitly enabled
        if (!config.enabled) {
          console.log("OneSignal disabled by admin");
          return;
        }
        if (config.app_id) {
          appId = config.app_id;
        }
      } else {
        // No config found = disabled by default now
        console.log("OneSignal not configured, skipping");
        return;
      }

      if (appId) {
        await initOneSignal(appId);
        setTimeout(() => promptOneSignalPush(), 3000);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (user) {
      setOneSignalExternalId(user.id);
      if (user.email) {
        setOneSignalTags({ email: user.email });
      }
      // Fetch profile for name tag
      supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.full_name) {
            setOneSignalTags({ name: data.full_name });
          }
        });
    } else {
      removeOneSignalExternalId();
    }
  }, [user]);
};
