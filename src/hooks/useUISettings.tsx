import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSharedChannel } from "@/hooks/useSharedChannel";

export type UISetting = {
  id: string;
  category: string;
  value: Record<string, any>;
  updated_at: string;
  updated_by: string | null;
};

const DEFAULTS: Record<string, Record<string, any>> = {
  brand_colors: {
    primary: "#C8A97E",
    secondary: "#fdf8f3",
    accent: "#22C55E",
    text: "#3a2e22",
    background: "#fdf8f3",
  },
  brand_fonts: {
    heading: "Inter",
    body: "Inter",
  },
  brand_logo: {
    url: "/logo.png",
    favicon: "/favicon.ico",
  },
};

export const useUISettings = () => {
  const [settings, setSettings] = useState<Record<string, Record<string, any>>>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    const { data } = await supabase.from("ui_settings").select("*");
    if (data) {
      const map = { ...DEFAULTS };
      (data as any[]).forEach((row) => {
        map[row.id] = row.value;
      });
      setSettings(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useSharedChannel(() => fetchSettings(), { table: "ui_settings" });

  const updateSetting = async (id: string, value: Record<string, any>, category = "brand") => {
    const adminName = sessionStorage.getItem("admin_entered_name") || "Admin";
    await supabase.from("ui_settings").upsert({
      id,
      category,
      value,
      updated_at: new Date().toISOString(),
      updated_by: adminName,
    } as any, { onConflict: "id" });
  };

  const getSetting = (id: string): Record<string, any> => settings[id] || {};

  return { settings, loading, updateSetting, getSetting, refetch: fetchSettings };
};
