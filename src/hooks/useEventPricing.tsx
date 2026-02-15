import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { EventPricingRow } from "@/lib/event-data";

export const useEventPricing = () => {
  const [pricing, setPricing] = useState<EventPricingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPricing = async () => {
    const { data } = await supabase
      .from("event_pricing")
      .select("*")
      .order("region")
      .order("artist_count");
    if (data) setPricing(data as EventPricingRow[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchPricing();
    const channel = supabase
      .channel("event-pricing-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "event_pricing" }, () => {
        fetchPricing();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return { pricing, loading, refetch: fetchPricing };
};
