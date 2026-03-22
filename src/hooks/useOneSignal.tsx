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

    // Fetch OneSignal config from admin settings
    const init = async () => {
      const { data } = await supabase
        .from("admin_site_settings")
        .select("value")
        .eq("id", "onesignal_config")
        .maybeSingle();

      if (data?.value) {
        const config = data.value as any;
        if (config.enabled && config.app_id) {
          await initOneSignal(config.app_id);
          // Slight delay to let SDK fully init
          setTimeout(() => promptOneSignalPush(), 3000);
        }
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (user) {
      setOneSignalExternalId(user.id);
      // Tag user with email for targeting
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
