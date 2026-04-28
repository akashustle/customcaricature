import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { unlockAdminUrl } from "@/lib/admin-url-unlock";

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export const useAutoLogout = (enabled: boolean = true) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  const logout = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("admin_sessions").update({ is_active: false } as any).eq("user_id", user.id).eq("is_active", true);
      }
      await supabase.auth.signOut();
    } catch {}
    sessionStorage.removeItem("admin_entered_name");
    unlockAdminUrl("main");
    navigate("/customcad75", { replace: true });
  }, [navigate]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (enabled) {
      timerRef.current = setTimeout(logout, INACTIVITY_TIMEOUT);
    }
  }, [enabled, logout]);

  useEffect(() => {
    if (!enabled) return;

    const events = ["mousedown", "keydown", "touchstart", "scroll", "mousemove"];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [enabled, resetTimer]);
};
