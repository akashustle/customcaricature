/**
 * AdminWatermarkSettings — control panel for the global image watermark.
 * Lets admins change brand text (e.g. "Creative Caricature Club™"), opacity,
 * color, logo URL, and toggle the watermark or right-click protection
 * across every gallery, event photo and homepage image on the site.
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Shield, Save, Eye, EyeOff, Lock } from "lucide-react";
import WatermarkedImage from "@/components/WatermarkedImage";

type WatermarkConfig = {
  enabled: boolean;
  brandText: string;
  color: string;
  opacity: number;
  logoUrl: string;
  lockControls: boolean;
};

const DEFAULT: WatermarkConfig = {
  enabled: true,
  brandText: "Creative Caricature Club™",
  color: "#ffffff",
  opacity: 0.22,
  logoUrl: "/logo.png",
  lockControls: true,
};

const PREVIEW_IMG =
  "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=900&auto=format&fit=crop";

const AdminWatermarkSettings = () => {
  const [config, setConfig] = useState<WatermarkConfig>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("admin_site_settings")
        .select("value")
        .eq("id", "watermark")
        .maybeSingle();
      if (data?.value) setConfig({ ...DEFAULT, ...(data.value as any) });
      setLoading(false);
    })();
  }, []);

  const update = <K extends keyof WatermarkConfig>(k: K, v: WatermarkConfig[K]) => {
    setConfig((p) => ({ ...p, [k]: v }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("admin_site_settings")
      .upsert({ id: "watermark", value: config as any, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Watermark settings saved", description: "Live across the site instantly." });
    setDirty(false);
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading watermark settings…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> Image Watermark Control
          </h2>
          <p className="text-xs text-muted-foreground">
            Protect every gallery, event photo and homepage image with your brand watermark.
          </p>
        </div>
        <Button onClick={save} disabled={!dirty || saving}>
          <Save className="w-4 h-4 mr-2" /> {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>

      {/* Master toggles */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Master Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              {config.enabled ? <Eye className="w-4 h-4 mt-0.5 text-primary" /> : <EyeOff className="w-4 h-4 mt-0.5 text-muted-foreground" />}
              <div>
                <p className="text-sm font-medium">Show Watermark</p>
                <p className="text-xs text-muted-foreground">Display brand watermark on all public images</p>
              </div>
            </div>
            <Switch checked={config.enabled} onCheckedChange={(v) => update("enabled", v)} />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Lock className="w-4 h-4 mt-0.5 text-primary" />
              <div>
                <p className="text-sm font-medium">Block Right-Click & Download</p>
                <p className="text-xs text-muted-foreground">Prevents visitors from saving or dragging images</p>
              </div>
            </div>
            <Switch checked={config.lockControls} onCheckedChange={(v) => update("lockControls", v)} />
          </div>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Brand & Appearance</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-medium">Brand Text</Label>
            <Input
              value={config.brandText}
              onChange={(e) => update("brandText", e.target.value)}
              placeholder="Creative Caricature Club™"
            />
            <p className="text-[10px] text-muted-foreground">Tip: include ™ or © for trademark/copyright marks</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Logo URL (optional)</Label>
            <Input
              value={config.logoUrl}
              onChange={(e) => update("logoUrl", e.target.value)}
              placeholder="/logo.png"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.color}
                onChange={(e) => update("color", e.target.value)}
                className="w-10 h-10 rounded-lg border cursor-pointer"
              />
              <Input
                value={config.color}
                onChange={(e) => update("color", e.target.value)}
                placeholder="#ffffff"
                className="font-mono text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-medium">
              Opacity — {Math.round(config.opacity * 100)}%
            </Label>
            <Slider
              value={[config.opacity * 100]}
              min={5}
              max={70}
              step={1}
              onValueChange={([v]) => update("opacity", v / 100)}
            />
            <p className="text-[10px] text-muted-foreground">Lower = subtler, higher = harder to remove</p>
          </div>
        </CardContent>
      </Card>

      {/* Live Preview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Live Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl overflow-hidden border border-border bg-card max-w-xl mx-auto">
            {/* key forces re-render so preview reflects unsaved changes */}
            <div key={JSON.stringify(config)} className="aspect-[4/3]">
              <WatermarkedImagePreview config={config} src={PREVIEW_IMG} />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 text-center">
            This is exactly how the watermark will appear across the site.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Preview that renders the watermark using the IN-PROGRESS config (not the
 * saved one), so admins see changes before clicking Save.
 */
const WatermarkedImagePreview = ({ config, src }: { config: WatermarkConfig; src: string }) => {
  const hexToRgb = (hex: string) => {
    const h = hex.replace("#", "");
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const num = parseInt(full || "ffffff", 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  };
  const { r, g, b } = hexToRgb(config.color);
  const logoTag = config.logoUrl
    ? `<image href='${config.logoUrl}' x='0' y='70' width='22' height='22' opacity='0.85'/>`
    : "";
  const tile = `<svg xmlns='http://www.w3.org/2000/svg' width='340' height='180' viewBox='0 0 340 180'>
    <g transform='rotate(-22 170 90)' fill='rgb(${r},${g},${b})' fill-opacity='${config.opacity}' style='font-family:Inter,sans-serif;font-weight:700;'>
      ${logoTag}
      <text x='${config.logoUrl ? 30 : 10}' y='88' font-size='14'>${config.brandText}</text>
    </g>
  </svg>`;
  const tileUrl = `url("data:image/svg+xml;utf8,${encodeURIComponent(tile)}")`;
  return (
    <div className="relative w-full h-full">
      <img src={src} alt="" className="w-full h-full object-cover" />
      {config.enabled && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none mix-blend-overlay"
          style={{ backgroundImage: tileUrl, backgroundRepeat: "repeat", backgroundSize: "280px 150px" }}
        />
      )}
    </div>
  );
};

export default AdminWatermarkSettings;
