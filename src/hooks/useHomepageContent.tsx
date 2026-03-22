import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useHomepageContent = () => {
  const [content, setContent] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const fetchContent = async () => {
    const keys = [
      "homepage_hero", "homepage_video", "homepage_social_proof",
      "homepage_what_you_get", "homepage_why_us", "homepage_use_cases",
      "homepage_smart_help", "homepage_sticky_cta", "homepage_urgency",
      "homepage_instant_quote"
    ];
    const { data } = await supabase
      .from("admin_site_settings")
      .select("id, value")
      .in("id", keys);
    if (data) {
      const map: Record<string, any> = {};
      data.forEach((row: any) => { map[row.id] = row.value; });
      setContent(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchContent();
    const ch = supabase
      .channel("homepage-content-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_site_settings" }, () => fetchContent())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return { content, loading, refetch: fetchContent };
};
