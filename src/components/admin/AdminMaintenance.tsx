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
import { AlertTriangle, Globe, Home, UserPlus, LogIn, LayoutDashboard, Package, Calendar, ShoppingBag, ClipboardList, Save, Wrench, BookOpen, MessageCircle, HelpCircle, FileText, Clock, Timer } from "lucide-react";
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
  const [timers, setTimers] = useState<Record<string, { hours: number; minutes: number; seconds: number }>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await supabase.from("maintenance_settings").select("*").order("id");
    const existing = data || [];
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
    // Initialize timers from existing settings
    const newTimers: Record<string, { hours: number; minutes: number; seconds: number }> = {};
    (existing || []).forEach((s: any) => {
      if (s.estimated_end) {
        const diff = new Date(s.estimated_end).getTime() - Date.now();
        if (diff > 0) {
          newTimers[s.id] = {
            hours: Math.floor(diff / 3600000),
            minutes: Math.floor((diff % 3600000) / 60000),
            seconds: Math.floor((diff % 60000) / 1000),
          };
        } else {
          newTimers[s.id] = { hours: 0, minutes: 30, seconds: 0 };
        }
      } else {
        newTimers[s.id] = { hours: 0, minutes: 30, seconds: 0 };
      }
    });
    setTimers(newTimers);
    setLoading(false);
  };

  useEffect(() => { fetchSettings(); }, []);

  // Auto-disable maintenance when estimated_end passes
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(async () => {
      const now = new Date();
      let changed = false;
      for (const s of settings) {
        if (s.is_enabled && s.estimated_end) {
          const end = new Date(s.estimated_end);
          if (end <= now) {
            const { error } = await supabase.from("maintenance_settings").update({ is_enabled: false, updated_at: now.toISOString() } as any).eq("id", s.id);
            if (!error) {
              toast({ title: `✅ ${s.id} maintenance auto-disabled`, description: "Timer expired." });
              changed = true;
            }
          }
        }
      }
      if (changed) fetchSettings();
    }, 5000);
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
    if (!current) {
      // Turning ON: compute estimated_end from timer
      const t = timers[id] || { hours: 0, minutes: 30, seconds: 0 };
      const totalMs = (t.hours * 3600 + t.minutes * 60 + t.seconds) * 1000;
      const estimatedEnd = totalMs > 0 ? new Date(Date.now() + totalMs).toISOString() : null;
      await updateSetting(id, { is_enabled: true, estimated_end: estimatedEnd });
    } else {
      await updateSetting(id, { is_enabled: false });
    }
  };

  const setTimerAndSave = (id: string, field: "hours" | "minutes" | "seconds", value: number) => {
    setTimers(prev => ({
      ...prev,
      [id]: { ...(prev[id] || { hours: 0, minutes: 30, seconds: 0 }), [field]: value }
    }));
  };

  const applyTimer = async (id: string) => {
    const t = timers[id] || { hours: 0, minutes: 30, seconds: 0 };
    const totalMs = (t.hours * 3600 + t.minutes * 60 + t.seconds) * 1000;
    if (totalMs <= 0) {
      toast({ title: "Set a timer duration", variant: "destructive" });
      return;
    }
    const estimatedEnd = new Date(Date.now() + totalMs).toISOString();
    const s = settings.find(x => x.id === id);
    await updateSetting(id, { title: s?.title, message: s?.message, estimated_end: estimatedEnd });
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
                <p className="text-sm text-muted-foreground">Entire website is blocked for non-admin users. Mobile nav hidden. Full-screen maintenance page shown.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg">Maintenance Mode</h3>
          <p className="text-sm text-muted-foreground">Set timer (hours/min/sec). Auto-disables when timer expires.</p>
        </div>
        <Badge variant="outline">{settings.filter(s => s.is_enabled).length} active</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settings.map((s, i) => {
          const Icon = PAGE_ICONS[s.id] || Globe;
          const isGlobal = s.id === "global";
          const t = timers[s.id] || { hours: 0, minutes: 30, seconds: 0 };
          const countdownActive = s.is_enabled && s.estimated_end && new Date(s.estimated_end) > new Date();
          const remainMs = countdownActive ? new Date(s.estimated_end).getTime() - Date.now() : 0;
          const remainH = Math.floor(remainMs / 3600000);
          const remainM = Math.floor((remainMs % 3600000) / 60000);
          const remainS = Math.floor((remainMs % 60000) / 1000);

          return (
            <motion.div key={s.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className={`transition-all rounded-2xl overflow-hidden ${s.is_enabled ? "border-destructive/50 bg-destructive/5" : "bg-white"} ${isGlobal ? "md:col-span-2 border-2" : ""}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-5 h-5 ${s.is_enabled ? "text-destructive" : "text-primary"}`} />
                      <CardTitle className="text-sm capitalize">{s.id.replace("-", " ")}</CardTitle>
                      {isGlobal && <Badge variant="destructive" className="text-[10px]">GLOBAL</Badge>}
                    </div>
                    <Switch checked={s.is_enabled} onCheckedChange={() => toggleMaintenance(s.id, s.is_enabled)} />
                  </div>
                  {countdownActive && (
                    <div className="flex items-center gap-2 mt-2">
                      <Timer className="w-4 h-4 text-amber-600 animate-pulse" />
                      <span className="text-sm font-bold text-amber-700">{remainH}h {remainM}m {remainS}s remaining</span>
                      <Badge className="text-[10px] bg-amber-100 text-amber-800 border-amber-300">Auto-off</Badge>
                    </div>
                  )}
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
                  {/* Timer setting: hours, minutes, seconds */}
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Duration Timer (set before enabling)</Label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Hours</Label>
                        <Input type="number" min={0} max={999} value={t.hours} onChange={e => setTimerAndSave(s.id, "hours", parseInt(e.target.value) || 0)} className="text-sm h-9" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Minutes</Label>
                        <Input type="number" min={0} max={59} value={t.minutes} onChange={e => setTimerAndSave(s.id, "minutes", parseInt(e.target.value) || 0)} className="text-sm h-9" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Seconds</Label>
                        <Input type="number" min={0} max={59} value={t.seconds} onChange={e => setTimerAndSave(s.id, "seconds", parseInt(e.target.value) || 0)} className="text-sm h-9" />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 rounded-full gap-2" disabled={saving === s.id}
                      onClick={() => updateSetting(s.id, { title: s.title, message: s.message })}>
                      <Save className="w-3 h-3" /> {saving === s.id ? "Saving..." : "Save Text"}
                    </Button>
                    <Button size="sm" variant="secondary" className="rounded-full gap-2" disabled={saving === s.id}
                      onClick={() => applyTimer(s.id)}>
                      <Timer className="w-3 h-3" /> Set Timer
                    </Button>
                  </div>
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
