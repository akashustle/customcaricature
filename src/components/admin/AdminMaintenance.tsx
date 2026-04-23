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
import { AlertTriangle, Globe, Home, UserPlus, LogIn, LayoutDashboard, Package, Calendar, ShoppingBag, ClipboardList, Save, Wrench, BookOpen, MessageCircle, HelpCircle, FileText, Clock, Timer, Eye, EyeOff, Receipt, Bell, User, Settings, CreditCard, Store, GraduationCap, MapPin, Mic, Camera, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { useSiteSettings } from "@/hooks/useSiteSettings";

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

const DASHBOARD_TABS = [
  { key: "orders", label: "Orders", icon: Package },
  { key: "events", label: "Events", icon: Calendar },
  { key: "shop", label: "Shop", icon: Store },
  { key: "chat", label: "Chat", icon: MessageCircle },
  { key: "payments", label: "Payments", icon: CreditCard },
  { key: "invoices", label: "Invoices", icon: Receipt },
  { key: "alerts", label: "Alerts", icon: Bell },
  { key: "workshop", label: "Workshop", icon: GraduationCap },
  { key: "profile", label: "Profile", icon: User },
  { key: "settings", label: "Settings", icon: Settings },
];

const AdminMaintenance = () => {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [timers, setTimers] = useState<Record<string, { hours: number; minutes: number; seconds: number }>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { settings: siteSettings, updateSetting: updateSiteSetting } = useSiteSettings();

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
    const newTimers: Record<string, { hours: number; minutes: number; seconds: number }> = {};
    (existing || []).forEach((s: any) => {
      if (s.estimated_end) {
        const diff = new Date(s.estimated_end).getTime() - Date.now();
        if (diff > 0) {
          newTimers[s.id] = { hours: Math.floor(diff / 3600000), minutes: Math.floor((diff % 3600000) / 60000), seconds: Math.floor((diff % 60000) / 1000) };
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
            if (!error) { toast({ title: `✅ ${s.id} maintenance auto-disabled`, description: "Timer expired." }); changed = true; }
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
      const t = timers[id] || { hours: 0, minutes: 30, seconds: 0 };
      const totalMs = (t.hours * 3600 + t.minutes * 60 + t.seconds) * 1000;
      const estimatedEnd = totalMs > 0 ? new Date(Date.now() + totalMs).toISOString() : null;
      await updateSetting(id, { is_enabled: true, estimated_end: estimatedEnd });
    } else {
      await updateSetting(id, { is_enabled: false });
    }
  };

  const setTimerAndSave = (id: string, field: "hours" | "minutes" | "seconds", value: number) => {
    setTimers(prev => ({ ...prev, [id]: { ...(prev[id] || { hours: 0, minutes: 30, seconds: 0 }), [field]: value } }));
  };

  const applyTimer = async (id: string) => {
    const t = timers[id] || { hours: 0, minutes: 30, seconds: 0 };
    const totalMs = (t.hours * 3600 + t.minutes * 60 + t.seconds) * 1000;
    if (totalMs <= 0) { toast({ title: "Set a timer duration", variant: "destructive" }); return; }
    const estimatedEnd = new Date(Date.now() + totalMs).toISOString();
    const s = settings.find(x => x.id === id);
    await updateSetting(id, { title: s?.title, message: s?.message, estimated_end: estimatedEnd });
  };

  const globalEnabled = settings.find(s => s.id === "global")?.is_enabled;

  const dashboardTabs = (siteSettings as any).dashboard_tabs || { orders: true, events: true, shop: true, chat: true, payments: true, invoices: true, alerts: true, workshop: true, profile: true, settings: true };

  const toggleDashboardTab = (key: string) => {
    const updated = { ...dashboardTabs, [key]: !dashboardTabs[key] };
    updateSiteSetting("dashboard_tabs", updated);
  };

  const allowRegistration = (siteSettings as any).allow_registration_maintenance?.enabled ?? false;
  const loginPopupVisible = (siteSettings as any).login_popup_visible?.enabled ?? false;
  const maintenanceWaMessage = (siteSettings as any).maintenance_whatsapp_message?.text ?? "Hi, I want to book an event caricature";
  const caricatureVisible = (siteSettings as any).custom_caricature_visible?.enabled ?? true;
  const adminSplashEnabled = (siteSettings as any).admin_splash_enabled?.enabled === true;
  const homepageSplashEnabled = (siteSettings as any).homepage_splash_enabled?.enabled === true;
  const workshopSplashEnabled = (siteSettings as any).workshop_splash_enabled?.enabled === true;
  const appOnboardingEnabled = (siteSettings as any).app_onboarding_enabled?.enabled === true;
  const adminLocationRequired = (siteSettings as any).admin_location_required?.enabled ?? false;
  const hideHowItWorks = (siteSettings as any).hide_how_it_works?.enabled ?? true;
  const hideWhatYouGet = (siteSettings as any).hide_what_you_get?.enabled ?? true;
  const hideStyles = (siteSettings as any).hide_styles_section?.enabled ?? true;
  const hideStartOrderBtn = (siteSettings as any).hide_start_order_btn?.enabled ?? true;
  const hideHeroOrderBtn = (siteSettings as any).hide_hero_order_btn?.enabled ?? true;

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
                <p className="text-sm text-muted-foreground">Entire website is blocked for non-admin users.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick Controls */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Settings className="w-4 h-4" /> Quick Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
         <div className="flex items-center justify-between">
176:             <div>
177:               <p className="text-sm font-medium">Allow Registration During Maintenance</p>
178:               <p className="text-xs text-muted-foreground">Show register button on maintenance page</p>
179:             </div>
180:             <Switch checked={allowRegistration} onCheckedChange={(v) => updateSiteSetting("allow_registration_maintenance", { enabled: v })} />
181:           </div>
182:           <div className="flex items-center justify-between">
183:             <div>
184:               <p className="text-sm font-medium">Login Popup on Website</p>
185:               <p className="text-xs text-muted-foreground">Show login prompt popup to visitors</p>
186:             </div>
187:            <Switch checked={loginPopupVisible} onCheckedChange={(v) => updateSiteSetting("login_popup_visible", { enabled: v })} />
188:           </div>
189:           <div className="flex items-center justify-between">
190:             <div>
191:               <p className="text-sm font-medium">Custom Caricature Ordering</p>
192:               <p className="text-xs text-muted-foreground">Show/hide all custom caricature ordering across website</p>
193:             </div>
194:             <Switch checked={caricatureVisible} onCheckedChange={(v) => updateSiteSetting("custom_caricature_visible", { enabled: v })} />
195:           </div>
196:           <div className="flex items-center justify-between">
197:             <div>
198:               <p className="text-sm font-medium">Admin Page Splash Screen</p>
199:               <p className="text-xs text-muted-foreground">Show splash animation on admin login page</p>
200:             </div>
201:             <Switch checked={adminSplashEnabled} onCheckedChange={(v) => updateSiteSetting("admin_splash_enabled", { enabled: v })} />
 202:           </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Require Location for Admin Login</p>
              <p className="text-xs text-muted-foreground">Block admin dashboard if location is denied</p>
            </div>
            <Switch checked={adminLocationRequired} onCheckedChange={(v) => updateSiteSetting("admin_location_required", { enabled: v })} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Homepage Splash Screen</p>
              <p className="text-xs text-muted-foreground">Show splash animation to public visitors</p>
            </div>
            <Switch checked={homepageSplashEnabled} onCheckedChange={(v) => updateSiteSetting("homepage_splash_enabled", { enabled: v })} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Workshop Splash Screen</p>
              <p className="text-xs text-muted-foreground">Show splash on workshop area</p>
            </div>
            <Switch checked={workshopSplashEnabled} onCheckedChange={(v) => updateSiteSetting("workshop_splash_enabled", { enabled: v })} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">App Onboarding Slides</p>
              <p className="text-xs text-muted-foreground">Show 3-slide onboarding to first-time visitors</p>
            </div>
            <Switch checked={appOnboardingEnabled} onCheckedChange={(v) => updateSiteSetting("app_onboarding_enabled", { enabled: v })} />
          </div>

          {/* Homepage section visibility — hide-toggles default ON (sections hidden) */}
          <div className="space-y-3 pt-3 border-t border-border/40">
            <Label className="text-sm font-medium flex items-center gap-2"><Home className="w-4 h-4" /> Homepage Section Visibility</Label>
            <p className="text-[10px] text-muted-foreground">Toggle ON to HIDE these sections on the homepage. Turn OFF to show them again.</p>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Hide hero "Order Caricature" button</p>
                <p className="text-xs text-muted-foreground">Removes the Start Your Caricature CTA in the hero section</p>
              </div>
              <Switch checked={hideHeroOrderBtn} onCheckedChange={(v) => updateSiteSetting("hide_hero_order_btn", { enabled: v })} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Hide "How It Works" / Simple Process</p>
                <p className="text-xs text-muted-foreground">Hides the 3-step custom-caricature explainer</p>
              </div>
              <Switch checked={hideHowItWorks} onCheckedChange={(v) => updateSiteSetting("hide_how_it_works", { enabled: v })} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Hide "What You Get" section</p>
                <p className="text-xs text-muted-foreground">Hides the photo-to-art experience checklist</p>
              </div>
              <Switch checked={hideWhatYouGet} onCheckedChange={(v) => updateSiteSetting("hide_what_you_get", { enabled: v })} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Hide "Pick Your Style / Our Styles" section</p>
                <p className="text-xs text-muted-foreground">Hides the caricature style picker</p>
              </div>
              <Switch checked={hideStyles} onCheckedChange={(v) => updateSiteSetting("hide_styles_section", { enabled: v })} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Hide final-CTA "Start Your Order" button</p>
                <p className="text-xs text-muted-foreground">Hides the order CTA on "Make Your Event Unforgettable"</p>
              </div>
              <Switch checked={hideStartOrderBtn} onCheckedChange={(v) => updateSiteSetting("hide_start_order_btn", { enabled: v })} />
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-border/40">
            <Label className="text-sm font-medium flex items-center gap-2"><MessageCircle className="w-4 h-4" /> Maintenance WhatsApp Prefilled Message</Label>
            <div className="flex gap-2">
              <Input
                value={maintenanceWaMessage}
                onChange={e => updateSiteSetting("maintenance_whatsapp_message", { text: e.target.value })}
                placeholder="Hi, I want to book an event caricature"
                className="text-sm flex-1"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">This message is prefilled when users click the WhatsApp button on the maintenance page.</p>
          </div>

          {/* Permission Toggles */}
          <div className="space-y-3 pt-3 border-t border-border/40">
            <Label className="text-sm font-medium flex items-center gap-2"><Shield className="w-4 h-4" /> Customer Permission Prompts</Label>
            <p className="text-[10px] text-muted-foreground">Control which browser permissions are requested from visitors</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: "permission_location", label: "Location", icon: MapPin, desc: "Track visitor location" },
                { key: "permission_notifications", label: "Notifications", icon: Bell, desc: "Push notifications" },
                { key: "permission_microphone", label: "Microphone", icon: Mic, desc: "Voice features" },
                { key: "permission_camera", label: "Camera", icon: Camera, desc: "Camera access" },
              ].map(perm => {
                const Icon = perm.icon;
                const isOn = (siteSettings as any)[perm.key]?.enabled ?? false;
                return (
                  <div key={perm.key} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isOn ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-border/40"}`}>
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-xs font-medium">{perm.label}</p>
                        <p className="text-[10px] text-muted-foreground">{perm.desc}</p>
                      </div>
                    </div>
                    <Switch checked={isOn} onCheckedChange={(v) => updateSiteSetting(perm.key, { enabled: v })} />
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Tab Visibility Control */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><LayoutDashboard className="w-4 h-4" /> User Dashboard Tab Control</CardTitle>
          <p className="text-xs text-muted-foreground">Show/hide tabs on user dashboard in real-time</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {DASHBOARD_TABS.map(tab => {
              const isOn = dashboardTabs[tab.key] !== false;
              const Icon = tab.icon;
              return (
                <motion.button key={tab.key} whileTap={{ scale: 0.95 }}
                  onClick={() => toggleDashboardTab(tab.key)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${isOn ? "bg-primary/10 border-primary/30 text-foreground" : "bg-muted/30 border-border/40 text-muted-foreground"}`}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs font-medium truncate">{tab.label}</span>
                  {isOn ? <Eye className="w-3 h-3 ml-auto text-primary flex-shrink-0" /> : <EyeOff className="w-3 h-3 ml-auto flex-shrink-0" />}
                </motion.button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg">Maintenance Mode</h3>
          <p className="text-sm text-muted-foreground">Set timer. Auto-disables when timer expires.</p>
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
              <Card className={`transition-all rounded-2xl overflow-hidden ${s.is_enabled ? "border-destructive/50 bg-destructive/5" : "bg-card"} ${isGlobal ? "md:col-span-2 border-2" : ""}`}>
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
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Duration Timer</Label>
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
