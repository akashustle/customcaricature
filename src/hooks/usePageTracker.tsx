import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Tracks page views with device/browser/IP/location for web analytics.
 * Works for both logged-in and anonymous users.
 */
const usePageTracker = () => {
  const location = useLocation();
  const ipRef = useRef<string | null>(null);
  const locationRef = useRef<{ city?: string; country?: string } | null>(null);

  // Fetch IP & location once per session
  useEffect(() => {
    if (ipRef.current) return;
    fetch("https://ipapi.co/json/")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          ipRef.current = data.ip || null;
          locationRef.current = { city: data.city, country: data.country_name };
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const trackPageView = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const ua = navigator.userAgent;
      const isMobile = /mobile|android|iphone/i.test(ua);
      let browser = "Unknown";
      if (ua.includes("Firefox")) browser = "Firefox";
      else if (ua.includes("Edg")) browser = "Edge";
      else if (ua.includes("Chrome")) browser = "Chrome";
      else if (ua.includes("Safari")) browser = "Safari";

      await supabase.from("app_actions").insert({
        action_type: "page_view",
        screen: location.pathname,
        user_id: user?.id || null,
        device_info: isMobile ? "mobile" : "desktop",
        metadata: {
          referrer: document.referrer || null,
          userAgent: ua.slice(0, 150),
          browser,
          ip: ipRef.current,
          city: locationRef.current?.city,
          country: locationRef.current?.country,
          screenSize: `${screen.width}x${screen.height}`,
          language: navigator.language,
          timestamp: new Date().toISOString(),
        },
      } as any);
    };

    trackPageView();
  }, [location.pathname]);
};

export default usePageTracker;
