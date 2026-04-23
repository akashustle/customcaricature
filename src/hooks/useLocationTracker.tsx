import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const ASK_KEY = "ccc_user_location_asked_v1";
const isDashboardRoute = () => {
  if (typeof window === "undefined") return false;
  return window.location.pathname.startsWith("/dashboard");
};

/**
 * Tracks user's live location and sends updates to the database.
 *
 * Permission policy (per admin requirement):
 * - Only triggered on the user dashboard route.
 * - The browser permission prompt is shown AT MOST once per device (tracked via localStorage).
 * - If the user already granted permission, tracking starts silently.
 * - If denied or dismissed, we never re-prompt.
 */
const useLocationTracker = (userId: string | null) => {
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!userId || !navigator.geolocation) return;
    if (!isDashboardRoute()) return;

    let cancelled = false;

    const updateLocation = (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      supabase
        .from("user_live_locations")
        .upsert(
          {
            user_id: userId,
            latitude,
            longitude,
            last_seen_at: new Date().toISOString(),
            is_online: true,
          } as any,
          { onConflict: "user_id" }
        )
        .then(({ error }) => {
          if (error) console.error("Location update error:", error.message);
        });
    };

    const handleError = (err: GeolocationPositionError) => {
      // Mark as asked so we never re-prompt this device.
      try { localStorage.setItem(ASK_KEY, "done"); } catch {}
      console.warn("Geolocation error:", err.message);
    };

    const startTracking = () => {
      if (cancelled) return;
      navigator.geolocation.getCurrentPosition(updateLocation, handleError, {
        enableHighAccuracy: true,
        timeout: 10000,
      });
      watchIdRef.current = navigator.geolocation.watchPosition(updateLocation, handleError, {
        enableHighAccuracy: true,
        maximumAge: 30000,
      });
      intervalRef.current = setInterval(() => {
        navigator.geolocation.getCurrentPosition(updateLocation, handleError, {
          enableHighAccuracy: false,
          timeout: 5000,
        });
      }, 30000);
    };

    const checkAndStart = async () => {
      const alreadyAsked = typeof window !== "undefined" && localStorage.getItem(ASK_KEY) === "done";
      // Probe current permission state if available
      try {
        if (navigator.permissions) {
          const result = await navigator.permissions.query({ name: "geolocation" });
          if (result.state === "granted") {
            startTracking();
            return;
          }
          if (result.state === "denied") {
            // never auto-prompt again
            try { localStorage.setItem(ASK_KEY, "done"); } catch {}
            return;
          }
        }
      } catch {}

      if (alreadyAsked) return;

      // First and only prompt for this device — mark before/after to avoid loops
      try { localStorage.setItem(ASK_KEY, "done"); } catch {}
      navigator.geolocation.getCurrentPosition(
        (pos) => { updateLocation(pos); startTracking(); },
        handleError,
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };

    checkAndStart();

    return () => {
      cancelled = true;
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Mark user as offline
      supabase
        .from("user_live_locations")
        .update({ is_online: false, last_seen_at: new Date().toISOString() } as any)
        .eq("user_id", userId)
        .then(() => {});
    };
  }, [userId]);
};

export default useLocationTracker;
