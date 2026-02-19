import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, CalendarDays, MapPin, Users, Home, FileText, RefreshCw, Loader2, CalendarOff, Trash2, Package, Palette, MessageCircle, Send, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import LiveGreeting from "@/components/LiveGreeting";
import { EVENT_TYPES, EVENT_STATUS_LABELS, EVENT_STATUS_COLORS } from "@/lib/event-data";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ArtistEvent = {
  id: string; client_name: string; event_type: string; event_date: string;
  event_start_time: string; event_end_time: string; venue_name: string;
  full_address: string; city: string; state: string; pincode: string;
  artist_count: number; status: string; notes: string | null;
  payment_status: string;
};

type ArtistOrder = {
  id: string; order_type: string; style: string; face_count: number;
  status: string; customer_name: string; created_at: string;
  expected_delivery_date: string | null;
};

type BlockedDate = {
  id: string; blocked_date: string; blocked_start_time: string | null;
  blocked_end_time: string | null; reason: string | null; artist_id: string;
};

const STATUS_LABELS: Record<string, string> = {
  new: "New", in_progress: "In Progress", artwork_ready: "Art Ready",
  dispatched: "Dispatched", delivered: "Delivered", completed: "Completed",
};

type ChatMessage = {
  id: string; sender_id: string; receiver_id: string | null;
  message: string; is_admin: boolean; read: boolean; created_at: string;
};

const ArtistDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [artist, setArtist] = useState<{ id: string; name: string; portfolio_url: string | null } | null>(null);
  const [events, setEvents] = useState<ArtistEvent[]>([]);
  const [orders, setOrders] = useState<ArtistOrder[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRitesh, setIsRitesh] = useState(false);
  const [activeTab, setActiveTab] = useState("events");
  const [orderFilter, setOrderFilter] = useState("all");

  // Block date form
  const [blockDate, setBlockDate] = useState("");
  const [blockStartTime, setBlockStartTime] = useState("");
  const [blockEndTime, setBlockEndTime] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [addingBlock, setAddingBlock] = useState(false);

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatMsg, setChatMsg] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) { navigate("/artistlogin"); return; }
    if (user) fetchArtistProfile(user.id);
  }, [user, authLoading]);

  const fetchArtistProfile = async (userId: string) => {
    const { data: artistData } = await (supabase
      .from("artists").select("id, name, portfolio_url") as any)
      .eq("auth_user_id", userId).maybeSingle();
    if (!artistData) { navigate("/dashboard"); return; }
    setArtist(artistData as any);
    const isR = (artistData as any).name?.toLowerCase().includes("ritesh");
    setIsRitesh(isR);
    fetchEvents((artistData as any).id);
    fetchBlockedDates((artistData as any).id);
    if (isR) fetchOrders((artistData as any).id);

    const ch = supabase.channel("artist-dashboard-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "event_artist_assignments" }, () => fetchEvents((artistData as any).id))
      .on("postgres_changes", { event: "*", schema: "public", table: "event_bookings" }, () => fetchEvents((artistData as any).id))
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => { if (isR) fetchOrders((artistData as any).id); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  };

  const fetchEvents = async (artistId: string) => {
    // Fetch from event_artist_assignments table
    const { data: assignments } = await supabase
      .from("event_artist_assignments")
      .select("event_id")
      .eq("artist_id", artistId) as any;
    
    // Also check legacy assigned_artist_id
    const { data: legacyEvents } = await supabase
      .from("event_bookings")
      .select("id")
      .eq("assigned_artist_id", artistId);

    const eventIds = new Set<string>();
    if (assignments) assignments.forEach((a: any) => eventIds.add(a.event_id));
    if (legacyEvents) legacyEvents.forEach((e: any) => eventIds.add(e.id));

    if (eventIds.size === 0) { setEvents([]); setLoading(false); return; }

    const { data } = await supabase
      .from("event_bookings")
      .select("id, client_name, event_type, event_date, event_start_time, event_end_time, venue_name, full_address, city, state, pincode, artist_count, status, notes, payment_status")
      .in("id", Array.from(eventIds))
      .order("event_date", { ascending: true });
    if (data) setEvents(data as any);
    setLoading(false);
  };

  const fetchOrders = async (artistId: string) => {
    const { data } = await supabase
      .from("orders")
      .select("id, order_type, style, face_count, status, customer_name, created_at, expected_delivery_date")
      .eq("assigned_artist_id", artistId)
      .order("created_at", { ascending: false });
    if (data) setOrders(data as any);
  };

  const fetchBlockedDates = async (artistId: string) => {
    const { data } = await (supabase.from("artist_blocked_dates")
      .select("id, blocked_date, blocked_start_time, blocked_end_time, reason, artist_id") as any)
      .eq("artist_id", artistId)
      .order("blocked_date", { ascending: true });
    if (data) setBlockedDates(data as any);
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status: status as any }).eq("id", orderId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Status Updated!" }); if (artist) fetchOrders(artist.id); }
  };

  const handleAddBlockedDate = async () => {
    if (!artist || !blockDate) { toast({ title: "Please select a date", variant: "destructive" }); return; }
    setAddingBlock(true);
    const { error } = await (supabase.from("artist_blocked_dates").insert({
      artist_id: artist.id, blocked_date: blockDate,
      blocked_start_time: blockStartTime || null, blocked_end_time: blockEndTime || null,
      reason: blockReason || null,
    }) as any);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Date Blocked! 📅" });
      setBlockDate(""); setBlockStartTime(""); setBlockEndTime(""); setBlockReason("");
      fetchBlockedDates(artist.id);
    }
    setAddingBlock(false);
  };

  const handleDeleteBlock = async (id: string) => {
    const { error } = await (supabase.from("artist_blocked_dates").delete() as any).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Unblocked!" }); if (artist) fetchBlockedDates(artist.id); }
  };

  const handleLogout = async () => { await signOut(); navigate("/artistlogin"); };
  const handleRefresh = async () => {
    if (!artist) return;
    toast({ title: "Refreshing..." });
    await Promise.all([fetchEvents(artist.id), fetchBlockedDates(artist.id), ...(isRitesh ? [fetchOrders(artist.id)] : [])]);
    toast({ title: "Refreshed!" });
  };

  // Chat functions
  const fetchChatMessages = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq("is_artist_chat", true)
      .order("created_at", { ascending: true })
      .limit(100);
    if (data) {
      setChatMessages(data as any);
      const unreadCount = (data as any[]).filter((m: any) => m.receiver_id === user.id && !m.read).length;
      setChatUnread(unreadCount);
    }
  };

  const sendChatMessage = async () => {
    if (!chatMsg.trim() || !user) return;
    setChatSending(true);
    await supabase.from("chat_messages").insert({
      sender_id: user.id,
      receiver_id: null,
      message: chatMsg.trim(),
      is_admin: false,
      is_artist_chat: true,
    } as any);
    setChatMsg("");
    setChatSending(false);
  };

  useEffect(() => {
    if (!user) return;
    fetchChatMessages();
    const ch = supabase
      .channel(`artist-chat-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => fetchChatMessages())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  useEffect(() => {
    if (chatOpen && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      // Mark messages as read
      const unreadIds = chatMessages.filter(m => m.receiver_id === user?.id && !m.read).map(m => m.id);
      if (unreadIds.length > 0) {
        supabase.from("chat_messages").update({ read: true } as any).in("id", unreadIds).then(() => fetchChatMessages());
      }
    }
  }, [chatOpen, chatMessages]);

  const filteredOrders = orders.filter(o => {
    if (orderFilter === "all") return true;
    if (orderFilter === "upcoming") return ["new", "in_progress"].includes(o.status);
    if (orderFilter === "completed") return ["delivered", "completed", "artwork_ready", "dispatched"].includes(o.status);
    return true;
  });

  if (loading || authLoading) return <div className="min-h-screen flex items-center justify-center font-sans text-muted-foreground">Loading...</div>;

  const upcoming = events.filter(e => e.status === "upcoming");
  const completed = events.filter(e => e.status === "completed");

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <img src="/logo.png" alt="CCC" className="w-8 h-8 rounded-full" />
            <h1 className="font-display text-lg font-bold">Artist Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleRefresh} className="font-sans"><RefreshCw className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="font-sans hidden md:flex"><Home className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="font-sans hidden md:flex"><LogOut className="w-4 h-4 mr-1" /> Logout</Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <LiveGreeting name={artist?.name} />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="card-3d"><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold font-display text-primary">{events.length}</p>
            <p className="text-[10px] text-muted-foreground font-sans">Total Events</p>
          </CardContent></Card>
          <Card className="card-3d"><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold font-display text-primary">{upcoming.length}</p>
            <p className="text-[10px] text-muted-foreground font-sans">Upcoming</p>
          </CardContent></Card>
          <Card className="card-3d"><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold font-display text-primary">{completed.length}</p>
            <p className="text-[10px] text-muted-foreground font-sans">Completed</p>
          </CardContent></Card>
        </div>

        {artist?.portfolio_url && (
          <a href={artist.portfolio_url} target="_blank" rel="noopener noreferrer">
            <Card className="mb-6 card-3d border-primary/20 bg-primary/5">
              <CardContent className="p-4 flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-sans font-medium text-sm">Your Portfolio</p>
                  <p className="text-xs text-muted-foreground font-sans">View or share your portfolio</p>
                </div>
              </CardContent>
            </Card>
          </a>
        )}

        {/* Tabs - Desktop only, mobile uses bottom nav */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full mb-4 hidden md:flex">
            <TabsTrigger value="events" className="flex-1 font-sans"><CalendarDays className="w-4 h-4 mr-1" />Events</TabsTrigger>
            {isRitesh && <TabsTrigger value="orders" className="flex-1 font-sans"><Package className="w-4 h-4 mr-1" />Custom Orders</TabsTrigger>}
            <TabsTrigger value="chat" className="flex-1 font-sans"><MessageCircle className="w-4 h-4 mr-1" />Chat {chatUnread > 0 && <Badge className="ml-1 bg-destructive text-destructive-foreground text-[9px] h-4 min-w-4">{chatUnread}</Badge>}</TabsTrigger>
            <TabsTrigger value="blocked" className="flex-1 font-sans"><CalendarOff className="w-4 h-4 mr-1" />Block Dates</TabsTrigger>
          </TabsList>

          <TabsContent value="events">
            {/* Upcoming Events */}
            <h2 className="font-display text-xl font-bold mb-3 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" /> Upcoming Events
            </h2>
            {upcoming.length === 0 ? (
              <Card className="mb-6"><CardContent className="p-8 text-center">
                <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="font-sans text-muted-foreground">No upcoming events assigned yet</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-3 mb-6">
                {upcoming.map((ev) => {
                  const eventDate = new Date(ev.event_date);
                  const today = new Date(); today.setHours(0,0,0,0);
                  const daysLeft = Math.ceil((eventDate.getTime() - today.getTime()) / (1000*60*60*24));

                  return (
                    <motion.div key={ev.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                      <Card className="card-3d">
                        <CardContent className="p-4 space-y-2">
                          {daysLeft > 0 && (
                            <div className="bg-primary/10 rounded-xl p-3 text-center">
                              <p className="font-display text-2xl font-bold text-primary">{daysLeft}</p>
                              <p className="text-xs font-sans text-muted-foreground">
                                {daysLeft === 1 ? "✨ Tomorrow!" : `📅 Days to go`}
                              </p>
                            </div>
                          )}
                          {daysLeft === 0 && (
                            <div className="bg-primary/20 rounded-xl p-3 text-center">
                              <p className="font-display text-lg font-bold text-primary">🎊 Today!</p>
                            </div>
                          )}
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-sans font-semibold">{ev.client_name}</p>
                              <Badge className="border-none text-xs bg-primary/10 text-primary mt-1">
                                {EVENT_TYPES.find(t => t.value === ev.event_type)?.label || ev.event_type}
                              </Badge>
                            </div>
                            <Badge className={`${EVENT_STATUS_COLORS[ev.status]} border-none text-xs`}>{EVENT_STATUS_LABELS[ev.status]}</Badge>
                          </div>
                          <div className="text-sm font-sans space-y-1 text-muted-foreground">
                            <p className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {eventDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} · {ev.event_start_time} - {ev.event_end_time}</p>
                            <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {ev.venue_name}, {ev.city}, {ev.state} - {ev.pincode}</p>
                            <p className="flex items-center gap-1"><Users className="w-3 h-3" /> {ev.artist_count} Artist{ev.artist_count > 1 ? "s" : ""}</p>
                            {ev.notes && <p className="text-xs italic">Note: {ev.notes}</p>}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Completed Events */}
            {completed.length > 0 && (
              <>
                <h2 className="font-display text-xl font-bold mb-3">Completed Events</h2>
                <div className="space-y-3">
                  {completed.map(ev => (
                    <Card key={ev.id}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-sans font-semibold">{ev.client_name}</p>
                            <p className="text-xs text-muted-foreground font-sans">
                              {new Date(ev.event_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            </p>
                          </div>
                          <Badge className="bg-green-100 text-green-800 border-none text-xs">Completed</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-sans">{ev.venue_name}, {ev.city}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          {/* Custom Orders - Ritesh Only */}
          {isRitesh && (
            <TabsContent value="orders">
              <h2 className="font-display text-xl font-bold mb-3 flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" /> Assigned Custom Caricatures
              </h2>
              {/* Filter tabs */}
              <div className="flex gap-1.5 mb-4">
                {[
                  { value: "all", label: `All (${orders.length})` },
                  { value: "upcoming", label: `Active (${orders.filter(o => ["new","in_progress"].includes(o.status)).length})` },
                  { value: "completed", label: `Completed (${orders.filter(o => ["delivered","completed","artwork_ready","dispatched"].includes(o.status)).length})` },
                ].map(tab => (
                  <Button key={tab.value} variant={orderFilter === tab.value ? "default" : "outline"} size="sm" className="text-xs font-sans h-7 rounded-full" onClick={() => setOrderFilter(tab.value)}>
                    {tab.label}
                  </Button>
                ))}
              </div>
              {filteredOrders.length === 0 ? (
                <Card><CardContent className="p-8 text-center">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="font-sans text-muted-foreground">No orders in this category</p>
                </CardContent></Card>
              ) : (
                <div className="space-y-3">
                  {filteredOrders.map(order => (
                    <Card key={order.id} className="card-3d">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</p>
                            <p className="font-sans font-medium capitalize">{order.order_type} — {order.style}</p>
                            <p className="text-xs text-muted-foreground font-sans">{order.customer_name}</p>
                            <p className="text-xs text-muted-foreground font-sans">
                              {new Date(order.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            </p>
                            {order.expected_delivery_date && (
                              <p className="text-xs text-muted-foreground font-sans">Due: {new Date(order.expected_delivery_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</p>
                            )}
                          </div>
                          <Badge className="border-none text-xs">{STATUS_LABELS[order.status] || order.status}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs font-sans">Update Status:</Label>
                          <Select value={order.status} onValueChange={v => updateOrderStatus(order.id, v)}>
                            <SelectTrigger className="h-7 text-xs w-40"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">New</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="artwork_ready">Art Ready</SelectItem>
                              <SelectItem value="dispatched">Dispatched</SelectItem>
                              <SelectItem value="delivered">Delivered</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )}

          {/* Chat Tab */}
          <TabsContent value="chat">
            <Card className="flex flex-col" style={{ minHeight: 400 }}>
              <CardHeader className="py-3 px-4 bg-primary text-primary-foreground rounded-t-xl">
                <CardTitle className="text-sm font-sans font-medium">💬 Chat with Admin</CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex flex-col flex-1">
                <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-3 space-y-2" style={{ minHeight: 250, maxHeight: 400 }}>
                  {chatMessages.length === 0 && (
                    <p className="text-center text-xs text-muted-foreground py-8 font-sans">
                      👋 Hi {artist?.name}! Send a message to the admin.
                    </p>
                  )}
                  {chatMessages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs font-sans ${
                        msg.sender_id === user?.id
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted rounded-bl-sm"
                      }`}>
                        {msg.is_admin && <p className="text-[9px] font-bold mb-0.5 opacity-70">Admin</p>}
                        <p>{msg.message}</p>
                        <p className={`text-[9px] mt-0.5 ${msg.sender_id === user?.id ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                          {new Date(msg.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 p-3 border-t border-border">
                  <Input
                    value={chatMsg}
                    onChange={e => setChatMsg(e.target.value)}
                    placeholder="Type a message..."
                    className="text-xs h-8 font-sans"
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                  />
                  <Button size="sm" onClick={sendChatMessage} disabled={!chatMsg.trim() || chatSending} className="h-8 w-8 p-0">
                    {chatSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="blocked">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <CalendarOff className="w-5 h-5 text-primary" /> Block Your Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="font-sans text-xs">Date</Label><Input type="date" value={blockDate} onChange={e => setBlockDate(e.target.value)} min={new Date().toISOString().split("T")[0]} /></div>
                  <div><Label className="font-sans text-xs">Reason (optional)</Label><Input value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="e.g. Personal leave" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="font-sans text-xs">From Time (optional)</Label><Input type="time" value={blockStartTime} onChange={e => setBlockStartTime(e.target.value)} /></div>
                  <div><Label className="font-sans text-xs">To Time (optional)</Label><Input type="time" value={blockEndTime} onChange={e => setBlockEndTime(e.target.value)} /></div>
                </div>
                <Button onClick={handleAddBlockedDate} disabled={!blockDate || addingBlock} className="w-full rounded-full font-sans bg-primary hover:bg-primary/90" size="sm">
                  {addingBlock ? "Blocking..." : "Block Date"}
                </Button>

                {blockedDates.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <p className="text-xs font-sans text-muted-foreground font-medium">Your Blocked Dates</p>
                    {blockedDates.map(bd => (
                      <div key={bd.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2 text-sm font-sans">
                        <div>
                          <span className="font-medium">{new Date(bd.blocked_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                          {bd.blocked_start_time && bd.blocked_end_time && (
                            <span className="text-muted-foreground ml-2 text-xs">{bd.blocked_start_time} - {bd.blocked_end_time}</span>
                          )}
                          {bd.reason && <span className="text-muted-foreground ml-2 text-xs">({bd.reason})</span>}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteBlock(bd.id)} className="text-destructive h-7 w-7 p-0">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      {/* Mobile Bottom Nav for Artist Dashboard */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-md border-t border-border">
        <div className="flex items-center justify-around py-2">
          <ArtistBottomNavItem icon={Home} label="Home" active={false} onClick={() => navigate("/")} />
          <ArtistBottomNavItem icon={CalendarDays} label="Events" active={activeTab === "events"} onClick={() => setActiveTab("events")} />
          {isRitesh && <ArtistBottomNavItem icon={Package} label="Orders" active={activeTab === "orders"} onClick={() => setActiveTab("orders")} />}
          <ArtistBottomNavItem icon={MessageCircle} label="Chat" active={activeTab === "chat"} onClick={() => setActiveTab("chat")} badge={chatUnread > 0 ? chatUnread : undefined} />
          <ArtistBottomNavItem icon={CalendarOff} label="Block" active={activeTab === "blocked"} onClick={() => setActiveTab("blocked")} />
          <ArtistBottomNavItem icon={LogOut} label="Logout" active={false} onClick={handleLogout} />
        </div>
      </div>
    </div>
  );
};

const ArtistBottomNavItem = ({ icon: Icon, label, active, onClick, badge }: { icon: any; label: string; active: boolean; onClick: () => void; badge?: number }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-colors relative ${active ? "text-primary" : "text-muted-foreground"}`}>
    <Icon className="w-5 h-5" />
    <span className="text-[10px] font-sans font-medium">{label}</span>
    {badge && badge > 0 && (
      <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[8px] rounded-full w-4 h-4 flex items-center justify-center">{badge}</span>
    )}
  </button>
);

export default ArtistDashboard;
