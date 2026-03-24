import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, Globe, Home, UserPlus, LogIn, LayoutDashboard, Package, Calendar, ShoppingBag, ClipboardList, Save, Wrench, BookOpen, MessageCircle, HelpCircle, FileText } from "lucide-react";
import { motion } from "framer-motion";

const PAGE_ICONS: Record<string, any> = {
  global: Globe, home: Home, registration: UserPlus, login: LogIn,
  dashboard: LayoutDashboard, order: Package, "book-event": Calendar,
  shop: ShoppingBag, enquiry: ClipboardList, workshop: BookOpen,
  "live-chat": MessageCircle, support: HelpCircle, gallery: FileText,
  about: FileText, blog: FileText, "track-order": Package,
};

const ALL_PAGES = [
  "global", "home", "registration", "login", "dashboard", "order",
  "book-event", "shop", "enquiry", "workshop", "live-chat", "support",
  "gallery", "about", "blog", "track-order",
];

const AdminMaintenance = () => {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await supabase.from("maintenance_settings").select("*").order("id");
    const existing = data || [];
    // Auto-create missing pages
    const existingIds = existing.map(s => s.id);
    const missing = ALL_PAGES.filter(p => !existingIds.includes(p));
    if (missing.length > 0) {
      await Promise.all(missing.map(id =>
        supabase.from("maintenance_settings").upsert({
          id, is_enabled: false, title: `${id.replace("-", " ")} Under Maintenance`,
          message: "This page is currently under maintenance.", estimated_end: null, allowed_user_ids: [],
        } as any)
      ));
      const { data: refreshed } = await supabase.from("maintenance_settings").select("*").order("id");
      setSettings(refreshed || []);
    } else {
      setSettings(existing);
    }
    setLoading(false);
  };

  useEffect(() => { fetchSettings(); }, []);

  // Auto-disable maintenance when estimated_end passes
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(async () => {
      const now = new Date();
      for (const s of settings) {
        if (s.is_enabled && s.estimated_end) {
          const end = new Date(s.estimated_end);
          if (end <= now) {
            await supabase.from("maintenance_settings").update({ is_enabled: false, updated_at: now.toISOString() } as any).eq("id", s.id);
            toast({ title: `${s.id} maintenance auto-disabled`, description: "Scheduled end time reached." });
            fetchSettings();
          }
        }
      }
    }, 30000); // check every 30s
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [settings]);

  const updateSetting = async (id: string, updates: any) => {
    setSaving(id);
    const { error } = await supabase.from("maintenance_settings").update({ ...updates, updated_at: new Date().toISOString() } as any).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Updated", description: `${id} maintenance saved` }); fetchSettings(); }
    setSaving(null);
  };

  const toggleMaintenance = async (id: string, current: boolean) => {
    await updateSetting(id, { is_enabled: !current });
  };

  const globalEnabled = settings.find(s => s.id === "global")?.is_enabled;

  if (loading) return <div className="flex items-center justify-center py-10"><Wrench className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      {globalEnabled && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-destructive flex-shrink-0" />
              <div>
                <p className="font-bold text-destructive">GLOBAL MAINTENANCE MODE IS ON</p>
                <p className="text-sm text-muted-foreground">Entire website is blocked for non-admin users. All pages show maintenance screen.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg">Maintenance Mode</h3>
          <p className="text-sm text-muted-foreground">Control access to individual pages or the entire site. Auto-disables at scheduled end time.</p>
        </div>
        <Badge variant="outline">{settings.filter(s => s.is_enabled).length} active</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settings.map((s, i) => {
          const Icon = PAGE_ICONS[s.id] || Globe;
          const isGlobal = s.id === "global";
          const countdownActive = s.is_enabled && s.estimated_end && new Date(s.estimated_end) > new Date();
          return (
            <motion.div key={s.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className={`transition-all rounded-2xl overflow-hidden ${s.is_enabled ? "border-destructive/50 bg-destructive/5" : "bg-white"} ${isGlobal ? "md:col-span-2 border-2" : ""}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-5 h-5 ${s.is_enabled ? "text-destructive" : "text-primary"}`} />
                      <CardTitle className="text-sm capitalize">{s.id.replace("-", " ")}</CardTitle>
                      {isGlobal && <Badge variant="destructive" className="text-[10px]">GLOBAL</Badge>}
                      {countdownActive && <Badge className="text-[10px] bg-amber-100 text-amber-800 border-amber-300">Auto-off scheduled</Badge>}
                    </div>
                    <Switch checked={s.is_enabled} onCheckedChange={() => toggleMaintenance(s.id, s.is_enabled)} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Title</Label>
                    <Input value={s.title || ""} onChange={e => setSettings(prev => prev.map(x => x.id === s.id ? { ...x, title: e.target.value } : x))} className="text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Message</Label>
                    <Textarea value={s.message || ""} onChange={e => setSettings(prev => prev.map(x => x.id === s.id ? { ...x, message: e.target.value } : x))} className="text-sm" rows={2} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Auto-disable at (estimated end)</Label>
                    <Input type="datetime-local" value={s.estimated_end ? new Date(s.estimated_end).toISOString().slice(0, 16) : ""}
                      onChange={e => setSettings(prev => prev.map(x => x.id === s.id ? { ...x, estimated_end: e.target.value ? new Date(e.target.value).toISOString() : null } : x))}
                      className="text-sm" />
                  </div>
                  <Button size="sm" variant="outline" className="w-full rounded-full gap-2" disabled={saving === s.id}
                    onClick={() => updateSetting(s.id, { title: s.title, message: s.message, estimated_end: s.estimated_end })}>
                    <Save className="w-3 h-3" /> {saving === s.id ? "Saving..." : "Save Changes"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminMaintenance;
