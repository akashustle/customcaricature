import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, Save, X, FileText, Upload, UserPlus, CalendarDays, MapPin, Users, Phone, Mail, Search, Eye, Palette, IndianRupee, CheckCircle2, Clock, ChevronDown, ChevronUp, MessageCircle, Send, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EVENT_TYPES, EVENT_STATUS_LABELS } from "@/lib/event-data";
import { motion, AnimatePresence } from "framer-motion";

// Admin-side chat panel for artist
const AdminArtistChatDialog = ({ artistUserId, artistName, open, onClose }: {
  artistUserId: string; artistName: string; open: boolean; onClose: () => void;
}) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !artistUserId) return;
    fetchMessages();
    const ch = supabase.channel(`admin-artist-chat-${artistUserId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
        const row = payload.new as any;
        if (row.is_artist_chat && (row.sender_id === artistUserId || row.receiver_id === artistUserId)) fetchMessages();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [open, artistUserId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const fetchMessages = async () => {
    const { data } = await supabase.from("chat_messages")
      .select("id, message, is_admin, sender_id, created_at, read")
      .or(`sender_id.eq.${artistUserId},receiver_id.eq.${artistUserId}`)
      .eq("is_artist_chat", true).eq("deleted", false)
      .order("created_at", { ascending: true }).limit(200);
    if (data) setMessages(data as any);
    // Mark artist messages as read
    await supabase.from("chat_messages").update({ read: true } as any)
      .eq("sender_id", artistUserId).eq("is_artist_chat", true).eq("read", false);
  };

  const sendMessage = async () => {
    if (!newMsg.trim()) return;
    setSending(true);
    await supabase.from("chat_messages").insert({
      sender_id: (await supabase.auth.getUser()).data.user?.id || "",
      receiver_id: artistUserId,
      message: newMsg.trim(), is_admin: true, is_artist_chat: true,
    } as any);
    setNewMsg("");
    setSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-2 border-b border-border">
          <DialogTitle className="font-display flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" /> Chat with {artistName}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[300px]">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <MessageCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground font-sans">No messages yet</p>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.is_admin ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm font-sans ${
                msg.is_admin ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted/50 text-foreground rounded-tl-sm"
              }`}>
                {!msg.is_admin && <p className="text-[10px] font-semibold text-primary mb-0.5">{artistName}</p>}
                <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                <p className={`text-[9px] mt-0.5 ${msg.is_admin ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {new Date(msg.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="p-3 border-t border-border">
          <div className="flex gap-2">
            <Input value={newMsg} onChange={e => setNewMsg(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Type a message..." className="flex-1 h-10 rounded-full text-sm" />
            <Button onClick={sendMessage} disabled={!newMsg.trim() || sending} className="h-10 w-10 rounded-full p-0">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

type ArtistDocument = { id: string; artist_id: string; document_type: string; file_name: string; storage_path: string; created_at: string; };
type Artist = { id: string; name: string; experience: string | null; portfolio_url: string | null; email: string | null; mobile: string | null; auth_user_id: string | null; created_at: string; };
type ArtistEvent = { id: string; client_name: string; event_type: string; event_date: string; city: string; status: string; payment_status: string; total_price: number; artist_count: number; };
type ArtistLog = { id: string; artist_id: string; artist_name: string; action_type: string; description: string | null; metadata: any; created_at: string; };

const AdminArtists = () => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newArtist, setNewArtist] = useState({ name: "", experience: "", email: "", mobile: "", password: "" });
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: "", experience: "", email: "", mobile: "" });
  const [artistDocs, setArtistDocs] = useState<Record<string, ArtistDocument[]>>({});
  const [docSignedUrls, setDocSignedUrls] = useState<Record<string, string>>({});
  const [artistEvents, setArtistEvents] = useState<Record<string, ArtistEvent[]>>({});
  const [expandedArtist, setExpandedArtist] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [artistLogs, setArtistLogs] = useState<Record<string, ArtistLog[]>>({});
  const [showLogsFor, setShowLogsFor] = useState<string | null>(null);
  const [chatArtist, setChatArtist] = useState<{ userId: string; name: string } | null>(null);

  useEffect(() => {
    fetchArtists();
    fetchAllDocs();
    fetchAllArtistEvents();
    fetchAllLogs();
    const ch = supabase.channel("admin-artists-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "artists" }, () => fetchArtists())
      .on("postgres_changes", { event: "*", schema: "public", table: "artist_documents" }, () => fetchAllDocs())
      .on("postgres_changes", { event: "*", schema: "public", table: "event_artist_assignments" }, () => fetchAllArtistEvents())
      .on("postgres_changes", { event: "*", schema: "public", table: "event_bookings" }, () => fetchAllArtistEvents())
      .on("postgres_changes", { event: "*", schema: "public", table: "artist_action_logs" }, () => fetchAllLogs())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchAllLogs = async () => {
    const { data } = await supabase.from("artist_action_logs" as any).select("*").order("created_at", { ascending: false }).limit(200);
    if (data) {
      const map: Record<string, ArtistLog[]> = {};
      (data as any[]).forEach(log => {
        if (!map[log.artist_id]) map[log.artist_id] = [];
        map[log.artist_id].push(log);
      });
      setArtistLogs(map);
    }
  };

  const fetchArtists = async () => {
    const { data } = await supabase.from("artists").select("*").order("created_at", { ascending: false });
    if (data) {
      setArtists(data as any);
      const urls: Record<string, string> = {};
      for (const a of data as any[]) {
        if (a.portfolio_url) {
          let path = a.portfolio_url;
          if (path.includes("/artist-portfolios/")) path = path.split("/artist-portfolios/")[1];
          if (!path.startsWith("http")) {
            const { data: signed } = await supabase.storage.from("artist-portfolios").createSignedUrl(path, 3600);
            if (signed?.signedUrl) urls[a.id] = signed.signedUrl;
          } else urls[a.id] = path;
        }
      }
      setSignedUrls(urls);
    }
    setLoading(false);
  };

  const fetchAllDocs = async () => {
    const { data } = await supabase.from("artist_documents").select("*").order("created_at", { ascending: false });
    if (data) {
      const map: Record<string, ArtistDocument[]> = {};
      const urls: Record<string, string> = {};
      for (const doc of data as any[]) {
        if (!map[doc.artist_id]) map[doc.artist_id] = [];
        map[doc.artist_id].push(doc);
        const { data: signed } = await supabase.storage.from("event-documents").createSignedUrl(doc.storage_path, 3600);
        if (signed?.signedUrl) urls[doc.id] = signed.signedUrl;
      }
      setArtistDocs(map);
      setDocSignedUrls(urls);
    }
  };

  const fetchAllArtistEvents = async () => {
    const { data: assignments } = await supabase.from("event_artist_assignments").select("artist_id, event_id") as any;
    if (!assignments || assignments.length === 0) return;
    
    const eventIds = [...new Set(assignments.map((a: any) => a.event_id))];
    const { data: events } = await supabase.from("event_bookings")
      .select("id, client_name, event_type, event_date, city, status, payment_status, total_price, artist_count")
      .in("id", eventIds as string[]).order("event_date", { ascending: false });
    
    if (events) {
      const map: Record<string, ArtistEvent[]> = {};
      for (const a of assignments) {
        const ev = (events as any[]).find(e => e.id === a.event_id);
        if (ev) {
          if (!map[a.artist_id]) map[a.artist_id] = [];
          map[a.artist_id].push(ev);
        }
      }
      // Also check legacy assigned_artist_id
      for (const ev of events as any[]) {
        const { data: booking } = await supabase.from("event_bookings").select("assigned_artist_id").eq("id", ev.id).single();
        if (booking?.assigned_artist_id && !map[booking.assigned_artist_id]?.find(e => e.id === ev.id)) {
          if (!map[booking.assigned_artist_id]) map[booking.assigned_artist_id] = [];
          map[booking.assigned_artist_id].push(ev);
        }
      }
      setArtistEvents(map);
    }
  };

  const uploadArtistDoc = async (artistId: string, file: File, docType: string) => {
    const path = `artist-docs/${artistId}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from("event-documents").upload(path, file);
    if (upErr) { toast({ title: "Upload Error", description: upErr.message, variant: "destructive" }); return; }
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("artist_documents").insert({ artist_id: artistId, document_type: docType, file_name: file.name, storage_path: path, uploaded_by: user?.id || "" } as any);
    toast({ title: "Document Uploaded! 📄" });
    fetchAllDocs();
  };

  const deleteArtistDoc = async (docId: string, storagePath: string) => {
    await supabase.storage.from("event-documents").remove([storagePath]);
    await supabase.from("artist_documents").delete().eq("id", docId);
    toast({ title: "Document Deleted" });
    fetchAllDocs();
  };

  const addArtist = async () => {
    if (!newArtist.name) return;
    setAdding(true);
    try {
      let portfolioUrl: string | null = null;
      if (portfolioFile) {
        const path = `${crypto.randomUUID()}_${portfolioFile.name}`;
        const { error: uploadErr } = await supabase.storage.from("artist-portfolios").upload(path, portfolioFile);
        if (uploadErr) throw uploadErr;
        portfolioUrl = path;
      }
      if (newArtist.email && newArtist.password) {
        const { data, error } = await supabase.functions.invoke("admin-create-user", {
          body: { email: newArtist.email, password: newArtist.password, full_name: newArtist.name, mobile: newArtist.mobile || "0000000000", make_artist: true, artist_name: newArtist.name, experience: newArtist.experience || null },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        if (portfolioUrl && data?.user_id) await (supabase.from("artists").update({ portfolio_url: portfolioUrl } as any) as any).eq("auth_user_id", data.user_id);
      } else {
        const { error: insertError } = await (supabase.from("artists") as any).insert({ name: newArtist.name, experience: newArtist.experience || null, portfolio_url: portfolioUrl, email: newArtist.email || null, mobile: newArtist.mobile || null });
        if (insertError) throw insertError;
      }
      toast({ title: "Artist Added!" });
      setShowAdd(false);
      setNewArtist({ name: "", experience: "", email: "", mobile: "", password: "" });
      setPortfolioFile(null);
      fetchArtists();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setAdding(false); }
  };

  const saveEdit = async (id: string) => {
    await supabase.from("artists").update({ name: editData.name, experience: editData.experience || null, email: editData.email || null, mobile: editData.mobile || null } as any).eq("id", id);
    toast({ title: "Artist Updated" });
    setEditingId(null);
    fetchArtists();
  };

  const updatePortfolio = async (id: string, file: File) => {
    const path = `${crypto.randomUUID()}_${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("artist-portfolios").upload(path, file);
    if (uploadErr) { toast({ title: "Upload Error", description: uploadErr.message, variant: "destructive" }); return; }
    await supabase.from("artists").update({ portfolio_url: path } as any).eq("id", id);
    toast({ title: "Portfolio Updated" });
    fetchArtists();
  };

  const deleteArtist = async (id: string) => {
    await supabase.from("artists").delete().eq("id", id);
    toast({ title: "Artist Deleted" });
    fetchArtists();
  };

  const filtered = artists.filter(a => !searchQuery || a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.email?.toLowerCase().includes(searchQuery.toLowerCase()));

  // Stats
  const totalEvents = Object.values(artistEvents).flat().length;
  const upcomingEvents = Object.values(artistEvents).flat().filter(e => e.status === "upcoming").length;
  const totalRevenue = Object.values(artistEvents).flat().reduce((s, e) => s + e.total_price, 0);
  const activeArtists = artists.filter(a => (artistEvents[a.id]?.filter(e => e.status === "upcoming").length || 0) > 0).length;

  return (
    <div className="space-y-4">
      {/* Stats Widgets */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Artists", value: artists.length, icon: Users, color: "text-primary" },
          { label: "Active", value: activeArtists, icon: CheckCircle2, color: "text-green-600" },
          { label: "Events Assigned", value: totalEvents, icon: CalendarDays, color: "text-blue-600" },
          { label: "Revenue", value: `₹${(totalRevenue / 1000).toFixed(0)}K`, icon: IndianRupee, color: "text-amber-600" },
        ].map(s => (
          <Card key={s.label} className="overflow-hidden">
            <CardContent className="p-3 flex items-center gap-3">
              <s.icon className={`w-8 h-8 ${s.color} flex-shrink-0`} />
              <div>
                <p className="text-xl font-bold font-display">{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-sans">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="font-display text-xl font-bold">Artists ({filtered.length})</h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search artists..." className="pl-9 h-9" />
          </div>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button size="sm" className="font-sans rounded-full"><Plus className="w-4 h-4 mr-1" />Add</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Add New Artist</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name *</Label><Input value={newArtist.name} onChange={e => setNewArtist({ ...newArtist, name: e.target.value })} placeholder="Artist name" /></div>
                <div><Label>Experience</Label><Textarea value={newArtist.experience} onChange={e => setNewArtist({ ...newArtist, experience: e.target.value })} placeholder="e.g. 5 years..." /></div>
                <div className="border-t border-border pt-3">
                  <p className="text-xs font-sans text-muted-foreground mb-2 flex items-center gap-1"><UserPlus className="w-3 h-3" /> Login Credentials</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Email</Label><Input type="email" value={newArtist.email} onChange={e => setNewArtist({ ...newArtist, email: e.target.value })} placeholder="artist@email.com" /></div>
                    <div><Label>Mobile</Label><Input value={newArtist.mobile} onChange={e => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 10) setNewArtist({ ...newArtist, mobile: d }); }} placeholder="9876543210" maxLength={10} /></div>
                  </div>
                  <div className="mt-2"><Label>Password</Label><Input type="password" value={newArtist.password} onChange={e => setNewArtist({ ...newArtist, password: e.target.value })} placeholder="Min 6 chars" /></div>
                </div>
                <div>
                  <Label className="flex items-center gap-1"><FileText className="w-4 h-4" />Portfolio (PDF)</Label>
                  <Input type="file" accept=".pdf" onChange={e => setPortfolioFile(e.target.files?.[0] || null)} />
                </div>
                <Button onClick={addArtist} disabled={!newArtist.name || adding} className="w-full font-sans">
                  {adding ? "Adding..." : newArtist.email ? "Create Artist with Login" : "Add Artist"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Artists List */}
      {loading ? <p className="text-center text-muted-foreground py-10 font-sans">Loading...</p> : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center"><p className="text-muted-foreground font-sans">No artists found</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(artist => {
            const events = artistEvents[artist.id] || [];
            const upcomingCount = events.filter(e => e.status === "upcoming").length;
            const completedCount = events.filter(e => e.status === "completed").length;
            const artistRevenue = events.reduce((s, e) => s + e.total_price, 0);
            const isExpanded = expandedArtist === artist.id;

            return (
              <Card key={artist.id} className="overflow-hidden">
                <CardContent className="p-4">
                  {editingId === artist.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label className="text-xs">Name</Label><Input value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} /></div>
                        <div><Label className="text-xs">Mobile</Label><Input value={editData.mobile} onChange={e => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 10) setEditData({ ...editData, mobile: d }); }} maxLength={10} /></div>
                      </div>
                      <div><Label className="text-xs">Email</Label><Input type="email" value={editData.email} onChange={e => setEditData({ ...editData, email: e.target.value })} /></div>
                      <div><Label className="text-xs">Experience</Label><Textarea value={editData.experience} onChange={e => setEditData({ ...editData, experience: e.target.value })} /></div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveEdit(artist.id)} className="font-sans"><Save className="w-4 h-4 mr-1" />Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-start">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                              {artist.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-sans font-semibold">{artist.name}</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                {artist.auth_user_id && <Badge className="text-[10px] bg-green-100 text-green-700 border-none">Has Login</Badge>}
                                {upcomingCount > 0 && <Badge className="text-[10px] bg-blue-100 text-blue-700 border-none">{upcomingCount} Upcoming</Badge>}
                                {completedCount > 0 && <Badge className="text-[10px] bg-primary/10 text-primary border-none">{completedCount} Done</Badge>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground font-sans flex-wrap">
                            {artist.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{artist.email}</span>}
                            {artist.mobile && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{artist.mobile}</span>}
                          </div>
                          {artist.experience && <p className="text-xs text-muted-foreground font-sans mt-1">{artist.experience}</p>}

                          {/* Quick stats */}
                          <div className="flex gap-3 mt-2 text-xs font-sans">
                            <span className="bg-muted/50 rounded-full px-2 py-0.5">📅 {events.length} events</span>
                            {artistRevenue > 0 && <span className="bg-muted/50 rounded-full px-2 py-0.5">💰 ₹{(artistRevenue / 1000).toFixed(0)}K</span>}
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <label className="cursor-pointer" title="Upload Portfolio">
                            <input type="file" accept=".pdf" className="hidden" onChange={e => { if (e.target.files?.[0]) updatePortfolio(artist.id, e.target.files[0]); }} />
                            <Button variant="ghost" size="sm" asChild><span><Upload className="w-4 h-4" /></span></Button>
                          </label>
                          <label className="cursor-pointer" title="Upload Document">
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={e => {
                              if (e.target.files?.[0]) {
                                const docType = prompt("Document type? (passport / id / travel_doc)", "passport");
                                if (docType) uploadArtistDoc(artist.id, e.target.files[0], docType);
                              }
                            }} />
                            <Button variant="ghost" size="sm" asChild><span><FileText className="w-4 h-4 text-primary" /></span></Button>
                          </label>
                          <Button variant="ghost" size="sm" onClick={() => { setEditingId(artist.id); setEditData({ name: artist.name, experience: artist.experience || "", email: artist.email || "", mobile: artist.mobile || "" }); }}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Delete Artist?</AlertDialogTitle><AlertDialogDescription>This will permanently delete {artist.name}.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteArtist(artist.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          {artist.auth_user_id && (
                            <Button variant="ghost" size="sm" onClick={() => setChatArtist({ userId: artist.auth_user_id!, name: artist.name })}>
                              <MessageCircle className="w-4 h-4 text-primary" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Portfolio & Docs */}
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {(artist.portfolio_url || signedUrls[artist.id]) && (
                          <a href={signedUrls[artist.id] || "#"} target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-sans underline flex items-center gap-1">
                            <FileText className="w-3 h-3" />Portfolio
                          </a>
                        )}
                        {artistDocs[artist.id]?.map(doc => (
                          <div key={doc.id} className="flex items-center gap-1 text-xs">
                            <a href={docSignedUrls[doc.id] || "#"} target="_blank" rel="noopener noreferrer" className="text-primary underline font-sans">{doc.document_type}</a>
                            <Button variant="ghost" size="sm" className="h-4 w-4 p-0 text-destructive" onClick={() => deleteArtistDoc(doc.id, doc.storage_path)}><Trash2 className="w-2.5 h-2.5" /></Button>
                          </div>
                        ))}
                      </div>

                      {/* Expand for events */}
                      {events.length > 0 && (
                        <>
                          <button onClick={() => setExpandedArtist(isExpanded ? null : artist.id)}
                            className="w-full mt-2 flex items-center justify-center gap-1 text-xs text-primary font-sans py-1 hover:bg-primary/5 rounded-lg transition-colors">
                            {isExpanded ? <><ChevronUp className="w-3 h-3" /> Hide Events</> : <><ChevronDown className="w-3 h-3" /> View {events.length} Events</>}
                          </button>
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="space-y-2 mt-2">
                                  {events.map(ev => (
                                    <div key={ev.id} className="bg-muted/30 rounded-lg p-3 text-xs font-sans flex justify-between items-center">
                                      <div>
                                        <p className="font-semibold">{ev.client_name}</p>
                                        <p className="text-muted-foreground">{new Date(ev.event_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} · {ev.city}</p>
                                        <Badge className="text-[9px] mt-0.5 border-none bg-primary/10 text-primary">{EVENT_TYPES.find(t => t.value === ev.event_type)?.label || ev.event_type}</Badge>
                                      </div>
                                      <div className="text-right">
                                        <Badge className={`text-[9px] border-none ${ev.status === "upcoming" ? "bg-blue-100 text-blue-800" : ev.status === "completed" ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}`}>
                                          {EVENT_STATUS_LABELS[ev.status] || ev.status}
                                        </Badge>
                                        <p className="font-semibold mt-0.5">₹{ev.total_price.toLocaleString("en-IN")}</p>
                                        <Badge className={`text-[9px] border-none mt-0.5 ${ev.payment_status === "fully_paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                                          {ev.payment_status === "fully_paid" ? "✅ Paid" : ev.payment_status}
                                        </Badge>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </>
                      )}

                      <p className="text-[10px] text-muted-foreground font-sans mt-2">Added: {new Date(artist.created_at).toLocaleDateString("en-IN")}</p>

                      {/* Action Logs */}
                      {artistLogs[artist.id] && artistLogs[artist.id].length > 0 && (
                        <>
                          <button onClick={() => setShowLogsFor(showLogsFor === artist.id ? null : artist.id)}
                            className="w-full mt-1 flex items-center justify-center gap-1 text-[10px] text-muted-foreground font-sans py-1 hover:bg-muted/30 rounded-lg transition-colors">
                            {showLogsFor === artist.id ? "▲ Hide" : "▼ View"} {artistLogs[artist.id].length} Actions
                          </button>
                          <AnimatePresence>
                            {showLogsFor === artist.id && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="space-y-1 mt-1 max-h-48 overflow-y-auto">
                                  {artistLogs[artist.id].map(log => (
                                    <div key={log.id} className="bg-muted/20 rounded px-2 py-1 text-[10px] font-sans flex justify-between">
                                      <span>
                                        <Badge className="text-[8px] mr-1 border-none bg-primary/10 text-primary">{log.action_type}</Badge>
                                        {log.description}
                                      </span>
                                      <span className="text-muted-foreground flex-shrink-0 ml-2">{new Date(log.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminArtists;
