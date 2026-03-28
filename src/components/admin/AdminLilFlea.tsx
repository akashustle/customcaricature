import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Upload, Trash2, Star, Image, ExternalLink, Save, Settings, Link, Calendar, MapPin, Ticket, Eye, ChevronUp, ChevronDown, Smartphone, Clapperboard, Type, Bell, Users, Volume2, Power, Instagram, Mail } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type GalleryItem = {
  id: string;
  image_url: string;
  caption: string | null;
  is_featured: boolean;
  sort_order: number;
};

type NotifyUser = {
  id: string;
  name: string;
  mobile: string;
  instagram_id: string | null;
  created_at: string;
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
  maps_url: "https://maps.app.goo.gl/UCwiCob2ikenav397",
  whatsapp_number: "919819731040",
  show_district: true,
  splash_line1: "We're Coming to",
  splash_line2: "The Lil Flea!",
  splash_line3: "Come, Visit Our Stall",
  splash_line4: "See You There! 🎨",
  splash_enabled: true,
  splash_sound_url: "/sounds/lil-flea-splash.wav",
  show_footer_link: true,
  footer_link_text: "🎪 Lil Flea Live",
  page_closed: false,
  close_message: "Thank you for joining The Lil Flea and connecting with Live Caricature!",
  instagram_id: "creativecaricatureclub",
  email: "info@creativecaricatureclub.com",
};

const AdminLilFlea = () => {
  const [images, setImages] = useState<GalleryItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [notifyUsers, setNotifyUsers] = useState<NotifyUser[]>([]);
  const [uploadingSound, setUploadingSound] = useState(false);

  const fetchImages = async () => {
    const { data } = await supabase.from("lil_flea_gallery").select("*").order("sort_order");
    if (data) setImages(data as any[]);
    setLoading(false);
  };

  const fetchConfig = async () => {
    const { data } = await supabase.from("admin_site_settings").select("*").eq("id", "lil_flea_config").maybeSingle();
    if (data?.value) setConfig({ ...DEFAULT_CONFIG, ...(data.value as any) });
  };

  const fetchNotifyUsers = async () => {
    const { data } = await supabase.from("lil_flea_notify_users" as any).select("*").order("created_at", { ascending: false });
    if (data) setNotifyUsers(data as any[]);
  };

  useEffect(() => {
    fetchImages();
    fetchConfig();
    fetchNotifyUsers();
    const ch = supabase
      .channel("admin-lil-flea-gallery")
      .on("postgres_changes", { event: "*", schema: "public", table: "lil_flea_gallery" }, () => fetchImages())
      .on("postgres_changes", { event: "*", schema: "public", table: "lil_flea_notify_users" }, () => fetchNotifyUsers())
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
      const { error: uploadErr } = await supabase.storage.from("gallery-images").upload(path, file, { upsert: true });
      if (uploadErr) { toast({ title: `Upload failed: ${file.name}`, variant: "destructive" }); continue; }
      const { data: urlData } = supabase.storage.from("gallery-images").getPublicUrl(path);
      await supabase.from("lil_flea_gallery").insert({ image_url: urlData.publicUrl, sort_order: maxSort + i + 1, caption: null, is_featured: false } as any);
    }
    toast({ title: `${files.length} image(s) uploaded ✅` });
    setUploading(false);
  };

  const handleSoundUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingSound(true);
    const file = files[0];
    const ext = file.name.split(".").pop();
    const path = `lil-flea/splash-sound.${ext}`;
    const { error } = await supabase.storage.from("gallery-images").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Sound upload failed", variant: "destructive" });
      setUploadingSound(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("gallery-images").getPublicUrl(path);
    setConfig({ ...config, splash_sound_url: urlData.publicUrl });
    toast({ title: "Sound uploaded ✅ — Save settings to apply" });
    setUploadingSound(false);
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

  const deleteNotifyUser = async (id: string) => {
    await supabase.from("lil_flea_notify_users" as any).delete().eq("id", id);
    toast({ title: "User removed" });
  };

  const clearSplashSession = () => {
    sessionStorage.removeItem("lf_splash_done");
    sessionStorage.removeItem("lf_thankyou_shown");
    toast({ title: "Splash will show again on next visit to /lil-flea" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">🎪 Lil Flea Page</h2>
          <p className="text-muted-foreground text-sm">Manage event page, splash, gallery, notifications & content</p>
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
          <TabsTrigger value="splash" className="gap-1.5 rounded-lg text-xs flex-1 min-w-[70px]"><Clapperboard className="w-3.5 h-3.5" /> Splash</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5 rounded-lg text-xs flex-1 min-w-[70px]"><Settings className="w-3.5 h-3.5" /> Event</TabsTrigger>
          <TabsTrigger value="gallery" className="gap-1.5 rounded-lg text-xs flex-1 min-w-[70px]"><Image className="w-3.5 h-3.5" /> Gallery</TabsTrigger>
          <TabsTrigger value="links" className="gap-1.5 rounded-lg text-xs flex-1 min-w-[70px]"><Link className="w-3.5 h-3.5" /> Links</TabsTrigger>
          <TabsTrigger value="page" className="gap-1.5 rounded-lg text-xs flex-1 min-w-[70px]"><Power className="w-3.5 h-3.5" /> Page</TabsTrigger>
          <TabsTrigger value="notify" className="gap-1.5 rounded-lg text-xs flex-1 min-w-[70px]"><Bell className="w-3.5 h-3.5" /> Notify ({notifyUsers.length})</TabsTrigger>
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
                  <p className="text-xs text-muted-foreground">Show cinematic intro (once per session)</p>
                </div>
                <Switch checked={config.splash_enabled} onCheckedChange={v => setConfig({ ...config, splash_enabled: v })} />
              </div>

              <div className="border-t border-border/50 pt-4 space-y-4">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5"><Type className="w-3.5 h-3.5" /> Typewriter Text</p>
                {[
                  { key: "splash_line1" as const, label: "Line 1 — Opening", ph: "We're Coming to" },
                  { key: "splash_line2" as const, label: "Line 2 — Main title (big font)", ph: "The Lil Flea!" },
                  { key: "splash_line3" as const, label: "Line 3 — Call to action", ph: "Come, Visit Our Stall" },
                  { key: "splash_line4" as const, label: "Line 4 — Final message", ph: "See You There! 🎨" },
                ].map(field => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{field.label}</Label>
                    <Input value={config[field.key]} onChange={e => setConfig({ ...config, [field.key]: e.target.value })} placeholder={field.ph} />
                  </div>
                ))}
              </div>

              <div className="border-t border-border/50 pt-4 space-y-3">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5"><Volume2 className="w-3.5 h-3.5" /> Splash Sound</p>
                <p className="text-xs text-muted-foreground">Current: {config.splash_sound_url || "Default"}</p>
                <div className="flex gap-2 items-center">
                  <label className="flex items-center gap-2 border border-dashed border-border rounded-xl px-4 py-2 cursor-pointer hover:bg-muted/30 transition-all text-sm">
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{uploadingSound ? "Uploading..." : "Upload New Sound"}</span>
                    <input type="file" accept="audio/*" className="hidden" onChange={e => handleSoundUpload(e.target.files)} disabled={uploadingSound} />
                  </label>
                  {config.splash_sound_url && config.splash_sound_url !== "/sounds/lil-flea-splash.wav" && (
                    <Button variant="ghost" size="sm" onClick={() => setConfig({ ...config, splash_sound_url: "/sounds/lil-flea-splash.wav" })} className="text-xs text-destructive">
                      Reset to Default
                    </Button>
                  )}
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
                {[
                  { key: "event_name" as const, label: "Event Name", ph: "The Lil Flea" },
                  { key: "venue" as const, label: "Venue", ph: "Jio World Garden, BKC" },
                  { key: "dates" as const, label: "Dates", ph: "Apr 3–5 & Apr 10–12" },
                  { key: "time" as const, label: "Time", ph: "From 3 PM onwards" },
                ].map(field => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{field.label}</Label>
                    <Input value={config[field.key]} onChange={e => setConfig({ ...config, [field.key]: e.target.value })} placeholder={field.ph} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4 text-accent" /> Hero + Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "hero_title" as const, label: "Hero Title" },
                { key: "hero_subtitle" as const, label: "Hero Subtitle" },
                { key: "whatsapp_number" as const, label: "WhatsApp (without +)" },
                { key: "instagram_id" as const, label: "Instagram Handle" },
                { key: "email" as const, label: "Email Address" },
              ].map(field => (
                <div key={field.key} className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{field.label}</Label>
                  <Input value={(config as any)[field.key] || ""} onChange={e => setConfig({ ...config, [field.key]: e.target.value })} />
                </div>
              ))}
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
                <p className="text-muted-foreground text-sm py-8 text-center">No images yet.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {images.map((img, idx) => (
                    <div key={img.id} className="relative group rounded-xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow">
                      <img src={img.image_url} alt={img.caption || `Gallery ${idx + 1}`} className="w-full h-36 object-cover" loading="lazy" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="text-white h-8 w-8 p-0" onClick={() => moveImage(img.id, "up")}><ChevronUp className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" className="text-white h-8 w-8 p-0" onClick={() => moveImage(img.id, "down")}><ChevronDown className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" className={`h-8 w-8 p-0 ${img.is_featured ? "text-amber-400" : "text-white"}`} onClick={() => toggleFeatured(img.id, img.is_featured)}><Star className="w-4 h-4" fill={img.is_featured ? "currentColor" : "none"} /></Button>
                          <Button size="sm" variant="ghost" className="text-red-400 h-8 w-8 p-0" onClick={() => handleDelete(img.id)}><Trash2 className="w-4 h-4" /></Button>
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
              <CardTitle className="text-base flex items-center gap-2"><Ticket className="w-4 h-4 text-accent" /> Ticket Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "ticket_url" as const, label: "Event Ticket URL" },
                { key: "maps_url" as const, label: "Google Maps URL" },
              ].map(field => (
                <div key={field.key} className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{field.label}</Label>
                  <Input value={config[field.key]} onChange={e => setConfig({ ...config, [field.key]: e.target.value })} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Smartphone className="w-4 h-4 text-accent" /> District App</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Show District App Section</Label>
                  <p className="text-xs text-muted-foreground">Display District booking option on the page</p>
                </div>
                <Switch checked={config.show_district} onCheckedChange={v => setConfig({ ...config, show_district: v })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">District App Link</Label>
                <Input value={config.district_app_url} onChange={e => setConfig({ ...config, district_app_url: e.target.value })} />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={saveConfig} disabled={saving} className="gap-2 rounded-xl bg-primary text-primary-foreground font-semibold">
              <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Links"}
            </Button>
          </div>
        </TabsContent>

        {/* ─── PAGE TAB ─── */}
        <TabsContent value="page" className="space-y-4 mt-4">
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Power className="w-4 h-4 text-accent" /> Page Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Close Page (Event Ended)</Label>
                  <p className="text-xs text-muted-foreground">Shows thank you message + notify prompt instead of the page</p>
                </div>
                <Switch checked={config.page_closed || false} onCheckedChange={v => setConfig({ ...config, page_closed: v })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Close Message</Label>
                <Input value={config.close_message || ""} onChange={e => setConfig({ ...config, close_message: e.target.value })} placeholder="Thank you for joining..." />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Link className="w-4 h-4 text-accent" /> Footer Link</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Show in Footer Navigation</Label>
                  <p className="text-xs text-muted-foreground">Toggle Lil Flea link visibility in the site footer</p>
                </div>
                <Switch checked={config.show_footer_link !== false} onCheckedChange={v => setConfig({ ...config, show_footer_link: v })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Footer Link Text</Label>
                <Input value={config.footer_link_text || ""} onChange={e => setConfig({ ...config, footer_link_text: e.target.value })} placeholder="🎪 Lil Flea Live" />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={saveConfig} disabled={saving} className="gap-2 rounded-xl bg-primary text-primary-foreground font-semibold">
              <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Page Settings"}
            </Button>
          </div>
        </TabsContent>

        {/* ─── NOTIFY TAB ─── */}
        <TabsContent value="notify" className="space-y-4 mt-4">
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Bell className="w-4 h-4 text-accent" /> Notify Users ({notifyUsers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {notifyUsers.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">No users have signed up for notifications yet.</p>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground px-3 py-2 bg-muted/30 rounded-lg">
                    <span className="col-span-3">Name</span>
                    <span className="col-span-3">Mobile</span>
                    <span className="col-span-3">Instagram</span>
                    <span className="col-span-2">Date</span>
                    <span className="col-span-1"></span>
                  </div>
                  {notifyUsers.map(user => (
                    <div key={user.id} className="grid grid-cols-12 gap-2 items-center text-sm px-3 py-2 rounded-lg hover:bg-muted/20 transition-colors border border-transparent hover:border-border">
                      <span className="col-span-3 font-medium truncate">{user.name}</span>
                      <span className="col-span-3 text-muted-foreground truncate">{user.mobile}</span>
                      <span className="col-span-3 text-muted-foreground truncate">{user.instagram_id || "—"}</span>
                      <span className="col-span-2 text-xs text-muted-foreground">{new Date(user.created_at).toLocaleDateString()}</span>
                      <span className="col-span-1 flex justify-end">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteNotifyUser(user.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminLilFlea;
