import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Trash2, Plus, Loader2, Image, Eye, EyeOff } from "lucide-react";

type BAItem = {
  id: string;
  before_image_url: string;
  after_image_url: string;
  caption: string | null;
  sort_order: number;
  is_active: boolean;
};

const AdminBeforeAfter = () => {
  const [items, setItems] = useState<BAItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);

  const fetchItems = async () => {
    const { data } = await supabase.from("before_after_gallery").select("*").order("sort_order");
    if (data) setItems(data as BAItem[]);
  };

  useEffect(() => {
    fetchItems();
    const ch = supabase.channel("admin-ba-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "before_after_gallery" }, () => fetchItems())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const handleUpload = async () => {
    if (!beforeFile || !afterFile) { toast({ title: "Select both images", variant: "destructive" }); return; }
    setUploading(true);
    try {
      const uploadFile = async (file: File, prefix: string) => {
        const ext = file.name.split(".").pop();
        const path = `before-after/${prefix}-${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("gallery-images").upload(path, file);
        if (error) throw error;
        return supabase.storage.from("gallery-images").getPublicUrl(path).data.publicUrl;
      };

      const beforeUrl = await uploadFile(beforeFile, "before");
      const afterUrl = await uploadFile(afterFile, "after");

      const { error } = await supabase.from("before_after_gallery").insert({
        before_image_url: beforeUrl,
        after_image_url: afterUrl,
        caption: caption || null,
        sort_order: items.length,
      } as any);
      if (error) throw error;

      setCaption(""); setBeforeFile(null); setAfterFile(null);
      toast({ title: "Before/After pair added!" });
      fetchItems();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (item: BAItem) => {
    // Clean up storage
    for (const url of [item.before_image_url, item.after_image_url]) {
      const parts = url.split("/gallery-images/");
      if (parts[1]) await supabase.storage.from("gallery-images").remove([parts[1]]);
    }
    await supabase.from("before_after_gallery").delete().eq("id", item.id);
    toast({ title: "Deleted" });
    fetchItems();
  };

  const toggleActive = async (item: BAItem) => {
    await supabase.from("before_after_gallery").update({ is_active: !item.is_active } as any).eq("id", item.id);
    fetchItems();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg" style={{ fontFamily: 'Inter, sans-serif' }}>Before & After Gallery</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="space-y-1">
            <Label className="font-sans text-sm">Before Image (Original Photo)</Label>
            <Input type="file" accept="image/*" onChange={(e) => setBeforeFile(e.target.files?.[0] || null)} />
          </div>
          <div className="space-y-1">
            <Label className="font-sans text-sm">After Image (Caricature)</Label>
            <Input type="file" accept="image/*" onChange={(e) => setAfterFile(e.target.files?.[0] || null)} />
          </div>
          <div className="space-y-1">
            <Label className="font-sans text-sm">Caption (optional)</Label>
            <div className="flex gap-2">
              <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption..." />
              <Button onClick={handleUpload} disabled={uploading || !beforeFile || !afterFile}>
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground font-sans">
            <Image className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No before/after pairs yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <div key={item.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="grid grid-cols-2 gap-0.5">
                  <div className="relative">
                    <img src={item.before_image_url} alt="Before" className="w-full h-32 object-cover"  loading="lazy" decoding="async" />
                    <span className="absolute top-1 left-1 bg-foreground/60 text-background text-[10px] px-2 py-0.5 rounded-full font-sans">Before</span>
                  </div>
                  <div className="relative">
                    <img src={item.after_image_url} alt="After" className="w-full h-32 object-cover"  loading="lazy" decoding="async" />
                    <span className="absolute top-1 left-1 bg-primary/80 text-primary-foreground text-[10px] px-2 py-0.5 rounded-full font-sans">After</span>
                  </div>
                </div>
                <div className="p-2 flex items-center justify-between">
                  <span className="text-xs font-sans text-muted-foreground truncate flex-1">{item.caption || "No caption"}</span>
                  <div className="flex gap-1">
                    <button onClick={() => toggleActive(item)} className={`w-7 h-7 rounded-full flex items-center justify-center ${item.is_active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {item.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => handleDelete(item)} className="w-7 h-7 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminBeforeAfter;
