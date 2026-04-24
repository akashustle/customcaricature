/**
 * Hook that returns the linked workshop_users record for the current auth user
 * (if any) and exposes helpers to switch into the workshop dashboard.
 *
 * If a workshop_users row exists but isn't linked yet, calling `ensureLink()`
 * will invoke the `link-workshop-account` edge function which either links the
 * existing record or auto-creates a minimal one. This keeps the booking and
 * workshop accounts effortlessly switchable.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type WorkshopLinkState = {
  loading: boolean;
  workshopUser: any | null;
  hasWorkshop: boolean;
  ensureLink: (full_name?: string, email?: string, mobile?: string) => Promise<any | null>;
  switchToWorkshop: () => void;
  refresh: () => Promise<void>;
};

export function useWorkshopLink(authUserId: string | null | undefined): WorkshopLinkState {
  const [loading, setLoading] = useState(true);
  const [workshopUser, setWorkshopUser] = useState<any | null>(null);

  const fetch = useCallback(async () => {
    if (!authUserId) { setWorkshopUser(null); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("workshop_users" as any)
      .select("*")
      .eq("auth_user_id", authUserId)
      .order("workshop_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    setWorkshopUser((data as any) || null);
    setLoading(false);
  }, [authUserId]);

  useEffect(() => { void fetch(); }, [fetch]);

  const ensureLink = useCallback(async (full_name?: string, email?: string, mobile?: string) => {
    if (!authUserId) return null;
    try {
      const { data, error } = await supabase.functions.invoke("link-workshop-account", {
        body: { auth_user_id: authUserId, full_name, email, mobile },
      });
      if (error) throw error;
      if (data?.success && data?.workshop_user) {
        setWorkshopUser(data.workshop_user);
        try { localStorage.setItem("workshop_user", JSON.stringify(data.workshop_user)); } catch {}
        return data.workshop_user;
      }
    } catch (e) {
      console.warn("[useWorkshopLink] ensureLink failed", e);
    }
    return null;
  }, [authUserId]);

  const switchToWorkshop = useCallback(() => {
    if (workshopUser) {
      try { localStorage.setItem("workshop_user", JSON.stringify(workshopUser)); } catch {}
    }
    window.location.assign("/workshop-dashboard");
  }, [workshopUser]);

  return {
    loading,
    workshopUser,
    hasWorkshop: !!workshopUser,
    ensureLink,
    switchToWorkshop,
    refresh: fetch,
  };
}
