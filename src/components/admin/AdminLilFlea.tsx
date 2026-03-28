import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Upload, Trash2, Star, Image, ExternalLink, Save, Settings, Link, Calendar, MapPin, Ticket, Eye, ChevronUp, ChevronDown, Smartphone, Clapperboard, Type } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type GalleryItem = {
  id: string;
  image_url: string;
  caption: string | null;
  is_featured: boolean;
  sort_order: number;
};

const DEFAULT_CONFIG = {
  event_name: "The Lil Flea",
  hero_title: "We're Live at The Lil Flea 🎨",
  hero_subtitle: "Get your caricature made in minutes",
  venue: "Jio World Garden, BKC, Mumbai",
  dates: "Apr 3–5 & Apr 10–12",
  time: "From 3 PM onwards",
  ticket_url: "https://www.thelilflea.com/book-tickets-mumbai/",
  district_app_url: "https://play.google.com/store/apps/details?id=com.application.zomato.district&pcampaignid=web_share",
  maps_url: "https://maps.app.goo.gl/JioWorldGardenBKC",
  whatsapp_number: "919819731040",
  show_district: true,
  splash_line1: "We're Coming to",
  splash_line2: "The Lil Flea!",
  splash_line3: "Come, Visit Our Stall",
  splash_line4: "See You There! 🎨",
  splash_enabled: true,
};

const AdminLilFlea = () => {
  const [images, setImages] = useState<GalleryItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);

  const fetchImages = async () => {
    const { data } = await supabase.from("lil_flea_gallery").select("*").order("sort_order");
    if (data) setImages(data as any[]);
    setLoading(false);
  };

  const fetchConfig = async () => {
    const { data } = await supabase.from("admin_site_settings").select("*").eq("id", "lil_flea_config").maybeSingle();
    if (data?.value) setConfig({ ...DEFAULT_CONFIG, ...(data.value as any) });
  };

  useEffect(() => {
    fetchImages();
    fetchConfig();
    const ch = supabase
      .channel("admin-lil-flea-gallery")
      .on("postgres_changes", { event: "*", schema: "public", table: "lil_flea_gallery" }, () => fetchImages())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const saveConfig = async () => {
    setSaving(true);
    await supabase.from("admin_site_settings").upsert({
      id: "lil_flea_config",
      value: config as any,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });
    toast({ title: "Settings saved ✅" });
    setSaving(false);
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const maxSort = images.length > 0 ? Math.max(...images.map(i => i.sort_order)) : 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop();
      const path = `lil-flea/${Date.now()}-${i}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("gallery").upload(path, file, { upsert: true });
      if (uploadErr) { toast({ title: `Upload failed: ${file.name}`, variant: "destructive" }); continue; }
      const { data: urlData } = supabase.storage.from("gallery").getPublicUrl(path);
      await supabase.from("lil_flea_gallery").insert({ image_url: urlData.publicUrl, sort_order: maxSort + i + 1, caption: null, is_featured: false } as any);
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
    const a = images[idx]; const b = images[swapIdx];
    await Promise.all([
      supabase.from("lil_flea_gallery").update({ sort_order: b.sort_order } as any).eq("id", a.id),
      supabase.from("lil_flea_gallery").update({ sort_order: a.sort_order } as any).eq("id", b.id),
    ]);
  };

  const clearSplashSession = () => {
    toast({ title: "Splash will show again on next visit to /lil-flea", description: "Session cleared for testing" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            🎪 Lil Flea Page
          </h2>
          <p className="text-muted-foreground text-sm">Manage event page, splash screen, gallery & content</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={clearSplashSession} className="gap-1.5 rounded-xl text-xs">
            <Clapperboard className="w-3.5 h-3.5" /> Reset Splash
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open("/lil-flea", "_blank")} className="gap-1.5 rounded-xl text-xs">
            <Eye className="w-3.5 h-3.5" /> Preview
          </Button>
        </div>
      </div>

      <Tabs defaultValue="splash" className="w-full">
        <TabsList className="w-full flex flex-wrap gap-1 bg-muted/50 p-1 rounded-xl h-auto">
          <TabsTrigger value="splash" className="gap-1.5 rounded-lg text-xs flex-1 min-w-[80px]"><Clapperboard className="w-3.5 h-3.5" /> Splash</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5 rounded-lg text-xs flex-1 min-w-[80px]"><Settings className="w-3.5 h-3.5" /> Event</TabsTrigger>
          <TabsTrigger value="gallery" className="gap-1.5 rounded-lg text-xs flex-1 min-w-[80px]"><Image className="w-3.5 h-3.5" /> Gallery</TabsTrigger>
          <TabsTrigger value="links" className="gap-1.5 rounded-lg text-xs flex-1 min-w-[80px]"><Link className="w-3.5 h-3.5" /> Links</TabsTrigger>
        </TabsList>

        {/* ─── SPLASH TAB ─── */}
        <TabsContent value="splash" className="space-y-4 mt-4">
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Clapperboard className="w-4 h-4 text-accent" /> Splash Screen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Enable Splash Screen</Label>
                  <p className="text-xs text-muted-foreground">Show cinematic intro when users visit the page</p>
                </div>
                <Switch checked={config.splash_enabled} onCheckedChange={v => setConfig({ ...config, splash_enabled: v })} />
              </div>

              <div className="border-t border-border/50 pt-4 space-y-4">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5"><Type className="w-3.5 h-3.5" /> Typewriter Text Lines</p>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Line 1 — Opening subtitle</Label>
                    <Input value={config.splash_line1} onChange={e => setConfig({ ...config, splash_line1: e.target.value })} placeholder="We're Coming to" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Line 2 — Main title (big caricature font)</Label>
                    <Input value={config.splash_line2} onChange={e => setConfig({ ...config, splash_line2: e.target.value })} placeholder="The Lil Flea!" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Line 3 — Call to action message</Label>
                    <Input value={config.splash_line3} onChange={e => setConfig({ ...config, splash_line3: e.target.value })} placeholder="Come, Visit Our Stall" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Line 4 — Final closing message</Label>
                    <Input value={config.splash_line4} onChange={e => setConfig({ ...config, splash_line4: e.target.value })} placeholder="See You There! 🎨" />
                  </div>
                </div>

                <div className="bg-muted/30 rounded-xl p-4 text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold">ℹ️ Splash flow (12 seconds):</p>
                  <p>0-2s → 3D gate opens, logo appears</p>
                  <p>2-4.5s → Line 1 & 2 typewriter</p>
                  <p>4.5-6s → Line 3 + date/time/venue</p>
                  <p>6-9.5s → Images flow from all directions</p>
                  <p>9.5-12s → Line 4 final message + fade out</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={saveConfig} disabled={saving} className="gap-2 rounded-xl bg-primary text-primary-foreground font-semibold">
              <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Splash Settings"}
            </Button>
          </div>
        </TabsContent>

        {/* ─── SETTINGS TAB ─── */}
        <TabsContent value="settings" className="space-y-4 mt-4">
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Calendar className="w-4 h-4 text-accent" /> Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Event Name</Label>
                  <Input value={config.event_name} onChange={e => setConfig({ ...config, event_name: e.target.value })} placeholder="The Lil Flea" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Venue</Label>
                  <Input value={config.venue} onChange={e => setConfig({ ...config, venue: e.target.value })} placeholder="Jio World Garden, BKC" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Dates</Label>
                  <Input value={config.dates} onChange={e => setConfig({ ...config, dates: e.target.value })} placeholder="Apr 3–5 & Apr 10–12" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Time</Label>
                  <Input value={config.time} onChange={e => setConfig({ ...config, time: e.target.value })} placeholder="From 3 PM onwards" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4 text-accent" /> Hero Section Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Hero Title</Label>
                <Input value={config.hero_title} onChange={e => setConfig({ ...config, hero_title: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Hero Subtitle</Label>
                <Input value={config.hero_subtitle} onChange={e => setConfig({ ...config, hero_subtitle: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">WhatsApp Number (without +)</Label>
                <Input value={config.whatsapp_number} onChange={e => setConfig({ ...config, whatsapp_number: e.target.value })} placeholder="919819731040" />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={saveConfig} disabled={saving} className="gap-2 rounded-xl bg-primary text-primary-foreground font-semibold">
              <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </TabsContent>

        {/* ─── GALLERY TAB ─── */}
        <TabsContent value="gallery" className="space-y-4 mt-4">
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Upload className="w-4 h-4 text-accent" /> Upload Images</CardTitle>
            </CardHeader>
            <CardContent>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl p-10 cursor-pointer hover:bg-muted/30 transition-all hover:border-accent/50">
                <Image className="w-10 h-10 text-muted-foreground mb-3" />
                <span className="text-sm text-muted-foreground font-medium">{uploading ? "Uploading..." : "Click to upload multiple images"}</span>
                <span className="text-xs text-muted-foreground/60 mt-1">JPG, PNG, WebP supported</span>
                <input type="file" multiple accept="image/*" className="hidden" onChange={e => handleUpload(e.target.files)} disabled={uploading} />
              </label>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Image className="w-4 h-4 text-accent" /> Gallery ({images.length} images)</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground text-sm py-8 text-center">Loading...</p>
              ) : images.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">No images yet. Upload above to start.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {images.map((img, idx) => (
                    <div key={img.id} className="relative group rounded-xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow">
                      <img src={img.image_url} alt={img.caption || `Gallery ${idx + 1}`} className="w-full h-36 object-cover" loading="lazy" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="text-white h-8 w-8 p-0" onClick={() => moveImage(img.id, "up")} title="Move up"><ChevronUp className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" className="text-white h-8 w-8 p-0" onClick={() => moveImage(img.id, "down")} title="Move down"><ChevronDown className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" className={`h-8 w-8 p-0 ${img.is_featured ? "text-amber-400" : "text-white"}`} onClick={() => toggleFeatured(img.id, img.is_featured)} title="Toggle featured"><Star className="w-4 h-4" fill={img.is_featured ? "currentColor" : "none"} /></Button>
                          <Button size="sm" variant="ghost" className="text-red-400 h-8 w-8 p-0" onClick={() => handleDelete(img.id)} title="Delete"><Trash2 className="w-4 h-4" /></Button>
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
                        <div className="absolute top-1.5 right-1.5 bg-accent text-accent-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5"><Star className="w-2.5 h-2.5" /> Featured</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── LINKS TAB ─── */}
        <TabsContent value="links" className="space-y-4 mt-4">
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Ticket className="w-4 h-4 text-accent" /> Ticket Booking Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Event Ticket URL</Label>
                <Input value={config.ticket_url} onChange={e => setConfig({ ...config, ticket_url: e.target.value })} placeholder="https://thelilflea.com/book-tickets-mumbai/" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Google Maps URL</Label>
                <Input value={config.maps_url} onChange={e => setConfig({ ...config, maps_url: e.target.value })} placeholder="https://maps.app.goo.gl/..." />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Smartphone className="w-4 h-4 text-accent" /> District App Integration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Show District App Section</Label>
                  <p className="text-xs text-muted-foreground">Display "Book via District App" on the page</p>
                </div>
                <Switch checked={config.show_district} onCheckedChange={v => setConfig({ ...config, show_district: v })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">District App Link</Label>
                <Input value={config.district_app_url} onChange={e => setConfig({ ...config, district_app_url: e.target.value })} placeholder="https://play.google.com/store/apps/..." />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={saveConfig} disabled={saving} className="gap-2 rounded-xl bg-primary text-primary-foreground font-semibold">
              <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Links"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminLilFlea;
