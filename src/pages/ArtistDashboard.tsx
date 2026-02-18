import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, CalendarDays, MapPin, Users, Home, FileText, RefreshCw, CreditCard, Loader2, CalendarOff, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import LiveGreeting from "@/components/LiveGreeting";
import { EVENT_TYPES, EVENT_STATUS_LABELS, EVENT_STATUS_COLORS } from "@/lib/event-data";
import { formatPrice } from "@/lib/pricing";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ArtistEvent = {
  id: string; client_name: string; event_type: string; event_date: string;
  event_start_time: string; event_end_time: string; venue_name: string;
  full_address: string; city: string; state: string; pincode: string;
  artist_count: number; status: string; notes: string | null;
  payment_status: string; total_price: number; advance_amount: number;
  remaining_amount: number | null; negotiated: boolean;
  negotiated_total: number | null; negotiated_advance: number | null;
};

type BlockedDate = {
  id: string; blocked_date: string; blocked_start_time: string | null;
  blocked_end_time: string | null; reason: string | null; artist_id: string;
};

const ArtistDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [artist, setArtist] = useState<{ id: string; name: string; portfolio_url: string | null } | null>(null);
  const [events, setEvents] = useState<ArtistEvent[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [collectingId, setCollectingId] = useState<string | null>(null);
  const [collectMethod, setCollectMethod] = useState<string>("");
  const [showCollectDialog, setShowCollectDialog] = useState(false);
  const [selectedEventForCollect, setSelectedEventForCollect] = useState<ArtistEvent | null>(null);

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
    fetchEvents(artistData.id);
    fetchBlockedDates(artistData.id);

    const ch = supabase.channel("artist-events")
      .on("postgres_changes", { event: "*", schema: "public", table: "event_bookings", filter: `assigned_artist_id=eq.${artistData.id}` }, () => fetchEvents(artistData.id))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  };

  const fetchEvents = async (artistId: string) => {
    const { data } = await supabase.from("event_bookings")
      .select("id, client_name, event_type, event_date, event_start_time, event_end_time, venue_name, full_address, city, state, pincode, artist_count, status, notes, payment_status, total_price, advance_amount, remaining_amount, negotiated, negotiated_total, negotiated_advance")
      .eq("assigned_artist_id", artistId)
      .order("event_date", { ascending: true });
    if (data) setEvents(data as any);
    setLoading(false);
  };

  const fetchBlockedDates = async (artistId: string) => {
    const { data } = await (supabase.from("artist_blocked_dates")
      .select("id, blocked_date, blocked_start_time, blocked_end_time, reason, artist_id") as any)
      .eq("artist_id", artistId)
      .order("blocked_date", { ascending: true });
    if (data) setBlockedDates(data as any);
  };

  const handleCollectPayment = async () => {
    if (!selectedEventForCollect || !collectMethod) return;
    setCollectingId(selectedEventForCollect.id);
    try {
      const { data, error } = await supabase.functions.invoke("collect-event-payment", {
        body: { event_id: selectedEventForCollect.id, collection_method: collectMethod },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "✅ Payment Collected!", description: `Remaining amount marked as collected (${collectMethod}).` });
      setShowCollectDialog(false);
      setCollectMethod("");
      if (artist) fetchEvents(artist.id);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setCollectingId(null);
  };

  const handleAddBlockedDate = async () => {
    if (!artist || !blockDate) { toast({ title: "Please select a date", variant: "destructive" }); return; }
    setAddingBlock(true);
    const { error } = await (supabase.from("artist_blocked_dates").insert({
      artist_id: artist.id,
      blocked_date: blockDate,
      blocked_start_time: blockStartTime || null,
      blocked_end_time: blockEndTime || null,
      reason: blockReason || null,
    }) as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
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
    await Promise.all([fetchEvents(artist.id), fetchBlockedDates(artist.id)]);
    toast({ title: "Refreshed!" });
  };

  if (loading || authLoading) return <div className="min-h-screen flex items-center justify-center font-sans text-muted-foreground">Loading...</div>;

  const upcoming = events.filter(e => e.status === "upcoming");
  const completed = events.filter(e => e.status === "completed");

  const getRemainingAmount = (ev: ArtistEvent) => {
    const total = ev.negotiated && ev.negotiated_total ? ev.negotiated_total : ev.total_price;
    const advance = ev.negotiated && ev.negotiated_advance ? ev.negotiated_advance : ev.advance_amount;
    return total - advance;
  };

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
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="font-sans"><Home className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="font-sans"><LogOut className="w-4 h-4 mr-1" /> Logout</Button>
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

        {/* Portfolio Link */}
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

        {/* Block Dates Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <CalendarOff className="w-5 h-5 text-primary" /> Block Your Dates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-sans text-xs">Date</Label>
                <Input type="date" value={blockDate} onChange={e => setBlockDate(e.target.value)} min={new Date().toISOString().split("T")[0]} />
              </div>
              <div>
                <Label className="font-sans text-xs">Reason (optional)</Label>
                <Input value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="e.g. Personal leave" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-sans text-xs">From Time (optional)</Label>
                <Input type="time" value={blockStartTime} onChange={e => setBlockStartTime(e.target.value)} />
              </div>
              <div>
                <Label className="font-sans text-xs">To Time (optional)</Label>
                <Input type="time" value={blockEndTime} onChange={e => setBlockEndTime(e.target.value)} />
              </div>
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
              const remaining = getRemainingAmount(ev);
              const isFullyPaid = ev.payment_status === "fully_paid";
              const isAdvancePaid = ev.payment_status === "confirmed" || isFullyPaid;

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

                      {/* Remaining Amount to Collect */}
                      {isAdvancePaid && !isFullyPaid && remaining > 0 && (
                        <div className="bg-amber-50 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-sans font-medium text-amber-800">💰 Remaining to Collect</p>
                              <p className="font-display text-lg font-bold text-amber-700">{formatPrice(remaining)}</p>
                            </div>
                            <Button
                              size="sm"
                              className="rounded-full font-sans bg-primary hover:bg-primary/90"
                              onClick={() => { setSelectedEventForCollect(ev); setShowCollectDialog(true); }}
                            >
                              <CreditCard className="w-3 h-3 mr-1" /> Collect
                            </Button>
                          </div>
                        </div>
                      )}

                      {isFullyPaid && (
                        <div className="bg-green-50 rounded-lg p-2 text-center">
                          <p className="text-xs font-sans font-medium text-green-700">✅ Fully Paid</p>
                        </div>
                      )}
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
              {completed.map((ev) => (
                <Card key={ev.id} className="opacity-75">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-sans font-semibold">{ev.client_name}</p>
                        <p className="text-xs text-muted-foreground font-sans">
                          {new Date(ev.event_date).toLocaleDateString("en-IN")} · {ev.venue_name}, {ev.city}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className="bg-primary/10 text-primary border-none text-xs">Completed</Badge>
                        {ev.payment_status === "fully_paid" && <Badge className="bg-green-100 text-green-800 border-none text-xs">Fully Paid ✅</Badge>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Collect Payment Dialog */}
      <Dialog open={showCollectDialog} onOpenChange={setShowCollectDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Collect Remaining Payment</DialogTitle>
          </DialogHeader>
          {selectedEventForCollect && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 text-sm font-sans">
                <p><span className="text-muted-foreground">Client:</span> <span className="font-medium">{selectedEventForCollect.client_name}</span></p>
                <p><span className="text-muted-foreground">Amount:</span> <span className="font-bold text-primary">{formatPrice(getRemainingAmount(selectedEventForCollect))}</span></p>
              </div>
              <div>
                <Label className="font-sans">Collection Method</Label>
                <Select value={collectMethod} onValueChange={setCollectMethod}>
                  <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">💵 Cash</SelectItem>
                    <SelectItem value="online">📱 Online (UPI/Transfer)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleCollectPayment}
                disabled={!collectMethod || collectingId === selectedEventForCollect.id}
                className="w-full rounded-full font-sans bg-primary hover:bg-primary/90"
              >
                {collectingId ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : "Confirm Collection"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ArtistDashboard;
