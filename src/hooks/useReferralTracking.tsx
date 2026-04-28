/**
 * useReferralTracking — captures `?ref=CODE` on any landing, persists it
 * for the session, and logs click + conversion events to `referral_events`.
 *
 * Conventions:
 *  - Code formats: CCC-XXXX (booking) or WS-XXXX (workshop).
 *  - On first detection: log "click" with visitor_session_id + UA.
 *  - On register/login: log "register"/"login" with referred_user_id.
 *  - On booking/order: caller invokes logReferralConversion() helper.
 *
 * The referrer's auth user_id is resolved by looking up the secret_code
 * (CCC) in `profiles` or (WS) in `workshop_users.auth_user_id`.
 */
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const REF_KEY = "ccc_ref_code";
const REF_LOGGED_KEY = "ccc_ref_logged";

const ensureSessionId = () => {
  let sid = localStorage.getItem("ccc_visitor_sid");
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem("ccc_visitor_sid", sid);
  }
  return sid;
};

const resolveReferrer = async (code: string): Promise<string | null> => {
  // Strip prefix
  const m = code.match(/^(CCC|WS)-?(.+)$/i);
  if (!m) return null;
  const [, kind, secret] = m;
  if (kind.toUpperCase() === "CCC") {
    const { data } = await supabase.from("profiles").select("user_id")
      .eq("secret_code", secret).maybeSingle();
    return data?.user_id || null;
  }
  if (kind.toUpperCase() === "WS") {
    const { data } = await (supabase.from("workshop_users" as any)).select("auth_user_id")
      .eq("secret_code", secret).maybeSingle();
    return (data as any)?.auth_user_id || null;
  }
  return null;
};

export const logReferralEvent = async (
  type: "click" | "register" | "login" | "booking" | "order",
  opts: { referredUserId?: string; metadata?: any } = {},
) => {
  const code = sessionStorage.getItem(REF_KEY) || localStorage.getItem(REF_KEY);
  if (!code) return;
  try {
    const referrerUserId = await resolveReferrer(code);
    await (supabase.from("referral_events" as any)).insert({
      referral_code: code.toUpperCase(),
      referrer_user_id: referrerUserId,
      event_type: type,
      visitor_session_id: ensureSessionId(),
      referred_user_id: opts.referredUserId || null,
      user_agent: navigator.userAgent.slice(0, 500),
      source: window.location.pathname,
      metadata: opts.metadata || {},
    });
  } catch {/* non-fatal */}
};

export const useReferralTracking = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (!ref) return;
    const cleanRef = ref.trim().slice(0, 32).toUpperCase();
    sessionStorage.setItem(REF_KEY, cleanRef);
    localStorage.setItem(REF_KEY, cleanRef);
    // Only log click once per session per code
    const loggedKey = `${REF_LOGGED_KEY}_${cleanRef}`;
    if (sessionStorage.getItem(loggedKey)) return;
    sessionStorage.setItem(loggedKey, "1");
    logReferralEvent("click");
  }, []);
};

export const getActiveReferralCode = () =>
  sessionStorage.getItem(REF_KEY) || localStorage.getItem(REF_KEY);
