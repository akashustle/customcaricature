import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { gtagPageView } from "@/lib/gtag";

// Module-level geo cache — fetched once, shared across all instances
let geoData: { ip: string | null; city: string | null; country: string | null } = {
  ip: null, city: null, country: null,
};
let geoFetched = false;

const fetchGeoOnce = () => {
  if (geoFetched) return;
  geoFetched = true;
  // Defer geo lookup — not critical for page rendering
  requestIdleCallback?.(() => {
    fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(5000) })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          geoData = { ip: data.ip || null, city: data.city || null, country: data.country_name || null };
        }
      })
      .catch(() => {});
  }) ?? setTimeout(() => {
    fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(5000) })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          geoData = { ip: data.ip || null, city: data.city || null, country: data.country_name || null };
        }
      })
      .catch(() => {});
  }, 3000);
};

/**
 * Tracks page views with device/browser info for web analytics + GA4.
 * Optimized: uses cached session, defers DB insert, batches geo lookup.
 */
const usePageTracker = () => {
  const location = useLocation();
  const initialRef = useRef(true);

  // Kick off geo fetch once
  useEffect(() => { fetchGeoOnce(); }, []);

  useEffect(() => {
    // Fire GA4 immediately (lightweight)
    gtagPageView(location.pathname);

    // Defer Supabase insert to not block rendering
    const timeoutId = setTimeout(async () => {
      try {
        // Use getSession (cached, no network call) instead of getUser (always hits network)
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || null;

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
          user_id: userId,
          device_info: isMobile ? "mobile" : "desktop",
          metadata: {
            referrer: document.referrer || null,
            browser,
            ip: geoData.ip,
            city: geoData.city,
            country: geoData.country,
            screenSize: `${screen.width}x${screen.height}`,
            timestamp: new Date().toISOString(),
          },
        } as any);
      } catch {
        // silently fail — tracking should never block UX
      }
    }, initialRef.current ? 2000 : 500); // Longer delay on first load

    initialRef.current = false;
    return () => clearTimeout(timeoutId);
  }, [location.pathname]);
};

export default usePageTracker;
