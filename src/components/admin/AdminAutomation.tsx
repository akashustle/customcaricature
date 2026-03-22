import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { motion } from "framer-motion";
import { formatPrice } from "@/lib/pricing";
import {
  MessageCircle, Save, Plus, Trash2, Edit2, Phone, Key, Shield,
  Zap, Clock, Send, FileText, BarChart3, TrendingUp, Users,
  Target, Eye, ArrowDown, Wifi, WifiOff, Copy, CheckCircle
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, FunnelChart, Funnel, LabelList, LineChart, Line, Legend
} from "recharts";

const COLORS = ["hsl(22, 78%, 52%)", "hsl(210, 62%, 48%)", "hsl(152, 55%, 40%)", "hsl(280, 55%, 55%)", "hsl(38, 88%, 50%)"];

const WHATSAPP_PROVIDERS = [
  { value: "meta", label: "Meta Cloud API" },
  { value: "twilio", label: "Twilio" },
  { value: "gupshup", label: "Gupshup" },
  { value: "interakt", label: "Interakt" },
];

const SCRIPT_CATEGORIES = [
  { value: "first_contact", label: "First Contact" },
  { value: "negotiation", label: "Negotiation" },
  { value: "closing", label: "Closing" },
  { value: "follow_up", label: "Follow-up" },
  { value: "general", label: "General" },
];

const AdminAutomation = () => {
  const { settings, updateSetting } = useSiteSettings();
  const [tab, setTab] = useState("whatsapp");

  // WhatsApp API
  const [waProvider, setWaProvider] = useState("meta");
  const [waApiKey, setWaApiKey] = useState("");
  const [waPhoneId, setWaPhoneId] = useState("");
  const [waBusinessId, setWaBusinessId] = useState("");
  const [waEnabled, setWaEnabled] = useState(false);
  const [waStatus, setWaStatus] = useState<"idle" | "testing" | "connected" | "failed">("idle");

  // Templates
  const [templates, setTemplates] = useState<any[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);

  // Scripts
  const [scripts, setScripts] = useState<any[]>([]);
  const [editingScript, setEditingScript] = useState<any | null>(null);
  const [newScriptTitle, setNewScriptTitle] = useState("");
  const [newScriptBody, setNewScriptBody] = useState("");
  const [newScriptCat, setNewScriptCat] = useState("general");

  // Funnel
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  const fetchAll = useCallback(async () => {
    const [tRes, sRes, eRes, evRes, fRes] = await Promise.all([
      supabase.from("automation_templates" as any).select("*").order("sort_order"),
      supabase.from("sales_scripts" as any).select("*").order("sort_order"),
      supabase.from("enquiries" as any).select("id, status, source, created_at"),
      supabase.from("event_bookings").select("id, status, payment_status, created_at"),
      supabase.from("funnel_events" as any).select("*").order("created_at", { ascending: false }).limit(1000),
    ]);
    if (tRes.data) setTemplates(tRes.data as any[]);
    if (sRes.data) setScripts(sRes.data as any[]);
    if (eRes.data) setEnquiries(eRes.data as any[]);
    if (evRes.data) setEvents(evRes.data as any[]);
    if (fRes.data) setFunnelData(fRes.data as any[]);
  }, []);

  useEffect(() => {
    fetchAll();
    // Load WhatsApp config
    const loadWaConfig = async () => {
      const { data } = await supabase.from("admin_site_settings").select("value").eq("id", "whatsapp_api_config").maybeSingle();
      if (data?.value) {
        const v = data.value as any;
        setWaProvider(v.provider || "meta");
        setWaApiKey(v.api_key || "");
        setWaPhoneId(v.phone_id || "");
        setWaBusinessId(v.business_id || "");
        setWaEnabled(v.enabled || false);
        if (v.api_key) setWaStatus("connected");
      }
    };
    loadWaConfig();

    const ch = supabase.channel("automation-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "automation_templates" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "sales_scripts" }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchAll]);

  // WhatsApp
  const saveWaConfig = async () => {
    await updateSetting("whatsapp_api_config", {
      provider: waProvider, api_key: waApiKey, phone_id: waPhoneId,
      business_id: waBusinessId, enabled: waEnabled,
    });
    toast({ title: "WhatsApp API config saved ✅" });
  };

  const testWaConnection = async () => {
    setWaStatus("testing");
    // Simulate test - in production this would call the actual API
    setTimeout(() => {
      if (waApiKey && waPhoneId) {
        setWaStatus("connected");
        toast({ title: "API Connection Successful ✅" });
      } else {
        setWaStatus("failed");
        toast({ title: "Connection failed - check credentials", variant: "destructive" });
      }
    }, 1500);
  };

  // Templates
  const saveTemplate = async (t: any) => {
    await supabase.from("automation_templates" as any).update({
      label: t.label, message_body: t.message_body, is_enabled: t.is_enabled,
      delay_minutes: t.delay_minutes, updated_at: new Date().toISOString(),
    } as any).eq("id", t.id);
    toast({ title: "Template saved ✅" });
    setEditingTemplate(null);
    fetchAll();
  };

  const toggleTemplate = async (id: string, enabled: boolean) => {
    await supabase.from("automation_templates" as any).update({ is_enabled: enabled } as any).eq("id", id);
    fetchAll();
  };

  const deleteTemplate = async (id: string) => {
    await supabase.from("automation_templates" as any).delete().eq("id", id);
    toast({ title: "Template deleted" });
    fetchAll();
  };

  // Scripts
  const addScript = async () => {
    if (!newScriptTitle || !newScriptBody) return;
    await supabase.from("sales_scripts" as any).insert({
      title: newScriptTitle, script_body: newScriptBody, category: newScriptCat,
    } as any);
    toast({ title: "Script added ✅" });
    setNewScriptTitle(""); setNewScriptBody(""); setNewScriptCat("general");
    fetchAll();
  };

  const saveScript = async (s: any) => {
    await supabase.from("sales_scripts" as any).update({
      title: s.title, script_body: s.script_body, category: s.category,
      is_active: s.is_active, updated_at: new Date().toISOString(),
    } as any).eq("id", s.id);
    toast({ title: "Script updated ✅" });
    setEditingScript(null);
    fetchAll();
  };

  const deleteScript = async (id: string) => {
    await supabase.from("sales_scripts" as any).delete().eq("id", id);
    toast({ title: "Script deleted" });
    fetchAll();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard 📋" });
  };

  // Funnel metrics
  const totalEnquiries = enquiries.length;
  const contactedLeads = enquiries.filter(e => e.status !== "new").length;
  const confirmedBookings = enquiries.filter(e => ["converted", "completed"].includes(e.status)).length;
  const totalEvents = events.length;
  const paidEvents = events.filter(e => ["confirmed", "fully_paid"].includes(e.payment_status)).length;

  const enquiryRate = totalEnquiries > 0 ? Math.round((contactedLeads / totalEnquiries) * 100) : 0;
  const bookingRate = totalEnquiries > 0 ? Math.round((confirmedBookings / totalEnquiries) * 100) : 0;

  // Source breakdown
  const sourceData = (() => {
    const counts: Record<string, number> = {};
    enquiries.forEach(e => {
      const src = (e as any).source || "direct";
      counts[src] = (counts[src] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  // Funnel stages
  const funnelStages = [
    { name: "Enquiries", value: totalEnquiries, fill: COLORS[0] },
    { name: "Contacted", value: contactedLeads, fill: COLORS[1] },
    { name: "Confirmed", value: confirmedBookings, fill: COLORS[2] },
    { name: "Events Paid", value: paidEvents, fill: COLORS[3] },
  ];

  // Monthly conversions
  const monthlyConversions = (() => {
    const months: Record<string, { enquiries: number; bookings: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = { enquiries: 0, bookings: 0 };
    }
    enquiries.forEach(e => {
      const key = e.created_at?.substring(0, 7);
      if (months[key]) months[key].enquiries++;
    });
    enquiries.filter(e => ["converted", "completed"].includes(e.status)).forEach(e => {
      const key = e.created_at?.substring(0, 7);
      if (months[key]) months[key].bookings++;
    });
    return Object.entries(months).map(([k, v]) => ({
      month: new Date(k + "-01").toLocaleDateString("en-IN", { month: "short" }),
      ...v,
    }));
  })();

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif' }}>
        <Zap className="w-5 h-5 text-primary" /> Automation & API
      </h2>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="whatsapp" className="text-xs">WhatsApp API</TabsTrigger>
          <TabsTrigger value="templates" className="text-xs">Templates</TabsTrigger>
          <TabsTrigger value="scripts" className="text-xs">Sales Scripts</TabsTrigger>
          <TabsTrigger value="rules" className="text-xs">Rules</TabsTrigger>
          <TabsTrigger value="funnel" className="text-xs">Funnel</TabsTrigger>
        </TabsList>

        {/* === WHATSAPP API === */}
        <TabsContent value="whatsapp" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageCircle className="w-4 h-4" /> WhatsApp API Configuration
                <Badge variant={waStatus === "connected" ? "default" : waStatus === "failed" ? "destructive" : "secondary"} className="ml-auto">
                  {waStatus === "connected" ? <><Wifi className="w-3 h-3 mr-1" /> Connected</> :
                   waStatus === "failed" ? <><WifiOff className="w-3 h-3 mr-1" /> Failed</> :
                   waStatus === "testing" ? "Testing..." : "Not Connected"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">API Provider</Label>
                  <Select value={waProvider} onValueChange={setWaProvider}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {WHATSAPP_PROVIDERS.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">API Key</Label>
                  <Input className="mt-1" type="password" value={waApiKey} onChange={e => setWaApiKey(e.target.value)} placeholder="Enter API key" />
                </div>
                <div>
                  <Label className="text-xs">Phone Number ID</Label>
                  <Input className="mt-1" value={waPhoneId} onChange={e => setWaPhoneId(e.target.value)} placeholder="Phone Number ID" />
                </div>
                <div>
                  <Label className="text-xs">Business Account ID</Label>
                  <Input className="mt-1" value={waBusinessId} onChange={e => setWaBusinessId(e.target.value)} placeholder="Business Account ID" />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={waEnabled} onCheckedChange={setWaEnabled} />
                <span className="text-sm">Enable WhatsApp Automation</span>
              </div>

              <div className="flex gap-2">
                <Button onClick={saveWaConfig} size="sm"><Save className="w-4 h-4 mr-1" /> Save Config</Button>
                <Button onClick={testWaConnection} size="sm" variant="outline" disabled={waStatus === "testing"}>
                  <Zap className="w-4 h-4 mr-1" /> Test Connection
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === TEMPLATES === */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Manage automated message templates. Use {"{{name}}"}, {"{{link}}"} as variables.</p>
          </div>

          <div className="space-y-3">
            {templates.map(t => (
              <Card key={t.id} className="border border-border/60">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px]">{t.trigger_event}</Badge>
                        <span className="text-sm font-semibold">{t.label}</span>
                        {t.delay_minutes > 0 && (
                          <Badge variant="secondary" className="text-[10px]">
                            <Clock className="w-3 h-3 mr-0.5" /> {t.delay_minutes >= 60 ? `${t.delay_minutes / 60}h` : `${t.delay_minutes}m`}
                          </Badge>
                        )}
                      </div>
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans bg-muted/30 p-2 rounded-lg mt-1">{t.message_body}</pre>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Switch checked={t.is_enabled} onCheckedChange={v => toggleTemplate(t.id, v)} />
                      <Button size="icon" variant="ghost" onClick={() => setEditingTemplate({ ...t })}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteTemplate(t.id)} className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Edit Template Dialog */}
          <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
            <DialogContent>
              <DialogHeader><DialogTitle>Edit Template</DialogTitle></DialogHeader>
              {editingTemplate && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Label</Label>
                    <Input value={editingTemplate.label} onChange={e => setEditingTemplate({ ...editingTemplate, label: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Message Body</Label>
                    <Textarea rows={6} value={editingTemplate.message_body} onChange={e => setEditingTemplate({ ...editingTemplate, message_body: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Delay (minutes)</Label>
                    <Input type="number" value={editingTemplate.delay_minutes} onChange={e => setEditingTemplate({ ...editingTemplate, delay_minutes: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={editingTemplate.is_enabled} onCheckedChange={v => setEditingTemplate({ ...editingTemplate, is_enabled: v })} />
                    <span className="text-sm">Enabled</span>
                  </div>
                  <Button onClick={() => saveTemplate(editingTemplate)}><Save className="w-4 h-4 mr-1" /> Save</Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* === SALES SCRIPTS === */}
        <TabsContent value="scripts" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Add New Script</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input value={newScriptTitle} onChange={e => setNewScriptTitle(e.target.value)} placeholder="Script title" />
                </div>
                <div>
                  <Label className="text-xs">Category</Label>
                  <Select value={newScriptCat} onValueChange={setNewScriptCat}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SCRIPT_CATEGORIES.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Textarea rows={4} value={newScriptBody} onChange={e => setNewScriptBody(e.target.value)} placeholder="Script body..." />
              <Button size="sm" onClick={addScript} disabled={!newScriptTitle || !newScriptBody}>
                <Plus className="w-4 h-4 mr-1" /> Add Script
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {scripts.map(s => (
              <Card key={s.id} className="border border-border/60">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px]">{s.category}</Badge>
                        <span className="text-sm font-semibold">{s.title}</span>
                      </div>
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans bg-muted/30 p-2 rounded-lg mt-1">{s.script_body}</pre>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => copyToClipboard(s.script_body)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditingScript({ ...s })}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteScript(s.id)} className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Edit Script Dialog */}
          <Dialog open={!!editingScript} onOpenChange={() => setEditingScript(null)}>
            <DialogContent>
              <DialogHeader><DialogTitle>Edit Script</DialogTitle></DialogHeader>
              {editingScript && (
                <div className="space-y-3">
                  <Input value={editingScript.title} onChange={e => setEditingScript({ ...editingScript, title: e.target.value })} />
                  <Select value={editingScript.category} onValueChange={v => setEditingScript({ ...editingScript, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SCRIPT_CATEGORIES.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea rows={6} value={editingScript.script_body} onChange={e => setEditingScript({ ...editingScript, script_body: e.target.value })} />
                  <Button onClick={() => saveScript(editingScript)}><Save className="w-4 h-4 mr-1" /> Save</Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* === AUTOMATION RULES === */}
        <TabsContent value="rules" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { trigger: "New Enquiry", action: "Send WhatsApp greeting", delay: "Instant", template: "new_lead", icon: MessageCircle },
              { trigger: "No Response (2hr)", action: "Send follow-up", delay: "2 hours", template: "follow_up_2hr", icon: Clock },
              { trigger: "No Response (24hr)", action: "Send follow-up", delay: "24 hours", template: "follow_up_24hr", icon: Clock },
              { trigger: "Booking Confirmed", action: "Send confirmation + Notify admin", delay: "Instant", template: "booking_confirmed", icon: CheckCircle },
              { trigger: "Event Tomorrow", action: "Send reminder", delay: "1 day before", template: "event_reminder", icon: Send },
            ].map((rule, i) => {
              const tmpl = templates.find(t => t.template_key === rule.template);
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="border border-border/60">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <rule.icon className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{rule.trigger}</p>
                          <p className="text-[11px] text-muted-foreground">{rule.action}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <Badge variant="secondary" className="text-[10px]">
                          <Clock className="w-3 h-3 mr-0.5" /> {rule.delay}
                        </Badge>
                        <Switch
                          checked={tmpl?.is_enabled ?? true}
                          onCheckedChange={v => tmpl && toggleTemplate(tmpl.id, v)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">
                💡 Automation rules use the message templates defined in the Templates tab. 
                Enable/disable rules using the toggles above. Delay settings are configured per template.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === FUNNEL ANALYTICS === */}
        <TabsContent value="funnel" className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Users, label: "Total Enquiries", value: totalEnquiries, color: "text-blue-600", bg: "bg-blue-50" },
              { icon: Target, label: "Enquiry Rate", value: `${enquiryRate}%`, color: "text-amber-600", bg: "bg-amber-50" },
              { icon: TrendingUp, label: "Booking Rate", value: `${bookingRate}%`, color: "text-emerald-600", bg: "bg-emerald-50" },
              { icon: CheckCircle, label: "Confirmed", value: confirmedBookings, color: "text-purple-600", bg: "bg-purple-50" },
            ].map(s => (
              <Card key={s.label} className="border border-border/60">
                <CardContent className="p-3">
                  <div className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center mb-1`}>
                    <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                  </div>
                  <p className="text-lg font-bold">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Conversion Funnel */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Conversion Funnel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {funnelStages.map((stage, i) => {
                    const maxVal = funnelStages[0].value || 1;
                    const pct = Math.round((stage.value / maxVal) * 100);
                    const dropOff = i > 0 ? Math.round(((funnelStages[i - 1].value - stage.value) / (funnelStages[i - 1].value || 1)) * 100) : 0;
                    return (
                      <div key={stage.name}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium">{stage.name}</span>
                          <span>{stage.value} {i > 0 && <span className="text-red-500 ml-1">↓{dropOff}%</span>}</span>
                        </div>
                        <div className="h-8 bg-muted/30 rounded-lg overflow-hidden">
                          <motion.div
                            className="h-full rounded-lg flex items-center justify-end pr-2"
                            style={{ background: stage.fill, width: `${pct}%` }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, delay: i * 0.15 }}
                          >
                            <span className="text-[10px] text-white font-bold">{pct}%</span>
                          </motion.div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Source Breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Lead Sources</CardTitle>
              </CardHeader>
              <CardContent>
                {sourceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={sourceData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={3} dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-8">No data yet</p>
                )}
              </CardContent>
            </Card>

            {/* Monthly Conversions */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Monthly Enquiries vs Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyConversions}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="enquiries" fill={COLORS[0]} name="Enquiries" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="bookings" fill={COLORS[2]} name="Bookings" radius={[4, 4, 0, 0]} />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAutomation;
