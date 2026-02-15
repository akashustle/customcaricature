import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type SiteSettings = {
  event_booking_global: { enabled: boolean };
  workshop_button: { enabled: boolean; label: string; url: string };
  event_booking_button: { enabled: boolean };
};

const defaults: SiteSettings = {
  event_booking_global: { enabled: false },
  workshop_button: { enabled: true, label: "Workshop", url: "https://creativecaricatureclub.com/workshop" },
  event_booking_button: { enabled: true },
};

export const useSiteSettings = () => {
  const [settings, setSettings] = useState<SiteSettings>(defaults);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    const { data } = await supabase.from("admin_site_settings").select("id, value");
    if (data) {
      const s = { ...defaults };
      data.forEach((row: any) => {
        if (row.id in s) {
          (s as any)[row.id] = row.value;
        }
      });
      setSettings(s);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
    const ch = supabase
      .channel("site-settings")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_site_settings" }, () => fetchSettings())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const updateSetting = async (id: string, value: any) => {
    await supabase.from("admin_site_settings").update({ value, updated_at: new Date().toISOString() } as any).eq("id", id);
    fetchSettings();
  };

  return { settings, loading, updateSetting, refetch: fetchSettings };
};
