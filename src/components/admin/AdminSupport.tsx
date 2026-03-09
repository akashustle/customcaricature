import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Search, Eye, ChevronUp, Trash2, Save, X, Mail, Phone, MessageCircle, Send } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import ExportButton from "./ExportButton";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "new", label: "New", color: "bg-blue-100 text-blue-800" },
  { value: "read", label: "Read", color: "bg-yellow-100 text-yellow-800" },
  { value: "replied", label: "Replied", color: "bg-green-100 text-green-800" },
  { value: "resolved", label: "Resolved", color: "bg-emerald-100 text-emerald-800" },
  { value: "spam", label: "Spam", color: "bg-red-100 text-red-800" },
];

const AdminSupport = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();
    const ch = supabase.channel("admin-support")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages" }, (payload) => {
        setMessages(prev => [payload.new as any, ...prev]);
        toast({ title: "📩 New Support Message!", description: (payload.new as any).name });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "support_messages" }, (payload) => {
        setMessages(prev => prev.map(m => m.id === (payload.new as any).id ? { ...m, ...(payload.new as any) } : m));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "support_messages" }, (payload) => {
        setMessages(prev => prev.filter(m => m.id !== (payload.old as any).id));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchMessages = async () => {
    const { data } = await supabase.from("support_messages" as any).select("*").order("created_at", { ascending: false });
    if (data) setMessages(data as any[]);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("support_messages" as any).update({ status, updated_at: new Date().toISOString() } as any).eq("id", id);
    toast({ title: `Status updated to ${status}` });
  };

  const sendReply = async (id: string) => {
    if (!replyText.trim()) return;
    await supabase.from("support_messages" as any).update({
      admin_reply: replyText.trim(),
      replied_at: new Date().toISOString(),
      status: "replied",
      updated_at: new Date().toISOString(),
    } as any).eq("id", id);
    toast({ title: "Reply saved" });
    setReplyingId(null);
    setReplyText("");
  };

  const deleteMessage = async (id: string) => {
    await supabase.from("support_messages" as any).delete().eq("id", id);
    toast({ title: "Message deleted" });
  };

  const filtered = messages.filter((m: any) => {
    const matchSearch = !search || m.name?.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase()) || m.mobile?.includes(search);
    const matchStatus = statusFilter === "all" || m.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusColor = (status: string) => STATUS_OPTIONS.find(s => s.value === status)?.color || "bg-muted text-foreground";

  const stats = {
    total: messages.length,
    new: messages.filter(m => m.status === "new").length,
    replied: messages.filter(m => m.status === "replied").length,
    resolved: messages.filter(m => m.status === "resolved").length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "New", value: stats.new, color: "text-blue-600" },
          { label: "Replied", value: stats.replied, color: "text-green-600" },
          { label: "Resolved", value: stats.resolved, color: "text-emerald-600" },
        ].map(s => (
          <Card key={s.label} className="stat-widget-3d">
            <CardContent className="p-4 text-center">
              <p className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground font-sans">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search name, email, mobile..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 font-sans" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <ExportButton
          data={filtered.map((m: any) => ({
            "Name": m.name, "Email": m.email, "Mobile": m.mobile || "", "Subject": m.subject || "",
            "Message": m.message, "Status": m.status, "Reply": m.admin_reply || "",
            "Created": new Date(m.created_at).toLocaleString("en-IN"),
          }))}
          sheetName="Support" fileName="CCC_Support_Messages"
        />
      </div>

      <p className="text-sm text-muted-foreground font-sans">{filtered.length} message{filtered.length !== 1 ? "s" : ""}</p>

      {loading ? (
        <p className="text-center text-muted-foreground py-8 font-sans">Loading...</p>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center"><p className="text-muted-foreground font-sans">No messages found</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((m: any) => (
            <Card key={m.id} className="border-border">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-sans font-semibold text-sm">{m.name}</p>
                      <Badge className={cn("text-[10px] border-none", statusColor(m.status))}>{m.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-sans">
                      {m.email} {m.mobile && `· 📱 ${m.mobile}`}
                    </p>
                    {m.subject && <p className="text-xs font-sans font-medium">📌 {m.subject}</p>}
                    <p className="text-xs text-muted-foreground font-sans line-clamp-2">{m.message}</p>
                    <p className="text-[10px] text-muted-foreground font-sans">{new Date(m.created_at).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}>
                      {expandedId === m.id ? <ChevronUp className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {expandedId === m.id && (
                  <div className="mt-4 pt-4 border-t border-border space-y-3 animate-in fade-in duration-200">
                    <div className="p-3 rounded-xl bg-muted/50">
                      <p className="text-sm font-sans whitespace-pre-wrap">{m.message}</p>
                    </div>

                    <div className="flex gap-2">
                      <a href={`mailto:${m.email}`} className="text-xs text-primary font-sans flex items-center gap-1 hover:underline">
                        <Mail className="w-3 h-3" /> Email
                      </a>
                      {m.mobile && (
                        <a href={`https://wa.me/91${m.mobile}`} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 font-sans flex items-center gap-1 hover:underline">
                          <MessageCircle className="w-3 h-3" /> WhatsApp
                        </a>
                      )}
                      {m.mobile && (
                        <a href={`tel:+91${m.mobile}`} className="text-xs text-blue-600 font-sans flex items-center gap-1 hover:underline">
                          <Phone className="w-3 h-3" /> Call
                        </a>
                      )}
                    </div>

                    {m.admin_reply && (
                      <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                        <p className="text-xs text-muted-foreground font-sans mb-1">Admin Reply:</p>
                        <p className="text-sm font-sans">{m.admin_reply}</p>
                        {m.replied_at && <p className="text-[10px] text-muted-foreground font-sans mt-1">{new Date(m.replied_at).toLocaleString("en-IN")}</p>}
                      </div>
                    )}

                    <Select value={m.status} onValueChange={(v) => updateStatus(m.id, v)}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>

                    {replyingId === m.id ? (
                      <div className="space-y-2">
                        <Textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Type your reply..." rows={3} />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => sendReply(m.id)}><Send className="w-3 h-3 mr-1" />Send Reply</Button>
                          <Button size="sm" variant="ghost" onClick={() => setReplyingId(null)}><X className="w-3 h-3" /></Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => { setReplyingId(m.id); setReplyText(m.admin_reply || ""); }}>
                        <Send className="w-3 h-3 mr-1" /> Reply
                      </Button>
                    )}

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" className="font-sans"><Trash2 className="w-3 h-3 mr-1" />Delete</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Delete this message?</AlertDialogTitle></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMessage(m.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminSupport;
