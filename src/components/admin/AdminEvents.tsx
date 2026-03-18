import { useEffect, useState } from "react";
import ExportButton from "@/components/admin/ExportButton";
import { supabase } from "@/integrations/supabase/client";
import { useEventPricing } from "@/hooks/useEventPricing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/pricing";
import { EVENT_TYPES, EVENT_STATUS_LABELS, EVENT_STATUS_COLORS, INDIA_STATES_CITIES } from "@/lib/event-data";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  CalendarIcon, Plus, Search, Trash2, DollarSign, X, Save, Settings, TrendingUp, CreditCard, MapPin, Users, BarChart3, Edit2, ChevronDown, Eye, Bell,
} from "lucide-react";
import EventRevenueWidget from "@/components/EventRevenueWidget";
import EventCompletionNotice from "@/components/EventCompletionNotice";

type EventBooking = {
  id: string; user_id: string | null; client_name: string; client_mobile: string;
  client_email: string; client_instagram: string | null; event_type: string;
  event_date: string; event_start_time: string; event_end_time: string;
  state: string; city: string; full_address: string; venue_name: string; pincode: string;
  artist_count: number; is_mumbai: boolean; total_price: number; advance_amount: number;
  remaining_amount: number; extra_hours: number; negotiated: boolean;
  negotiated_total: number | null; negotiated_advance: number | null;
  payment_status: string; status: string; notes: string | null; created_at: string;
  assigned_artist_id: string | null;
};
type ArtistAssignment = { event_id: string; artist_id: string };
type Profile = { user_id: string; full_name: string; email: string; mobile: string; };

const AdminEvents = ({ customers }: { customers: Profile[] }) => {
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [events, setEvents] = useState<EventBooking[]>([]);
  const [artists, setArtists] = useState<{ id: string; name: string }[]>([]);
  const [artistAssignments, setArtistAssignments] = useState<ArtistAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [calendarDate, setCalendarDate] = useState<Date>();
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [negotiateId, setNegotiateId] = useState<string | null>(null);
  const [negTotal, setNegTotal] = useState("");
  const [negAdvance, setNegAdvance] = useState("");
  const [showPricing, setShowPricing] = useState(false);
  const { pricing: dbPricing, refetch: refetchPricing } = useEventPricing();
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editEventData, setEditEventData] = useState<Partial<EventBooking>>({});
  const [demandId, setDemandId] = useState<string | null>(null);
  const [demandAmount, setDemandAmount] = useState("");
  const [demandNote, setDemandNote] = useState("");
  const [demandStatusOnPaid, setDemandStatusOnPaid] = useState("confirmed");
  const [demands, setDemands] = useState<any[]>([]);

  const [pricingEdits, setPricingEdits] = useState<Record<string, { total_price: string; advance_amount: string; extra_hour_rate: string; valid_until: string }>>({});

  const [mf, setMf] = useState({
    clientName: "", clientMobile: "", clientEmail: "", clientInstagram: "",
    eventType: "wedding", customEventType: "", eventDate: "", startTime: "10:00", endTime: "18:00",
    state: "", city: "", customCity: "", fullAddress: "", venueName: "", pincode: "",
    artistCount: 1, totalPrice: 30000, advancePaid: 20000,
    paymentStatus: "pending", negotiated: false, negotiatedTotal: 0, negotiatedAdvance: 0,
    notes: "", extraHours: 0, userId: "",
  });
  const [addingEvent, setAddingEvent] = useState(false);

  const [showBlockDate, setShowBlockDate] = useState(false);
  const [blockDate, setBlockDate] = useState<Date>();
  const [blockStartTime, setBlockStartTime] = useState("");
  const [blockEndTime, setBlockEndTime] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [blockedDates, setBlockedDates] = useState<any[]>([]);

  const [paymentDates, setPaymentDates] = useState<Record<string, { advance_date?: string; full_date?: string }>>({});

  useEffect(() => {
    fetchEvents();
    fetchBlockedDates();
    fetchArtists();
    fetchArtistAssignments();
    fetchPaymentDates();
    fetchDemands();
    const ch = supabase.channel("admin-events")
      .on("postgres_changes", { event: "*", schema: "public", table: "event_bookings" }, () => fetchEvents())
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_history" }, () => { fetchEvents(); fetchPaymentDates(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "event_artist_assignments" }, () => fetchArtistAssignments())
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_demands" }, () => fetchDemands())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Auto-complete events whose date+time has passed
  useEffect(() => {
    const checkAutoComplete = () => {
      const now = new Date();
      events.forEach(async (ev) => {
        if (ev.status !== "upcoming") return;
        const [year, month, day] = ev.event_date.split("-").map(Number);
        const [endH, endM] = ev.event_end_time.split(":").map(Number);
        const eventEnd = new Date(year, month - 1, day, endH, endM);
        if (now > eventEnd) {
          await supabase.from("event_bookings").update({ status: "completed" } as any).eq("id", ev.id);
          toast({ title: `Event auto-completed: ${ev.client_name}` });
        }
      });
    };
    checkAutoComplete();
    const interval = setInterval(checkAutoComplete, 60000); // check every minute
    return () => clearInterval(interval);
  }, [events]);

  useEffect(() => {
    if (dbPricing.length > 0) {
      const edits: typeof pricingEdits = {};
      dbPricing.forEach(p => {
        edits[p.id] = {
          total_price: String(p.total_price),
          advance_amount: String(p.advance_amount),
          extra_hour_rate: String(p.extra_hour_rate),
          valid_until: p.valid_until || "",
        };
      });
      setPricingEdits(edits);
    }
  }, [dbPricing]);

  const fetchEvents = async () => {
    const { data } = await supabase.from("event_bookings").select("*").order("event_date", { ascending: false });
    if (data) setEvents(data as any);
    setLoading(false);
  };
  const fetchBlockedDates = async () => {
    const { data } = await supabase.from("artist_blocked_dates").select("*").order("blocked_date", { ascending: false });
    if (data) setBlockedDates(data);
  };
  const fetchArtists = async () => {
    const { data } = await supabase.from("artists").select("id, name");
    if (data) setArtists(data as any);
  };
  const fetchArtistAssignments = async () => {
    const { data } = await supabase.from("event_artist_assignments").select("event_id, artist_id") as any;
    if (data) setArtistAssignments(data);
  };
  const fetchPaymentDates = async () => {
    const { data } = await supabase.from("payment_history").select("booking_id, payment_type, created_at").not("booking_id", "is", null);
    if (data) {
      const map: Record<string, { advance_date?: string; full_date?: string }> = {};
      data.forEach((p: any) => {
        if (!p.booking_id) return;
        if (!map[p.booking_id]) map[p.booking_id] = {};
        if (p.payment_type === "event_advance") map[p.booking_id].advance_date = p.created_at;
        if (p.payment_type === "event_remaining") map[p.booking_id].full_date = p.created_at;
      });
      setPaymentDates(map);
    }
  };
  const getEventArtists = (eventId: string): string[] => {
    return artistAssignments.filter(a => a.event_id === eventId).map(a => a.artist_id);
  };
  const toggleArtistAssignment = async (eventId: string, artistId: string, assigned: boolean) => {
    if (assigned) {
      await supabase.from("event_artist_assignments").delete().eq("event_id", eventId).eq("artist_id", artistId);
      toast({ title: "Artist Removed" });
    } else {
      await supabase.from("event_artist_assignments").insert({ event_id: eventId, artist_id: artistId } as any);
      toast({ title: "Artist Assigned" });
    }
    fetchArtistAssignments();
  };
  // Legacy single-artist compat
  const assignArtist = async (eventId: string, artistId: string | null) => {
    await supabase.from("event_bookings").update({ assigned_artist_id: artistId } as any).eq("id", eventId);
    toast({ title: artistId ? "Artist Assigned" : "Artist Removed" });
    fetchEvents();
  };

  const addBlockedDate = async () => {
    if (!blockDate) return;
    await supabase.from("artist_blocked_dates").insert({
      blocked_date: format(blockDate, "yyyy-MM-dd"),
      reason: blockReason || null,
      blocked_start_time: blockStartTime || null,
      blocked_end_time: blockEndTime || null,
    } as any);
    toast({ title: "Date Blocked" });
    setShowBlockDate(false); setBlockDate(undefined); setBlockReason(""); setBlockStartTime(""); setBlockEndTime("");
    fetchBlockedDates();
  };
  const removeBlockedDate = async (id: string) => { await supabase.from("artist_blocked_dates").delete().eq("id", id); toast({ title: "Date Unblocked" }); fetchBlockedDates(); };
  const updateEventStatus = async (id: string, status: string) => { await supabase.from("event_bookings").update({ status } as any).eq("id", id); toast({ title: "Status Updated" }); fetchEvents(); };
  const updatePaymentStatus = async (id: string, ps: string) => { await supabase.from("event_bookings").update({ payment_status: ps } as any).eq("id", id); toast({ title: "Payment Status Updated" }); fetchEvents(); };
  const deleteEvent = async (id: string) => { await supabase.from("event_bookings").delete().eq("id", id); toast({ title: "Event Deleted" }); fetchEvents(); };

  const saveEventEdit = async () => {
    if (!editingEventId) return;
    const { error } = await supabase.from("event_bookings").update({
      client_name: editEventData.client_name,
      client_mobile: editEventData.client_mobile,
      client_email: editEventData.client_email,
      client_instagram: editEventData.client_instagram || null,
      event_type: editEventData.event_type,
      event_date: editEventData.event_date,
      event_start_time: editEventData.event_start_time,
      event_end_time: editEventData.event_end_time,
      state: editEventData.state,
      city: editEventData.city,
      full_address: editEventData.full_address,
      venue_name: editEventData.venue_name,
      pincode: editEventData.pincode,
      artist_count: editEventData.artist_count,
      total_price: editEventData.total_price,
      advance_amount: editEventData.advance_amount,
      remaining_amount: editEventData.remaining_amount,
      payment_status: editEventData.payment_status,
      extra_hours: editEventData.extra_hours,
      notes: editEventData.notes || null,
    } as any).eq("id", editingEventId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Event Updated!" }); setEditingEventId(null); fetchEvents(); }
  };

  const saveNegotiation = async () => {
    if (!negotiateId) return;
    await supabase.from("event_bookings").update({ negotiated: true, negotiated_total: parseInt(negTotal) || 0, negotiated_advance: parseInt(negAdvance) || 0 } as any).eq("id", negotiateId);
    toast({ title: "Negotiation Saved" }); setNegotiateId(null); fetchEvents();
  };

  const savePricing = async (id: string) => {
    const edit = pricingEdits[id];
    if (!edit) return;
    await supabase.from("event_pricing").update({
      total_price: parseInt(edit.total_price) || 0,
      advance_amount: parseInt(edit.advance_amount) || 0,
      extra_hour_rate: parseInt(edit.extra_hour_rate) || 0,
      valid_until: edit.valid_until || null,
    } as any).eq("id", id);
    toast({ title: "Pricing Updated – Live on website!" });
    refetchPricing();
  };

  const addManualEvent = async () => {
    if (!mf.clientName || !mf.clientEmail || !mf.clientMobile || !mf.eventDate) return;
    setAddingEvent(true);
    try {
      const actualCity = mf.city === "__other__" ? mf.customCity : mf.city;
      const finalEventType = mf.eventType === "other" ? mf.customEventType : mf.eventType;
      const isMumbai = mf.state === "Maharashtra" && actualCity === "Mumbai";
      await supabase.from("event_bookings").insert({
        user_id: mf.userId || null, client_name: mf.clientName, client_mobile: mf.clientMobile,
        client_email: mf.clientEmail, client_instagram: mf.clientInstagram || null,
        event_type: finalEventType, event_date: mf.eventDate, event_start_time: mf.startTime, event_end_time: mf.endTime,
        state: mf.state, city: actualCity, full_address: mf.fullAddress, venue_name: mf.venueName, pincode: mf.pincode,
        artist_count: mf.artistCount, is_mumbai: isMumbai,
        total_price: mf.negotiated ? mf.negotiatedTotal : mf.totalPrice,
        advance_amount: mf.negotiated ? mf.negotiatedAdvance : mf.advancePaid,
        extra_hours: mf.extraHours, negotiated: mf.negotiated,
        negotiated_total: mf.negotiated ? mf.negotiatedTotal : null,
        negotiated_advance: mf.negotiated ? mf.negotiatedAdvance : null,
        payment_status: mf.paymentStatus, notes: mf.notes || null,
      } as any);
      toast({ title: "Event Added!" }); setShowAddEvent(false);
      setMf({ clientName: "", clientMobile: "", clientEmail: "", clientInstagram: "", eventType: "wedding", customEventType: "", eventDate: "", startTime: "10:00", endTime: "18:00", state: "", city: "", customCity: "", fullAddress: "", venueName: "", pincode: "", artistCount: 1, totalPrice: 30000, advancePaid: 20000, paymentStatus: "pending", negotiated: false, negotiatedTotal: 0, negotiatedAdvance: 0, notes: "", extraHours: 0, userId: "" });
      fetchEvents();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); } finally { setAddingEvent(false); }
  };

  const filtered = events.filter(e => {
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (paymentFilter !== "all" && e.payment_status !== paymentFilter) return false;
    if (regionFilter === "mumbai" && !e.is_mumbai) return false;
    if (regionFilter === "outside" && e.is_mumbai) return false;
    if (search && !e.client_name.toLowerCase().includes(search.toLowerCase()) && !e.id.toLowerCase().includes(search.toLowerCase()) && !e.client_email.toLowerCase().includes(search.toLowerCase())) return false;
    if (calendarDate && new Date(e.event_date).toDateString() !== calendarDate.toDateString()) return false;
    return true;
  });

  // Analytics - Updated logic
  const upcoming = events.filter(e => e.status === "upcoming").length;
  const completed = events.filter(e => e.status === "completed").length;
  const cancelled = events.filter(e => e.status === "cancelled").length;
  const mumbaiEvents = events.filter(e => e.is_mumbai).length;
  const outsideEvents = events.filter(e => !e.is_mumbai).length;

  // Fully paid events count toward revenue
  const fullyPaidEvents = events.filter(e => e.payment_status === "fully_paid");
  const advancePaidEvents = events.filter(e => e.payment_status === "confirmed");

  // Revenue = total from fully paid events
  const totalRevenue = fullyPaidEvents.reduce((s, e) => s + (e.negotiated && e.negotiated_total ? e.negotiated_total : e.total_price), 0);
  // Advance collected = advance from events that only have advance paid (not fully paid yet)
  const totalAdvanceCollected = advancePaidEvents.reduce((s, e) => s + (e.negotiated && e.negotiated_advance ? e.negotiated_advance : e.advance_amount), 0);
  const pendingPayments = events.filter(e => e.payment_status === "pending").length;
  const allPaidEvents = [...fullyPaidEvents, ...advancePaidEvents];
  const avgEventValue = allPaidEvents.length > 0 ? Math.round((totalRevenue + totalAdvanceCollected) / allPaidEvents.length) : 0;
  const negotiatedEvents = events.filter(e => e.negotiated).length;
  const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
  const monthlyRevenue = fullyPaidEvents.filter(e => new Date(e.created_at) > monthAgo).reduce((s, e) => s + (e.negotiated && e.negotiated_total ? e.negotiated_total : e.total_price), 0)
    + advancePaidEvents.filter(e => new Date(e.created_at) > monthAgo).reduce((s, e) => s + (e.negotiated && e.negotiated_advance ? e.negotiated_advance : e.advance_amount), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-2">
        <ExportButton
          data={filtered.map(e => ({
            "Client": e.client_name,
            "Email": e.client_email,
            "Mobile": e.client_mobile,
            "Event Type": e.event_type,
            "Date": e.event_date,
            "Time": `${e.event_start_time} - ${e.event_end_time}`,
            "Venue": e.venue_name,
            "City": e.city,
            "State": e.state,
            "Total Price": e.negotiated_total || e.total_price,
            "Advance": e.negotiated_advance || e.advance_amount,
            "Payment": e.payment_status,
            "Status": e.status,
          }))}
          sheetName="Events"
          fileName="CCC_Events"
        />
      </div>
      {/* Stats Widgets - 3D Animated */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { icon: Calendar, label: "Total Events", value: String(events.length), color: "hsl(36,45%,52%)" },
          { icon: TrendingUp, label: "Upcoming", value: String(upcoming), color: "hsl(210,65%,55%)" },
          { icon: Settings, label: "Completed", value: String(completed), color: "hsl(152,50%,48%)" },
          { icon: X, label: "Cancelled", value: String(cancelled), color: "hsl(0,55%,62%)" },
          { icon: MapPin, label: "Mumbai", value: String(mumbaiEvents), color: "hsl(280,50%,55%)" },
          { icon: MapPin, label: "Outside Mumbai", value: String(outsideEvents), color: "hsl(38,92%,55%)" },
        ].map((w, i) => (
          <div key={w.label} className="stat-widget-3d">
            <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-10 -translate-y-4 translate-x-4" style={{ background: w.color }} />
            <div className="flex items-center gap-2 relative z-10">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm" style={{ background: w.color }}>
                <w.icon className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-body font-bold truncate">{w.value}</p>
                <p className="text-[10px] text-muted-foreground font-body">{w.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Analytics - 3D Animated */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { icon: TrendingUp, label: "Total Revenue", value: formatPrice(totalRevenue), color: "hsl(152,50%,48%)" },
          { icon: CreditCard, label: "Advance Collected", value: formatPrice(totalAdvanceCollected), color: "hsl(210,65%,55%)" },
          { icon: DollarSign, label: "Monthly Revenue", value: formatPrice(monthlyRevenue), color: "hsl(36,45%,52%)" },
          { icon: BarChart3, label: "Avg Event Value", value: formatPrice(avgEventValue), color: "hsl(280,50%,55%)" },
          { icon: DollarSign, label: "Pending Payments", value: String(pendingPayments), color: "hsl(38,92%,55%)" },
          { icon: Users, label: "Negotiated Events", value: String(negotiatedEvents), color: "hsl(340,55%,58%)" },
        ].map((w, i) => (
          <div key={w.label} className="stat-widget-3d">
            <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-10 -translate-y-4 translate-x-4" style={{ background: w.color }} />
            <div className="flex items-center gap-2 relative z-10">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm" style={{ background: w.color }}>
                <w.icon className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm md:text-base font-body font-bold truncate">{w.value}</p>
                <p className="text-[10px] text-muted-foreground font-body">{w.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search name, email, ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 font-sans" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Dialog open={showAddEvent} onOpenChange={setShowAddEvent}>
              <DialogTrigger asChild><Button size="sm" className="font-sans rounded-full"><Plus className="w-4 h-4 mr-1" />Add Event</Button></DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
                <DialogHeader><DialogTitle className="font-display">Add Manual Event</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Client Name *</Label><Input value={mf.clientName} onChange={e => setMf({...mf, clientName: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Mobile *</Label><Input value={mf.clientMobile} onChange={e => { const d = e.target.value.replace(/\D/g,""); if(d.length<=10) setMf({...mf, clientMobile: d}); }} maxLength={10} /></div>
                    <div><Label>Email *</Label><Input type="email" value={mf.clientEmail} onChange={e => setMf({...mf, clientEmail: e.target.value})} /></div>
                  </div>
                  <div><Label>Instagram</Label><Input value={mf.clientInstagram} onChange={e => setMf({...mf, clientInstagram: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Event Type *</Label>
                      <Select value={mf.eventType} onValueChange={v => setMf({...mf, eventType: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Event Date *</Label><Input type="date" value={mf.eventDate} onChange={e => setMf({...mf, eventDate: e.target.value})} /></div>
                  </div>
                  {mf.eventType === "other" && (
                    <div><Label>Specify Event Type *</Label><Input value={mf.customEventType} onChange={e => setMf({...mf, customEventType: e.target.value})} placeholder="e.g. Engagement" /></div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Start Time</Label><Input type="time" value={mf.startTime} onChange={e => setMf({...mf, startTime: e.target.value})} /></div>
                    <div><Label>End Time</Label><Input type="time" value={mf.endTime} onChange={e => setMf({...mf, endTime: e.target.value})} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>State</Label>
                      <Select value={mf.state} onValueChange={v => setMf({...mf, state: v, city: "", customCity: ""})}>
                        <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
                        <SelectContent>{Object.keys(INDIA_STATES_CITIES).sort().map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>City</Label>
                      <Select value={mf.city} onValueChange={v => setMf({...mf, city: v})} disabled={!mf.state}>
                        <SelectTrigger><SelectValue placeholder="City" /></SelectTrigger>
                        <SelectContent>
                          {(INDIA_STATES_CITIES[mf.state]||[]).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          {mf.state && <SelectItem value="__other__">Other</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {mf.city === "__other__" && (
                    <div><Label>Enter City *</Label><Input value={mf.customCity} onChange={e => setMf({...mf, customCity: e.target.value})} /></div>
                  )}
                  <div><Label>Venue Name</Label><Input value={mf.venueName} onChange={e => setMf({...mf, venueName: e.target.value})} /></div>
                  <div><Label>Full Address</Label><Input value={mf.fullAddress} onChange={e => setMf({...mf, fullAddress: e.target.value})} /></div>
                  <div><Label>Pincode</Label><Input value={mf.pincode} onChange={e => { const d = e.target.value.replace(/\D/g,""); if(d.length<=6) setMf({...mf, pincode: d}); }} maxLength={6} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Artist Count</Label><Select value={String(mf.artistCount)} onValueChange={v => setMf({...mf, artistCount: parseInt(v)})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n} Artist{n > 1 ? "s" : ""}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Extra Hours</Label><Input type="number" min={0} value={mf.extraHours} onChange={e => setMf({...mf, extraHours: parseInt(e.target.value)||0})} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Total Price (₹)</Label><Input type="number" value={mf.totalPrice} onChange={e => setMf({...mf, totalPrice: parseInt(e.target.value)||0})} /></div>
                    <div><Label>Advance Paid (₹)</Label><Input type="number" value={mf.advancePaid} onChange={e => setMf({...mf, advancePaid: parseInt(e.target.value)||0})} /></div>
                  </div>
                  <div>
                    <Label>Payment Status</Label>
                    <Select value={mf.paymentStatus} onValueChange={v => setMf({...mf, paymentStatus: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="partial_1_paid">Partial 1 Paid</SelectItem>
                        <SelectItem value="partial_2_paid">Partial 2 Paid</SelectItem>
                        <SelectItem value="confirmed">Advance Received</SelectItem>
                        <SelectItem value="fully_paid">Fully Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2"><Checkbox checked={mf.negotiated} onCheckedChange={c => setMf({...mf, negotiated: !!c})} /><Label>Negotiated</Label></div>
                  {mf.negotiated && (
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Negotiated Total</Label><Input type="number" value={mf.negotiatedTotal} onChange={e => setMf({...mf, negotiatedTotal: parseInt(e.target.value)||0})} /></div>
                      <div><Label>Negotiated Advance</Label><Input type="number" value={mf.negotiatedAdvance} onChange={e => setMf({...mf, negotiatedAdvance: parseInt(e.target.value)||0})} /></div>
                    </div>
                  )}
                  {customers.length > 0 && (
                    <div><Label>Link to Customer</Label><Select value={mf.userId} onValueChange={v => setMf({...mf, userId: v})}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{customers.map(c => <SelectItem key={c.user_id} value={c.user_id}>{c.full_name} ({c.email})</SelectItem>)}</SelectContent></Select></div>
                  )}
                  <div><Label>Notes</Label><Textarea value={mf.notes} onChange={e => setMf({...mf, notes: e.target.value})} /></div>
                  <Button onClick={addManualEvent} disabled={!mf.clientName || !mf.clientEmail || !mf.clientMobile || !mf.eventDate || addingEvent} className="w-full font-sans">
                    {addingEvent ? "Adding..." : "Add Event"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showBlockDate} onOpenChange={setShowBlockDate}>
              <DialogTrigger asChild><Button size="sm" variant="outline" className="font-sans rounded-full"><CalendarIcon className="w-4 h-4 mr-1" />Block Date</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-display">Block a Date</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Calendar mode="single" selected={blockDate} onSelect={setBlockDate} className={cn("p-3 pointer-events-auto")} disabled={d => d < new Date()} />
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Start Time (optional)</Label><Input type="time" value={blockStartTime} onChange={e => setBlockStartTime(e.target.value)} /></div>
                    <div><Label>End Time (optional)</Label><Input type="time" value={blockEndTime} onChange={e => setBlockEndTime(e.target.value)} /></div>
                  </div>
                  <div><Label>Reason (optional)</Label><Input value={blockReason} onChange={e => setBlockReason(e.target.value)} /></div>
                  <Button onClick={addBlockedDate} disabled={!blockDate} className="w-full font-sans">Block This Date</Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showPricing} onOpenChange={setShowPricing}>
              <DialogTrigger asChild><Button size="sm" variant="outline" className="font-sans rounded-full"><Settings className="w-4 h-4 mr-1" />Pricing</Button></DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle className="font-display">Event Pricing Control</DialogTitle></DialogHeader>
                <p className="text-xs text-muted-foreground font-sans mb-3">Changes here reflect instantly on the website.</p>
                <div className="space-y-4">
                  {dbPricing.map(p => (
                    <Card key={p.id}>
                      <CardContent className="p-4 space-y-3">
                        <p className="font-sans font-semibold text-sm">{p.region === "mumbai" ? "🏙️ Mumbai" : "🌍 Outside Mumbai"} – {p.artist_count} Artist{p.artist_count > 1 ? "s" : ""}</p>
                        <div className="grid grid-cols-3 gap-2">
                          <div><Label className="text-xs">Total (₹)</Label><Input type="number" value={pricingEdits[p.id]?.total_price || ""} onChange={e => setPricingEdits({...pricingEdits, [p.id]: {...pricingEdits[p.id], total_price: e.target.value}})} /></div>
                          <div><Label className="text-xs">Advance (₹)</Label><Input type="number" value={pricingEdits[p.id]?.advance_amount || ""} onChange={e => setPricingEdits({...pricingEdits, [p.id]: {...pricingEdits[p.id], advance_amount: e.target.value}})} /></div>
                          <div><Label className="text-xs">Extra Hr (₹)</Label><Input type="number" value={pricingEdits[p.id]?.extra_hour_rate || ""} onChange={e => setPricingEdits({...pricingEdits, [p.id]: {...pricingEdits[p.id], extra_hour_rate: e.target.value}})} /></div>
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="flex-1"><Label className="text-xs">Valid Until</Label><Input type="date" value={pricingEdits[p.id]?.valid_until || ""} onChange={e => setPricingEdits({...pricingEdits, [p.id]: {...pricingEdits[p.id], valid_until: e.target.value}})} /></div>
                          <Button size="sm" onClick={() => savePricing(p.id)} className="font-sans"><Save className="w-3 h-3 mr-1" />Save</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-1.5">
          {["all", "upcoming", "completed", "cancelled"].map(s => (
            <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" className={`text-xs font-sans h-7 rounded-full ${statusFilter === s ? "admin-tab-active" : ""}`} onClick={() => setStatusFilter(s)}>
              {s === "all" ? `All (${events.length})` : `${EVENT_STATUS_LABELS[s]} (${events.filter(e => e.status === s).length})`}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["all", "pending", "partial_1_paid", "partial_2_paid", "confirmed", "fully_paid"].map(s => (
            <Button key={s} variant={paymentFilter === s ? "default" : "outline"} size="sm" className={`text-xs font-sans h-7 rounded-full ${paymentFilter === s ? "admin-tab-active" : ""}`} onClick={() => setPaymentFilter(s)}>
              {s === "all" ? "All Payments" : s === "partial_1_paid" ? "Partial 1" : s === "partial_2_paid" ? "Partial 2" : s === "confirmed" ? "Advance Paid" : s === "fully_paid" ? "Fully Paid" : "Pending"}
            </Button>
          ))}
          {["all", "mumbai", "outside"].map(s => (
            <Button key={s} variant={regionFilter === s ? "default" : "outline"} size="sm" className={`text-xs font-sans h-7 rounded-full ${regionFilter === s ? "admin-tab-active" : ""}`} onClick={() => setRegionFilter(s)}>
              {s === "all" ? "All Regions" : s === "mumbai" ? "Mumbai" : "Outside"}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs font-sans h-7 rounded-full">
                <CalendarIcon className="w-3 h-3 mr-1" />
                {calendarDate ? format(calendarDate, "dd MMM yyyy") : "Filter by Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={calendarDate} onSelect={setCalendarDate} className={cn("p-3 pointer-events-auto")} initialFocus />
            </PopoverContent>
          </Popover>
          {calendarDate && <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setCalendarDate(undefined)}><X className="w-3 h-3 mr-1" />Clear</Button>}
        </div>
      </div>

      {/* Blocked Dates */}
      {blockedDates.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="font-display text-sm">Blocked Dates</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {blockedDates.map((bd: any) => (
              <Badge key={bd.id} variant="outline" className="flex items-center gap-1 text-xs">
                {new Date(bd.blocked_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                {bd.blocked_start_time && ` ${bd.blocked_start_time}-${bd.blocked_end_time || ""}`}
                {bd.reason && ` - ${bd.reason}`}
                <button onClick={() => removeBlockedDate(bd.id)} className="ml-1 hover:text-destructive"><X className="w-3 h-3" /></button>
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Event List */}
       {loading ? <p className="text-center text-muted-foreground py-10">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-10">No events found</p> : (
        <div className="space-y-2">
          {filtered.map(ev => {
            const totalAmount = ev.negotiated && ev.negotiated_total ? ev.negotiated_total : ev.total_price;
            const advanceAmt = ev.negotiated && ev.negotiated_advance ? ev.negotiated_advance : ev.advance_amount;
            const remainingAmt = totalAmount - advanceAmt;
            const isExpanded = expandedEvent === ev.id;

            return (
              <Card key={ev.id} className="overflow-hidden">
                {/* Compact Summary Row */}
                <div className="p-3 md:p-4">
                  <div className="flex items-center gap-2 md:gap-4 flex-wrap">
                    {/* Name & Date */}
                    <div className="flex-1 min-w-[120px]">
                      <p className="font-sans font-semibold text-sm truncate">{ev.client_name}</p>
                      <p className="text-[11px] text-muted-foreground font-sans">
                        {new Date(ev.event_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} · {ev.event_start_time}
                      </p>
                    </div>
                    {/* City */}
                    <div className="hidden md:block min-w-[80px]">
                      <p className="text-xs text-muted-foreground font-sans">{ev.city}</p>
                    </div>
                    {/* Badges */}
                    <div className="flex gap-1 flex-wrap">
                      <Badge className={`${EVENT_STATUS_COLORS[ev.status]} border-none text-[10px] h-5`}>{EVENT_STATUS_LABELS[ev.status]}</Badge>
                      <Badge className={`border-none text-[10px] h-5 ${ev.payment_status === "fully_paid" ? "bg-green-100 text-green-800" : ev.payment_status === "confirmed" ? "bg-blue-100 text-blue-800" : ev.payment_status === "partial_1_paid" ? "bg-orange-100 text-orange-800" : "bg-red-100 text-red-800"}`}>
                        {ev.payment_status === "fully_paid" ? "Paid ✅" : ev.payment_status === "confirmed" ? "Advance ✅" : ev.payment_status === "partial_1_paid" ? "Partial 1" : "Pending"}
                      </Badge>
                    </div>
                    {/* Amount */}
                    <p className="font-display font-bold text-sm text-primary min-w-[70px] text-right">{formatPrice(totalAmount)}</p>
                    {/* View Details Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 gap-1 font-sans"
                      onClick={() => setExpandedEvent(isExpanded ? null : ev.id)}
                    >
                      <Eye className="w-3 h-3" />
                      <span className="hidden sm:inline">{isExpanded ? "Hide" : "View"}</span>
                      <ChevronDown className={cn("w-3 h-3 transition-transform", isExpanded && "rotate-180")} />
                    </Button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <CardContent className="pt-0 pb-4 px-3 md:px-4 border-t border-border space-y-3">
                    {/* Client Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground font-sans uppercase tracking-wide">Client Info</p>
                        <p className="text-sm font-sans">{ev.client_name}</p>
                        <p className="text-xs text-muted-foreground font-sans">{ev.client_email} · +91{ev.client_mobile}</p>
                        {ev.client_instagram && <p className="text-xs text-muted-foreground font-sans">IG: {ev.client_instagram}</p>}
                        <p className="text-xs text-muted-foreground font-sans">Booked: {new Date(ev.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground font-sans uppercase tracking-wide">Event Details</p>
                        <p className="text-sm font-sans capitalize">{EVENT_TYPES.find(t => t.value === ev.event_type)?.label || ev.event_type}</p>
                        <p className="text-xs text-muted-foreground font-sans">
                          {new Date(ev.event_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} · {ev.event_start_time} - {ev.event_end_time}
                        </p>
                        <p className="text-xs text-muted-foreground font-sans">{ev.venue_name}, {ev.city}, {ev.state} - {ev.pincode}</p>
                        <p className="text-xs text-muted-foreground font-sans">{ev.artist_count} Artist{ev.artist_count > 1 ? "s" : ""} · {ev.is_mumbai ? "Mumbai" : "Pan India"}</p>
                        {ev.extra_hours > 0 && <p className="text-xs text-muted-foreground font-sans">Extra Hours: {ev.extra_hours}</p>}
                      </div>
                    </div>

                    {/* Payment Info */}
                    <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground font-sans uppercase tracking-wide">Payment</p>
                      {ev.payment_status === "fully_paid" ? (
                        <p className="text-sm font-semibold text-green-700 font-sans">✅ Payment Fully Paid — {formatPrice(totalAmount)}</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 text-sm font-sans">
                          <div>
                            <span className="text-muted-foreground">Advance:</span>{" "}
                            <span className="font-semibold">{formatPrice(advanceAmt)}</span>{" "}
                            <span className={`text-xs font-semibold ${ev.payment_status === "confirmed" ? "text-green-600" : ev.payment_status === "partial_1_paid" ? "text-orange-600" : "text-red-600"}`}>
                              ({ev.payment_status === "confirmed" ? "Paid ✅" : ev.payment_status === "partial_1_paid" ? "Partial 1 ✅" : "Unpaid"})
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Remaining:</span>{" "}
                            <span className="font-semibold">{formatPrice(remainingAmt)}</span>{" "}
                            <span className="text-xs font-semibold text-red-600">(Unpaid)</span>
                          </div>
                        </div>
                      )}
                      {ev.negotiated && ev.negotiated_total && ev.negotiated_total !== ev.total_price && (
                        <p className="text-xs text-muted-foreground font-sans">Original: <span className="line-through">{formatPrice(ev.total_price)}</span> → Negotiated</p>
                      )}
                    </div>

                    {ev.notes && (
                      <div className="text-xs text-muted-foreground font-sans"><span className="font-semibold">Notes:</span> {ev.notes}</div>
                    )}

                    {/* Revenue Widget */}
                    <EventRevenueWidget
                      totalAmount={ev.total_price}
                      advanceAmount={ev.advance_amount}
                      paymentStatus={ev.payment_status}
                      negotiated={ev.negotiated}
                      negotiatedTotal={ev.negotiated_total}
                      negotiatedAdvance={ev.negotiated_advance}
                      advanceDate={paymentDates[ev.id]?.advance_date}
                      fullPaymentDate={paymentDates[ev.id]?.full_date}
                    />

                    {ev.status === "completed" && (
                      <EventCompletionNotice
                        event={ev}
                        assignedArtists={getEventArtists(ev.id).map(aid => ({ name: artists.find(a => a.id === aid)?.name || "Unknown" }))}
                      />
                    )}

                    {/* Action Controls */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                      <Select value={ev.status} onValueChange={v => updateEventStatus(ev.id, v)}>
                        <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(EVENT_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select value={ev.payment_status} onValueChange={v => updatePaymentStatus(ev.id, v)}>
                        <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="partial_1_paid">Partial 1 Paid</SelectItem>
                          <SelectItem value="partial_2_paid">Partial 2 Paid</SelectItem>
                          <SelectItem value="confirmed">Advance Received</SelectItem>
                          <SelectItem value="fully_paid">Fully Paid</SelectItem>
                          <SelectItem value="refunded">Refunded</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => { setEditingEventId(ev.id); setEditEventData(ev); }}>
                        <Edit2 className="w-3 h-3 mr-1" />Edit
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => { setNegotiateId(ev.id); setNegTotal(String(ev.negotiated_total || ev.total_price)); setNegAdvance(String(ev.negotiated_advance || ev.advance_amount)); }}>
                        <DollarSign className="w-3 h-3 mr-1" />Negotiate
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="destructive" size="sm" className="text-xs h-8"><Trash2 className="w-3 h-3" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete Event?</AlertDialogTitle><AlertDialogDescription>Permanently delete this event booking.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteEvent(ev.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>

                    {/* Artist Assignment */}
                    <div className="space-y-1 pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground font-sans">Assign Artists ({ev.artist_count} needed):</p>
                      <div className="flex flex-wrap gap-1">
                        {artists.map(a => {
                          const assigned = getEventArtists(ev.id).includes(a.id);
                          return (
                            <Button
                              key={a.id}
                              size="sm"
                              variant={assigned ? "default" : "outline"}
                              className={`text-xs h-7 rounded-full ${assigned ? "bg-primary" : ""}`}
                              onClick={() => toggleArtistAssignment(ev.id, a.id, assigned)}
                            >
                              {a.name} {assigned ? "✓" : "+"}
                            </Button>
                          );
                        })}
                      </div>
                      {getEventArtists(ev.id).length > 0 && (
                        <p className="text-xs text-green-600 font-sans">{getEventArtists(ev.id).length}/{ev.artist_count} artists assigned</p>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Negotiate Dialog */}
      {negotiateId && (
        <div className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4" onClick={() => setNegotiateId(null)}>
          <Card className="w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <CardHeader><CardTitle className="font-display text-lg">Negotiate Event Price</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Total Amount (₹)</Label><Input type="number" value={negTotal} onChange={e => setNegTotal(e.target.value)} /></div>
              <div><Label>Advance Amount (₹)</Label><Input type="number" value={negAdvance} onChange={e => setNegAdvance(e.target.value)} /></div>
              <div className="flex gap-2">
                <Button onClick={saveNegotiation} className="flex-1 font-sans"><Save className="w-4 h-4 mr-1" />Save</Button>
                <Button variant="ghost" onClick={() => setNegotiateId(null)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Event Dialog */}
      {editingEventId && (
        <div className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4" onClick={() => setEditingEventId(null)}>
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <CardHeader><CardTitle className="font-display text-lg">Edit Event Details</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Client Name</Label><Input value={editEventData.client_name || ""} onChange={e => setEditEventData({...editEventData, client_name: e.target.value})} /></div>
                <div><Label className="text-xs">Mobile</Label><Input value={editEventData.client_mobile || ""} onChange={e => { const d = e.target.value.replace(/\D/g,""); if(d.length<=10) setEditEventData({...editEventData, client_mobile: d}); }} maxLength={10} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Email</Label><Input type="email" value={editEventData.client_email || ""} onChange={e => setEditEventData({...editEventData, client_email: e.target.value})} /></div>
                <div><Label className="text-xs">Instagram</Label><Input value={editEventData.client_instagram || ""} onChange={e => setEditEventData({...editEventData, client_instagram: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Event Type</Label><Input value={editEventData.event_type || ""} onChange={e => setEditEventData({...editEventData, event_type: e.target.value})} /></div>
                <div><Label className="text-xs">Event Date</Label><Input type="date" value={editEventData.event_date || ""} onChange={e => setEditEventData({...editEventData, event_date: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Start Time</Label><Input type="time" value={editEventData.event_start_time || ""} onChange={e => setEditEventData({...editEventData, event_start_time: e.target.value})} /></div>
                <div><Label className="text-xs">End Time</Label><Input type="time" value={editEventData.event_end_time || ""} onChange={e => setEditEventData({...editEventData, event_end_time: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">State</Label><Input value={editEventData.state || ""} onChange={e => setEditEventData({...editEventData, state: e.target.value})} /></div>
                <div><Label className="text-xs">City</Label><Input value={editEventData.city || ""} onChange={e => setEditEventData({...editEventData, city: e.target.value})} /></div>
              </div>
              <div><Label className="text-xs">Venue Name</Label><Input value={editEventData.venue_name || ""} onChange={e => setEditEventData({...editEventData, venue_name: e.target.value})} /></div>
              <div><Label className="text-xs">Full Address</Label><Input value={editEventData.full_address || ""} onChange={e => setEditEventData({...editEventData, full_address: e.target.value})} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs">Pincode</Label><Input value={editEventData.pincode || ""} onChange={e => { const d = e.target.value.replace(/\D/g,""); if(d.length<=6) setEditEventData({...editEventData, pincode: d}); }} maxLength={6} /></div>
                <div><Label className="text-xs">Artists</Label><Input type="number" min={1} max={5} value={editEventData.artist_count || 1} onChange={e => setEditEventData({...editEventData, artist_count: parseInt(e.target.value)||1})} /></div>
                <div><Label className="text-xs">Extra Hrs</Label><Input type="number" min={0} value={editEventData.extra_hours || 0} onChange={e => setEditEventData({...editEventData, extra_hours: parseInt(e.target.value)||0})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Total Price (₹)</Label><Input type="number" value={editEventData.total_price || 0} onChange={e => setEditEventData({...editEventData, total_price: parseInt(e.target.value)||0})} /></div>
                <div><Label className="text-xs">Advance (₹)</Label><Input type="number" value={editEventData.advance_amount || 0} onChange={e => setEditEventData({...editEventData, advance_amount: parseInt(e.target.value)||0})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Remaining (₹)</Label><Input type="number" value={editEventData.remaining_amount ?? ((editEventData.total_price || 0) - (editEventData.advance_amount || 0))} onChange={e => setEditEventData({...editEventData, remaining_amount: parseInt(e.target.value)||0})} /></div>
                <div>
                  <Label className="text-xs">Payment Status</Label>
                  <Select value={editEventData.payment_status || "pending"} onValueChange={v => setEditEventData({...editEventData, payment_status: v})}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="partial_1_paid">Partial 1 Paid</SelectItem>
                      <SelectItem value="partial_2_paid">Partial 2 Paid</SelectItem>
                      <SelectItem value="confirmed">Advance Received</SelectItem>
                      <SelectItem value="fully_paid">Fully Paid</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label className="text-xs">Notes</Label><Textarea value={editEventData.notes || ""} onChange={e => setEditEventData({...editEventData, notes: e.target.value})} /></div>
              <div className="flex gap-2">
                <Button onClick={saveEventEdit} className="flex-1 font-sans"><Save className="w-4 h-4 mr-1" />Save Changes</Button>
                <Button variant="ghost" onClick={() => setEditingEventId(null)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminEvents;
