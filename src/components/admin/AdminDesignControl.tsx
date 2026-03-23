import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUISettings } from "@/hooks/useUISettings";
import { toast } from "@/hooks/use-toast";
import { Palette, Type, Image, Save, RefreshCw } from "lucide-react";

const FONT_OPTIONS = [
  "Inter", "Poppins", "DM Sans", "Plus Jakarta Sans", "Outfit",
  "Manrope", "Nunito", "Lato", "Open Sans", "Montserrat",
  "Playfair Display", "Merriweather", "Libre Baskerville",
];

const AdminDesignControl = () => {
  const { settings, updateSetting, loading } = useUISettings();

  const [colors, setColors] = useState<Record<string, string>>(settings.brand_colors || {});
  const [fonts, setFonts] = useState<Record<string, string>>(settings.brand_fonts || {});
  const [logo, setLogo] = useState<Record<string, string>>(settings.brand_logo || {});
  const [dirty, setDirty] = useState(false);

  // Sync state when settings load
  useState(() => {
    if (!loading) {
      setColors(settings.brand_colors || {});
      setFonts(settings.brand_fonts || {});
      setLogo(settings.brand_logo || {});
    }
  });

  const handleColorChange = (key: string, value: string) => {
    setColors(p => ({ ...p, [key]: value }));
    setDirty(true);
  };

  const handleFontChange = (key: string, value: string) => {
    setFonts(p => ({ ...p, [key]: value }));
    setDirty(true);
  };

  const handleLogoChange = (key: string, value: string) => {
    setLogo(p => ({ ...p, [key]: value }));
    setDirty(true);
  };

  const saveAll = async () => {
    await Promise.all([
      updateSetting("brand_colors", colors, "brand"),
      updateSetting("brand_fonts", fonts, "brand"),
      updateSetting("brand_logo", logo, "brand"),
    ]);
    toast({ title: "Design settings saved" });
    setDirty(false);
  };

  const COLOR_FIELDS = [
    { key: "primary", label: "Primary Color", desc: "Buttons, links, accents" },
    { key: "secondary", label: "Secondary Color", desc: "Cards, subtle backgrounds" },
    { key: "accent", label: "Accent Color", desc: "Success states, highlights" },
    { key: "text", label: "Text Color", desc: "Main body text" },
    { key: "background", label: "Background Color", desc: "Page background" },
    { key: "warning", label: "Warning Color", desc: "Alerts, caution states" },
    { key: "destructive", label: "Danger Color", desc: "Errors, delete actions" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" /> Design Control Panel
          </h2>
          <p className="text-xs text-muted-foreground">Control colors, fonts, and branding across the website</p>
        </div>
        <Button onClick={saveAll} disabled={!dirty}>
          <Save className="w-4 h-4 mr-1" /> Save Changes
        </Button>
      </div>

      {/* Colors */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" /> Brand Colors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {COLOR_FIELDS.map(({ key, label, desc }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs font-medium">{label}</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colors[key] || "#000000"}
                    onChange={e => handleColorChange(key, e.target.value)}
                    className="w-10 h-10 rounded-lg border cursor-pointer"
                  />
                  <div className="flex-1">
                    <Input
                      value={colors[key] || ""}
                      onChange={e => handleColorChange(key, e.target.value)}
                      placeholder="#000000"
                      className="text-xs font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Preview */}
          <div className="mt-6 p-4 rounded-xl border" style={{ backgroundColor: colors.background || "#fdf8f3" }}>
            <p className="text-xs font-medium mb-2" style={{ color: colors.text || "#3a2e22" }}>Live Preview</p>
            <div className="flex gap-2 flex-wrap">
              <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: colors.primary || "#C8A97E" }}>Primary Button</button>
              <button className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: colors.secondary || "#fdf8f3", color: colors.text || "#3a2e22", border: `1px solid ${colors.primary}20` }}>Secondary</button>
              <span className="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: colors.accent || "#22C55E" }}>Success</span>
              <span className="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: colors.warning || "#F59E0B" }}>Warning</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fonts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Type className="w-4 h-4 text-primary" /> Typography
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Heading Font</Label>
              <Select value={fonts.heading || "Inter"} onValueChange={v => handleFontChange("heading", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FONT_OPTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-2xl font-bold mt-2" style={{ fontFamily: fonts.heading || "Inter" }}>Heading Preview</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Body Font</Label>
              <Select value={fonts.body || "Inter"} onValueChange={v => handleFontChange("body", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FONT_OPTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-sm mt-2" style={{ fontFamily: fonts.body || "Inter" }}>Body text preview — the quick brown fox jumps over the lazy dog.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Image className="w-4 h-4 text-primary" /> Logo & Branding
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Logo URL</Label>
              <Input value={logo.url || ""} onChange={e => handleLogoChange("url", e.target.value)} placeholder="/logo.png or https://..." />
              {logo.url && <img src={logo.url} alt="Logo preview" className="w-16 h-16 rounded-lg object-contain border mt-2" />}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Favicon URL</Label>
              <Input value={logo.favicon || ""} onChange={e => handleLogoChange("favicon", e.target.value)} placeholder="/favicon.ico" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDesignControl;
