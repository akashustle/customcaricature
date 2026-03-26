import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Save, Plus, Trash2, Upload, GripVertical, Image } from "lucide-react";
import { Label } from "@/components/ui/label";

type ExploreItem = {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  link: string;
  icon: string;
  is_visible: boolean;
  sort_order: number;
};

const ICON_OPTIONS = ["palette", "calendar", "shopping", "users", "star", "graduation", "chat", "help", "phone"];

const DEFAULT_ITEMS: ExploreItem[] = [
  { id: "explore_order", title: "Custom Caricatures", subtitle: "Order hand-crafted caricature art from your photos", image_url: "", link: "/order", icon: "palette", sort_order: 1, is_visible: true },
  { id: "explore_events", title: "Book for Events", subtitle: "Live caricature artists for weddings, parties & corporate events", image_url: "", link: "/book-event", icon: "calendar", sort_order: 2, is_visible: true },
  { id: "explore_shop", title: "Shop", subtitle: "Browse caricature merchandise and gifts", image_url: "", link: "/shop", icon: "shopping", sort_order: 3, is_visible: true },
  { id: "explore_gallery", title: "Gallery", subtitle: "Explore our portfolio of caricature masterpieces", image_url: "", link: "/gallery/caricatures", icon: "star", sort_order: 4, is_visible: true },
  { id: "explore_workshop", title: "Workshop", subtitle: "Learn caricature art with professional artists", image_url: "", link: "/workshop", icon: "graduation", sort_order: 5, is_visible: true },
  { id: "explore_chat", title: "Live Chat", subtitle: "Get instant help with your queries", image_url: "", link: "/live-chat", icon: "chat", sort_order: 6, is_visible: true },
  { id: "explore_about", title: "About Us", subtitle: "Our story, team & journey", image_url: "", link: "/about", icon: "users", sort_order: 7, is_visible: true },
  { id: "explore_faq", title: "FAQs", subtitle: "Frequently asked questions answered", image_url: "", link: "/faqs", icon: "help", sort_order: 8, is_visible: true },
  { id: "explore_support", title: "Support", subtitle: "Need help? Reach out to us", image_url: "", link: "/support", icon: "phone", sort_order: 9, is_visible: true },
];

const AdminExploreEditor = () => {
  const [items, setItems] = useState<ExploreItem[]>([]);
  const [saving, setSaving] = useState(false);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const { data } = await supabase.from("content_blocks").select("*").eq("page", "explore").order("sort_order");
    if (data && data.length > 0) {
      setItems(data.map(d => {
        const c = d.content as any;
        return { id: d.id, title: c.title || "", subtitle: c.subtitle || "", image_url: c.image_url || "", link: c.link || "/", icon: c.icon || "palette", is_visible: d.is_visible, sort_order: d.sort_order };
      }));
    } else {
      setItems(DEFAULT_ITEMS);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const item of items) {
        await supabase.from("content_blocks").upsert({
          id: item.id,
          page: "explore",
          block_type: "explore_card",
          sort_order: item.sort_order,
          is_visible: item.is_visible,
          content: { title: item.title, subtitle: item.subtitle, image_url: item.image_url, link: item.link, icon: item.icon, is_visible: item.is_visible },
        });
      }
      toast({ title: "✅ Explore page saved!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleImageUpload = async (itemId: string, file: File) => {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `explore/${itemId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("blog-images").upload(path, file, { upsert: true });
    if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); return; }
    const { data: urlData } = supabase.storage.from("blog-images").getPublicUrl(path);
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, image_url: urlData.publicUrl } : i));
    toast({ title: "✅ Image uploaded!" });
  };

  const addItem = () => {
    const newId = `explore_${Date.now()}`;
    setItems(prev => [...prev, { id: newId, title: "New Section", subtitle: "Description", image_url: "", link: "/", icon: "palette", is_visible: true, sort_order: prev.length + 1 }]);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    supabase.from("content_blocks").delete().eq("id", id).then(() => toast({ title: "Section removed" }));
  };

  const updateItem = (id: string, field: keyof ExploreItem, value: any) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= items.length) return;
    const copy = [...items];
    [copy[idx], copy[next]] = [copy[next], copy[idx]];
    copy.forEach((c, i) => c.sort_order = i + 1);
    setItems(copy);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold">Explore Page Editor</h2>
        <div className="flex gap-2">
          <Button onClick={addItem} variant="outline" size="sm"><Plus className="w-4 h-4 mr-1" />Add Section</Button>
          <Button onClick={handleSave} disabled={saving} size="sm"><Save className="w-4 h-4 mr-1" />{saving ? "Saving..." : "Save All"}</Button>
        </div>
      </div>

      {items.map((item, idx) => (
        <Card key={item.id} className="border border-border">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-muted-foreground">#{idx + 1}</span>
                <Button size="sm" variant="ghost" onClick={() => moveItem(idx, -1)} disabled={idx === 0}>↑</Button>
                <Button size="sm" variant="ghost" onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1}>↓</Button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Visible</Label>
                  <Switch checked={item.is_visible} onCheckedChange={(v) => updateItem(item.id, "is_visible", v)} />
                </div>
                <Button size="sm" variant="destructive" onClick={() => removeItem(item.id)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Title</Label>
                <Input value={item.title} onChange={e => updateItem(item.id, "title", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Subtitle</Label>
                <Input value={item.subtitle} onChange={e => updateItem(item.id, "subtitle", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Link</Label>
                <Input value={item.link} onChange={e => updateItem(item.id, "link", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Icon</Label>
                <select className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background" value={item.icon} onChange={e => updateItem(item.id, "icon", e.target.value)}>
                  {ICON_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {item.image_url && <img src={item.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />}
              <input type="file" accept="image/*" className="hidden" ref={el => { fileRefs.current[item.id] = el; }} onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(item.id, f); }} />
              <Button size="sm" variant="outline" onClick={() => fileRefs.current[item.id]?.click()}><Upload className="w-3 h-3 mr-1" />Upload Image</Button>
              {item.image_url && <Button size="sm" variant="ghost" onClick={() => updateItem(item.id, "image_url", "")}><Trash2 className="w-3 h-3 mr-1" />Remove</Button>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminExploreEditor;
