import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, Upload, Building2 } from "lucide-react";

const AdminTrustedBrands = () => {
  const [brands, setBrands] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ name: "", category: "brand" });

  const fetch = async () => {
    const { data } = await supabase.from("trusted_brands" as any).select("*").order("sort_order");
    if (data) setBrands(data as any[]);
  };

  useEffect(() => {
    fetch();
    const ch = supabase.channel("admin-brands").on("postgres_changes", { event: "*", schema: "public", table: "trusted_brands" }, () => fetch()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !form.name) { toast({ title: "Name required", variant: "destructive" }); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `brands/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("gallery-images").upload(path, file);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("gallery-images").getPublicUrl(path);
      await supabase.from("trusted_brands" as any).insert({ name: form.name, logo_url: urlData.publicUrl, category: form.category, sort_order: brands.length } as any);
      toast({ title: "Brand added!" });
      setForm({ name: "", category: "brand" });
      fetch();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const remove = async (item: any) => {
    const urlParts = item.logo_url.split("/gallery-images/");
    if (urlParts[1]) await supabase.storage.from("gallery-images").remove([urlParts[1]]);
    await supabase.from("trusted_brands" as any).delete().eq("id", item.id);
    toast({ title: "Deleted" });
    fetch();
  };

  const toggleVisible = async (id: string, val: boolean) => {
    await supabase.from("trusted_brands" as any).update({ is_visible: val } as any).eq("id", id);
    fetch();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold" style={{ fontFamily: 'Inter, sans-serif' }}>Trusted Brands & Partners</h2>
      <Card>
        <CardHeader><CardTitle className="text-base">Add Brand/Logo</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Brand Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Company Name" /></div>
            <div><Label className="text-xs">Category</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="government">Government & Institutional</SelectItem>
                  <SelectItem value="entertainment">Entertainment & Commercial</SelectItem>
                  <SelectItem value="brand">Brand</SelectItem>
                  <SelectItem value="corporate">Corporate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="brand-upload" className="cursor-pointer">
              <Button asChild disabled={uploading || !form.name}><span>{uploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />} Upload Logo</span></Button>
            </Label>
            <input id="brand-upload" type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </div>
        </CardContent>
      </Card>
      {brands.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground"><Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No brands yet</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {brands.map((b: any) => (
            <Card key={b.id} className="relative group">
              <CardContent className="p-4 text-center">
                <img src={b.logo_url} alt={b.name} className="w-full h-20 object-contain mb-2"  loading="lazy" decoding="async" />
                <p className="text-xs font-semibold truncate">{b.name}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{b.category}</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Switch checked={b.is_visible} onCheckedChange={v => toggleVisible(b.id, v)} />
                  <Button variant="ghost" size="sm" className="text-destructive h-6 w-6 p-0" onClick={() => remove(b)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminTrustedBrands;
