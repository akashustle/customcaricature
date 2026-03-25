import { useState, useCallback, useRef } from "react";
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

  // Use refs to avoid stale closures
  const userRef = useRef(user);
  userRef.current = user;

  const isPromptEnabled = (settings as any)?.admin_action_prompt?.enabled !== false;

  const logAndExecute = useCallback(async (
    adminName: string,
    action: string,
    details: string,
    callback: (adminName: string) => Promise<void>
  ) => {
    const currentUser = userRef.current;
    if (!currentUser) return;
    // Store name in session for convenience
    sessionStorage.setItem("admin_action_name", adminName);
    // Log to admin_action_log
    try {
      const { data: sessions } = await supabase
        .from("admin_sessions")
        .select("id")
        .eq("user_id", currentUser.id)
        .eq("is_active", true)
        .order("login_at", { ascending: false })
        .limit(1);
      
      await supabase.from("admin_action_log").insert({
        user_id: currentUser.id,
        admin_name: adminName,
        action,
        details: details || null,
        session_id: sessions?.[0]?.id || null,
      } as any);
    } catch {}
    await callback(adminName);
  }, []);

  const confirmAction = useCallback(
    (action: string, details: string, callback: (adminName: string) => Promise<void>) => {
      if (!isPromptEnabled) {
        // Skip prompt, use stored name or "Admin"
        const storedName = sessionStorage.getItem("admin_action_name") || sessionStorage.getItem("admin_entered_name") || "Admin";
        logAndExecute(storedName, action, details, callback);
        return;
      }
      setActionState({ pending: true, action, details, callback });
    },
    [isPromptEnabled, logAndExecute]
  );

  const executeAction = useCallback(
    async (adminName: string) => {
      if (!actionState.callback) return;
      await logAndExecute(adminName, actionState.action, actionState.details, actionState.callback);
      setActionState({ pending: false, action: "", details: "", callback: null });
    },
    [actionState, logAndExecute]
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
