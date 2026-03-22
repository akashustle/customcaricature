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
      // First try DB config
      const { data } = await supabase
        .from("admin_site_settings")
        .select("value")
        .eq("id", "onesignal_config")
        .maybeSingle();

      let appId = "";
      if (data?.value) {
        const config = data.value as any;
        if (config.enabled && config.app_id) {
          appId = config.app_id;
        }
      }
      
      // Fallback to hardcoded app ID
      if (!appId) {
        appId = "d5da4d00-44cc-4ea0-b231-c66129f599f3";
      }

      if (appId) {
        await initOneSignal(appId);
        // Delay to let SDK fully init before prompting
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
