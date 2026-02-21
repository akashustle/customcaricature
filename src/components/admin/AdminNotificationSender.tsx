import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Send, Users, User, Loader2, Bell, Search, X } from "lucide-react";

type Profile = {
  user_id: string;
  full_name: string;
  email: string;
};

const AdminNotificationSender = () => {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [mode, setMode] = useState<"all" | "selected">("all");
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [sentHistory, setSentHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name, email").order("full_name");
      if (data) setUsers(data as any);
    };
    fetchUsers();
  }, []);

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
      const notifications = targetUsers.map(u => ({
        user_id: u.user_id,
        title: title.trim(),
        message: message.trim(),
        type: "broadcast",
        link: link.trim() || null,
      }));

      // Insert in batches of 50
      for (let i = 0; i < notifications.length; i += 50) {
        const batch = notifications.slice(i, i + 50);
        const { error } = await supabase.from("notifications").insert(batch as any);
        if (error) throw error;
      }

      toast({ title: `✅ Sent to ${targetUsers.length} user(s)!` });
      setSentHistory(prev => [{ title, message, count: targetUsers.length, time: new Date().toISOString() }, ...prev]);
      setTitle("");
      setMessage("");
      setLink("");
      setSelectedUsers([]);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSending(false);
  };

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold flex items-center gap-2">
        <Bell className="w-5 h-5 text-primary" /> Send Notifications
      </h2>

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
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
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
                    <Checkbox
                      checked={selectedUsers.includes(u.user_id)}
                      onCheckedChange={() => toggleUser(u.user_id)}
                    />
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

      {sentHistory.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Recent Sent</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {sentHistory.map((s, i) => (
              <div key={i} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2 text-sm font-sans">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{s.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Sent to {s.count} user(s) · {new Date(s.time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px]">✅ Sent</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminNotificationSender;
