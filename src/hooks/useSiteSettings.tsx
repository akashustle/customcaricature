import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

type DashboardTabs = {
  orders: boolean; events: boolean; shop: boolean; chat: boolean;
  payments: boolean; invoices: boolean; alerts: boolean; workshop: boolean;
  profile: boolean; settings: boolean;
};

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
  auto_assign_artist: { enabled: boolean; selected_artists?: string };
  artist_payment_system: { enabled: boolean };
  allow_registration_maintenance: { enabled: boolean };
  login_popup_visible: { enabled: boolean };
  dashboard_tabs: DashboardTabs;
  custom_caricature_visible: { enabled: boolean };
  admin_splash_enabled: { enabled: boolean };
  homepage_splash_enabled: { enabled: boolean };
  workshop_splash_enabled: { enabled: boolean };
  app_onboarding_enabled: { enabled: boolean };
  permission_location: { enabled: boolean };
  permission_notifications: { enabled: boolean };
  permission_microphone: { enabled: boolean };
  permission_camera: { enabled: boolean };
  admin_location_required: { enabled: boolean };
  hide_how_it_works: { enabled: boolean };
  hide_what_you_get: { enabled: boolean };
  hide_styles_section: { enabled: boolean };
  hide_start_order_btn: { enabled: boolean };
  hide_hero_order_btn: { enabled: boolean };
  homepage_urgency_strip: { enabled: boolean };
  floating_whatsapp: { enabled: boolean };
  floating_instagram: { enabled: boolean };
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
  app_download_link: { enabled: false },
  admin_secret_code: { code: "01022006", enabled: true },
  live_chat_visible: { enabled: false },
  auto_assign_artist: { enabled: false, selected_artists: "all" },
  artist_payment_system: { enabled: false },
  allow_registration_maintenance: { enabled: false },
  login_popup_visible: { enabled: false },
  dashboard_tabs: { orders: false, events: true, shop: false, chat: true, payments: true, invoices: false, alerts: false, workshop: false, profile: true, settings: false },
  custom_caricature_visible: { enabled: false },
  admin_splash_enabled: { enabled: false },
  homepage_splash_enabled: { enabled: false },
  workshop_splash_enabled: { enabled: false },
  app_onboarding_enabled: { enabled: false },
  permission_location: { enabled: false },
  permission_notifications: { enabled: false },
  permission_microphone: { enabled: false },
  permission_camera: { enabled: false },
  admin_location_required: { enabled: false },
  hide_how_it_works: { enabled: true },
  hide_what_you_get: { enabled: true },
  hide_styles_section: { enabled: true },
  hide_start_order_btn: { enabled: true },
  hide_hero_order_btn: { enabled: true },
  homepage_urgency_strip: { enabled: false },
  floating_whatsapp: { enabled: false },
  floating_instagram: { enabled: false },
};

// Module-level cache so all instances share one fetch result
let cachedSettings: SiteSettings | null = null;
let fetchPromise: Promise<SiteSettings> | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 30_000;

const parseSettings = (data: any[]): SiteSettings => {
  const s = { ...defaults };
  data.forEach((row: any) => {
    const key = row.id === "allow_artwork_status_without_upload" ? "allow_artwork_bypass" : row.id;
    if (key in s) {
      (s as any)[key] = row.value;
    }
  });
  return s;
};

const fetchSettingsOnce = async (): Promise<SiteSettings> => {
  const now = Date.now();
  if (cachedSettings && now - lastFetchTime < CACHE_TTL) return cachedSettings;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const { data } = await supabase.from("admin_site_settings").select("id, value");
      if (data) {
        cachedSettings = parseSettings(data);
        lastFetchTime = Date.now();
      }
      return cachedSettings || defaults;
    } finally {
      fetchPromise = null;
    }
  })();
  return fetchPromise;
};

export const useSiteSettings = () => {
  const [settings, setSettings] = useState<SiteSettings>(cachedSettings || defaults);
  const [loading, setLoading] = useState(!cachedSettings);
  const channelRef = useRef<any>(null);

  const fetchSettings = useCallback(async () => {
    lastFetchTime = 0;
    cachedSettings = null;
    const s = await fetchSettingsOnce();
    setSettings(s);
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchSettingsOnce().then(s => {
      if (mounted) { setSettings(s); setLoading(false); }
    });

    if (!channelRef.current) {
      channelRef.current = supabase
        .channel("site-settings")
        .on("postgres_changes", { event: "*", schema: "public", table: "admin_site_settings" }, () => {
          lastFetchTime = 0;
          cachedSettings = null;
          fetchSettingsOnce().then(s => { if (mounted) setSettings(s); });
        })
        .subscribe();
    }

    return () => {
      mounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  const updateSetting = async (id: string, value: any) => {
    await supabase.from("admin_site_settings").upsert({ id, value, updated_at: new Date().toISOString() } as any, { onConflict: "id" });
    fetchSettings();
  };

  return { settings, loading, updateSetting, refetch: fetchSettings };
};
