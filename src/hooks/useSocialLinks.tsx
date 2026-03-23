import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type SocialLink = {
  id: string;
  platform: string;
  url: string;
  icon_svg: string | null;
  is_active: boolean;
};

const useSocialLinks = () => {
  const [links, setLinks] = useState<SocialLink[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("social_links").select("*").eq("is_active", true).order("sort_order");
      if (data) setLinks(data as SocialLink[]);
    };
    fetch();
    const ch = supabase.channel("social-links-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "social_links" }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return links;
};

export default useSocialLinks;
