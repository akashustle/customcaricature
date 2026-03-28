import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Tracks page views with device/browser info for web analytics.
 * Works for both logged-in and anonymous users.
 */
const usePageTracker = () => {
  const location = useLocation();
  const dataRef = useRef<{ ip: string | null; city: string | null; country: string | null }>({
    ip: null, city: null, country: null
  });
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetch("https://ipapi.co/json/")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          dataRef.current = { ip: data.ip || null, city: data.city || null, country: data.country_name || null };
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const trackPageView = async () => {
      try {
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
            browser,
            ip: dataRef.current.ip,
            city: dataRef.current.city,
            country: dataRef.current.country,
            screenSize: `${screen.width}x${screen.height}`,
            timestamp: new Date().toISOString(),
          },
        } as any);
      } catch {
        // silently fail
      }
    };

    trackPageView();

    // Send page view to GA4
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("config", "G-VVZX2RDMW3", {
        page_path: location.pathname,
        page_title: document.title,
        page_location: window.location.href,
      });
    }
  }, [location.pathname]);
};

export default usePageTracker;
