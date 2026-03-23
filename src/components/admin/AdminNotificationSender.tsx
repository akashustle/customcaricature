import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { sendPushPilotNotification } from "@/lib/pushpilot";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Send, Users, User, Loader2, Bell, Search, X, Trash2, Edit2, BarChart3, RefreshCw, Eye } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Profile = {
  user_id: string;
  full_name: string;
  email: string;
};

type NotificationBatch = {
  id: string;
  title: string;
  message: string;
  link: string | null;
  sent_to_count: number;
  delivered_count: number;
  clicked_count: number;
  created_at: string;
};

type SentNotification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  clicked: boolean;
  link: string | null;
  batch_id: string | null;
  created_at: string;
};

const AdminNotificationSender = () => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [mode, setMode] = useState<"all" | "selected">("all");
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [batches, setBatches] = useState<NotificationBatch[]>([]);
  const [sentNotifications, setSentNotifications] = useState<SentNotification[]>([]);
  const [editingNotifId, setEditingNotifId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [viewBatchId, setViewBatchId] = useState<string | null>(null);
  
  // Permission tracking
  const [permissionStats, setPermissionStats] = useState<{ allowed: number; denied: number; profiles: { name: string; email: string; allowed: boolean }[] }>({ allowed: 0, denied: 0, profiles: [] });

  useEffect(() => {
    fetchUsers();
    fetchBatches();
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase.from("profiles").select("user_id, full_name, email").order("full_name");
    if (data) setUsers(data as any);
  };

  const fetchBatches = async () => {
    const { data } = await supabase.from("notification_batches").select("*").order("created_at", { ascending: false }).limit(50);
    if (data) setBatches(data as any);
  };

  const fetchBatchNotifications = async (batchId: string) => {
    const { data } = await supabase.from("notifications").select("id, user_id, title, message, type, read, clicked, link, batch_id, created_at").eq("batch_id", batchId).order("created_at", { ascending: false });
    if (data) setSentNotifications(data as any);
    setViewBatchId(batchId);
    
    // Update batch analytics
    if (data) {
      const readCount = data.filter((n: any) => n.read).length;
      const clickedCount = data.filter((n: any) => n.clicked).length;
      await supabase.from("notification_batches").update({ 
        delivered_count: readCount, 
        clicked_count: clickedCount 
      } as any).eq("id", batchId);
      fetchBatches();
    }
  };

  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
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

    setSending(true);
    try {
      // Create batch record
      const { data: batch, error: batchErr } = await supabase.from("notification_batches").insert({
        title: title.trim(),
        message: message.trim(),
        link: link.trim() || null,
        sent_by: user?.id,
        sent_to_count: targetUsers.length,
      } as any).select("id").single();

      if (batchErr || !batch) throw new Error(batchErr?.message || "Failed to create batch");

      const notifications = targetUsers.map(u => ({
        user_id: u.user_id,
        title: title.trim(),
        message: message.trim(),
        type: "broadcast",
        link: link.trim() || null,
        batch_id: (batch as any).id,
      }));

      for (let i = 0; i < notifications.length; i += 50) {
        const chunk = notifications.slice(i, i + 50);
        const { error } = await supabase.from("notifications").insert(chunk as any);
        if (error) throw error;
      }

      // Also send via OneSignal for push reach
      try {
        const userIds = mode === "all" ? undefined : targetUsers.map(u => u.user_id);
        await supabase.functions.invoke("send-onesignal", {
          body: {
            title: title.trim(),
            message: message.trim(),
            url: link.trim() || null,
            user_ids: userIds,
            admin_user_id: user?.id,
          },
        });
      } catch (osErr) {
        console.warn("OneSignal push failed (non-fatal):", osErr);
      }

      toast({ title: `✅ Sent to ${targetUsers.length} user(s)!` });
      setTitle("");
      setMessage("");
      setLink("");
      setSelectedUsers([]);
      fetchBatches();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSending(false);
  };

  const handleResend = async (batch: NotificationBatch) => {
    const targetUsers = mode === "all" ? users : users.filter(u => selectedUsers.includes(u.user_id));
    if (targetUsers.length === 0) {
      // Resend to all users
      setSending(true);
      try {
        const notifications = users.map(u => ({
          user_id: u.user_id,
          title: batch.title,
          message: batch.message,
          type: "broadcast",
          link: batch.link || null,
          batch_id: batch.id,
        }));

        for (let i = 0; i < notifications.length; i += 50) {
          const b = notifications.slice(i, i + 50);
          const { error } = await supabase.from("notifications").insert(b as any);
          if (error) throw error;
        }

        await supabase.from("notification_batches").update({ sent_to_count: batch.sent_to_count + users.length } as any).eq("id", batch.id);
        toast({ title: `✅ Resent to ${users.length} user(s)!` });
        fetchBatches();
      } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
      setSending(false);
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    await supabase.from("notifications").delete().eq("batch_id", batchId);
    await supabase.from("notification_batches").delete().eq("id", batchId);
    toast({ title: "Batch deleted" });
    fetchBatches();
    if (viewBatchId === batchId) setViewBatchId(null);
  };

  const handleDeleteNotification = async (notifId: string) => {
    await supabase.from("notifications").delete().eq("id", notifId);
    toast({ title: "Notification deleted" });
    if (viewBatchId) fetchBatchNotifications(viewBatchId);
  };

  const handleEditNotification = async (notifId: string) => {
    if (!editTitle.trim() || !editMessage.trim()) return;
    await supabase.from("notifications").update({ title: editTitle.trim(), message: editMessage.trim() } as any).eq("id", notifId);
    toast({ title: "Notification updated" });
    setEditingNotifId(null);
    if (viewBatchId) fetchBatchNotifications(viewBatchId);
  };

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold flex items-center gap-2">
        <Bell className="w-5 h-5 text-primary" /> Send Notifications
      </h2>

      {/* Compose */}
      <Card>
        <CardHeader><CardTitle className="font-display text-lg">Compose Notification</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="font-sans">Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. New Year Offer! 🎉" />
          </div>
          <div>
            <Label className="font-sans">Message *</Label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Your notification message..." rows={3} />
          </div>
          <div>
            <Label className="font-sans">Link (optional)</Label>
            <Input value={link} onChange={e => setLink(e.target.value)} placeholder="/order or /dashboard or full URL" />
          </div>

          <div>
            <Label className="font-sans mb-2 block">Send To</Label>
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
              <p className="text-xs text-muted-foreground font-sans">{selectedUsers.length} user(s) selected</p>
            </div>
          )}

          <Button
            onClick={handleSend}
            disabled={sending || !title.trim() || !message.trim() || (mode === "selected" && selectedUsers.length === 0)}
            className="w-full rounded-full font-sans bg-primary hover:bg-primary/90"
          >
            {sending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</> : <><Send className="w-4 h-4 mr-2" /> Send Notification</>}
          </Button>
        </CardContent>
      </Card>

      {/* Broadcast History with Analytics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-display text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" /> Broadcast History & Analytics</CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchBatches}><RefreshCw className="w-4 h-4" /></Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {batches.length === 0 ? (
            <p className="text-sm text-muted-foreground font-sans text-center py-4">No broadcasts sent yet</p>
          ) : batches.map(b => (
            <div key={b.id} className="bg-muted/30 rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-sans font-semibold text-sm truncate">{b.title}</p>
                  <p className="text-[11px] text-muted-foreground font-sans truncate">{b.message}</p>
                  <p className="text-[10px] text-muted-foreground font-sans mt-1">
                    {new Date(b.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0 ml-2">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => fetchBatchNotifications(b.id)}>
                    <Eye className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleResend(b)}>
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive"><Trash2 className="w-3 h-3" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Delete Broadcast?</AlertDialogTitle><AlertDialogDescription>This will delete all notifications in this batch.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteBatch(b.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              {/* Analytics badges */}
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-[10px]">📤 Sent: {b.sent_to_count}</Badge>
                <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700">👀 Opened: {b.delivered_count}</Badge>
                <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700">🖱️ Clicked: {b.clicked_count}</Badge>
                {b.sent_to_count > 0 && (
                  <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700">
                    📊 Open Rate: {Math.round((b.delivered_count / b.sent_to_count) * 100)}%
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Individual Notifications in Batch */}
      {viewBatchId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-lg">Notifications in Batch</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setViewBatchId(null)}><X className="w-4 h-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {sentNotifications.map(n => {
              const u = users.find(u => u.user_id === n.user_id);
              const isEditing = editingNotifId === n.id;
              return (
                <div key={n.id} className="bg-muted/20 rounded-lg p-2.5 space-y-1">
                  {isEditing ? (
                    <div className="space-y-2">
                      <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Title" className="h-8 text-xs" />
                      <Input value={editMessage} onChange={e => setEditMessage(e.target.value)} placeholder="Message" className="h-8 text-xs" />
                      <div className="flex gap-1">
                        <Button size="sm" className="h-7 text-xs" onClick={() => handleEditNotification(n.id)}>Save</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingNotifId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-sans font-medium">{u?.full_name || "Unknown"} <span className="text-muted-foreground">({u?.email || n.user_id.slice(0, 8)})</span></p>
                          <p className="text-[11px] font-sans">{n.title}: {n.message}</p>
                        </div>
                        <div className="flex gap-0.5 flex-shrink-0 ml-2">
                          <Badge variant="outline" className={`text-[9px] ${n.read ? "bg-green-50 text-green-700" : "bg-muted"}`}>
                            {n.read ? "✅ Read" : "⏳ Unread"}
                          </Badge>
                          {n.clicked && <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-700">🖱️ Clicked</Badge>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => { setEditingNotifId(n.id); setEditTitle(n.title); setEditMessage(n.message); }}>
                          <Edit2 className="w-3 h-3 mr-1" />Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-destructive" onClick={() => handleDeleteNotification(n.id)}>
                          <Trash2 className="w-3 h-3 mr-1" />Delete
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminNotificationSender;
