import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Trash2, Plus, Loader2, Image } from "lucide-react";

type GalleryItem = {
  id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
};

const GallerySection = ({ table, bucketFolder }: { table: string; bucketFolder: string }) => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");

  const fetchItems = async () => {
    const { data } = await supabase.from(table as any).select("*").order("sort_order");
    if (data) setItems(data as GalleryItem[]);
  };

  useEffect(() => {
    fetchItems();
    const ch = supabase.channel(`${table}-changes`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => fetchItems())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const path = `${bucketFolder}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("gallery-images").upload(path, file);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("gallery-images").getPublicUrl(path);
        const { error: dbErr } = await supabase.from(table as any).insert({
          image_url: urlData.publicUrl,
          caption: caption || null,
          sort_order: items.length,
        } as any);
        if (dbErr) throw dbErr;
      }
      setCaption("");
      toast({ title: "Images uploaded!" });
      fetchItems();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (item: GalleryItem) => {
    const urlParts = item.image_url.split("/gallery-images/");
    if (urlParts[1]) {
      await supabase.storage.from("gallery-images").remove([urlParts[1]]);
    }
    await supabase.from(table as any).delete().eq("id", item.id);
    toast({ title: "Image deleted" });
    fetchItems();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end">
        <div className="flex-1 space-y-1">
          <Label className="font-sans text-sm">Caption (optional)</Label>
          <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Enter caption..." />
        </div>
        <div>
          <Label htmlFor={`upload-${table}`} className="cursor-pointer">
            <Button asChild disabled={uploading}>
              <span>
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Upload
              </span>
            </Button>
          </Label>
          <input id={`upload-${table}`} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground font-sans">
          <Image className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No images yet. Upload some!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.id} className="group relative rounded-xl overflow-hidden border border-border bg-card">
              <img src={item.image_url} alt={item.caption || "Gallery"} className="w-full h-40 object-cover" />
              {item.caption && (
                <p className="px-2 py-1 text-xs font-sans text-muted-foreground truncate">{item.caption}</p>
              )}
              <button
                onClick={() => handleDelete(item)}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-destructive/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AdminGallery = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold" style={{ fontFamily: 'Inter, sans-serif' }}>Gallery Management</h2>
      <Tabs defaultValue="scroll-events">
        <TabsList>
          <TabsTrigger value="scroll-events">Scroll Event Gallery</TabsTrigger>
          <TabsTrigger value="events">Event Gallery</TabsTrigger>
          <TabsTrigger value="caricatures">Caricature Gallery</TabsTrigger>
        </TabsList>
        <TabsContent value="scroll-events" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Scroll Event Images (Homepage Slideshow)</CardTitle>
            </CardHeader>
            <CardContent>
              <GallerySection table="scroll_event_images" bucketFolder="scroll-events" />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="events" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Event Gallery</CardTitle>
            </CardHeader>
            <CardContent>
              <GallerySection table="event_gallery" bucketFolder="events" />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="caricatures" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Custom Caricature Gallery</CardTitle>
            </CardHeader>
            <CardContent>
              <GallerySection table="caricature_gallery" bucketFolder="caricatures" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminGallery;
