import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PricingType = {
  id: string;
  name: string;
  slug: string;
  price: number;
  per_face: boolean;
  min_faces: number;
  max_faces: number;
  is_active: boolean;
  sort_order: number;
};

export const usePricing = () => {
  const [types, setTypes] = useState<PricingType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTypes = async () => {
    const { data } = await supabase
      .from("caricature_types")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    if (data) setTypes(data as PricingType[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchTypes();

    // Real-time subscription for pricing changes
    const channel = supabase
      .channel("pricing-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "caricature_types" }, () => {
        fetchTypes();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const getPrice = (orderType: string, faceCount: number): number => {
    const type = types.find((t) => t.slug === orderType);
    if (!type) {
      // Fallback to hardcoded
      if (orderType === "single") return 3499;
      if (orderType === "couple") return 9499;
      return 3499 * Math.max(faceCount, 3);
    }
    return type.per_face ? type.price * Math.max(faceCount, type.min_faces) : type.price;
  };

  const getType = (slug: string) => types.find((t) => t.slug === slug);

  return { types, loading, getPrice, getType, refetch: fetchTypes };
};
