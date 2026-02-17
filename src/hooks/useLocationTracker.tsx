import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Tracks user's live location and sends updates to the database.
 * Requests permission on mount, updates every 30 seconds.
 */
const useLocationTracker = (userId: string | null) => {
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!userId || !navigator.geolocation) return;

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
      console.warn("Geolocation error:", err.message);
    };

    // Initial position
    navigator.geolocation.getCurrentPosition(updateLocation, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
    });

    // Watch for changes
    watchIdRef.current = navigator.geolocation.watchPosition(updateLocation, handleError, {
      enableHighAccuracy: true,
      maximumAge: 30000,
    });

    // Also send periodic heartbeat to keep is_online fresh
    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(updateLocation, handleError, {
        enableHighAccuracy: false,
        timeout: 5000,
      });
    }, 30000);

    // Mark offline on cleanup
    return () => {
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
