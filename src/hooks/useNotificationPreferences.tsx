import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type NotificationPrefs = {
  user_id: string;
  admin_updates: boolean;
  admin_contact_replies: boolean;
  emi_due_dates: boolean;
  credit_card_bills: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
};

const defaults = (uid: string): NotificationPrefs => ({
  user_id: uid,
  admin_updates: true,
  admin_contact_replies: true,
  emi_due_dates: true,
  credit_card_bills: true,
  quiet_hours_start: null,
  quiet_hours_end: null,
});

export const useNotificationPreferences = () => {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("notification_preferences" as any)
        .select("*").eq("user_id", user.id).maybeSingle();
      if (cancelled) return;
      setPrefs((data as any) || defaults(user.id));
      setLoading(false);
    })();
    const ch = supabase.channel(`np-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notification_preferences", filter: `user_id=eq.${user.id}` },
        (p) => setPrefs(p.new as any))
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [user?.id]);

  const update = useCallback(async (patch: Partial<NotificationPrefs>) => {
    if (!user) return;
    const next = { ...(prefs || defaults(user.id)), ...patch };
    setPrefs(next);
    await supabase.from("notification_preferences" as any).upsert(next as any, { onConflict: "user_id" });
  }, [user, prefs]);

  return { prefs: prefs || (user ? defaults(user.id) : null), loading, update };
};
