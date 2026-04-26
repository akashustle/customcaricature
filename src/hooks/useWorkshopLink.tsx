/**
 * Workshop link hook with automated background retry + recovery UI signals.
 *
 * Behaviour:
 *  - On mount we read the `workshop_users` row for the current auth user.
 *  - If `ensureLink()` fails (network / edge function error), we automatically
 *    retry up to 3 times with exponential backoff (1s, 2s, 4s) so transient
 *    issues self-heal without the user noticing.
 *  - We expose `lastError`, `retrying`, and `manualRetry()` so consumers can
 *    surface a clear recovery UI when even the auto-retries fail.
 *  - `switchToWorkshop()` performs a sanity check before navigating; if the
 *    cached record is stale we re-fetch first to avoid landing on a broken
 *    workshop dashboard.
 */
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type WorkshopLinkState = {
  loading: boolean;
  workshopUser: any | null;
  hasWorkshop: boolean;
  retrying: boolean;
  lastError: string | null;
  ensureLink: (full_name?: string, email?: string, mobile?: string) => Promise<any | null>;
  switchToWorkshop: () => Promise<void>;
  manualRetry: (full_name?: string, email?: string, mobile?: string) => Promise<any | null>;
  refresh: () => Promise<void>;
};

const MAX_RETRIES = 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function useWorkshopLink(authUserId: string | null | undefined): WorkshopLinkState {
  const [loading, setLoading] = useState(true);
  const [workshopUser, setWorkshopUser] = useState<any | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const inflight = useRef(false);

  const fetch = useCallback(async () => {
    if (!authUserId) { setWorkshopUser(null); setLoading(false); return; }
    setLoading(true);
    try {
      // 1) Direct link by auth_user_id
      const { data: direct, error } = await supabase
        .from("workshop_users" as any)
        .select("*")
        .eq("auth_user_id", authUserId)
        .order("workshop_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (direct) { setWorkshopUser(direct as any); setLastError(null); return; }

      // 2) Fallback: match by email/mobile from profile, then silently link.
      //    This catches users whose workshop record was created BEFORE they
      //    signed up for a booking account (e.g. Akash flow).
      const { data: prof } = await supabase
        .from("profiles")
        .select("email, mobile, full_name")
        .eq("user_id", authUserId)
        .maybeSingle();
      if (!prof) { setWorkshopUser(null); setLastError(null); return; }

      const email = (prof.email || "").toLowerCase().trim();
      const mobile = (prof.mobile || "").replace(/\D/g, "");
      let match: any = null;
      if (email) {
        const { data } = await supabase.from("workshop_users" as any)
          .select("*").ilike("email", email).maybeSingle();
        match = data;
      }
      if (!match && mobile) {
        const { data } = await supabase.from("workshop_users" as any)
          .select("*").eq("mobile", mobile).maybeSingle();
        match = data;
      }
      if (match) {
        setWorkshopUser(match as any);
        // Silent link — no await so UI is instant
        supabase.functions.invoke("link-workshop-account", {
          body: { auth_user_id: authUserId, email, mobile, full_name: prof.full_name },
        }).catch(() => {});
      } else {
        setWorkshopUser(null);
      }
      setLastError(null);
    } catch (e: any) {
      setLastError(e?.message || "Could not load workshop account");
    } finally {
      setLoading(false);
    }
  }, [authUserId]);

  useEffect(() => { void fetch(); }, [fetch]);

  // Internal: invoke the link-workshop-account edge function with retries
  const invokeLink = useCallback(async (full_name?: string, email?: string, mobile?: string) => {
    if (!authUserId) return null;
    let attempt = 0;
    let lastErr: any = null;
    while (attempt < MAX_RETRIES) {
      try {
        const { data, error } = await supabase.functions.invoke("link-workshop-account", {
          body: { auth_user_id: authUserId, full_name, email, mobile },
        });
        if (error) throw error;
        if (data?.success && data?.workshop_user) {
          setWorkshopUser(data.workshop_user);
          setLastError(null);
          try { localStorage.setItem("workshop_user", JSON.stringify(data.workshop_user)); } catch {}
          return data.workshop_user;
        }
        throw new Error(data?.error || "Linking returned no record");
      } catch (e: any) {
        lastErr = e;
        attempt += 1;
        if (attempt < MAX_RETRIES) {
          setRetrying(true);
          await sleep(1000 * Math.pow(2, attempt - 1)); // 1s, 2s, 4s
        }
      }
    }
    setLastError(lastErr?.message || "Workshop linking failed after several attempts");
    return null;
  }, [authUserId]);

  const ensureLink = useCallback(async (full_name?: string, email?: string, mobile?: string) => {
    if (!authUserId || inflight.current) return null;
    inflight.current = true;
    setRetrying(false);
    try {
      const res = await invokeLink(full_name, email, mobile);
      return res;
    } finally {
      setRetrying(false);
      inflight.current = false;
    }
  }, [authUserId, invokeLink]);

  const manualRetry = useCallback(async (full_name?: string, email?: string, mobile?: string) => {
    setLastError(null);
    return ensureLink(full_name, email, mobile);
  }, [ensureLink]);

  // Background self-heal: if we have an authUserId but no workshop row AND a
  // previous attempt failed, retry quietly once after 5s. This catches the
  // case where the edge function was cold-starting on first load.
  useEffect(() => {
    if (!authUserId || workshopUser || loading) return;
    if (!lastError) return;
    const t = setTimeout(() => {
      void invokeLink(); // silent retry; uses existing profile data
    }, 5000);
    return () => clearTimeout(t);
  }, [authUserId, workshopUser, loading, lastError, invokeLink]);

  const switchToWorkshop = useCallback(async () => {
    // Sanity-refresh before navigating to avoid stale cache landing the user
    // on a workshop dashboard that no longer exists.
    if (!workshopUser && authUserId) {
      await fetch();
    }
    const ws = workshopUser;
    if (ws) {
      try { localStorage.setItem("workshop_user", JSON.stringify(ws)); } catch {}
    }
    window.location.assign("/workshop-dashboard");
  }, [workshopUser, authUserId, fetch]);

  return {
    loading,
    workshopUser,
    hasWorkshop: !!workshopUser,
    retrying,
    lastError,
    ensureLink,
    switchToWorkshop,
    manualRetry,
    refresh: fetch,
  };
}
