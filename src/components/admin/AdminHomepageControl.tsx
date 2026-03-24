import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Plus, Trash2, GripVertical, Upload, Image } from "lucide-react";

const ThumbnailUploader = ({ currentUrl, onUploaded }: { currentUrl?: string; onUploaded: (url: string) => void }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `thumbnails/video-thumb-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("blog-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("blog-images").getPublicUrl(path);
      onUploaded(urlData.publicUrl);
      toast({ title: "✅ Thumbnail uploaded!" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      <Button variant="outline" size="sm" className="rounded-full gap-2" onClick={() => fileRef.current?.click()} disabled={uploading}>
        <Image className="w-4 h-4" />
        {uploading ? "Uploading..." : "Choose Thumbnail Image"}
      </Button>
    </div>
  );
};

const AdminHomepageControl = () => {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      const keys = [
        "homepage_hero", "homepage_video", "homepage_social_proof",
        "homepage_what_you_get", "homepage_why_us", "homepage_use_cases",
        "homepage_smart_help", "homepage_sticky_cta", "homepage_urgency",
        "homepage_instant_quote", "homepage_sections", "homepage_funnel_config"
      ];
      const { data } = await supabase.from("admin_site_settings").select("id, value").in("id", keys);
      if (data) {
        const map: Record<string, any> = {};
        data.forEach((row: any) => { map[row.id] = row.value; });
        setSettings(map);
      }
    };
    fetchAll();
  }, []);

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(settings)) {
        await supabase.from("admin_site_settings" as any).upsert({ id: key, value, updated_at: new Date().toISOString() } as any);
      }
      toast({ title: "✅ Homepage settings saved!" });
    } catch {
      toast({ title: "Error saving", variant: "destructive" });
    }
    setSaving(false);
  };

  const hero = settings.homepage_hero || {};
  const video = settings.homepage_video || {};
  const socialProof = settings.homepage_social_proof || {};
  const whatYouGet = settings.homepage_what_you_get || {};
  const whyUs = settings.homepage_why_us || {};
  const useCases = settings.homepage_use_cases || {};
  const smartHelp = settings.homepage_smart_help || {};
  const stickyCta = settings.homepage_sticky_cta || {};
  const urgency = settings.homepage_urgency || {};
  const instantQuote = settings.homepage_instant_quote || {};

  return (
    <div className="space-y-6 admin-panel-font">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="admin-section-header">Homepage Control Panel</h2>
          <p className="admin-section-subtitle">Manage all homepage content without code changes</p>
        </div>
        <Button onClick={saveAll} disabled={saving} className="rounded-full gap-2">
          <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save All"}
        </Button>
      </div>

      <Tabs defaultValue="hero" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="hero" className="text-xs">Hero</TabsTrigger>
          <TabsTrigger value="urgency" className="text-xs">Urgency</TabsTrigger>
          <TabsTrigger value="quote" className="text-xs">Quote</TabsTrigger>
          <TabsTrigger value="video" className="text-xs">Video</TabsTrigger>
          <TabsTrigger value="social" className="text-xs">Social Proof</TabsTrigger>
          <TabsTrigger value="whatyouget" className="text-xs">What You Get</TabsTrigger>
          <TabsTrigger value="whyus" className="text-xs">Why Us</TabsTrigger>
          <TabsTrigger value="usecases" className="text-xs">Use Cases</TabsTrigger>
          <TabsTrigger value="help" className="text-xs">Smart Help</TabsTrigger>
          <TabsTrigger value="sticky" className="text-xs">Sticky CTA</TabsTrigger>
        </TabsList>

        {/* Hero */}
        <TabsContent value="hero">
          <Card className="admin-glass-card">
            <CardHeader><CardTitle className="text-base">Hero Section</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Headline</label>
                <Input value={hero.headline || ""} onChange={e => updateSetting("homepage_hero", { ...hero, headline: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Subtext</label>
                <Textarea value={hero.subtext || ""} onChange={e => updateSetting("homepage_hero", { ...hero, subtext: e.target.value })} rows={2} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Pricing Line</label>
                <Input value={hero.pricing_line || ""} onChange={e => updateSetting("homepage_hero", { ...hero, pricing_line: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Urgency Text</label>
                <Input value={hero.urgency_text || ""} onChange={e => updateSetting("homepage_hero", { ...hero, urgency_text: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Primary CTA Label</label>
                  <Input value={hero.primary_cta || ""} onChange={e => updateSetting("homepage_hero", { ...hero, primary_cta: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Primary CTA Link</label>
                  <Input value={hero.primary_cta_link || ""} onChange={e => updateSetting("homepage_hero", { ...hero, primary_cta_link: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Secondary CTA Label</label>
                  <Input value={hero.secondary_cta || ""} onChange={e => updateSetting("homepage_hero", { ...hero, secondary_cta: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Secondary CTA Link</label>
                  <Input value={hero.secondary_cta_link || ""} onChange={e => updateSetting("homepage_hero", { ...hero, secondary_cta_link: e.target.value })} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Urgency */}
        <TabsContent value="urgency">
          <Card className="admin-glass-card">
            <CardHeader><CardTitle className="text-base">Global Urgency Banner</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch checked={urgency.enabled || false} onCheckedChange={v => updateSetting("homepage_urgency", { ...urgency, enabled: v })} />
                <span className="text-sm font-body">Enable urgency banner</span>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Urgency Text</label>
                <Input value={urgency.text || ""} onChange={e => updateSetting("homepage_urgency", { ...urgency, text: e.target.value })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Instant Quote */}
        <TabsContent value="quote">
          <Card className="admin-glass-card">
            <CardHeader><CardTitle className="text-base">Instant Quote Section</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Title</label>
                <Input value={instantQuote.title || ""} onChange={e => updateSetting("homepage_instant_quote", { ...instantQuote, title: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Button Text</label>
                <Input value={instantQuote.button_text || ""} onChange={e => updateSetting("homepage_instant_quote", { ...instantQuote, button_text: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Link</label>
                <Input value={instantQuote.link || ""} onChange={e => updateSetting("homepage_instant_quote", { ...instantQuote, link: e.target.value })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Video */}
        <TabsContent value="video">
          <Card className="admin-glass-card">
            <CardHeader><CardTitle className="text-base">Video Section</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch checked={video.enabled || false} onCheckedChange={v => updateSetting("homepage_video", { ...video, enabled: v })} />
                <span className="text-sm font-body">Enable video section</span>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">YouTube URL</label>
                <Input value={video.youtube_url || ""} onChange={e => updateSetting("homepage_video", { ...video, youtube_url: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." />
              </div>
              <div className="border-t border-border pt-4 mt-2">
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Custom Video URL (MP4 / direct link from any platform)</label>
                <Input value={video.custom_video_url || ""} onChange={e => updateSetting("homepage_video", { ...video, custom_video_url: e.target.value })} placeholder="https://your-cloud.com/video.mp4" />
                <p className="text-xs text-muted-foreground mt-1">If both YouTube and custom URL are set, custom URL takes priority.</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Thumbnail URL</label>
                <Input value={video.thumbnail_url || ""} onChange={e => updateSetting("homepage_video", { ...video, thumbnail_url: e.target.value })} placeholder="Leave blank to use default thumbnail" />
              </div>
              <div className="border-t border-border pt-4 mt-2">
                <label className="text-xs font-semibold text-muted-foreground mb-2 block flex items-center gap-2">
                  <Upload className="w-4 h-4" /> Upload Thumbnail Image
                </label>
                <ThumbnailUploader
                  currentUrl={video.thumbnail_url}
                  onUploaded={(url) => updateSetting("homepage_video", { ...video, thumbnail_url: url })}
                />
                {video.thumbnail_url && (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-1">Current Thumbnail:</p>
                    <img src={video.thumbnail_url} alt="Video thumbnail" className="w-48 h-auto rounded-lg border border-border object-cover" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Proof */}
        <TabsContent value="social">
          <Card className="admin-glass-card">
            <CardHeader><CardTitle className="text-base">Social Proof Stats</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {(socialProof.stats || []).map((stat: any, i: number) => (
                <div key={i} className="grid grid-cols-5 gap-2 items-center">
                  <Input className="col-span-2" value={stat.value} onChange={e => {
                    const newStats = [...(socialProof.stats || [])];
                    newStats[i] = { ...stat, value: e.target.value };
                    updateSetting("homepage_social_proof", { ...socialProof, stats: newStats });
                  }} placeholder="500+" />
                  <Input className="col-span-2" value={stat.label} onChange={e => {
                    const newStats = [...(socialProof.stats || [])];
                    newStats[i] = { ...stat, label: e.target.value };
                    updateSetting("homepage_social_proof", { ...socialProof, stats: newStats });
                  }} placeholder="Events" />
                  <Button variant="ghost" size="icon" onClick={() => {
                    const newStats = (socialProof.stats || []).filter((_: any, j: number) => j !== i);
                    updateSetting("homepage_social_proof", { ...socialProof, stats: newStats });
                  }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => {
                const newStats = [...(socialProof.stats || []), { value: "", label: "" }];
                updateSetting("homepage_social_proof", { ...socialProof, stats: newStats });
              }}><Plus className="w-4 h-4 mr-1" /> Add Stat</Button>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Monthly Counter Text</label>
                <Input value={socialProof.monthly_text || ""} onChange={e => updateSetting("homepage_social_proof", { ...socialProof, monthly_text: e.target.value })} />
              </div>
              <div className="border border-border rounded-xl p-4 space-y-3 mt-3">
                <p className="text-xs font-semibold text-muted-foreground">Monthly Counter Strip</p>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Label</label>
                  <Input value={(socialProof.monthly_counter || {}).label || ""} onChange={e => updateSetting("homepage_social_proof", { ...socialProof, monthly_counter: { ...(socialProof.monthly_counter || {}), label: e.target.value } })} placeholder="Events Booked This Month" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Count</label>
                  <Input type="number" value={(socialProof.monthly_counter || {}).count || ""} onChange={e => updateSetting("homepage_social_proof", { ...socialProof, monthly_counter: { ...(socialProof.monthly_counter || {}), count: parseInt(e.target.value) || 0 } })} placeholder="40" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* What You Get */}
        <TabsContent value="whatyouget">
          <Card className="admin-glass-card">
            <CardHeader><CardTitle className="text-base">What You Get</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(whatYouGet.items || []).map((item: string, i: number) => (
                <div key={i} className="flex gap-2 items-center">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <Input value={item} onChange={e => {
                    const newItems = [...(whatYouGet.items || [])];
                    newItems[i] = e.target.value;
                    updateSetting("homepage_what_you_get", { ...whatYouGet, items: newItems });
                  }} className="flex-1" />
                  <Button variant="ghost" size="icon" onClick={() => {
                    const newItems = (whatYouGet.items || []).filter((_: any, j: number) => j !== i);
                    updateSetting("homepage_what_you_get", { ...whatYouGet, items: newItems });
                  }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => {
                updateSetting("homepage_what_you_get", { ...whatYouGet, items: [...(whatYouGet.items || []), ""] });
              }}><Plus className="w-4 h-4 mr-1" /> Add Item</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Why Us */}
        <TabsContent value="whyus">
          <Card className="admin-glass-card">
            <CardHeader><CardTitle className="text-base">Why Choose Us</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(whyUs.points || []).map((point: string, i: number) => (
                <div key={i} className="flex gap-2 items-center">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <Input value={point} onChange={e => {
                    const newPoints = [...(whyUs.points || [])];
                    newPoints[i] = e.target.value;
                    updateSetting("homepage_why_us", { ...whyUs, points: newPoints });
                  }} className="flex-1" />
                  <Button variant="ghost" size="icon" onClick={() => {
                    const newPoints = (whyUs.points || []).filter((_: any, j: number) => j !== i);
                    updateSetting("homepage_why_us", { ...whyUs, points: newPoints });
                  }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => {
                updateSetting("homepage_why_us", { ...whyUs, points: [...(whyUs.points || []), ""] });
              }}><Plus className="w-4 h-4 mr-1" /> Add Point</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Use Cases */}
        <TabsContent value="usecases">
          <Card className="admin-glass-card">
            <CardHeader><CardTitle className="text-base">Use Cases</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {(useCases.cases || []).map((c: any, i: number) => (
                <div key={i} className="border border-border rounded-xl p-4 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <Input value={c.emoji} onChange={e => {
                      const nc = [...(useCases.cases || [])]; nc[i] = { ...c, emoji: e.target.value };
                      updateSetting("homepage_use_cases", { ...useCases, cases: nc });
                    }} placeholder="💒" />
                    <Input value={c.title} onChange={e => {
                      const nc = [...(useCases.cases || [])]; nc[i] = { ...c, title: e.target.value };
                      updateSetting("homepage_use_cases", { ...useCases, cases: nc });
                    }} placeholder="Wedding" />
                    <Input value={c.enquiry_type} onChange={e => {
                      const nc = [...(useCases.cases || [])]; nc[i] = { ...c, enquiry_type: e.target.value };
                      updateSetting("homepage_use_cases", { ...useCases, cases: nc });
                    }} placeholder="wedding" />
                  </div>
                  <div className="flex gap-2">
                    <Input value={c.desc} onChange={e => {
                      const nc = [...(useCases.cases || [])]; nc[i] = { ...c, desc: e.target.value };
                      updateSetting("homepage_use_cases", { ...useCases, cases: nc });
                    }} placeholder="Description" className="flex-1" />
                    <Button variant="ghost" size="icon" onClick={() => {
                      const nc = (useCases.cases || []).filter((_: any, j: number) => j !== i);
                      updateSetting("homepage_use_cases", { ...useCases, cases: nc });
                    }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => {
                updateSetting("homepage_use_cases", { ...useCases, cases: [...(useCases.cases || []), { title: "", emoji: "", desc: "", enquiry_type: "" }] });
              }}><Plus className="w-4 h-4 mr-1" /> Add Use Case</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Smart Help */}
        <TabsContent value="help">
          <Card className="admin-glass-card">
            <CardHeader><CardTitle className="text-base">Smart Help Section</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">WhatsApp Number</label>
                <Input value={smartHelp.whatsapp_number || ""} onChange={e => updateSetting("homepage_smart_help", { ...smartHelp, whatsapp_number: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">WhatsApp Prefilled Message</label>
                <Textarea value={smartHelp.whatsapp_message || ""} onChange={e => updateSetting("homepage_smart_help", { ...smartHelp, whatsapp_message: e.target.value })} rows={2} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Instagram URL</label>
                <Input value={smartHelp.instagram_url || ""} onChange={e => updateSetting("homepage_smart_help", { ...smartHelp, instagram_url: e.target.value })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sticky CTA */}
        <TabsContent value="sticky">
          <Card className="admin-glass-card">
            <CardHeader><CardTitle className="text-base">Sticky CTA (Mobile)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch checked={stickyCta.enabled || false} onCheckedChange={v => updateSetting("homepage_sticky_cta", { ...stickyCta, enabled: v })} />
                <span className="text-sm font-body">Enable sticky CTA bar</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Primary Text</label>
                  <Input value={stickyCta.text || ""} onChange={e => updateSetting("homepage_sticky_cta", { ...stickyCta, text: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Primary Link</label>
                  <Input value={stickyCta.link || ""} onChange={e => updateSetting("homepage_sticky_cta", { ...stickyCta, link: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Secondary Text</label>
                  <Input value={stickyCta.secondary_text || ""} onChange={e => updateSetting("homepage_sticky_cta", { ...stickyCta, secondary_text: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Secondary Link</label>
                  <Input value={stickyCta.secondary_link || ""} onChange={e => updateSetting("homepage_sticky_cta", { ...stickyCta, secondary_link: e.target.value })} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminHomepageControl;
