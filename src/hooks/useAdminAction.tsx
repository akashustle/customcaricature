import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSiteSettings";

type AdminActionState = {
  pending: boolean;
  action: string;
  details: string;
  callback: ((adminName: string) => Promise<void>) | null;
};

export const useAdminAction = () => {
  const { user } = useAuth();
  const { settings } = useSiteSettings();
  const [actionState, setActionState] = useState<AdminActionState>({
    pending: false,
    action: "",
    details: "",
    callback: null,
  });

  const isPromptEnabled = (settings as any)?.admin_action_prompt?.enabled !== false;

  const confirmAction = useCallback(
    (action: string, details: string, callback: (adminName: string) => Promise<void>) => {
      if (!isPromptEnabled) {
        // Skip prompt, use stored name or "Admin"
        const storedName = sessionStorage.getItem("admin_action_name") || "Admin";
        logAndExecute(storedName, action, details, callback);
        return;
      }
      setActionState({ pending: true, action, details, callback });
    },
    [isPromptEnabled]
  );

  const logAndExecute = async (
    adminName: string,
    action: string,
    details: string,
    callback: (adminName: string) => Promise<void>
  ) => {
    if (!user) return;
    // Store name in session for convenience
    sessionStorage.setItem("admin_action_name", adminName);
    // Log to admin_action_log
    try {
      const { data: sessions } = await supabase
        .from("admin_sessions")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("login_at", { ascending: false })
        .limit(1);
      
      await supabase.from("admin_action_log").insert({
        user_id: user.id,
        admin_name: adminName,
        action,
        details: details || null,
        session_id: sessions?.[0]?.id || null,
      } as any);
    } catch {}
    await callback(adminName);
  };

  const executeAction = useCallback(
    async (adminName: string) => {
      if (!actionState.callback) return;
      await logAndExecute(adminName, actionState.action, actionState.details, actionState.callback);
      setActionState({ pending: false, action: "", details: "", callback: null });
    },
    [actionState, user]
  );

  const cancelAction = useCallback(() => {
    setActionState({ pending: false, action: "", details: "", callback: null });
  }, []);

  return {
    actionState,
    confirmAction,
    executeAction,
    cancelAction,
    isPromptEnabled,
  };
};
