import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type SiteSettings = {
  event_booking_global: { enabled: boolean };
  workshop_button: { enabled: boolean; label: string; url: string };
  event_booking_button: { enabled: boolean };
  international_booking_global: { enabled: boolean };
  allow_artwork_bypass: { enabled: boolean };
  shop_nav_visible: { enabled: boolean };
  workshop_mobile_nav: { enabled: boolean };
  shop_tracking_visible: { enabled: boolean };
  support_button_visible: { enabled: boolean };
  support_mobile_nav: { enabled: boolean };
  gateway_charge_percentage: { percentage: number };
  admin_action_prompt: { enabled: boolean };
  workshop_dashboard_visible: { enabled: boolean };
  app_download_link: { enabled: boolean };
  admin_secret_code: { code: string; enabled: boolean };
  live_chat_visible: { enabled: boolean };
};

const defaults: SiteSettings = {
  event_booking_global: { enabled: false },
  workshop_button: { enabled: true, label: "Workshop", url: "https://creativecaricatureclub.com/workshop" },
  event_booking_button: { enabled: true },
  international_booking_global: { enabled: false },
  allow_artwork_bypass: { enabled: false },
  shop_nav_visible: { enabled: true },
  workshop_mobile_nav: { enabled: false },
  shop_tracking_visible: { enabled: true },
  support_button_visible: { enabled: true },
  support_mobile_nav: { enabled: false },
  gateway_charge_percentage: { percentage: 2.6 },
  admin_action_prompt: { enabled: true },
  workshop_dashboard_visible: { enabled: false },
  app_download_link: { enabled: true },
  admin_secret_code: { code: "01022006", enabled: true },
  live_chat_visible: { enabled: false },
};


export const useSiteSettings = () => {
  const [settings, setSettings] = useState<SiteSettings>(defaults);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    const { data } = await supabase.from("admin_site_settings").select("id, value");
    if (data) {
      const s = { ...defaults };
      data.forEach((row: any) => {
        const key = row.id === "allow_artwork_status_without_upload" ? "allow_artwork_bypass" : row.id === "shop_nav_visible" ? "shop_nav_visible" : row.id;
        if (key in s) {
          (s as any)[key] = row.value;
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
    await supabase.from("admin_site_settings").upsert({ id, value, updated_at: new Date().toISOString() } as any, { onConflict: "id" });
    fetchSettings();
  };

  return { settings, loading, updateSetting, refetch: fetchSettings };
};
