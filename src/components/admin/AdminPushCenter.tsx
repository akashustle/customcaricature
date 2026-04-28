import { useState, useEffect, useRef } from "react";
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
  Send, Users, User, Loader2, Bell, Search, X, Trash2, BarChart3,
  RefreshCw, Eye, Radio, Smartphone, Globe, Clock, Image, Link2,
  CheckCircle2, Calendar, Monitor, TrendingUp, Upload, FolderOpen
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";

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

type ComposeTargetMode = "all_users" | "all_subscribers" | "selected";

const STORAGE_BUCKETS = [
  { name: "gallery-images", label: "Gallery" },
  { name: "blog-images", label: "Blog" },
  { name: "shop-images", label: "Shop" },
  { name: "caricature-uploads", label: "Caricatures" },
];

const AdminPushCenter = () => {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState("compose");

  // Compose
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [mode, setMode] = useState<ComposeTargetMode>("all_subscribers");
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);

  // Schedule
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

  // File picker
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [pickerBucket, setPickerBucket] = useState("gallery-images");
  const [pickerFiles, setPickerFiles] = useState<{ name: string; url: string }[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = () => {
    fetchUsers(); fetchSubscribers(); fetchBatches(); fetchScheduled();
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
      setTotalSent(data.reduce((s: number, b: any) => s + (b.sent_to_count || 0), 0));
      setTotalOpened(data.reduce((s: number, b: any) => s + (b.delivered_count || 0), 0));
      setTotalClicked(data.reduce((s: number, b: any) => s + (b.clicked_count || 0), 0));
    }
  };

  const fetchScheduled = async () => {
    const { data } = await supabase.from("scheduled_push_notifications").select("*").order("scheduled_at", { ascending: true });
    if (data) setScheduled(data as any);
  };

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
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

  // File picker logic
  const fetchPickerFiles = async (bucket: string) => {
    setPickerLoading(true);
    setPickerBucket(bucket);
    try {
      const { data } = await supabase.storage.from(bucket).list("", { limit: 100 });
      if (data) {
        const files = data
          .filter(f => f.name && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.name))
          .map(f => {
            const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(f.name);
            return { name: f.name, url: urlData.publicUrl };
          });
        setPickerFiles(files);
      }
    } catch { setPickerFiles([]); }
    setPickerLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop();
    const path = `push-banners/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("gallery-images").upload(path, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return;
    }
    const { data: urlData } = supabase.storage.from("gallery-images").getPublicUrl(path);
    setImageUrl(urlData.publicUrl);
    toast({ title: "Banner uploaded!" });
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast({ title: "Please fill title and message", variant: "destructive" });
      return;
    }

    if (mode === "selected" && selectedUsers.length === 0) {
      toast({ title: "No users selected", variant: "destructive" });
      return;
    }

    // Schedule
    if (scheduleEnabled && scheduleDate && scheduleTime) {
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
      await supabase.from("scheduled_push_notifications").insert({
        title: title.trim(), message: message.trim(),
        link: link.trim() || null, image_url: imageUrl.trim() || null,
        target_type: mode,
        target_user_ids: mode === "selected" ? selectedUsers : [],
        scheduled_at: scheduledAt, created_by: user?.id,
      } as any);
      toast({ title: "📅 Notification scheduled!" });
      resetForm(); fetchScheduled();
      return;
    }

    setSending(true);
    try {
      const targetCount = mode === "all_subscribers"
        ? subscribers.filter(s => s.is_active).length
        : mode === "all_users" ? users.length
        : selectedUsers.length;

      // Create batch record
      const { data: batch } = await supabase.from("notification_batches").insert({
        title: title.trim(), message: message.trim(), link: link.trim() || null,
        sent_by: user?.id, sent_to_count: targetCount,
      } as any).select("id").single();

      if (mode === "all_subscribers") {
        // Send web push directly to ALL active push subscribers (including anonymous)
        const { data, error } = await supabase.functions.invoke("send-web-push", {
          body: {
            action: "broadcast_all",
            title: title.trim(), message: message.trim(),
            link: link.trim() || undefined, image_url: imageUrl.trim() || undefined,
          },
        });
        if (error) throw error;

        // Also create in-app notifications for registered users
        const registeredSubs = subscribers.filter(s => s.is_active && s.user_id && s.user_id !== "anonymous");
        const uniqueUserIds = [...new Set(registeredSubs.map(s => s.user_id))];
        if (uniqueUserIds.length > 0) {
          const notifs = uniqueUserIds.map(uid => ({
            user_id: uid, title: title.trim(), message: message.trim(),
            type: "broadcast", link: link.trim() || null,
            batch_id: (batch as any)?.id || null,
          }));
          for (let i = 0; i < notifs.length; i += 50) {
            await supabase.from("notifications").insert(notifs.slice(i, i + 50) as any);
          }
        }

        await supabase.from("notification_batches").update({
          delivered_count: data?.sent || 0,
        } as any).eq("id", (batch as any)?.id);

        toast({ title: `✅ Push sent! Delivered: ${data?.sent || 0}, Failed: ${data?.failed || 0}` });
      } else {
        // Send to specific users (all_users or selected)
        const targetUsers = mode === "all_users" ? users : users.filter(u => selectedUsers.includes(u.user_id));
        const userIds = targetUsers.map(u => u.user_id);

        // Insert in-app notifications (DB trigger fires web push)
        const notifs = userIds.map(uid => ({
          user_id: uid, title: title.trim(), message: message.trim(),
          type: "broadcast", link: link.trim() || null,
          batch_id: (batch as any)?.id || null,
        }));
        for (let i = 0; i < notifs.length; i += 50) {
          await supabase.from("notifications").insert(notifs.slice(i, i + 50) as any);
        }

        // Also send direct web push for reliability
        try {
          const result = await broadcastWebPush({
            title: title.trim(), message: message.trim(),
            link: link.trim() || undefined, userIds,
          });
          await supabase.from("notification_batches").update({
            delivered_count: Math.max(result?.sent || 0, userIds.length),
          } as any).eq("id", (batch as any)?.id);
        } catch {}

        toast({ title: `✅ Sent to ${targetUsers.length} user(s)!` });
      }

      resetForm(); fetchBatches();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSending(false);
  };

  const resetForm = () => {
    setTitle(""); setMessage(""); setLink(""); setImageUrl("");
    setSelectedUsers([]); setScheduleEnabled(false);
    setScheduleDate(""); setScheduleTime(""); setMode("all_subscribers");
  };

  const openComposer = (payload: {
    title: string;
    message: string;
    link?: string | null;
    image_url?: string | null;
    target_type?: string | null;
    target_user_ids?: string[];
    scheduled_at?: string | null;
  }) => {
    setTitle(payload.title || "");
    setMessage(payload.message || "");
    setLink(payload.link || "");
    setImageUrl(payload.image_url || "");
    setMode((payload.target_type as ComposeTargetMode) || "all_subscribers");
    setSelectedUsers(payload.target_user_ids || []);

    if (payload.scheduled_at) {
      const scheduledAt = new Date(payload.scheduled_at);
      const localDate = new Date(scheduledAt.getTime() - scheduledAt.getTimezoneOffset() * 60000);
      setScheduleEnabled(true);
      setScheduleDate(localDate.toISOString().slice(0, 10));
      setScheduleTime(localDate.toISOString().slice(11, 16));
    } else {
      setScheduleEnabled(false);
      setScheduleDate("");
      setScheduleTime("");
    }

    setActiveSubTab("compose");
  };

  const handleDeleteBatch = async (batchId: string) => {
    await supabase.from("notifications").delete().eq("batch_id", batchId);
    await supabase.from("notification_batches").delete().eq("id", batchId);
    toast({ title: "Batch deleted" }); fetchBatches();
  };

  const handleDeleteSubscriber = async (id: string) => {
    await supabase.from("push_subscriptions").delete().eq("id", id);
    toast({ title: "Subscriber removed" }); fetchSubscribers();
  };

  const handleCancelScheduled = async (id: string) => {
    await supabase.from("scheduled_push_notifications").delete().eq("id", id);
    toast({ title: "Cancelled" }); fetchScheduled();
  };

  const handleSendScheduledNow = async (s: ScheduledNotif) => {
    setSending(true);
    try {
      if (s.target_type === "all_subscribers") {
        const { data, error } = await supabase.functions.invoke("send-web-push", {
          body: {
            action: "broadcast_all",
            title: s.title, message: s.message,
            link: s.link || undefined, image_url: s.image_url || undefined,
          },
        });
        if (error) throw error;
        await supabase.from("scheduled_push_notifications").update({
          status: "sent", sent_at: new Date().toISOString(), sent_count: data?.sent || 0,
        } as any).eq("id", s.id);
        toast({ title: `✅ Sent! Delivered: ${data?.sent || 0}` });
      } else {
        const targetUsers = s.target_type === "all_users"
          ? users
          : users.filter(u => (s as any).target_user_ids?.includes(u.user_id));
        const notifs = targetUsers.map(u => ({
          user_id: u.user_id, title: s.title, message: s.message,
          type: "broadcast", link: s.link || null,
        }));
        for (let i = 0; i < notifs.length; i += 50) {
          await supabase.from("notifications").insert(notifs.slice(i, i + 50) as any);
        }
        await supabase.from("scheduled_push_notifications").update({
          status: "sent", sent_at: new Date().toISOString(), sent_count: targetUsers.length,
        } as any).eq("id", s.id);
        toast({ title: `✅ Sent to ${targetUsers.length} user(s)!` });
      }
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
    other: subscribers.filter(s => s.device_type !== "desktop" && s.device_type !== "mobile").length,
  };

  const getDeviceIcon = (type: string) => {
    if (type === "mobile") return <Smartphone className="w-3.5 h-3.5" />;
    if (type === "desktop") return <Monitor className="w-3.5 h-3.5" />;
    return <Globe className="w-3.5 h-3.5" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 shadow-sm border border-border">
          <img src="/logo.png" alt="CCC" className="w-full h-full object-cover"  loading="lazy" decoding="async" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            <Radio className="w-5 h-5 text-primary" /> Push Center
          </h2>
          <p className="text-xs text-muted-foreground font-sans">Self-hosted push notification system</p>
        </div>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={fetchAll}><RefreshCw className="w-4 h-4" /></Button>
      </div>

      {/* Analytics */}
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

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="text-[10px] gap-1"><Monitor className="w-3 h-3" /> Desktop: {deviceBreakdown.desktop}</Badge>
        <Badge variant="outline" className="text-[10px] gap-1"><Smartphone className="w-3 h-3" /> Mobile: {deviceBreakdown.mobile}</Badge>
        <Badge variant="outline" className="text-[10px] gap-1"><Globe className="w-3 h-3" /> Other: {deviceBreakdown.other}</Badge>
        {totalSent > 0 && (
          <Badge variant="outline" className="text-[10px] gap-1 bg-primary/5">
            📊 CTR: {totalClicked > 0 ? Math.round((totalClicked / totalSent) * 100) : 0}%
          </Badge>
        )}
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="compose" className="text-xs gap-1"><Send className="w-3 h-3" /> Compose</TabsTrigger>
          <TabsTrigger value="subscribers" className="text-xs gap-1"><Users className="w-3 h-3" /> Subscribers</TabsTrigger>
          <TabsTrigger value="history" className="text-xs gap-1"><BarChart3 className="w-3 h-3" /> History</TabsTrigger>
          <TabsTrigger value="scheduled" className="text-xs gap-1"><Clock className="w-3 h-3" /> Scheduled</TabsTrigger>
        </TabsList>

        {/* COMPOSE */}
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

              {/* Banner Image */}
              <div>
                <Label className="font-sans text-sm">Banner Image (optional)</Label>
                <div className="flex gap-2 mt-1">
                  <div className="relative flex-1">
                    <Image className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="Paste URL or use buttons →" className="pl-9" />
                  </div>
                  <Button variant="outline" size="sm" className="gap-1 text-xs flex-shrink-0" onClick={() => { setShowFilePicker(true); fetchPickerFiles(pickerBucket); }}>
                    <FolderOpen className="w-3.5 h-3.5" /> Files
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 text-xs flex-shrink-0" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-3.5 h-3.5" /> Upload
                  </Button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                </div>
                {imageUrl && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-border max-h-32 relative">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                    <Button variant="ghost" size="sm" className="absolute top-1 right-1 h-6 w-6 p-0 bg-background/80" onClick={() => setImageUrl("")}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Preview */}
              {(title || message) && (
                <div className="bg-muted/50 rounded-xl p-4 border border-border">
                  <p className="text-[10px] text-muted-foreground font-sans mb-2 uppercase tracking-wider">Preview</p>
                  <div className="flex items-start gap-3 bg-background rounded-lg p-3 shadow-sm border border-border">
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                      <img src="/logo.png" alt="CCC" className="w-full h-full object-cover"  loading="lazy" decoding="async" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold font-sans truncate">{title || "Title"}</p>
                      <p className="text-xs text-muted-foreground font-sans line-clamp-2">{message || "Message..."}</p>
                      {imageUrl && <div className="mt-1.5 rounded overflow-hidden h-16"><img src={imageUrl} alt="" className="w-full h-full object-cover"  loading="lazy" decoding="async" /></div>}
                      <p className="text-[9px] text-muted-foreground font-sans mt-1">Creative Caricature Club™ • now</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Target */}
              <div>
                <Label className="font-sans text-sm mb-2 block">Send To</Label>
                <Select value={mode} onValueChange={(v: any) => setMode(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_subscribers">
                      <div className="flex items-center gap-2"><Bell className="w-4 h-4" /> All Push Subscribers ({activeSubCount})</div>
                    </SelectItem>
                    <SelectItem value="all_users">
                      <div className="flex items-center gap-2"><Users className="w-4 h-4" /> All Registered Users ({users.length})</div>
                    </SelectItem>
                    <SelectItem value="selected">
                      <div className="flex items-center gap-2"><User className="w-4 h-4" /> Select Users</div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {mode === "all_subscribers" && (
                  <p className="text-[10px] text-muted-foreground mt-1 font-sans">
                    Sends to everyone who allowed notifications, including visitors who aren't registered
                  </p>
                )}
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

              {/* Schedule */}
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
                  <div><Label className="font-sans text-xs">Date</Label><Input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} /></div>
                  <div><Label className="font-sans text-xs">Time</Label><Input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} /></div>
                </div>
              )}

              <Button
                onClick={handleSend}
                disabled={sending || !title.trim() || !message.trim() || (mode === "selected" && selectedUsers.length === 0)}
                className="w-full rounded-full font-sans"
              >
                {sending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                  : scheduleEnabled ? <><Calendar className="w-4 h-4 mr-2" /> Schedule Notification</>
                  : <><Send className="w-4 h-4 mr-2" /> Send Now</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SUBSCRIBERS */}
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
                  const userName = users.find(u => u.user_id === sub.user_id)?.full_name || (sub.user_id === "anonymous" ? "Anonymous Visitor" : "Unknown");
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
                              {sub.city && <Badge variant="outline" className="text-[9px]">📍 {sub.city}</Badge>}
                              {sub.timezone && <Badge variant="outline" className="text-[9px]">🕐 {sub.timezone}</Badge>}
                            </div>
                            <p className="text-[9px] text-muted-foreground font-sans mt-1">
                              Subscribed: {new Date(sub.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
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

        {/* HISTORY */}
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
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openComposer({ title: b.title, message: b.message, link: b.link, target_type: "all_subscribers" })}>
                        <Eye className="w-3 h-3" />
                      </Button>
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
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SCHEDULED */}
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
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openComposer({ title: s.title, message: s.message, link: s.link, image_url: s.image_url, target_type: s.target_type, target_user_ids: (s as any).target_user_ids || [], scheduled_at: s.scheduled_at })}>
                        <Eye className="w-3 h-3" />
                      </Button>
                      {s.status === "pending" && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => handleSendScheduledNow(s)} disabled={sending}>
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

      {/* File Picker Dialog */}
      <Dialog open={showFilePicker} onOpenChange={setShowFilePicker}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Select Banner Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={pickerBucket} onValueChange={v => { setPickerBucket(v); fetchPickerFiles(v); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STORAGE_BUCKETS.map(b => (
                  <SelectItem key={b.name} value={b.name}>{b.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {pickerLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : pickerFiles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No images in this bucket</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {pickerFiles.map(f => (
                  <button key={f.name} onClick={() => { setImageUrl(f.url); setShowFilePicker(false); }}
                    className="border border-border rounded-lg overflow-hidden hover:ring-2 ring-primary transition-all aspect-square"
                  >
                    <img src={f.url} alt={f.name} className="w-full h-full object-cover"  loading="lazy" decoding="async" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPushCenter;
