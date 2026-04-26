import { useEffect, useState, useCallback, useRef, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Singleton auth provider — registers ONE listener for the entire app.
 * Previously every useAuth() call created its own onAuthStateChange listener
 * (28+ instances), which produced massive token-refresh storms and 429s.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);
  const lastTokenRef = useRef<string | null>(null);

  useEffect(() => {
    mounted.current = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted.current) return;
        // Skip duplicate emissions for the same access token (prevents re-render storms)
        const tok = newSession?.access_token ?? null;
        if (tok === lastTokenRef.current && _event !== "SIGNED_OUT") {
          if (loading) setLoading(false);
          return;
        }
        lastTokenRef.current = tok;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted.current) return;
      lastTokenRef.current = s?.access_token ?? null;
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      setSession(null);
      setUser(null);
    } finally {
      // Wipe the offline credential cache so a different user can't sign in
      // offline as the previous account on this device.
      try {
        const { clearCredentials } = await import("@/lib/offline-credentials");
        clearCredentials();
      } catch {/* ignore */}
    }
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (ctx) return ctx;
  // Fallback: no provider mounted yet (early renders) — return a stable empty state
  // instead of throwing, so existing components don't crash.
  return { session: null, user: null, loading: true, signOut: async () => {} };
};
