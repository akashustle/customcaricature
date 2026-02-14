import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/pricing";
import { EVENT_TYPES, EVENT_STATUS_LABELS, EVENT_STATUS_COLORS, INDIA_STATES_CITIES, getEventPrice } from "@/lib/event-data";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  CalendarIcon, Plus, Search, Eye, Trash2, DollarSign, X, Save, Edit2, MapPin, Users, Calendar as CalIcon,
} from "lucide-react";

type EventBooking = {
  id: string;
  user_id: string | null;
  client_name: string;
  client_mobile: string;
  client_email: string;
  client_instagram: string | null;
  event_type: string;
  event_date: string;
  event_start_time: string;
  event_end_time: string;
  state: string;
  city: string;
  full_address: string;
  venue_name: string;
  pincode: string;
  artist_count: number;
  is_mumbai: boolean;
  total_price: number;
  advance_amount: number;
  remaining_amount: number;
  extra_hours: number;
  negotiated: boolean;
  negotiated_total: number | null;
  negotiated_advance: number | null;
  payment_status: string;
  status: string;
  notes: string | null;
  created_at: string;
};

type Profile = { user_id: string; full_name: string; email: string; mobile: string; };

const AdminEvents = ({ customers }: { customers: Profile[] }) => {
  const [events, setEvents] = useState<EventBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [calendarDate, setCalendarDate] = useState<Date>();
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [negotiateId, setNegotiateId] = useState<string | null>(null);
  const [negTotal, setNegTotal] = useState("");
  const [negAdvance, setNegAdvance] = useState("");

  // Manual event form
  const [mf, setMf] = useState({
    clientName: "", clientMobile: "", clientEmail: "", clientInstagram: "",
    eventType: "wedding", eventDate: "", startTime: "10:00", endTime: "18:00",
    state: "", city: "", fullAddress: "", venueName: "", pincode: "",
    artistCount: 1, totalPrice: 30000, advancePaid: 20000,
    paymentStatus: "pending", negotiated: false, negotiatedTotal: 0, negotiatedAdvance: 0,
    notes: "", extraHours: 0, userId: "",
  });
  const [addingEvent, setAddingEvent] = useState(false);

  // Blocked dates management
  const [showBlockDate, setShowBlockDate] = useState(false);
  const [blockDate, setBlockDate] = useState<Date>();
  const [blockReason, setBlockReason] = useState("");
  const [blockedDates, setBlockedDates] = useState<any[]>([]);

  useEffect(() => {
    fetchEvents();
    fetchBlockedDates();
    const ch = supabase.channel("admin-events").on("postgres_changes", { event: "*", schema: "public", table: "event_bookings" }, () => fetchEvents()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchEvents = async () => {
    const { data } = await supabase.from("event_bookings").select("*").order("event_date", { ascending: false });
    if (data) setEvents(data as any);
    setLoading(false);
  };

  const fetchBlockedDates = async () => {
    const { data } = await supabase.from("artist_blocked_dates").select("*").order("blocked_date", { ascending: false });
    if (data) setBlockedDates(data);
  };

  const addBlockedDate = async () => {
    if (!blockDate) return;
    await supabase.from("artist_blocked_dates").insert({ blocked_date: format(blockDate, "yyyy-MM-dd"), reason: blockReason || null } as any);
    toast({ title: "Date Blocked" });
    setShowBlockDate(false);
    setBlockDate(undefined);
    setBlockReason("");
    fetchBlockedDates();
  };

  const removeBlockedDate = async (id: string) => {
    await supabase.from("artist_blocked_dates").delete().eq("id", id);
    toast({ title: "Date Unblocked" });
    fetchBlockedDates();
  };

  const updateEventStatus = async (id: string, status: string) => {
    await supabase.from("event_bookings").update({ status } as any).eq("id", id);
    toast({ title: "Status Updated" });
    fetchEvents();
  };

  const updatePaymentStatus = async (id: string, ps: string) => {
    await supabase.from("event_bookings").update({ payment_status: ps } as any).eq("id", id);
    toast({ title: "Payment Status Updated" });
    fetchEvents();
  };

  const deleteEvent = async (id: string) => {
    await supabase.from("event_bookings").delete().eq("id", id);
    toast({ title: "Event Deleted" });
    fetchEvents();
  };

  const saveNegotiation = async () => {
    if (!negotiateId) return;
    await supabase.from("event_bookings").update({
      negotiated: true,
      negotiated_total: parseInt(negTotal) || 0,
      negotiated_advance: parseInt(negAdvance) || 0,
    } as any).eq("id", negotiateId);
    toast({ title: "Negotiation Saved" });
    setNegotiateId(null);
    fetchEvents();
  };

  const addManualEvent = async () => {
    if (!mf.clientName || !mf.clientEmail || !mf.clientMobile || !mf.eventDate) return;
    setAddingEvent(true);
    try {
      const isMumbai = mf.state === "Maharashtra" && mf.city === "Mumbai";
      await supabase.from("event_bookings").insert({
        user_id: mf.userId || null,
        client_name: mf.clientName,
        client_mobile: mf.clientMobile,
        client_email: mf.clientEmail,
        client_instagram: mf.clientInstagram || null,
        event_type: mf.eventType,
        event_date: mf.eventDate,
        event_start_time: mf.startTime,
        event_end_time: mf.endTime,
        state: mf.state,
        city: mf.city,
        full_address: mf.fullAddress,
        venue_name: mf.venueName,
        pincode: mf.pincode,
        artist_count: mf.artistCount,
        is_mumbai: isMumbai,
        total_price: mf.negotiated ? mf.negotiatedTotal : mf.totalPrice,
        advance_amount: mf.negotiated ? mf.negotiatedAdvance : mf.advancePaid,
        extra_hours: mf.extraHours,
        negotiated: mf.negotiated,
        negotiated_total: mf.negotiated ? mf.negotiatedTotal : null,
        negotiated_advance: mf.negotiated ? mf.negotiatedAdvance : null,
        payment_status: mf.paymentStatus,
        notes: mf.notes || null,
      } as any);
      toast({ title: "Event Added!" });
      setShowAddEvent(false);
      setMf({ clientName: "", clientMobile: "", clientEmail: "", clientInstagram: "", eventType: "wedding", eventDate: "", startTime: "10:00", endTime: "18:00", state: "", city: "", fullAddress: "", venueName: "", pincode: "", artistCount: 1, totalPrice: 30000, advancePaid: 20000, paymentStatus: "pending", negotiated: false, negotiatedTotal: 0, negotiatedAdvance: 0, notes: "", extraHours: 0, userId: "" });
      fetchEvents();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAddingEvent(false);
    }
  };

  const formatDateTime = (dateStr: string) => new Date(dateStr).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });

  const filtered = events.filter(e => {
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (search && !e.client_name.toLowerCase().includes(search.toLowerCase()) && !e.id.toLowerCase().includes(search.toLowerCase())) return false;
    if (calendarDate && new Date(e.event_date).toDateString() !== calendarDate.toDateString()) return false;
    return true;
  });

  const upcoming = events.filter(e => e.status === "upcoming").length;
  const completed = events.filter(e => e.status === "completed").length;
  const cancelled = events.filter(e => e.status === "cancelled").length;
  const mumbaiEvents = events.filter(e => e.is_mumbai).length;
  const outsideEvents = events.filter(e => !e.is_mumbai).length;

  return (
    <div className="space-y-4">
      {/* Widgets */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total", value: events.length, color: "text-foreground" },
          { label: "Upcoming", value: upcoming, color: "text-blue-600" },
          { label: "Completed", value: completed, color: "text-green-600" },
          { label: "Cancelled", value: cancelled, color: "text-red-600" },
          { label: "Mumbai", value: mumbaiEvents, color: "text-purple-600" },
          { label: "Outside", value: outsideEvents, color: "text-orange-600" },
        ].map(w => (
          <Card key={w.label}>
            <CardContent className="p-3 text-center">
              <p className={`text-2xl font-bold font-display ${w.color}`}>{w.value}</p>
              <p className="text-xs text-muted-foreground font-sans">{w.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name or ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 font-sans" />
          </div>
          <div className="flex gap-2">
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
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Start Time</Label><Input type="time" value={mf.startTime} onChange={e => setMf({...mf, startTime: e.target.value})} /></div>
                    <div><Label>End Time</Label><Input type="time" value={mf.endTime} onChange={e => setMf({...mf, endTime: e.target.value})} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>State</Label>
                      <Select value={mf.state} onValueChange={v => setMf({...mf, state: v, city: ""})}>
                        <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
                        <SelectContent>{Object.keys(INDIA_STATES_CITIES).sort().map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>City</Label>
                      <Select value={mf.city} onValueChange={v => setMf({...mf, city: v})} disabled={!mf.state}>
                        <SelectTrigger><SelectValue placeholder="City" /></SelectTrigger>
                        <SelectContent>{(INDIA_STATES_CITIES[mf.state]||[]).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Venue Name</Label><Input value={mf.venueName} onChange={e => setMf({...mf, venueName: e.target.value})} /></div>
                  <div><Label>Full Address</Label><Input value={mf.fullAddress} onChange={e => setMf({...mf, fullAddress: e.target.value})} /></div>
                  <div><Label>Pincode</Label><Input value={mf.pincode} onChange={e => { const d = e.target.value.replace(/\D/g,""); if(d.length<=6) setMf({...mf, pincode: d}); }} maxLength={6} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Artist Count</Label><Select value={String(mf.artistCount)} onValueChange={v => setMf({...mf, artistCount: parseInt(v)})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">1 Artist</SelectItem><SelectItem value="2">2 Artists</SelectItem></SelectContent></Select></div>
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
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={mf.negotiated} onCheckedChange={c => setMf({...mf, negotiated: !!c})} />
                    <Label>Negotiated</Label>
                  </div>
                  {mf.negotiated && (
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Negotiated Total</Label><Input type="number" value={mf.negotiatedTotal} onChange={e => setMf({...mf, negotiatedTotal: parseInt(e.target.value)||0})} /></div>
                      <div><Label>Negotiated Advance</Label><Input type="number" value={mf.negotiatedAdvance} onChange={e => setMf({...mf, negotiatedAdvance: parseInt(e.target.value)||0})} /></div>
                    </div>
                  )}
                  {customers.length > 0 && (
                    <div>
                      <Label>Link to Customer (optional)</Label>
                      <Select value={mf.userId} onValueChange={v => setMf({...mf, userId: v})}>
                        <SelectTrigger><SelectValue placeholder="Select customer..." /></SelectTrigger>
                        <SelectContent>{customers.map(c => <SelectItem key={c.user_id} value={c.user_id}>{c.full_name} ({c.email})</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
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
                  <div><Label>Reason (optional)</Label><Input value={blockReason} onChange={e => setBlockReason(e.target.value)} /></div>
                  <Button onClick={addBlockedDate} disabled={!blockDate} className="w-full font-sans">Block This Date</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-1.5">
          {["all", "upcoming", "completed", "cancelled"].map(s => (
            <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" className="text-xs font-sans h-7 rounded-full" onClick={() => setStatusFilter(s)}>
              {s === "all" ? `All (${events.length})` : `${EVENT_STATUS_LABELS[s]} (${events.filter(e => e.status === s).length})`}
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
            {blockedDates.map(bd => (
              <Badge key={bd.id} variant="outline" className="flex items-center gap-1 text-xs">
                {new Date(bd.blocked_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                {bd.reason && ` - ${bd.reason}`}
                <button onClick={() => removeBlockedDate(bd.id)} className="ml-1 hover:text-destructive"><X className="w-3 h-3" /></button>
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Event List */}
      {loading ? <p className="text-center text-muted-foreground py-10">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-10">No events found</p> : (
        <div className="space-y-3">
          {filtered.map(ev => (
            <Card key={ev.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-sans font-semibold">{ev.client_name}</p>
                    <p className="text-xs text-muted-foreground font-sans">{ev.client_email} · +91{ev.client_mobile}</p>
                    {ev.client_instagram && <p className="text-xs text-muted-foreground font-sans">IG: {ev.client_instagram}</p>}
                    <p className="text-xs text-muted-foreground font-sans mt-1">Booked: {formatDateTime(ev.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-sans font-medium text-primary">
                      {formatPrice(ev.negotiated && ev.negotiated_total ? ev.negotiated_total : ev.total_price)}
                    </p>
                    {ev.negotiated && ev.negotiated_total && ev.negotiated_total !== ev.total_price && (
                      <p className="text-xs text-muted-foreground line-through">{formatPrice(ev.total_price)}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge className="border-none text-xs bg-purple-100 text-purple-800">{EVENT_TYPES.find(t => t.value === ev.event_type)?.label}</Badge>
                  <Badge className={`${EVENT_STATUS_COLORS[ev.status]} border-none text-xs`}>{EVENT_STATUS_LABELS[ev.status]}</Badge>
                  <Badge className={`border-none text-xs ${ev.payment_status === "confirmed" ? "bg-green-100 text-green-800" : ev.payment_status === "partial" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}`}>
                    Pay: {ev.payment_status}
                  </Badge>
                  {ev.negotiated && <Badge className="border-none text-xs bg-indigo-100 text-indigo-800">Negotiated</Badge>}
                  <Badge variant="outline" className="text-xs">{ev.artist_count} Artist{ev.artist_count > 1 ? "s" : ""}</Badge>
                  <Badge variant="outline" className="text-xs">{ev.is_mumbai ? "Mumbai" : "Pan India"}</Badge>
                </div>

                <div className="text-sm font-sans space-y-1">
                  <p><span className="text-muted-foreground">Event:</span> {new Date(ev.event_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} · {ev.event_start_time} - {ev.event_end_time}</p>
                  <p><span className="text-muted-foreground">Location:</span> {ev.venue_name}, {ev.city}, {ev.state} - {ev.pincode}</p>
                  <p><span className="text-muted-foreground">Advance:</span> {formatPrice(ev.negotiated && ev.negotiated_advance ? ev.negotiated_advance : ev.advance_amount)} · <span className="text-muted-foreground">Remaining:</span> {formatPrice((ev.negotiated && ev.negotiated_total ? ev.negotiated_total : ev.total_price) - (ev.negotiated && ev.negotiated_advance ? ev.negotiated_advance : ev.advance_amount))}</p>
                  {ev.extra_hours > 0 && <p><span className="text-muted-foreground">Extra Hours:</span> {ev.extra_hours}</p>}
                  {ev.notes && <p><span className="text-muted-foreground">Notes:</span> {ev.notes}</p>}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Select value={ev.status} onValueChange={v => updateEventStatus(ev.id, v)}>
                    <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(EVENT_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={ev.payment_status} onValueChange={v => updatePaymentStatus(ev.id, v)}>
                    <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                    </SelectContent>
                  </Select>
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
              </CardContent>
            </Card>
          ))}
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
    </div>
  );
};

export default AdminEvents;
