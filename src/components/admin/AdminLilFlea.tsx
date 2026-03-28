import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Upload, Trash2, Star, GripVertical, Image, ExternalLink } from "lucide-react";

type GalleryItem = {
  id: string;
  image_url: string;
  caption: string | null;
  is_featured: boolean;
  sort_order: number;
};

const AdminLilFlea = () => {
  const [images, setImages] = useState<GalleryItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchImages = async () => {
    const { data } = await supabase.from("lil_flea_gallery").select("*").order("sort_order");
    if (data) setImages(data as any[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchImages();
    const ch = supabase
      .channel("admin-lil-flea-gallery")
      .on("postgres_changes", { event: "*", schema: "public", table: "lil_flea_gallery" }, () => fetchImages())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const maxSort = images.length > 0 ? Math.max(...images.map(i => i.sort_order)) : 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop();
      const path = `lil-flea/${Date.now()}-${i}.${ext}`;

      const { error: uploadErr } = await supabase.storage.from("gallery").upload(path, file, { upsert: true });
      if (uploadErr) {
        toast({ title: `Upload failed: ${file.name}`, variant: "destructive" });
        continue;
      }

      const { data: urlData } = supabase.storage.from("gallery").getPublicUrl(path);
      await supabase.from("lil_flea_gallery").insert({
        image_url: urlData.publicUrl,
        sort_order: maxSort + i + 1,
        caption: null,
        is_featured: false,
      } as any);
    }

    toast({ title: `${files.length} image(s) uploaded ✅` });
    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("lil_flea_gallery").delete().eq("id", id);
    toast({ title: "Image deleted" });
  };

  const toggleFeatured = async (id: string, current: boolean) => {
    await supabase.from("lil_flea_gallery").update({ is_featured: !current } as any).eq("id", id);
  };

  const updateCaption = async (id: string, caption: string) => {
    await supabase.from("lil_flea_gallery").update({ caption } as any).eq("id", id);
  };

  const moveImage = async (id: string, direction: "up" | "down") => {
    const idx = images.findIndex(i => i.id === id);
    if ((direction === "up" && idx <= 0) || (direction === "down" && idx >= images.length - 1)) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const a = images[idx];
    const b = images[swapIdx];
    await Promise.all([
      supabase.from("lil_flea_gallery").update({ sort_order: b.sort_order } as any).eq("id", a.id),
      supabase.from("lil_flea_gallery").update({ sort_order: a.sort_order } as any).eq("id", b.id),
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Lil Flea Page</h2>
          <p className="text-muted-foreground text-sm">Manage gallery, images & event details for the Lil Flea landing page</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.open("/lil-flea", "_blank")} className="gap-1">
            <ExternalLink className="w-4 h-4" /> View Page
          </Button>
        </div>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><ExternalLink className="w-4 h-4" /> Event Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Page URL:</strong> /lil-flea</p>
          <p><strong>Ticket Link:</strong> <a href="https://thelilflea.com/booking-tickets-mumbai" target="_blank" rel="noopener" className="text-primary underline">thelilflea.com/booking-tickets-mumbai</a></p>
          <p><strong>Venue:</strong> Jio World Garden, BKC, Mumbai</p>
          <p><strong>Dates:</strong> Apr 3–5 & Apr 10–12, from 3 PM</p>
        </CardContent>
      </Card>

      {/* Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Upload className="w-4 h-4" /> Upload Images</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:bg-muted/50 transition-colors">
            <Image className="w-8 h-8 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">{uploading ? "Uploading..." : "Click to upload multiple images"}</span>
            <input type="file" multiple accept="image/*" className="hidden" onChange={e => handleUpload(e.target.files)} disabled={uploading} />
          </label>
        </CardContent>
      </Card>

      {/* Gallery Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Image className="w-4 h-4" /> Gallery ({images.length} images)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Loading...</p>
          ) : images.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No images uploaded yet. Upload images above to populate the gallery.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((img, idx) => (
                <div key={img.id} className="relative group rounded-xl overflow-hidden border border-border">
                  <img src={img.image_url} alt={img.caption || `Gallery ${idx + 1}`} className="w-full h-40 object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="text-white h-8 w-8 p-0" onClick={() => moveImage(img.id, "up")} title="Move up">
                        <GripVertical className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className={`h-8 w-8 p-0 ${img.is_featured ? "text-amber-400" : "text-white"}`} onClick={() => toggleFeatured(img.id, img.is_featured)} title="Toggle featured">
                        <Star className="w-4 h-4" fill={img.is_featured ? "currentColor" : "none"} />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-400 h-8 w-8 p-0" onClick={() => handleDelete(img.id)} title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Caption"
                      defaultValue={img.caption || ""}
                      onBlur={e => updateCaption(img.id, e.target.value)}
                      className="h-7 text-xs bg-white/20 border-white/30 text-white placeholder:text-white/50 w-4/5"
                      onClick={e => e.stopPropagation()}
                    />
                  </div>
                  {img.is_featured && (
                    <div className="absolute top-1 right-1 bg-amber-500 text-black text-[10px] px-1.5 py-0.5 rounded-full font-bold">Featured</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLilFlea;
