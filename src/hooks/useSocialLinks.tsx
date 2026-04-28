import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSharedChannel } from "@/hooks/useSharedChannel";

type SocialLink = {
  id: string;
  platform: string;
  url: string;
  icon_svg: string | null;
  is_active: boolean;
};

const useSocialLinks = () => {
  const [links, setLinks] = useState<SocialLink[]>([]);

  const fetchLinks = async () => {
    const { data } = await supabase.from("social_links").select("*").eq("is_active", true).order("sort_order");
    if (data) setLinks(data as SocialLink[]);
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  useSharedChannel(() => fetchLinks(), { table: "social_links" });

  return links;
};

export default useSocialLinks;
