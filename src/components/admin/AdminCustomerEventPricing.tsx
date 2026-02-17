import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Save, X, Calendar } from "lucide-react";
import { formatPrice } from "@/lib/pricing";

type EventPricingEntry = {
  id: string;
  user_id: string;
  region: string;
  artist_count: number;
  custom_total_price: number;
  custom_advance_amount: number;
  custom_extra_hour_rate: number;
};

interface Props {
  userId: string;
  userName: string;
  onClose: () => void;
}

const CONFIGS = [
  { region: "mumbai", artist_count: 1, label: "Mumbai – 1 Artist", defaultTotal: 30000, defaultAdvance: 20000, defaultExtraHr: 4000 },
  { region: "mumbai", artist_count: 2, label: "Mumbai – 2 Artists", defaultTotal: 50000, defaultAdvance: 35000, defaultExtraHr: 4000 },
  { region: "outside", artist_count: 1, label: "Outside Mumbai – 1 Artist", defaultTotal: 40000, defaultAdvance: 25000, defaultExtraHr: 5000 },
  { region: "outside", artist_count: 2, label: "Outside Mumbai – 2 Artists", defaultTotal: 70000, defaultAdvance: 45000, defaultExtraHr: 5000 },
];

const AdminCustomerEventPricing = ({ userId, userName, onClose }: Props) => {
  const [pricing, setPricing] = useState<EventPricingEntry[]>([]);
  const [edits, setEdits] = useState<Record<string, { total: string; advance: string; extraHr: string }>>({});
  const [loading, setLoading] = useState(true);

  const key = (region: string, ac: number) => `${region}_${ac}`;

  useEffect(() => { fetchPricing(); }, [userId]);

  const fetchPricing = async () => {
    const { data } = await supabase.from("customer_event_pricing").select("*").eq("user_id", userId);
    if (data) {
      setPricing(data as any);
      const e: Record<string, { total: string; advance: string; extraHr: string }> = {};
      (data as any[]).forEach((p: EventPricingEntry) => {
        e[key(p.region, p.artist_count)] = {
          total: String(p.custom_total_price),
          advance: String(p.custom_advance_amount),
          extraHr: String(p.custom_extra_hour_rate),
        };
      });
      setEdits(e);
    }
    setLoading(false);
  };

  const savePrice = async (region: string, artistCount: number) => {
    const k = key(region, artistCount);
    const edit = edits[k];
    if (!edit) return;
    const total = parseInt(edit.total);
    const advance = parseInt(edit.advance);
    const extraHr = parseInt(edit.extraHr);
    if (!total || !advance || total <= 0 || advance <= 0) {
      toast({ title: "Invalid prices", variant: "destructive" });
      return;
    }

    const existing = pricing.find(p => p.region === region && p.artist_count === artistCount);
    if (existing) {
      await supabase.from("customer_event_pricing").update({
        custom_total_price: total,
        custom_advance_amount: advance,
        custom_extra_hour_rate: extraHr || 5000,
      } as any).eq("id", existing.id);
    } else {
      await supabase.from("customer_event_pricing").insert({
        user_id: userId,
        region,
        artist_count: artistCount,
        custom_total_price: total,
        custom_advance_amount: advance,
        custom_extra_hour_rate: extraHr || 5000,
      } as any);
    }
    toast({ title: "Event Price Saved", description: `${region} ${artistCount} artist(s) → ${formatPrice(total)} for ${userName}` });
    fetchPricing();
  };

  const removePrice = async (region: string, artistCount: number) => {
    const existing = pricing.find(p => p.region === region && p.artist_count === artistCount);
    if (existing) {
      await supabase.from("customer_event_pricing").delete().eq("id", existing.id);
      const newEdits = { ...edits };
      delete newEdits[key(region, artistCount)];
      setEdits(newEdits);
      toast({ title: "Custom Event Price Removed" });
      fetchPricing();
    }
  };

  const updateEdit = (k: string, field: "total" | "advance" | "extraHr", value: string) => {
    setEdits(prev => ({
      ...prev,
      [k]: { ...(prev[k] || { total: "", advance: "", extraHr: "" }), [field]: value },
    }));
  };

  if (loading) return <p className="text-sm text-muted-foreground font-sans">Loading...</p>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="font-display text-base flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />Event Pricing for {userName}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground font-sans">Set custom event prices. Leave empty to use default pricing.</p>
        {CONFIGS.map(cfg => {
          const k = key(cfg.region, cfg.artist_count);
          const hasCustom = pricing.some(p => p.region === cfg.region && p.artist_count === cfg.artist_count);
          const edit = edits[k] || { total: "", advance: "", extraHr: "" };
          return (
            <div key={k} className="border border-border rounded-lg p-3 space-y-2">
              <p className="text-xs font-sans font-semibold">{cfg.label}</p>
              <p className="text-[10px] text-muted-foreground font-sans">Default: Total {formatPrice(cfg.defaultTotal)} · Advance {formatPrice(cfg.defaultAdvance)} · Extra Hr {formatPrice(cfg.defaultExtraHr)}</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[10px] font-sans">Total (₹)</Label>
                  <Input type="number" placeholder={String(cfg.defaultTotal)} value={edit.total} onChange={e => updateEdit(k, "total", e.target.value)} className="h-7 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px] font-sans">Advance (₹)</Label>
                  <Input type="number" placeholder={String(cfg.defaultAdvance)} value={edit.advance} onChange={e => updateEdit(k, "advance", e.target.value)} className="h-7 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px] font-sans">Extra Hr (₹)</Label>
                  <Input type="number" placeholder={String(cfg.defaultExtraHr)} value={edit.extraHr} onChange={e => updateEdit(k, "extraHr", e.target.value)} className="h-7 text-xs" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs font-sans" onClick={() => savePrice(cfg.region, cfg.artist_count)} disabled={!edit.total || !edit.advance}>
                  <Save className="w-3 h-3 mr-1" />Save
                </Button>
                {hasCustom && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => removePrice(cfg.region, cfg.artist_count)}>
                    <X className="w-3 h-3 mr-1" />Remove
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default AdminCustomerEventPricing;
