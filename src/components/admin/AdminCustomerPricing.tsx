import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Save, X, DollarSign } from "lucide-react";
import { formatPrice } from "@/lib/pricing";

type CustomerPricingEntry = {
  id: string;
  user_id: string;
  caricature_type_slug: string;
  custom_price: number;
};

type CaricatureType = {
  slug: string;
  name: string;
  price: number;
  per_face: boolean;
};

interface Props {
  userId: string;
  userName: string;
  onClose: () => void;
  caricatureTypes: CaricatureType[];
}

const AdminCustomerPricing = ({ userId, userName, onClose, caricatureTypes }: Props) => {
  const [pricing, setPricing] = useState<CustomerPricingEntry[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPricing();
  }, [userId]);

  const fetchPricing = async () => {
    const { data } = await supabase.from("customer_pricing").select("*").eq("user_id", userId);
    if (data) {
      setPricing(data as any);
      const e: Record<string, string> = {};
      data.forEach((p: any) => { e[p.caricature_type_slug] = String(p.custom_price); });
      setEdits(e);
    }
    setLoading(false);
  };

  const savePrice = async (slug: string) => {
    const price = parseInt(edits[slug]);
    if (!price || price <= 0) {
      toast({ title: "Invalid price", variant: "destructive" });
      return;
    }

    const existing = pricing.find(p => p.caricature_type_slug === slug);
    if (existing) {
      await supabase.from("customer_pricing").update({ custom_price: price } as any).eq("id", existing.id);
    } else {
      await supabase.from("customer_pricing").insert({
        user_id: userId,
        caricature_type_slug: slug,
        custom_price: price,
      } as any);
    }
    toast({ title: "Custom Price Saved", description: `${slug} → ${formatPrice(price)} for ${userName}` });
    fetchPricing();
  };

  const removePrice = async (slug: string) => {
    const existing = pricing.find(p => p.caricature_type_slug === slug);
    if (existing) {
      await supabase.from("customer_pricing").delete().eq("id", existing.id);
      const newEdits = { ...edits };
      delete newEdits[slug];
      setEdits(newEdits);
      toast({ title: "Custom Price Removed", description: `${userName} will now see default pricing for ${slug}` });
      fetchPricing();
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground font-sans">Loading...</p>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="font-display text-base flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" />Custom Pricing for {userName}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground font-sans">Set custom prices per caricature type. Leave empty to use default pricing.</p>
        {caricatureTypes.map(type => {
          const hasCustom = pricing.some(p => p.caricature_type_slug === type.slug);
          return (
            <div key={type.slug} className="flex items-end gap-2">
              <div className="flex-1">
                <Label className="text-xs font-sans">{type.name} {type.per_face ? "(per face)" : ""} — Default: {formatPrice(type.price)}</Label>
                <Input
                  type="number"
                  placeholder={String(type.price)}
                  value={edits[type.slug] || ""}
                  onChange={e => setEdits({ ...edits, [type.slug]: e.target.value })}
                  className="h-8"
                />
              </div>
              <Button size="sm" className="h-8 font-sans" onClick={() => savePrice(type.slug)} disabled={!edits[type.slug]}>
                <Save className="w-3 h-3 mr-1" />Save
              </Button>
              {hasCustom && (
                <Button size="sm" variant="ghost" className="h-8 text-destructive" onClick={() => removePrice(type.slug)}>
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default AdminCustomerPricing;
