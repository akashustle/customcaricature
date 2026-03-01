import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Save, Trash2, X, Edit2, Globe } from "lucide-react";
import { formatPrice } from "@/lib/pricing";
import { getCountries } from "@/lib/countries-data";

type IntlPricing = {
  id: string;
  country: string;
  artist_count: number;
  total_price: number;
  advance_amount: number;
  extra_hour_rate: number;
  currency: string;
};

type GlobalIntlPricing = {
  one_artist_total: number;
  one_artist_advance: number;
  two_artist_total: number;
  two_artist_advance: number;
  extra_hour_rate: number;
  apply_to_all: boolean;
};

const DEFAULT_GLOBAL: GlobalIntlPricing = {
  one_artist_total: 0, one_artist_advance: 0,
  two_artist_total: 0, two_artist_advance: 0,
  extra_hour_rate: 5000, apply_to_all: false,
};

const AdminInternationalPricing = () => {
  const [pricing, setPricing] = useState<IntlPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<IntlPricing>>({});
  const [newPricing, setNewPricing] = useState({
    country: "", artist_count: 1, total_price: 0, advance_amount: 0, extra_hour_rate: 5000, currency: "INR",
  });
  const [globalPricing, setGlobalPricing] = useState<GlobalIntlPricing>(DEFAULT_GLOBAL);
  const [savingGlobal, setSavingGlobal] = useState(false);

  const countries = getCountries();

  const fetchPricing = async () => {
    const { data } = await supabase.from("international_event_pricing").select("*").order("country").order("artist_count");
    if (data) setPricing(data as any);
    setLoading(false);
  };

  const fetchGlobalPricing = async () => {
    const { data } = await supabase.from("admin_site_settings").select("value").eq("id", "global_intl_pricing").maybeSingle();
    if (data?.value) setGlobalPricing(data.value as any);
  };

  useEffect(() => {
    fetchPricing();
    fetchGlobalPricing();
    const ch = supabase
      .channel("intl-pricing-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "international_event_pricing" }, () => fetchPricing())
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_site_settings" }, () => fetchGlobalPricing())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const saveGlobalPricing = async () => {
    setSavingGlobal(true);
    await supabase.from("admin_site_settings").upsert({ id: "global_intl_pricing", value: globalPricing as any, updated_at: new Date().toISOString() } as any, { onConflict: "id" });
    toast({ title: "Global international pricing saved" });
    setSavingGlobal(false);
  };

  const addPricing = async () => {
    if (!newPricing.country || !newPricing.total_price) return;
    await supabase.from("international_event_pricing").insert(newPricing as any);
    toast({ title: "International pricing added" });
    setShowAdd(false);
    setNewPricing({ country: "", artist_count: 1, total_price: 0, advance_amount: 0, extra_hour_rate: 5000, currency: "INR" });
    fetchPricing();
  };

  const saveEdit = async (id: string) => {
    await supabase.from("international_event_pricing").update(editData as any).eq("id", id);
    toast({ title: "Pricing updated" });
    setEditingId(null);
    fetchPricing();
  };

  const deletePricing = async (id: string) => {
    if (!confirm("Delete this pricing entry?")) return;
    await supabase.from("international_event_pricing").delete().eq("id", id);
    toast({ title: "Pricing deleted" });
    fetchPricing();
  };

  // Group by country
  const grouped = pricing.reduce((acc, p) => {
    if (!acc[p.country]) acc[p.country] = [];
    acc[p.country].push(p);
    return acc;
  }, {} as Record<string, IntlPricing[]>);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-display text-xl font-bold flex items-center gap-2"><Globe className="w-5 h-5 text-primary" />International Event Pricing</h2>
          <p className="text-xs text-muted-foreground font-sans">Set pricing for international event bookings by country</p>
        </div>
        <Button size="sm" className="font-sans rounded-full" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-4 h-4 mr-1" />Add Pricing
        </Button>
      </div>

      {showAdd && (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Country *</Label>
                <Select value={newPricing.country} onValueChange={(v) => setNewPricing({ ...newPricing, country: v })}>
                  <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Artists</Label>
                <Select value={String(newPricing.artist_count)} onValueChange={(v) => setNewPricing({ ...newPricing, artist_count: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n} Artist{n > 1 ? "s" : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Total Price (₹)</Label><Input type="number" value={newPricing.total_price} onChange={(e) => setNewPricing({ ...newPricing, total_price: parseInt(e.target.value) || 0 })} /></div>
              <div><Label className="text-xs">Advance (₹)</Label><Input type="number" value={newPricing.advance_amount} onChange={(e) => setNewPricing({ ...newPricing, advance_amount: parseInt(e.target.value) || 0 })} /></div>
              <div><Label className="text-xs">Extra Hr Rate (₹)</Label><Input type="number" value={newPricing.extra_hour_rate} onChange={(e) => setNewPricing({ ...newPricing, extra_hour_rate: parseInt(e.target.value) || 0 })} /></div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addPricing} className="font-sans"><Save className="w-4 h-4 mr-1" />Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}><X className="w-4 h-4" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Global International Pricing */}
      <Card className="border-primary/20">
        <CardHeader className="py-3 px-4">
          <CardTitle className="font-display text-base flex items-center gap-2">🌍 Global International Pricing (Outside India)</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          <p className="text-xs text-muted-foreground font-sans">Set a single rate for all international bookings. If "Apply to All" is enabled, this pricing applies to any country without specific pricing set above.</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] font-sans">1 Artist – Total (₹)</Label>
              <Input type="number" className="h-8 text-xs" value={globalPricing.one_artist_total || ""} onChange={e => setGlobalPricing({...globalPricing, one_artist_total: parseInt(e.target.value) || 0})} placeholder="e.g. 80000" />
            </div>
            <div>
              <Label className="text-[10px] font-sans">1 Artist – Advance (₹)</Label>
              <Input type="number" className="h-8 text-xs" value={globalPricing.one_artist_advance || ""} onChange={e => setGlobalPricing({...globalPricing, one_artist_advance: parseInt(e.target.value) || 0})} placeholder="e.g. 50000" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] font-sans">2 Artists – Total (₹)</Label>
              <Input type="number" className="h-8 text-xs" value={globalPricing.two_artist_total || ""} onChange={e => setGlobalPricing({...globalPricing, two_artist_total: parseInt(e.target.value) || 0})} placeholder="e.g. 140000" />
            </div>
            <div>
              <Label className="text-[10px] font-sans">2 Artists – Advance (₹)</Label>
              <Input type="number" className="h-8 text-xs" value={globalPricing.two_artist_advance || ""} onChange={e => setGlobalPricing({...globalPricing, two_artist_advance: parseInt(e.target.value) || 0})} placeholder="e.g. 90000" />
            </div>
          </div>
          <div>
            <Label className="text-[10px] font-sans">Extra Hour Rate (₹)</Label>
            <Input type="number" className="h-8 text-xs w-40" value={globalPricing.extra_hour_rate || ""} onChange={e => setGlobalPricing({...globalPricing, extra_hour_rate: parseInt(e.target.value) || 0})} />
          </div>
          <div className="flex items-center gap-3 pt-2 border-t border-border">
            <input type="checkbox" checked={globalPricing.apply_to_all} onChange={e => setGlobalPricing({...globalPricing, apply_to_all: e.target.checked})} className="w-4 h-4 accent-primary" />
            <div>
              <p className="text-xs font-sans font-medium">Apply to All International Bookings</p>
              <p className="text-[10px] text-muted-foreground font-sans">When enabled, all international bookings without country-specific pricing will use these rates</p>
            </div>
          </div>
          <Button size="sm" className="font-sans" onClick={saveGlobalPricing} disabled={savingGlobal}>
            <Save className="w-3 h-3 mr-1" />{savingGlobal ? "Saving..." : "Save Global Pricing"}
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-center text-muted-foreground py-10 font-sans">Loading...</p>
      ) : Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-sans text-muted-foreground">No international pricing set yet. Add pricing for countries above.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([country, entries]) => (
          <Card key={country}>
            <CardHeader className="py-3 px-4">
              <CardTitle className="font-display text-base flex items-center gap-2">🌍 {country}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              {entries.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  {editingId === p.id ? (
                    <div className="flex-1 space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <div><Label className="text-[10px]">Total (₹)</Label><Input className="h-8 text-xs" type="number" value={editData.total_price || 0} onChange={(e) => setEditData({ ...editData, total_price: parseInt(e.target.value) || 0 })} /></div>
                        <div><Label className="text-[10px]">Advance (₹)</Label><Input className="h-8 text-xs" type="number" value={editData.advance_amount || 0} onChange={(e) => setEditData({ ...editData, advance_amount: parseInt(e.target.value) || 0 })} /></div>
                        <div><Label className="text-[10px]">Extra/hr (₹)</Label><Input className="h-8 text-xs" type="number" value={editData.extra_hour_rate || 0} onChange={(e) => setEditData({ ...editData, extra_hour_rate: parseInt(e.target.value) || 0 })} /></div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" className="h-7 text-xs" onClick={() => saveEdit(p.id)}><Save className="w-3 h-3 mr-1" />Save</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="font-sans text-sm font-medium">{p.artist_count} Artist{p.artist_count > 1 ? "s" : ""}</p>
                        <p className="text-xs text-muted-foreground font-sans">
                          Total: {formatPrice(p.total_price)} · Advance: {formatPrice(p.advance_amount)} · Extra: {formatPrice(p.extra_hour_rate)}/hr
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingId(p.id); setEditData(p); }}><Edit2 className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deletePricing(p.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default AdminInternationalPricing;
