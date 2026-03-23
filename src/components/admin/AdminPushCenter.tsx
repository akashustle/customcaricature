import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { broadcastWebPush, sendWebPushNotification } from "@/lib/webpush";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  Send, Users, User, Loader2, Bell, Search, X, Trash2, Edit2, BarChart3,
  RefreshCw, Eye, Radio, Smartphone, Globe, Clock, Image, Link2,
  CheckCircle2, XCircle, Calendar, Monitor, TrendingUp, Zap, Settings, ChevronDown
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from "framer-motion";

type Profile = { user_id: string; full_name: string; email: string };
type Subscriber = {
  id: string; user_id: string; device_type: string; browser: string; os: string;
  device_name: string | null; city: string | null; country: string | null; timezone: string | null;
  is_active: boolean; welcome_sent: boolean; created_at: string; last_active_at: string;
  endpoint: string;
};
type NotificationBatch = {
  id: string; title: string; message: string; link: string | null;
  sent_to_count: number; delivered_count: number; clicked_count: number; created_at: string;
};
type ScheduledNotif = {
  id: string; title: string; message: string; link: string | null; image_url: string | null;
  target_type: string; scheduled_at: string; status: string; sent_count: number;
  failed_count: number; created_at: string;
};

const AdminPushCenter = () => {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState("compose");

  // Compose state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [mode, setMode] = useState<"all" | "selected">("all");
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);

  // Schedule state
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  // Data
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [batches, setBatches] = useState<NotificationBatch[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledNotif[]>([]);
  const [subSearch, setSubSearch] = useState("");

  // Analytics
  const [totalSent, setTotalSent] = useState(0);
  const [totalOpened, setTotalOpened] = useState(0);
  const [totalClicked, setTotalClicked] = useState(0);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = () => {
    fetchUsers();
    fetchSubscribers();
    fetchBatches();
    fetchScheduled();
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from("profiles").select("user_id, full_name, email").order("full_name");
    if (data) setUsers(data as any);
  };

  const fetchSubscribers = async () => {
    const { data } = await supabase.from("push_subscriptions").select("*").order("created_at", { ascending: false });
    if (data) setSubscribers(data as any);
  };

  const fetchBatches = async () => {
    const { data } = await supabase.from("notification_batches").select("*").order("created_at", { ascending: false }).limit(50);
    if (data) {
      setBatches(data as any);
      const sent = data.reduce((s: number, b: any) => s + (b.sent_to_count || 0), 0);
      const opened = data.reduce((s: number, b: any) => s + (b.delivered_count || 0), 0);
      const clicked = data.reduce((s: number, b: any) => s + (b.clicked_count || 0), 0);
      setTotalSent(sent);
      setTotalOpened(opened);
      setTotalClicked(clicked);
    }
  };

  const fetchScheduled = async () => {
    const { data } = await supabase.from("scheduled_push_notifications").select("*").order("scheduled_at", { ascending: true });
    if (data) setScheduled(data as any);
  };

  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  const filteredSubscribers = subscribers.filter(s =>
    !subSearch || s.browser?.toLowerCase().includes(subSearch.toLowerCase()) ||
    s.city?.toLowerCase().includes(subSearch.toLowerCase()) ||
    s.os?.toLowerCase().includes(subSearch.toLowerCase()) ||
    s.user_id?.toLowerCase().includes(subSearch.toLowerCase())
  );

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast({ title: "Please fill title and message", variant: "destructive" });
      return;
    }

    const targetUsers = mode === "all" ? users : users.filter(u => selectedUsers.includes(u.user_id));
    if (targetUsers.length === 0) {
      toast({ title: "No users selected", variant: "destructive" });
      return;
    }

    // If scheduled
    if (scheduleEnabled && scheduleDate && scheduleTime) {
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
      await supabase.from("scheduled_push_notifications").insert({
        title: title.trim(),
        message: message.trim(),
        link: link.trim() || null,
        image_url: imageUrl.trim() || null,
        target_type: mode,
        target_user_ids: mode === "selected" ? selectedUsers : [],
        scheduled_at: scheduledAt,
        created_by: user?.id,
      } as any);
      toast({ title: "📅 Notification scheduled!" });
      setTitle(""); setMessage(""); setLink(""); setImageUrl("");
      setSelectedUsers([]); setScheduleEnabled(false);
      fetchScheduled();
      return;
    }

    setSending(true);
    try {
      // Create batch
      const { data: batch, error: batchErr } = await supabase.from("notification_batches").insert({
        title: title.trim(), message: message.trim(), link: link.trim() || null,
        sent_by: user?.id, sent_to_count: targetUsers.length,
      } as any).select("id").single();
      if (batchErr || !batch) throw new Error(batchErr?.message || "Failed");

      // Insert in-app notifications (triggers DB web push trigger too)
      const notifications = targetUsers.map(u => ({
        user_id: u.user_id, title: title.trim(), message: message.trim(),
        type: "broadcast", link: link.trim() || null, batch_id: (batch as any).id,
      }));
      for (let i = 0; i < notifications.length; i += 50) {
        await supabase.from("notifications").insert(notifications.slice(i, i + 50) as any);
      }

      // Direct web push for extra reliability
      try {
        await broadcastWebPush({
          title: title.trim(), message: message.trim(),
          link: link.trim() || undefined, userIds: targetUsers.map(u => u.user_id),
        });
      } catch {}

      toast({ title: `✅ Sent to ${targetUsers.length} user(s)!` });
      setTitle(""); setMessage(""); setLink(""); setImageUrl(""); setSelectedUsers([]);
      fetchBatches();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSending(false);
  };

  const handleDeleteBatch = async (batchId: string) => {
    await supabase.from("notifications").delete().eq("batch_id", batchId);
    await supabase.from("notification_batches").delete().eq("id", batchId);
    toast({ title: "Batch deleted" });
    fetchBatches();
  };

  const handleDeleteSubscriber = async (id: string) => {
    await supabase.from("push_subscriptions").delete().eq("id", id);
    toast({ title: "Subscriber removed" });
    fetchSubscribers();
  };

  const handleCancelScheduled = async (id: string) => {
    await supabase.from("scheduled_push_notifications").delete().eq("id", id);
    toast({ title: "Scheduled notification cancelled" });
    fetchScheduled();
  };

  const handleSendScheduledNow = async (s: ScheduledNotif) => {
    // Send immediately
    const targetUsers = s.target_type === "all" ? users : users.filter(u => (s as any).target_user_ids?.includes(u.user_id));
    if (targetUsers.length === 0) {
      toast({ title: "No target users found", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const notifications = targetUsers.map(u => ({
        user_id: u.user_id, title: s.title, message: s.message,
        type: "broadcast", link: s.link || null,
      }));
      for (let i = 0; i < notifications.length; i += 50) {
        await supabase.from("notifications").insert(notifications.slice(i, i + 50) as any);
      }
      await supabase.from("scheduled_push_notifications").update({
        status: "sent", sent_at: new Date().toISOString(), sent_count: targetUsers.length,
      } as any).eq("id", s.id);
      toast({ title: `✅ Sent to ${targetUsers.length} user(s)!` });
      fetchScheduled();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSending(false);
  };

  const activeSubCount = subscribers.filter(s => s.is_active).length;
  const deviceBreakdown = {
    desktop: subscribers.filter(s => s.device_type === "desktop").length,
    mobile: subscribers.filter(s => s.device_type === "mobile").length,
    tablet: subscribers.filter(s => s.device_type === "tablet").length,
    unknown: subscribers.filter(s => !s.device_type || s.device_type === "unknown").length,
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case "mobile": return <Smartphone className="w-3.5 h-3.5" />;
      case "desktop": return <Monitor className="w-3.5 h-3.5" />;
      default: return <Globe className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 shadow-sm border border-border">
          <img src="/logo.png" alt="CCC" className="w-full h-full object-cover" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            <Radio className="w-5 h-5 text-primary" /> Push Center
          </h2>
          <p className="text-xs text-muted-foreground font-sans">Self-hosted push notification system</p>
        </div>
      </div>

      {/* Analytics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Subscribers", value: subscribers.length, icon: Users, color: "text-primary" },
          { label: "Active", value: activeSubCount, icon: CheckCircle2, color: "text-emerald-600" },
          { label: "Total Sent", value: totalSent, icon: Send, color: "text-blue-600" },
          { label: "Opened", value: totalOpened, icon: Eye, color: "text-purple-600" },
          { label: "Clicked", value: totalClicked, icon: TrendingUp, color: "text-amber-600" },
        ].map(stat => (
          <Card key={stat.label} className="bg-muted/30">
            <CardContent className="p-3 flex items-center gap-3">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <div>
                <p className="text-lg font-bold font-display">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground font-sans">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Device Breakdown */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="text-[10px] gap-1"><Monitor className="w-3 h-3" /> Desktop: {deviceBreakdown.desktop}</Badge>
        <Badge variant="outline" className="text-[10px] gap-1"><Smartphone className="w-3 h-3" /> Mobile: {deviceBreakdown.mobile}</Badge>
        <Badge variant="outline" className="text-[10px] gap-1"><Globe className="w-3 h-3" /> Other: {deviceBreakdown.tablet + deviceBreakdown.unknown}</Badge>
        {totalSent > 0 && (
          <Badge variant="outline" className="text-[10px] gap-1 bg-primary/5">
            📊 CTR: {totalClicked > 0 ? Math.round((totalClicked / totalSent) * 100) : 0}%
          </Badge>
        )}
      </div>

      {/* Sub Tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="compose" className="text-xs gap-1"><Send className="w-3 h-3" /> Compose</TabsTrigger>
          <TabsTrigger value="subscribers" className="text-xs gap-1"><Users className="w-3 h-3" /> Subscribers</TabsTrigger>
          <TabsTrigger value="history" className="text-xs gap-1"><BarChart3 className="w-3 h-3" /> History</TabsTrigger>
          <TabsTrigger value="scheduled" className="text-xs gap-1"><Clock className="w-3 h-3" /> Scheduled</TabsTrigger>
        </TabsList>

        {/* COMPOSE TAB */}
        <TabsContent value="compose" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Send className="w-4 h-4 text-primary" /> New Push Notification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="font-sans text-sm">Title *</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. New Year Offer! 🎉" />
                </div>
                <div>
                  <Label className="font-sans text-sm">Link (optional)</Label>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={link} onChange={e => setLink(e.target.value)} placeholder="/order or full URL" className="pl-9" />
                  </div>
                </div>
              </div>

              <div>
                <Label className="font-sans text-sm">Message *</Label>
                <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Your notification message..." rows={3} />
              </div>

              <div>
                <Label className="font-sans text-sm">Banner Image URL (optional)</Label>
                <div className="relative">
                  <Image className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://example.com/banner.jpg" className="pl-9" />
                </div>
                {imageUrl && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-border max-h-32">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                  </div>
                )}
              </div>

              {/* Preview */}
              {(title || message) && (
                <div className="bg-muted/50 rounded-xl p-4 border border-border">
                  <p className="text-[10px] text-muted-foreground font-sans mb-2 uppercase tracking-wider">Preview</p>
                  <div className="flex items-start gap-3 bg-background rounded-lg p-3 shadow-sm border border-border">
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                      <img src="/logo.png" alt="CCC" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold font-sans truncate">{title || "Notification Title"}</p>
                      <p className="text-xs text-muted-foreground font-sans line-clamp-2">{message || "Notification message..."}</p>
                      {imageUrl && <div className="mt-1.5 rounded overflow-hidden h-16"><img src={imageUrl} alt="" className="w-full h-full object-cover" /></div>}
                      <p className="text-[9px] text-muted-foreground font-sans mt-1">Creative Caricature Club • now</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Target */}
              <div>
                <Label className="font-sans text-sm mb-2 block">Send To</Label>
                <Select value={mode} onValueChange={(v: "all" | "selected") => setMode(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all"><div className="flex items-center gap-2"><Users className="w-4 h-4" /> All Users ({users.length})</div></SelectItem>
                    <SelectItem value="selected"><div className="flex items-center gap-2"><User className="w-4 h-4" /> Select Users</div></SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {mode === "selected" && (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="pl-9" />
                  </div>
                  {selectedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedUsers.map(id => {
                        const u = users.find(u => u.user_id === id);
                        return u ? (
                          <Badge key={id} variant="secondary" className="text-xs cursor-pointer" onClick={() => toggleUser(id)}>
                            {u.full_name} <X className="w-3 h-3 ml-1" />
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                  <div className="max-h-48 overflow-y-auto border border-border rounded-lg">
                    {filteredUsers.map(u => (
                      <label key={u.user_id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer border-b border-border/50 last:border-0">
                        <Checkbox checked={selectedUsers.includes(u.user_id)} onCheckedChange={() => toggleUser(u.user_id)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-sans font-medium truncate">{u.full_name}</p>
                          <p className="text-[11px] text-muted-foreground font-sans truncate">{u.email}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Schedule Toggle */}
              <div className="flex items-center gap-3 bg-muted/30 rounded-lg p-3 border border-border">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1">
                  <Label className="font-sans text-sm font-medium">Schedule for later</Label>
                  <p className="text-[10px] text-muted-foreground font-sans">Send at a specific date and time</p>
                </div>
                <Switch checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} />
              </div>

              {scheduleEnabled && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="font-sans text-xs">Date</Label>
                    <Input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} />
                  </div>
                  <div>
                    <Label className="font-sans text-xs">Time</Label>
                    <Input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} />
                  </div>
                </div>
              )}

              <Button
                onClick={handleSend}
                disabled={sending || !title.trim() || !message.trim() || (mode === "selected" && selectedUsers.length === 0)}
                className="w-full rounded-full font-sans"
              >
                {sending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                ) : scheduleEnabled ? (
                  <><Calendar className="w-4 h-4 mr-2" /> Schedule Notification</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" /> Send Now</>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SUBSCRIBERS TAB */}
        <TabsContent value="subscribers" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Push Subscribers ({subscribers.length})
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={fetchSubscribers}><RefreshCw className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={subSearch} onChange={e => setSubSearch(e.target.value)} placeholder="Search by browser, city, OS..." className="pl-9" />
              </div>

              <div className="max-h-[500px] overflow-y-auto space-y-2">
                {filteredSubscribers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8 font-sans">No subscribers yet</p>
                ) : filteredSubscribers.map(sub => {
                  const userName = users.find(u => u.user_id === sub.user_id)?.full_name || "Anonymous";
                  return (
                    <motion.div key={sub.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="bg-muted/20 rounded-lg p-3 border border-border/50 hover:border-border transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            {getDeviceIcon(sub.device_type)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-sans font-semibold truncate">{userName}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              <Badge variant="outline" className="text-[9px]">{sub.browser || "Unknown"}</Badge>
                              <Badge variant="outline" className="text-[9px]">{sub.os || "Unknown"}</Badge>
                              {sub.device_type && <Badge variant="outline" className="text-[9px]">{sub.device_type}</Badge>}
                              {sub.city && <Badge variant="outline" className="text-[9px]">📍 {sub.city}{sub.country ? `, ${sub.country}` : ""}</Badge>}
                              {sub.timezone && <Badge variant="outline" className="text-[9px]">🕐 {sub.timezone}</Badge>}
                            </div>
                            <p className="text-[9px] text-muted-foreground font-sans mt-1">
                              Subscribed: {new Date(sub.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                              {sub.last_active_at && ` • Last active: ${new Date(sub.last_active_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {sub.is_active ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-none text-[9px]">Active</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] text-destructive">Inactive</Badge>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive"><Trash2 className="w-3 h-3" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Remove subscriber?</AlertDialogTitle></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteSubscriber(sub.id)}>Remove</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" /> Broadcast History
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={fetchBatches}><RefreshCw className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {batches.length === 0 ? (
                <p className="text-sm text-muted-foreground font-sans text-center py-6">No broadcasts sent yet</p>
              ) : batches.map(b => (
                <div key={b.id} className="bg-muted/20 rounded-lg p-3 space-y-2 border border-border/50">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-sans font-semibold text-sm truncate">{b.title}</p>
                      <p className="text-[11px] text-muted-foreground font-sans truncate">{b.message}</p>
                      <p className="text-[10px] text-muted-foreground font-sans mt-1">
                        {new Date(b.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive"><Trash2 className="w-3 h-3" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Delete broadcast?</AlertDialogTitle></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteBatch(b.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-[10px]">📤 Sent: {b.sent_to_count}</Badge>
                    <Badge variant="outline" className="text-[10px]">👀 Opened: {b.delivered_count}</Badge>
                    <Badge variant="outline" className="text-[10px]">🖱️ Clicked: {b.clicked_count}</Badge>
                    {b.sent_to_count > 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        📊 {Math.round((b.delivered_count / b.sent_to_count) * 100)}% open rate
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SCHEDULED TAB */}
        <TabsContent value="scheduled" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" /> Scheduled Notifications
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={fetchScheduled}><RefreshCw className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {scheduled.length === 0 ? (
                <p className="text-sm text-muted-foreground font-sans text-center py-6">No scheduled notifications</p>
              ) : scheduled.map(s => (
                <div key={s.id} className="bg-muted/20 rounded-lg p-3 space-y-2 border border-border/50">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-sans font-semibold text-sm truncate">{s.title}</p>
                      <p className="text-[11px] text-muted-foreground font-sans truncate">{s.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={s.status === "pending" ? "outline" : "secondary"} className="text-[10px]">
                          {s.status === "pending" ? "⏳ Pending" : s.status === "sent" ? "✅ Sent" : s.status}
                        </Badge>
                        <p className="text-[10px] text-muted-foreground font-sans">
                          📅 {new Date(s.scheduled_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                        {s.sent_count > 0 && <Badge variant="outline" className="text-[9px]">Sent to {s.sent_count}</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {s.status === "pending" && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => handleSendScheduledNow(s)}>
                          <Send className="w-3 h-3" /> Send Now
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive"><Trash2 className="w-3 h-3" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Cancel scheduled notification?</AlertDialogTitle></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleCancelScheduled(s.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPushCenter;
