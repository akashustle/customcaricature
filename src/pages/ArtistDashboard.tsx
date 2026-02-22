import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, CalendarDays, MapPin, Users, Home, FileText, RefreshCw, Loader2, CalendarOff, Trash2, Package, Palette, MessageCircle, X, Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import LiveGreeting from "@/components/LiveGreeting";
import { EVENT_TYPES, EVENT_STATUS_LABELS, EVENT_STATUS_COLORS } from "@/lib/event-data";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import NotificationBell from "@/components/NotificationBell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermissions } from "@/hooks/usePermissions";
import ArtworkUploadFlow from "@/components/admin/ArtworkUploadFlow";
import ChatWidget from "@/components/ChatWidget";

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
  expected_delivery_date: string | null; art_confirmation_status: string | null;
  notes: string | null; delivery_address: string | null; delivery_city: string | null;
  delivery_state: string | null; delivery_pincode: string | null;
  amount: number; customer_mobile: string; customer_email: string;
  instagram_id: string | null;
};

type BlockedDate = {
  id: string; blocked_date: string; blocked_start_time: string | null;
  blocked_end_time: string | null; reason: string | null; artist_id: string;
};

const STATUS_LABELS: Record<string, string> = {
  new: "New", in_progress: "In Progress", artwork_ready: "Art Ready",
  dispatched: "Dispatched", delivered: "Delivered", completed: "Completed",
};

// Component to show order images for artist with slidable fullscreen viewer
const ArtistOrderImages = ({ orderId }: { orderId: string }) => {
  const [images, setImages] = useState<{ id: string; storage_path: string; file_name: string }[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchImages = async () => {
      const { data } = await supabase.from("order_images").select("id, storage_path, file_name").eq("order_id", orderId);
      if (data && data.length > 0) {
        setImages(data);
        const u: Record<string, string> = {};
        for (const img of data) {
          const { data: signed } = await supabase.storage.from("order-photos").createSignedUrl(img.storage_path, 3600);
          if (signed?.signedUrl) u[img.id] = signed.signedUrl;
        }
        setUrls(u);
      }
    };
    fetchImages();
  }, [orderId]);

  const openViewer = (index: number) => { setCurrentIndex(index); setViewerOpen(true); };
  const prevImage = () => setCurrentIndex(i => (i > 0 ? i - 1 : images.length - 1));
  const nextImage = () => setCurrentIndex(i => (i < images.length - 1 ? i + 1 : 0));

  if (images.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-sans text-muted-foreground mb-1">📸 Customer Photos ({images.length}):</p>
      <div className="flex gap-1 flex-wrap">
        {images.map((img, idx) => (
          <div key={img.id} className="w-14 h-14 rounded border border-border overflow-hidden cursor-pointer" onClick={() => openViewer(idx)}>
            {urls[img.id] ? (
              <img src={urls[img.id]} alt={img.file_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-muted" />
            )}
          </div>
        ))}
      </div>
      {/* Fullscreen slidable image viewer */}
      <AnimatePresence>
        {viewerOpen && images[currentIndex] && urls[images[currentIndex].id] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center"
            onClick={() => setViewerOpen(false)}
          >
            <div className="absolute top-4 right-4 flex gap-2 z-10">
              <span className="text-white/70 text-sm font-sans">{currentIndex + 1} / {images.length}</span>
              <button onClick={() => setViewerOpen(false)} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-4 max-w-full px-4" onClick={e => e.stopPropagation()}>
              {images.length > 1 && (
                <button onClick={prevImage} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 flex-shrink-0">
                  ‹
                </button>
              )}
              <motion.img
                key={currentIndex}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                src={urls[images[currentIndex].id]}
                alt={images[currentIndex].file_name}
                className="max-w-[80vw] max-h-[80vh] object-contain rounded-lg"
              />
              {images.length > 1 && (
                <button onClick={nextImage} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 flex-shrink-0">
                  ›
                </button>
              )}
            </div>
            <p className="text-white/60 text-xs font-sans mt-3">{images[currentIndex].file_name}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ArtistDashboard = () => {
  const navigate = useNavigate();
  usePermissions(true);
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
      .select("id, order_type, style, face_count, status, customer_name, created_at, expected_delivery_date, art_confirmation_status, ask_user_delivered, notes, delivery_address, delivery_city, delivery_state, delivery_pincode, amount, customer_mobile, customer_email, instagram_id")
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
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <img src="/logo.png" alt="CCC" className="w-8 h-8 rounded-full border border-border" />
            <h1 className="font-calligraphy text-xl font-bold">Artist Dashboard</h1>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
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
                          <div className="text-right">
                            <Badge className="border-none text-xs">{STATUS_LABELS[order.status] || order.status}</Badge>
                            <p className="font-sans text-sm font-bold text-primary mt-1">₹{order.amount}</p>
                          </div>
                        </div>
                        {/* Order Details */}
                        <div className="bg-muted/30 rounded-lg p-3 space-y-1 text-xs font-sans">
                          <p><span className="text-muted-foreground">Faces:</span> {order.face_count}</p>
                          <p><span className="text-muted-foreground">Mobile:</span> {order.customer_mobile}</p>
                          <p><span className="text-muted-foreground">Email:</span> {order.customer_email}</p>
                          {order.instagram_id && <p><span className="text-muted-foreground">Instagram:</span> {order.instagram_id}</p>}
                          {order.notes && <p><span className="text-muted-foreground">Notes:</span> {order.notes}</p>}
                          {order.delivery_address && (
                            <p><span className="text-muted-foreground">Delivery:</span> {order.delivery_address}, {order.delivery_city}, {order.delivery_state} - {order.delivery_pincode}</p>
                          )}
                        </div>
                        {/* Order Images */}
                        <ArtistOrderImages orderId={order.id} />
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
                        <ArtworkUploadFlow orderId={order.id} orderStatus={order.status} artConfirmationStatus={order.art_confirmation_status} onStatusChange={() => { if (artist) fetchOrders(artist.id); }} isArtist />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )}



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
        <div className="flex items-center overflow-x-auto py-2 px-1 gap-1">
          <ArtistBottomNavItem icon={Home} label="Home" active={false} onClick={() => navigate("/")} />
          <ArtistBottomNavItem icon={CalendarDays} label="Events" active={activeTab === "events"} onClick={() => setActiveTab("events")} />
          {isRitesh && <ArtistBottomNavItem icon={Package} label="Orders" active={activeTab === "orders"} onClick={() => setActiveTab("orders")} />}
          <ArtistBottomNavItem icon={CalendarOff} label="Block" active={activeTab === "blocked"} onClick={() => setActiveTab("blocked")} />
          <ArtistBottomNavItem icon={Bell} label="Alerts" active={false} onClick={() => navigate("/notifications")} />
          <ArtistBottomNavItem icon={LogOut} label="Logout" active={false} onClick={handleLogout} />
        </div>
      </div>
      {/* Chat Widget - floating like user dashboard */}
      {user && artist && <ChatWidget userId={user.id} userName={artist.name} isArtistChat />}
    </div>
  );
};

const ArtistBottomNavItem = ({ icon: Icon, label, active, onClick, badge }: { icon: any; label: string; active: boolean; onClick: () => void; badge?: number }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all flex-shrink-0 relative ${active ? "text-primary-foreground bg-primary shadow-md scale-105" : "text-muted-foreground hover:text-foreground"}`}>
    <Icon className="w-5 h-5" />
    <span className="text-[10px] font-sans font-medium">{label}</span>
    {badge && badge > 0 && (
      <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[8px] rounded-full w-4 h-4 flex items-center justify-center">{badge}</span>
    )}
  </button>
);

export default ArtistDashboard;
