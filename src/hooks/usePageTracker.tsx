import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Tracks page views and user actions for web analytics.
 * Works for both logged-in and anonymous users.
 */
const usePageTracker = () => {
  const location = useLocation();

  useEffect(() => {
    const trackPageView = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const deviceInfo = /mobile|android|iphone/i.test(navigator.userAgent) ? "mobile" : "desktop";

      await supabase.from("app_actions").insert({
        action_type: "page_view",
        screen: location.pathname,
        user_id: user?.id || null,
        device_info: deviceInfo,
        metadata: { referrer: document.referrer, userAgent: navigator.userAgent.slice(0, 120) },
      } as any);
    };

    trackPageView();
  }, [location.pathname]);
};

export default usePageTracker;
