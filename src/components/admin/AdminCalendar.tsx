import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/pricing";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, parseISO, isBefore, isAfter, differenceInDays } from "date-fns";
import {
  ChevronLeft, ChevronRight, Calendar, Plus, Eye, MapPin, Users, DollarSign,
  Clock, Star, Package, TrendingUp, Target, Zap, Activity, AlertTriangle,
  CalendarDays, ArrowUp, ArrowDown, X, Loader2
} from "lucide-react";

type CalendarEvent = {
  id: string; title: string; date: string; type: "event" | "order_delivery" | "manual" | "blocked";
  color: string; details: any;
};

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const AdminCalendar = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [blockedDates, setBlockedDates] = useState<any[]>([]);
  const [manualEvents, setManualEvents] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddManual, setShowAddManual] = useState(false);
  const [manualForm, setManualForm] = useState({ title: "", description: "", date: "", time: "", type: "reminder" });
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
    const ch = supabase.channel("admin-calendar-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "event_bookings" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "artist_blocked_dates" }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchAll = async () => {
    const [ev, ord, blocked, manual] = await Promise.all([
      supabase.from("event_bookings").select("*").order("event_date"),
      supabase.from("orders").select("*").order("expected_delivery_date"),
      supabase.from("artist_blocked_dates").select("*"),
      supabase.from("admin_site_settings").select("*").eq("id", "calendar_manual_events"),
    ]);
    if (ev.data) setEvents(ev.data);
    if (ord.data) setOrders(ord.data);
    if (blocked.data) setBlockedDates(blocked.data);
    if (manual.data?.[0]) {
      try { setManualEvents(JSON.parse(JSON.stringify(manual.data[0].value)) || []); } catch { setManualEvents([]); }
    }
    setLoading(false);
  };

  const calendarEvents = useMemo<CalendarEvent[]>(() => {
    const items: CalendarEvent[] = [];
    events.forEach(e => {
      items.push({
        id: e.id, title: `🎉 ${e.client_name} - ${e.event_type}`, date: e.event_date,
        type: "event", color: e.status === "completed" ? "bg-emerald-500" : e.status === "cancelled" ? "bg-red-400" : "bg-indigo-500",
        details: e,
      });
    });
    orders.forEach(o => {
      if (o.expected_delivery_date) {
        items.push({
          id: o.id, title: `📦 ${o.customer_name || "Order"}`, date: o.expected_delivery_date,
          type: "order_delivery", color: o.status === "delivered" ? "bg-emerald-500" : "bg-amber-500",
          details: o,
        });
      }
    });
    blockedDates.forEach(b => {
      items.push({
        id: b.id, title: `🚫 ${b.reason || "Blocked"}`, date: b.blocked_date,
        type: "blocked", color: "bg-red-500", details: b,
      });
    });
    manualEvents.forEach((m: any) => {
      items.push({
        id: m.id || crypto.randomUUID(), title: `📌 ${m.title}`, date: m.date,
        type: "manual", color: "bg-violet-500", details: m,
      });
    });
    return items;
  }, [events, orders, blockedDates, manualEvents]);

  const getEventsForDate = (date: Date) => calendarEvents.filter(e => isSameDay(parseISO(e.date), date));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  // Analytics
  const thisMonthEvents = events.filter(e => {
    const d = parseISO(e.event_date);
    return isSameMonth(d, currentMonth);
  });
  const thisMonthOrders = orders.filter(o => {
    if (!o.expected_delivery_date) return false;
    return isSameMonth(parseISO(o.expected_delivery_date), currentMonth);
  });
  const upcomingEvents = events.filter(e => isAfter(parseISO(e.event_date), new Date()) && e.status !== "cancelled");
  const nextEvent = upcomingEvents.sort((a, b) => a.event_date.localeCompare(b.event_date))[0];
  const daysToNext = nextEvent ? differenceInDays(parseISO(nextEvent.event_date), new Date()) : null;
  const thisMonthRevenue = thisMonthEvents.filter(e => ["confirmed", "fully_paid"].includes(e.payment_status))
    .reduce((s: number, e: any) => s + (e.negotiated_total || e.total_price), 0);
  const busyDays = new Set(calendarEvents.map(e => e.date)).size;
  const blockedCount = blockedDates.filter(b => isSameMonth(parseISO(b.blocked_date), currentMonth)).length;

  const addManualEvent = async () => {
    if (!manualForm.title || !manualForm.date) return;
    const newEvent = { id: crypto.randomUUID(), ...manualForm, created_at: new Date().toISOString() };
    const updated = [...manualEvents, newEvent];
    await supabase.from("admin_site_settings").upsert({ id: "calendar_manual_events", value: updated as any });
    setManualEvents(updated);
    setShowAddManual(false);
    setManualForm({ title: "", description: "", date: "", time: "", type: "reminder" });
    toast({ title: "Event Added to Calendar! 📅" });
  };

  const deleteManualEvent = async (id: string) => {
    const updated = manualEvents.filter((m: any) => m.id !== id);
    await supabase.from("admin_site_settings").upsert({ id: "calendar_manual_events", value: updated as any });
    setManualEvents(updated);
    toast({ title: "Manual Event Removed" });
  };

  const widgets = [
    { icon: Calendar, label: "This Month Events", value: thisMonthEvents.length, gradient: "from-indigo-50 to-blue-50", iconBg: "from-indigo-500 to-blue-500", border: "border-l-indigo-500" },
    { icon: Package, label: "Deliveries Due", value: thisMonthOrders.length, gradient: "from-amber-50 to-orange-50", iconBg: "from-amber-500 to-orange-500", border: "border-l-amber-500" },
    { icon: DollarSign, label: "Month Revenue", value: formatPrice(thisMonthRevenue), gradient: "from-emerald-50 to-green-50", iconBg: "from-emerald-500 to-green-500", border: "border-l-emerald-500" },
    { icon: Target, label: "Upcoming Events", value: upcomingEvents.length, gradient: "from-violet-50 to-purple-50", iconBg: "from-violet-500 to-purple-500", border: "border-l-violet-500" },
    { icon: Clock, label: "Next Event In", value: daysToNext !== null ? `${daysToNext}d` : "—", gradient: "from-cyan-50 to-teal-50", iconBg: "from-cyan-500 to-teal-500", border: "border-l-cyan-500" },
    { icon: Activity, label: "Busy Days", value: busyDays, gradient: "from-pink-50 to-rose-50", iconBg: "from-pink-500 to-rose-500", border: "border-l-pink-500" },
    { icon: AlertTriangle, label: "Blocked Dates", value: blockedCount, gradient: "from-red-50 to-orange-50", iconBg: "from-red-500 to-orange-500", border: "border-l-red-500" },
    { icon: Zap, label: "Total Events", value: events.length, gradient: "from-yellow-50 to-amber-50", iconBg: "from-yellow-500 to-amber-500", border: "border-l-yellow-500" },
  ];

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-display font-bold flex items-center gap-2"><CalendarDays className="w-6 h-6 text-primary" />Calendar</h2>
          <p className="text-sm text-muted-foreground font-sans">Events, deliveries & schedules at a glance</p>
        </div>
        <div className="flex gap-2">
          <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="month">Month</SelectItem><SelectItem value="week">Week</SelectItem></SelectContent>
          </Select>
          <Button onClick={() => setShowAddManual(true)} size="sm" className="rounded-full font-sans"><Plus className="w-4 h-4 mr-1" />Add Event</Button>
        </div>
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {widgets.map((w, i) => (
          <motion.div key={w.label} initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.03, type: "spring", stiffness: 300, damping: 25 }}
            whileHover={{ y: -4, scale: 1.03 }} className="cursor-pointer">
            <div className={`admin-widget-3d bg-gradient-to-br ${w.gradient} border-l-4 ${w.border}`}>
              <div className="p-2.5">
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${w.iconBg} flex items-center justify-center shadow-lg mb-1.5`}>
                  <w.icon className="w-3.5 h-3.5 text-white" />
                </div>
                <p className="text-base font-extrabold text-foreground leading-tight truncate">{w.value}</p>
                <p className="text-[9px] text-muted-foreground font-sans font-medium">{w.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Calendar Grid */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="w-5 h-5" /></Button>
            <div className="text-center">
              <CardTitle className="text-lg font-display">{MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}</CardTitle>
              <p className="text-xs text-muted-foreground font-sans">{thisMonthEvents.length} events · {thisMonthOrders.length} deliveries</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="w-5 h-5" /></Button>
          </div>
        </CardHeader>
        <CardContent className="p-2">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-px mb-1">
            {DAY_NAMES.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-muted-foreground py-1 font-sans">{d}</div>
            ))}
          </div>
          {/* Calendar cells */}
          <div className="grid grid-cols-7 gap-px">
            {calDays.map((day, idx) => {
              const dayEvents = getEventsForDate(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isCurrentDay = isToday(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              return (
                <motion.div
                  key={idx}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setSelectedDate(day)}
                  className={`min-h-[72px] md:min-h-[90px] p-1 rounded-lg cursor-pointer transition-all border ${
                    isSelected ? "border-primary bg-primary/5 ring-2 ring-primary/20" :
                    isCurrentDay ? "border-primary/30 bg-primary/5" :
                    isCurrentMonth ? "border-border/40 hover:border-primary/30 hover:bg-muted/30" :
                    "border-transparent opacity-40"
                  }`}
                >
                  <p className={`text-xs font-bold text-right ${isCurrentDay ? "text-primary" : isCurrentMonth ? "text-foreground" : "text-muted-foreground"}`}>
                    {format(day, "d")}
                  </p>
                  <div className="space-y-0.5 mt-0.5">
                    {dayEvents.slice(0, 3).map((ev, i) => (
                      <div key={i} onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); }}
                        className={`${ev.color} text-white text-[8px] md:text-[9px] px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80`}>
                        {ev.title.substring(0, 20)}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <p className="text-[8px] text-muted-foreground font-medium text-center">+{dayEvents.length - 3} more</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Details */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-display">{format(selectedDate, "EEEE, MMMM d, yyyy")}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedDate(null)}><X className="w-4 h-4" /></Button>
                </div>
              </CardHeader>
              <CardContent>
                {getEventsForDate(selectedDate).length === 0 ? (
                  <p className="text-sm text-muted-foreground font-sans py-4 text-center">No events on this date</p>
                ) : (
                  <div className="space-y-2">
                    {getEventsForDate(selectedDate).map(ev => (
                      <div key={ev.id} onClick={() => setSelectedEvent(ev)}
                        className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 cursor-pointer transition-all border border-border/40">
                        <div className={`w-3 h-3 rounded-full ${ev.color} flex-shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold font-sans truncate">{ev.title}</p>
                          <p className="text-[10px] text-muted-foreground font-sans capitalize">{ev.type.replace("_", " ")}</p>
                        </div>
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upcoming Events List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display">Upcoming Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {calendarEvents
                .filter(e => !isBefore(parseISO(e.date), new Date()))
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(0, 20)
                .map(ev => (
                  <div key={ev.id} onClick={() => setSelectedEvent(ev)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 hover:bg-muted/40 cursor-pointer transition-all border border-border/30">
                    <div className={`w-10 h-10 rounded-xl ${ev.color} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
                      {format(parseISO(ev.date), "dd")}
                      <br />
                      {format(parseISO(ev.date), "MMM")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold font-sans truncate">{ev.title}</p>
                      <p className="text-[10px] text-muted-foreground font-sans">{format(parseISO(ev.date), "EEEE, MMM d, yyyy")}</p>
                    </div>
                    <Badge variant="outline" className="text-[9px] capitalize">{ev.type.replace("_", " ")}</Badge>
                  </div>
                ))}
              {calendarEvents.filter(e => !isBefore(parseISO(e.date), new Date())).length === 0 && (
                <p className="text-sm text-muted-foreground font-sans text-center py-8">No upcoming events</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-display">{selectedEvent?.title}</DialogTitle></DialogHeader>
          {selectedEvent && (
            <div className="space-y-3">
              <Badge className={`${selectedEvent.color} text-white capitalize`}>{selectedEvent.type.replace("_", " ")}</Badge>
              <p className="text-sm text-muted-foreground font-sans">{format(parseISO(selectedEvent.date), "EEEE, MMMM d, yyyy")}</p>
              {selectedEvent.type === "event" && (
                <div className="space-y-2 text-sm font-sans">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-muted-foreground">Client:</span> <strong>{selectedEvent.details.client_name}</strong></div>
                    <div><span className="text-muted-foreground">Type:</span> <strong className="capitalize">{selectedEvent.details.event_type}</strong></div>
                    <div><span className="text-muted-foreground">City:</span> <strong>{selectedEvent.details.city}</strong></div>
                    <div><span className="text-muted-foreground">Venue:</span> <strong>{selectedEvent.details.venue_name}</strong></div>
                    <div><span className="text-muted-foreground">Time:</span> <strong>{selectedEvent.details.event_start_time} - {selectedEvent.details.event_end_time}</strong></div>
                    <div><span className="text-muted-foreground">Artists:</span> <strong>{selectedEvent.details.artist_count}</strong></div>
                    <div><span className="text-muted-foreground">Total:</span> <strong className="text-emerald-600">{formatPrice(selectedEvent.details.negotiated_total || selectedEvent.details.total_price)}</strong></div>
                    <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline" className="capitalize text-[10px]">{selectedEvent.details.status}</Badge></div>
                    <div><span className="text-muted-foreground">Payment:</span> <Badge variant="outline" className="capitalize text-[10px]">{selectedEvent.details.payment_status}</Badge></div>
                  </div>
                  {selectedEvent.details.notes && <p className="text-xs bg-muted/30 p-2 rounded-lg">{selectedEvent.details.notes}</p>}
                </div>
              )}
              {selectedEvent.type === "order_delivery" && (
                <div className="space-y-2 text-sm font-sans">
                  <div><span className="text-muted-foreground">Customer:</span> <strong>{selectedEvent.details.customer_name}</strong></div>
                  <div><span className="text-muted-foreground">Amount:</span> <strong>{formatPrice(selectedEvent.details.amount)}</strong></div>
                  <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline" className="capitalize">{selectedEvent.details.status}</Badge></div>
                </div>
              )}
              {selectedEvent.type === "blocked" && (
                <div className="text-sm font-sans">
                  <p><span className="text-muted-foreground">Reason:</span> {selectedEvent.details.reason || "No reason specified"}</p>
                  {selectedEvent.details.blocked_start_time && <p><span className="text-muted-foreground">Time:</span> {selectedEvent.details.blocked_start_time} - {selectedEvent.details.blocked_end_time}</p>}
                </div>
              )}
              {selectedEvent.type === "manual" && (
                <div className="space-y-2 text-sm font-sans">
                  {selectedEvent.details.description && <p>{selectedEvent.details.description}</p>}
                  {selectedEvent.details.time && <p><span className="text-muted-foreground">Time:</span> {selectedEvent.details.time}</p>}
                  <Button variant="destructive" size="sm" onClick={() => { deleteManualEvent(selectedEvent.id); setSelectedEvent(null); }}>Remove</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Manual Event */}
      <Dialog open={showAddManual} onOpenChange={setShowAddManual}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Add Calendar Event</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="font-sans">Title *</Label><Input value={manualForm.title} onChange={e => setManualForm(p => ({ ...p, title: e.target.value }))} placeholder="Meeting, Reminder..." /></div>
            <div><Label className="font-sans">Date *</Label><Input type="date" value={manualForm.date} onChange={e => setManualForm(p => ({ ...p, date: e.target.value }))} /></div>
            <div><Label className="font-sans">Time</Label><Input type="time" value={manualForm.time} onChange={e => setManualForm(p => ({ ...p, time: e.target.value }))} /></div>
            <div><Label className="font-sans">Type</Label>
              <Select value={manualForm.type} onValueChange={v => setManualForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="reminder">Reminder</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="deadline">Deadline</SelectItem>
                  <SelectItem value="followup">Follow-up</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="font-sans">Description</Label><Textarea value={manualForm.description} onChange={e => setManualForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional notes..." /></div>
            <Button onClick={addManualEvent} disabled={!manualForm.title || !manualForm.date} className="w-full rounded-full font-sans">Add to Calendar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCalendar;
