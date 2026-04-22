import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const ADMIN_AUTH_HANDOFF_KEY = "ccc_admin_auth_handoff";
const ADMIN_AUTH_HANDOFF_TTL_MS = 15_000;

type AdminAuthHandoff = {
  createdAt: number;
  expectedUserId: string | null;
  expiresAt: number;
};

export type AdminRoleCheckResult = {
  attempts: number;
  definitive: boolean;
  reason: string;
  status: "granted" | "denied" | "pending";
  userId: string;
};

export type AdminSessionHandoffResult = {
  session: Session;
  source: "event" | "session";
  user: User;
};

const matchesExpectedUser = (user: User | null | undefined, expectedUserId?: string | null) => {
  if (!user) return false;
  if (!expectedUserId) return true;
  return user.id === expectedUserId;
};

export const startAdminAuthHandoff = (expectedUserId?: string | null) => {
  if (typeof window === "undefined") return;

  const createdAt = Date.now();
  const handoff: AdminAuthHandoff = {
    createdAt,
    expectedUserId: expectedUserId ?? null,
    expiresAt: createdAt + ADMIN_AUTH_HANDOFF_TTL_MS,
  };

  sessionStorage.setItem(ADMIN_AUTH_HANDOFF_KEY, JSON.stringify(handoff));
};

export const readAdminAuthHandoff = (): AdminAuthHandoff | null => {
  if (typeof window === "undefined") return null;

  const raw = sessionStorage.getItem(ADMIN_AUTH_HANDOFF_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AdminAuthHandoff;
    if (!parsed?.expiresAt || parsed.expiresAt < Date.now()) {
      sessionStorage.removeItem(ADMIN_AUTH_HANDOFF_KEY);
      return null;
    }
    return parsed;
  } catch {
    sessionStorage.removeItem(ADMIN_AUTH_HANDOFF_KEY);
    return null;
  }
};

export const clearAdminAuthHandoff = () => {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ADMIN_AUTH_HANDOFF_KEY);
};

export const waitForAdminSessionHandoff = async ({
  expectedUserId,
  maxChecks = 18,
  pollMs = 180,
  timeoutMs = 6_000,
}: {
  expectedUserId?: string | null;
  maxChecks?: number;
  pollMs?: number;
  timeoutMs?: number;
} = {}): Promise<AdminSessionHandoffResult> => {
  return await new Promise((resolve, reject) => {
    let completed = false;
    let checks = 0;
    let pollTimer: number | null = null;
    const deadline = Date.now() + timeoutMs;

    const finalize = (result: AdminSessionHandoffResult) => {
      if (completed) return;
      completed = true;
      if (pollTimer) window.clearTimeout(pollTimer);
      subscription.unsubscribe();
      resolve(result);
    };

    const fail = (message: string) => {
      if (completed) return;
      completed = true;
      if (pollTimer) window.clearTimeout(pollTimer);
      subscription.unsubscribe();
      reject(new Error(message));
    };

    const acceptSession = (session: Session | null, source: "event" | "session") => {
      if (!session?.user || !matchesExpectedUser(session.user, expectedUserId)) return false;
      finalize({ session, source, user: session.user });
      return true;
    };

    const pollSession = async () => {
      if (completed) return;

      checks += 1;
      const { data: { session } } = await supabase.auth.getSession();

      if (acceptSession(session, "session")) return;

      if (checks >= maxChecks || Date.now() >= deadline) {
        fail("Session handoff timed out. Please try signing in again.");
        return;
      }

      pollTimer = window.setTimeout(() => {
        void pollSession();
      }, pollMs);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      acceptSession(session, "event");
    });

    void pollSession();
  });
};

export const checkAdminRole = async (
  userId: string,
  retries = 3,
  retryDelayMs = 350,
): Promise<AdminRoleCheckResult> => {
  let lastReason = "Role check not started.";

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const { data, error } = await supabase.rpc("has_role", {
      _role: "admin",
      _user_id: userId,
    });

    if (!error && data === true) {
      return {
        attempts: attempt,
        definitive: true,
        reason: "Admin role confirmed.",
        status: "granted",
        userId,
      };
    }

    if (!error && data === false) {
      return {
        attempts: attempt,
        definitive: true,
        reason: "Admin role was definitively denied.",
        status: "denied",
        userId,
      };
    }

    lastReason = error?.message || "Role check is still syncing.";

    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempt));
    }
  }

  return {
    attempts: retries,
    definitive: false,
    reason: lastReason,
    status: "pending",
    userId,
  };
};