import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, Globe, Home, UserPlus, LogIn, LayoutDashboard, Package, Calendar, ShoppingBag, ClipboardList, Save } from "lucide-react";
import { motion } from "framer-motion";

const PAGE_ICONS: Record<string, any> = {
  global: Globe,
  home: Home,
  registration: UserPlus,
  login: LogIn,
  dashboard: LayoutDashboard,
  order: Package,
  "book-event": Calendar,
  shop: ShoppingBag,
  enquiry: ClipboardList,
};

const AdminMaintenance = () => {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await supabase.from("maintenance_settings").select("*").order("id");
    setSettings(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchSettings(); }, []);

  const updateSetting = async (id: string, updates: any) => {
    setSaving(id);
    const { error } = await supabase.from("maintenance_settings").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Updated", description: `${id} maintenance settings saved` });
      fetchSettings();
    }
    setSaving(null);
  };

  const toggleMaintenance = async (id: string, current: boolean) => {
    await updateSetting(id, { is_enabled: !current });
  };

  const globalEnabled = settings.find(s => s.id === "global")?.is_enabled;

  return (
    <div className="space-y-6">
      {/* Global Warning */}
      {globalEnabled && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-destructive flex-shrink-0" />
              <div>
                <p className="font-body font-bold text-destructive">GLOBAL MAINTENANCE MODE IS ON</p>
                <p className="text-sm text-muted-foreground font-body">Your entire website is in maintenance mode. All pages are blocked for non-admin users.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-body font-bold text-lg">Maintenance Mode</h3>
          <p className="text-sm text-muted-foreground font-body">Control access to individual pages or the entire site</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settings.map((s, i) => {
          const Icon = PAGE_ICONS[s.id] || Globe;
          const isGlobal = s.id === "global";
          return (
            <motion.div key={s.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className={`transition-all ${s.is_enabled ? "border-destructive/50 bg-destructive/5" : ""} ${isGlobal ? "md:col-span-2" : ""}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-5 h-5 ${s.is_enabled ? "text-destructive" : "text-primary"}`} />
                      <CardTitle className="text-sm font-body capitalize">{s.id.replace("-", " ")}</CardTitle>
                      {isGlobal && <Badge variant="destructive" className="text-[10px]">GLOBAL</Badge>}
                    </div>
                    <Switch checked={s.is_enabled} onCheckedChange={() => toggleMaintenance(s.id, s.is_enabled)} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs font-body text-muted-foreground">Title</Label>
                    <Input
                      value={s.title || ""}
                      onChange={e => setSettings(prev => prev.map(x => x.id === s.id ? { ...x, title: e.target.value } : x))}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-body text-muted-foreground">Message</Label>
                    <Textarea
                      value={s.message || ""}
                      onChange={e => setSettings(prev => prev.map(x => x.id === s.id ? { ...x, message: e.target.value } : x))}
                      className="text-sm"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-body text-muted-foreground">Estimated End Time</Label>
                    <Input
                      type="datetime-local"
                      value={s.estimated_end ? new Date(s.estimated_end).toISOString().slice(0, 16) : ""}
                      onChange={e => setSettings(prev => prev.map(x => x.id === s.id ? { ...x, estimated_end: e.target.value || null } : x))}
                      className="text-sm"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full rounded-full font-body gap-2"
                    disabled={saving === s.id}
                    onClick={() => updateSetting(s.id, { title: s.title, message: s.message, estimated_end: s.estimated_end })}
                  >
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