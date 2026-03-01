import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Save, X, Globe } from "lucide-react";
import { formatPrice } from "@/lib/pricing";
import { getCountries } from "@/lib/countries-data";

type IntlPricingEntry = {
  id: string;
  user_id: string;
  country: string;
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

const AdminCustomerIntlPricing = ({ userId, userName, onClose }: Props) => {
  const [pricing, setPricing] = useState<IntlPricingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState("");
  const [artistCount, setArtistCount] = useState(1);
  const [total, setTotal] = useState("");
  const [advance, setAdvance] = useState("");
  const [extraHr, setExtraHr] = useState("");
  const countries = getCountries();

  const fetchPricing = async () => {
    const { data } = await supabase.from("customer_international_event_pricing").select("*").eq("user_id", userId);
    if (data) setPricing(data as any);
    setLoading(false);
  };

  useEffect(() => { fetchPricing(); }, [userId]);

  const savePrice = async () => {
    if (!country || !total || !advance) { toast({ title: "Fill all fields", variant: "destructive" }); return; }
    const existing = pricing.find(p => p.country === country && p.artist_count === artistCount);
    if (existing) {
      await supabase.from("customer_international_event_pricing").update({
        custom_total_price: parseInt(total),
        custom_advance_amount: parseInt(advance),
        custom_extra_hour_rate: parseInt(extraHr) || 5000,
      } as any).eq("id", existing.id);
    } else {
      await supabase.from("customer_international_event_pricing").insert({
        user_id: userId,
        country,
        artist_count: artistCount,
        custom_total_price: parseInt(total),
        custom_advance_amount: parseInt(advance),
        custom_extra_hour_rate: parseInt(extraHr) || 5000,
      } as any);
    }
    toast({ title: "Intl Price Saved", description: `${country} ${artistCount} artist(s) for ${userName}` });
    setCountry(""); setTotal(""); setAdvance(""); setExtraHr("");
    fetchPricing();
  };

  const removePrice = async (id: string) => {
    await supabase.from("customer_international_event_pricing").delete().eq("id", id);
    toast({ title: "Custom Intl Price Removed" });
    fetchPricing();
  };

  if (loading) return <p className="text-sm text-muted-foreground font-sans">Loading...</p>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="font-display text-base flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />Intl Pricing for {userName}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground font-sans">Set custom international event prices for this client.</p>
        
        {/* Existing custom prices */}
        {pricing.length > 0 && (
          <div className="space-y-2">
            {pricing.map(p => (
              <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-xs font-sans">
                <div>
                  <span className="font-medium">{p.country}</span> · {p.artist_count} Artist{p.artist_count > 1 ? "s" : ""}
                  <br />Total: {formatPrice(p.custom_total_price)} · Adv: {formatPrice(p.custom_advance_amount)} · Extra: {formatPrice(p.custom_extra_hour_rate)}/hr
                </div>
                <Button variant="ghost" size="sm" className="text-destructive h-7 text-xs" onClick={() => removePrice(p.id)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add new */}
        <div className="border border-border rounded-lg p-3 space-y-2">
          <p className="text-xs font-sans font-semibold">Add / Update Pricing</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] font-sans">Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent className="max-h-60">{countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] font-sans">Artists</Label>
              <Select value={String(artistCount)} onValueChange={v => setArtistCount(parseInt(v))}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label className="text-[10px] font-sans">Total (₹)</Label><Input type="number" className="h-7 text-xs" value={total} onChange={e => setTotal(e.target.value)} /></div>
            <div><Label className="text-[10px] font-sans">Advance (₹)</Label><Input type="number" className="h-7 text-xs" value={advance} onChange={e => setAdvance(e.target.value)} /></div>
            <div><Label className="text-[10px] font-sans">Extra Hr (₹)</Label><Input type="number" className="h-7 text-xs" value={extraHr} onChange={e => setExtraHr(e.target.value)} placeholder="5000" /></div>
          </div>
          <Button size="sm" className="h-7 text-xs font-sans" onClick={savePrice} disabled={!country || !total || !advance}>
            <Save className="w-3 h-3 mr-1" />Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminCustomerIntlPricing;
