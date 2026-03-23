import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useAdminActivityLog = () => {
  const { user } = useAuth();

  const logActivity = useCallback(async ({
    actionType,
    module,
    description,
    targetId,
    oldValue,
    newValue,
  }: {
    actionType: string;
    module: string;
    description: string;
    targetId?: string;
    oldValue?: any;
    newValue?: any;
  }) => {
    if (!user) return;
    const adminName = sessionStorage.getItem("admin_entered_name") || sessionStorage.getItem("admin_action_name") || "Admin";
    
    let ipAddress: string | null = null;
    try {
      const res = await fetch("https://ipapi.co/json/");
      if (res.ok) { const geo = await res.json(); ipAddress = geo.ip || null; }
    } catch {}

    const ua = navigator.userAgent;
    const isMobile = /Mobile|Android|iPhone/i.test(ua);
    const browser = /Chrome/.test(ua) ? "Chrome" : /Firefox/.test(ua) ? "Firefox" : /Safari/.test(ua) ? "Safari" : "Other";
    const os = /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /iPhone/.test(ua) ? "iOS" : "Other";
    const deviceInfo = `${browser} on ${os} (${isMobile ? "Mobile" : "Desktop"})`;

    try {
      await supabase.from("admin_activity_logs" as any).insert({
        admin_id: user.id,
        admin_name: adminName,
        action_type: actionType,
        module,
        description,
        target_id: targetId || null,
        old_value: oldValue ? JSON.parse(JSON.stringify(oldValue)) : null,
        new_value: newValue ? JSON.parse(JSON.stringify(newValue)) : null,
        ip_address: ipAddress,
        device_info: deviceInfo,
      });
    } catch {}
  }, [user]);

  return { logActivity };
};
