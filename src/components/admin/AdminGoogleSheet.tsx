import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { RefreshCw, Sheet, Upload, CheckCircle, Loader2, ExternalLink, Search, Plus, Calendar, Users, TrendingUp, BarChart3, ArrowUpRight, ArrowDownRight, X, Eye, Trash2, RotateCcw, Send, ChevronRight, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

interface EventBooking {
  id: string;
  event_date: string;
  venue_name: string | null;
  event_start_time: string | null;
  event_end_time: string | null;
  client_name: string | null;
  client_mobile: string | null;
  client_email: string | null;
  city: string | null;
  state: string | null;
  event_type: string | null;
  artist_count: number | null;
  total_price: number | null;
  advance_amount: number | null;
  status: string | null;
  payment_status: string | null;
  notes: string | null;
  source?: string | null;
  sheet_pushed?: boolean;
  sheet_pushed_at?: string | null;
  created_at: string;
}

interface DrillDownData {
  title: string;
  events: EventBooking[];
}

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const AdminGoogleSheet = () => {
  const [sheetTabs, setSheetTabs] = useState<Record<string, string[][]>>({});
  const [tabNames, setTabNames] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const [events, setEvents] = useState<EventBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pushingId, setPushingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [addingEvent, setAddingEvent] = useState(false);
  const [drillDown, setDrillDown] = useState<DrillDownData | null>(null);
  const [monthFilter, setMonthFilter] = useState("this_month");
  const [newEvent, setNewEvent] = useState({
    event_date: "", venue_name: "", event_start_time: "", event_end_time: "",
    client_name: "", client_mobile: "", client_email: "", city: "", state: "",
    event_type: "wedding", artist_count: 1, total_price: 0, advance_amount: 0,
    status: "confirmed", payment_status: "pending", notes: "",
  });

  const fetchEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from("event_bookings")
      .select("*")
      .order("event_date", { ascending: false });
    if (!error && data) setEvents(data as EventBooking[]);
  }, []);

  const fetchSheetData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", {
        body: { action: "read" },
      });
      if (error) throw error;
      if (data?.success) {
        setSheetTabs(data.tabs || {});
        setTabNames(data.tabNames || []);
        if (!activeTab && data.tabNames?.length > 0) {
          setActiveTab(data.tabNames[0]);
        }
        setLastSynced(new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }));
      } else {
        throw new Error(data?.error || "Failed to read sheet");
      }
    } catch (err: any) {
      console.error("Sheet read error:", err);
      toast({ title: "Failed to load sheet data", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  const handleFullSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", {
        body: { action: "sync_all" },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: "✅ All Events Synced!", description: `${data.synced} events pushed to Google Sheet by month` });
        await Promise.all([fetchSheetData(), fetchEvents()]);
      } else {
        throw new Error(data?.error || "Sync failed");
      }
    } catch (err: any) {
      toast({ title: "Sync Failed", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const handlePushSingle = async (eventId: string) => {
    setPushingId(eventId);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", {
        body: { action: "push_single", event_id: eventId },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: "✅ Event Pushed!", description: `Pushed to ${data.tab} tab` });
        await Promise.all([fetchSheetData(), fetchEvents()]);
      } else {
        throw new Error(data?.error || "Push failed");
      }
    } catch (err: any) {
      toast({ title: "Push Failed", description: err.message, variant: "destructive" });
    } finally {
      setPushingId(null);
    }
  };

  const handleDeleteFromSheet = async (eventId: string) => {
    setDeletingId(eventId);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", {
        body: { action: "delete_from_sheet", event_id: eventId },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: "✅ Removed from Sheet", description: "Event row deleted from Google Sheet" });
        await Promise.all([fetchSheetData(), fetchEvents()]);
      } else {
        throw new Error(data?.error || "Delete failed");
      }
    } catch (err: any) {
      toast({ title: "Delete Failed", description: err.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Delete this event from database? This cannot be undone.")) return;
    try {
      // First remove from sheet if pushed
      const event = events.find(e => e.id === eventId);
      if (event?.sheet_pushed) {
        await supabase.functions.invoke("google-sheets-sync", {
          body: { action: "delete_from_sheet", event_id: eventId },
        });
      }
      const { error } = await supabase.from("event_bookings").delete().eq("id", eventId);
      if (error) throw error;
      toast({ title: "✅ Event Deleted" });
      await Promise.all([fetchSheetData(), fetchEvents()]);
    } catch (err: any) {
      toast({ title: "Delete Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleAddManualEvent = async () => {
    if (!newEvent.event_date || !newEvent.client_name) {
      toast({ title: "Required fields missing", description: "Date and Client Name are required", variant: "destructive" });
      return;
    }
    setAddingEvent(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", {
        body: { action: "add_manual_event", event_data: newEvent },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: "✅ Manual Event Added!", description: `Synced to ${data.tab} tab` });
        setShowAddEvent(false);
        setNewEvent({
          event_date: "", venue_name: "", event_start_time: "", event_end_time: "",
          client_name: "", client_mobile: "", client_email: "", city: "", state: "",
          event_type: "wedding", artist_count: 1, total_price: 0, advance_amount: 0,
          status: "confirmed", payment_status: "pending", notes: "",
        });
        await Promise.all([fetchSheetData(), fetchEvents()]);
      } else {
        throw new Error(data?.error || "Failed");
      }
    } catch (err: any) {
      toast({ title: "Failed to add event", description: err.message, variant: "destructive" });
    } finally {
      setAddingEvent(false);
    }
  };

  useEffect(() => { fetchSheetData(); fetchEvents(); }, []);

  useEffect(() => {
    const channel = supabase
      .channel("google-sheet-events")
      .on("postgres_changes", { event: "*", schema: "public", table: "event_bookings" }, () => {
        fetchEvents();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchEvents]);

  // Filtered events by month
  const filteredEvents = useMemo(() => {
    const now = new Date();
    const cy = now.getFullYear();
    const cm = now.getMonth();

    if (monthFilter === "this_month") return events.filter(e => { const d = new Date(e.event_date); return d.getMonth() === cm && d.getFullYear() === cy; });
    if (monthFilter === "next_month") {
      const nm = cm === 11 ? 0 : cm + 1;
      const ny = cm === 11 ? cy + 1 : cy;
      return events.filter(e => { const d = new Date(e.event_date); return d.getMonth() === nm && d.getFullYear() === ny; });
    }
    if (monthFilter === "this_year") return events.filter(e => new Date(e.event_date).getFullYear() === cy);
    if (monthFilter === "all") return events;
    // Specific month like "2026-03"
    if (monthFilter.includes("-")) {
      const [y, m] = monthFilter.split("-").map(Number);
      return events.filter(e => { const d = new Date(e.event_date); return d.getMonth() === m - 1 && d.getFullYear() === y; });
    }
    return events;
  }, [events, monthFilter]);

  // Generate month options for filter
  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    events.forEach(e => {
      const d = new Date(e.event_date);
      months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    });
    return Array.from(months).sort();
  }, [events]);

  // Analytics
  const analytics = useMemo(() => {
    const now = new Date();
    const cm = now.getMonth();
    const cy = now.getFullYear();
    const nm = cm === 11 ? 0 : cm + 1;
    const ny = cm === 11 ? cy + 1 : cy;

    const thisMonthEvents = events.filter(e => { const d = new Date(e.event_date); return d.getMonth() === cm && d.getFullYear() === cy; });
    const nextMonthEvents = events.filter(e => { const d = new Date(e.event_date); return d.getMonth() === nm && d.getFullYear() === ny; });
    const upcomingEvents = events.filter(e => new Date(e.event_date) >= now);
    const websiteEvents = events.filter(e => !e.source || e.source === "website");
    const manualEvents = events.filter(e => e.source === "manual");
    const pushedEvents = events.filter(e => (e as any).sheet_pushed === true);
    const unpushedEvents = events.filter(e => (e as any).sheet_pushed !== true);

    const totalRevenue = events.reduce((s, e) => s + (e.total_price || 0), 0);
    const thisMonthRevenue = thisMonthEvents.reduce((s, e) => s + (e.total_price || 0), 0);
    const totalAdvance = events.reduce((s, e) => s + (e.advance_amount || 0), 0);

    const monthlyData: Record<string, { month: string; events: number; revenue: number }> = {};
    events.forEach(e => {
      const d = new Date(e.event_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
      if (!monthlyData[key]) monthlyData[key] = { month: label, events: 0, revenue: 0 };
      monthlyData[key].events++;
      monthlyData[key].revenue += e.total_price || 0;
    });
    const monthlyTrend = Object.entries(monthlyData).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v).slice(-8);

    const typeMap: Record<string, number> = {};
    events.forEach(e => { typeMap[e.event_type || "other"] = (typeMap[e.event_type || "other"] || 0) + 1; });
    const typeDistribution = Object.entries(typeMap).map(([name, value]) => ({ name, value }));

    const statusMap: Record<string, number> = {};
    events.forEach(e => { statusMap[e.status || "unknown"] = (statusMap[e.status || "unknown"] || 0) + 1; });
    const statusDistribution = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

    return {
      total: events.length, thisMonth: thisMonthEvents.length, nextMonth: nextMonthEvents.length,
      upcoming: upcomingEvents.length, websiteEvents, manualEvents, pushedEvents, unpushedEvents,
      totalRevenue, thisMonthRevenue, totalAdvance, monthlyTrend, typeDistribution, statusDistribution,
      thisMonthEvents, nextMonthEvents, upcomingEvents,
    };
  }, [events]);

  // Sheet tab data
  const activeTabData = sheetTabs[activeTab] || [];
  const sheetHeaders = activeTabData.length > 1 ? activeTabData[1] : activeTabData[0] || [];
  const sheetRows = activeTabData.slice(2);
  const filteredSheetRows = search.trim()
    ? sheetRows.filter(row => row.some(cell => cell?.toLowerCase().includes(search.toLowerCase())))
    : sheetRows;

  const getStatusBadge = (s: string) => {
    const v = s?.toLowerCase() || "";
    if (v.includes("confirmed") || v.includes("completed") || v.includes("paid")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (v.includes("pending")) return "bg-amber-50 text-amber-700 border-amber-200";
    if (v.includes("cancelled")) return "bg-red-50 text-red-700 border-red-200";
    return "bg-slate-50 text-slate-600 border-slate-200";
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <Card className="border border-border/40 shadow-sm bg-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
                <Sheet className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Google Sheet Sync</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Month-based tabs • Auto-sync • Real-time</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {lastSynced && (
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                  {lastSynced}
                </div>
              )}
              <Button variant="outline" size="sm" onClick={fetchSheetData} disabled={loading} className="text-xs h-8">
                {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                Refresh
              </Button>
              <Button size="sm" onClick={handleFullSync} disabled={syncing} className="text-xs h-8 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white">
                {syncing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3 mr-1" />}
                {syncing ? "Syncing..." : "Push All to Sheet"}
              </Button>
              <Dialog open={showAddEvent} onOpenChange={setShowAddEvent}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="text-xs h-8"><Plus className="w-3 h-3 mr-1" /> Add Manual Event</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Add Manual Event</DialogTitle></DialogHeader>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div><Label className="text-xs">Date *</Label><Input type="date" value={newEvent.event_date} onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })} className="h-8 text-xs" /></div>
                    <div><Label className="text-xs">Client Name *</Label><Input value={newEvent.client_name} onChange={(e) => setNewEvent({ ...newEvent, client_name: e.target.value })} className="h-8 text-xs" /></div>
                    <div><Label className="text-xs">Venue</Label><Input value={newEvent.venue_name} onChange={(e) => setNewEvent({ ...newEvent, venue_name: e.target.value })} className="h-8 text-xs" /></div>
                    <div><Label className="text-xs">City</Label><Input value={newEvent.city} onChange={(e) => setNewEvent({ ...newEvent, city: e.target.value })} className="h-8 text-xs" /></div>
                    <div><Label className="text-xs">State</Label><Input value={newEvent.state} onChange={(e) => setNewEvent({ ...newEvent, state: e.target.value })} className="h-8 text-xs" /></div>
                    <div><Label className="text-xs">Mobile</Label><Input value={newEvent.client_mobile} onChange={(e) => setNewEvent({ ...newEvent, client_mobile: e.target.value })} className="h-8 text-xs" /></div>
                    <div><Label className="text-xs">Email</Label><Input type="email" value={newEvent.client_email} onChange={(e) => setNewEvent({ ...newEvent, client_email: e.target.value })} className="h-8 text-xs" /></div>
                    <div>
                      <Label className="text-xs">Event Type</Label>
                      <Select value={newEvent.event_type} onValueChange={(v) => setNewEvent({ ...newEvent, event_type: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["wedding", "birthday", "corporate", "engagement", "reception", "other"].map(t => (
                            <SelectItem key={t} value={t} className="text-xs">{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-xs">Start Time</Label><Input type="time" value={newEvent.event_start_time} onChange={(e) => setNewEvent({ ...newEvent, event_start_time: e.target.value })} className="h-8 text-xs" /></div>
                    <div><Label className="text-xs">End Time</Label><Input type="time" value={newEvent.event_end_time} onChange={(e) => setNewEvent({ ...newEvent, event_end_time: e.target.value })} className="h-8 text-xs" /></div>
                    <div><Label className="text-xs">Artists</Label><Input type="number" min={1} max={5} value={newEvent.artist_count} onChange={(e) => setNewEvent({ ...newEvent, artist_count: +e.target.value })} className="h-8 text-xs" /></div>
                    <div><Label className="text-xs">Total Price (₹)</Label><Input type="number" value={newEvent.total_price} onChange={(e) => setNewEvent({ ...newEvent, total_price: +e.target.value })} className="h-8 text-xs" /></div>
                    <div><Label className="text-xs">Advance (₹)</Label><Input type="number" value={newEvent.advance_amount} onChange={(e) => setNewEvent({ ...newEvent, advance_amount: +e.target.value })} className="h-8 text-xs" /></div>
                    <div>
                      <Label className="text-xs">Payment Status</Label>
                      <Select value={newEvent.payment_status} onValueChange={(v) => setNewEvent({ ...newEvent, payment_status: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["pending", "confirmed", "paid", "full_paid"].map(s => (
                            <SelectItem key={s} value={s} className="text-xs">{s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2"><Label className="text-xs">Notes</Label><Input value={newEvent.notes} onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })} className="h-8 text-xs" /></div>
                  </div>
                  <Button onClick={handleAddManualEvent} disabled={addingEvent} className="w-full mt-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white">
                    {addingEvent ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    {addingEvent ? "Adding..." : "Add Event & Push to Sheet"}
                  </Button>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 4 Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "This Month", value: analytics.thisMonth, icon: Calendar, gradient: "from-indigo-500 to-violet-500", shadow: "shadow-indigo-500/20", sub: `${MONTH_NAMES[new Date().getMonth()]} ${new Date().getFullYear()}`, drillTitle: "This Month Events", drillEvents: analytics.thisMonthEvents },
          { title: "Next Month", value: analytics.nextMonth, icon: ChevronRight, gradient: "from-cyan-500 to-blue-500", shadow: "shadow-cyan-500/20", sub: `${MONTH_NAMES[(new Date().getMonth() + 1) % 12]}`, drillTitle: "Next Month Events", drillEvents: analytics.nextMonthEvents },
          { title: "Upcoming", value: analytics.upcoming, icon: TrendingUp, gradient: "from-emerald-500 to-green-500", shadow: "shadow-emerald-500/20", sub: `${analytics.upcoming} scheduled`, drillTitle: "Upcoming Events", drillEvents: analytics.upcomingEvents },
          { title: "Pushed / Total", value: `${analytics.pushedEvents.length}/${analytics.total}`, icon: Upload, gradient: "from-amber-500 to-orange-500", shadow: "shadow-amber-500/20", sub: `${analytics.unpushedEvents.length} not pushed`, drillTitle: "Unpushed Events", drillEvents: analytics.unpushedEvents },
        ].map(w => (
          <motion.div key={w.title} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card className="border border-border/40 bg-card shadow-sm cursor-pointer hover:shadow-md transition-all" onClick={() => setDrillDown({ title: w.drillTitle, events: w.drillEvents })}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${w.gradient} flex items-center justify-center shadow-lg ${w.shadow}`}>
                    <w.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">{w.sub}</span>
                </div>
                <p className="text-2xl font-black mt-3 tracking-tight">{w.value}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mt-1">{w.title}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Drill-Down Dialog */}
      <Dialog open={!!drillDown} onOpenChange={() => setDrillDown(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Eye className="w-5 h-5" />{drillDown?.title} ({drillDown?.events.length || 0})</DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto mt-2">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  {["Date", "Client", "City", "Type", "Price", "Status", "Pushed", "Actions"].map(h => (
                    <TableHead key={h} className="text-[10px] font-bold uppercase">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {drillDown?.events.map(e => (
                  <TableRow key={e.id} className="hover:bg-muted/20">
                    <TableCell className="text-xs font-medium">{e.event_date}</TableCell>
                    <TableCell className="text-xs">{e.client_name || "—"}</TableCell>
                    <TableCell className="text-xs">{e.city || "—"}</TableCell>
                    <TableCell className="text-xs"><Badge variant="outline" className="text-[9px]">{e.event_type}</Badge></TableCell>
                    <TableCell className="text-xs font-medium">₹{(e.total_price || 0).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-[9px] ${getStatusBadge(e.status || "")}`}>{e.status}</Badge></TableCell>
                    <TableCell>{(e as any).sheet_pushed ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <X className="w-3.5 h-3.5 text-muted-foreground" />}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {!(e as any).sheet_pushed ? (
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => handlePushSingle(e.id)} disabled={pushingId === e.id}>
                            {pushingId === e.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-amber-600" onClick={() => handleDeleteFromSheet(e.id)} disabled={deletingId === e.id}>
                            {deletingId === e.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!drillDown?.events.length && <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">No events</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Month Filter + Events Table */}
      <Card className="border border-border/40 bg-card shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Filter className="w-4 h-4 text-indigo-500" /> Events by Month
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="h-8 text-xs w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_month" className="text-xs">This Month</SelectItem>
                  <SelectItem value="next_month" className="text-xs">Next Month</SelectItem>
                  <SelectItem value="this_year" className="text-xs">This Year</SelectItem>
                  <SelectItem value="all" className="text-xs">All Events</SelectItem>
                  {monthOptions.map(m => {
                    const [y, mo] = m.split("-");
                    return <SelectItem key={m} value={m} className="text-xs">{MONTH_NAMES[parseInt(mo) - 1]} {y}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
              <Badge variant="outline" className="text-[10px]">{filteredEvents.length} events</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  {["Date", "Venue", "Client", "City", "Type", "Price", "Advance", "Status", "Source", "Pushed", "Actions"].map(h => (
                    <TableHead key={h} className="text-[10px] font-bold uppercase whitespace-nowrap">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map(e => (
                  <TableRow key={e.id} className="hover:bg-muted/20">
                    <TableCell className="text-xs font-medium whitespace-nowrap">{e.event_date}</TableCell>
                    <TableCell className="text-xs max-w-[120px] truncate">{e.venue_name || "—"}</TableCell>
                    <TableCell className="text-xs">{e.client_name || "—"}</TableCell>
                    <TableCell className="text-xs">{e.city || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[9px]">{e.event_type}</Badge></TableCell>
                    <TableCell className="text-xs font-medium">₹{(e.total_price || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">₹{(e.advance_amount || 0).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-[9px] ${getStatusBadge(e.status || "")}`}>{e.status}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={`text-[9px] ${e.source === "manual" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>{e.source || "website"}</Badge></TableCell>
                    <TableCell>
                      {(e as any).sheet_pushed ? (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-[9px] text-emerald-600">Yes</span>
                        </div>
                      ) : <span className="text-[9px] text-muted-foreground">No</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {!(e as any).sheet_pushed ? (
                          <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]" onClick={() => handlePushSingle(e.id)} disabled={pushingId === e.id} title="Push to Sheet">
                            {pushingId === e.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 text-green-600" />}
                          </Button>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={() => handlePushSingle(e.id)} disabled={pushingId === e.id} title="Re-push">
                              {pushingId === e.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3 text-blue-600" />}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={() => handleDeleteFromSheet(e.id)} disabled={deletingId === e.id} title="Remove from Sheet">
                              {deletingId === e.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3 text-amber-600" />}
                            </Button>
                          </>
                        )}
                        {e.source === "website" && (
                          <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={() => handleDeleteEvent(e.id)} title="Delete Event">
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredEvents.length === 0 && <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground text-sm">No events for this period</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border border-border/40 bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-indigo-500" />Monthly Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="events" fill="#6366f1" radius={[4, 4, 0, 0]} name="Events" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border border-border/40 bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2"><BarChart3 className="w-4 h-4 text-amber-500" />Event Types</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={analytics.typeDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {analytics.typeDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Revenue */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Revenue", value: `₹${(analytics.totalRevenue / 1000).toFixed(1)}K`, color: "text-emerald-600" },
          { label: "This Month Revenue", value: `₹${(analytics.thisMonthRevenue / 1000).toFixed(1)}K`, color: "text-indigo-600" },
          { label: "Total Advance", value: `₹${(analytics.totalAdvance / 1000).toFixed(1)}K`, color: "text-amber-600" },
        ].map(s => (
          <Card key={s.label} className="border border-border/40 bg-card shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{s.label}</p>
              <p className={`text-xl font-black mt-1 ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Google Sheet Tabs View */}
      <Card className="border border-border/40 bg-card shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2"><Sheet className="w-4 h-4 text-green-500" />Google Sheet Data</CardTitle>
            <div className="flex items-center gap-2">
              {tabNames.length > 0 && (
                <Select value={activeTab} onValueChange={setActiveTab}>
                  <SelectTrigger className="h-8 text-xs w-44"><SelectValue placeholder="Select tab" /></SelectTrigger>
                  <SelectContent>
                    {tabNames.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-7 h-8 text-xs w-36" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : filteredSheetRows.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Sheet className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No data in this tab</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-[10px] font-bold w-8">#</TableHead>
                    {sheetHeaders.map((h, i) => (
                      <TableHead key={i} className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSheetRows.map((row, idx) => (
                    <TableRow key={idx} className="hover:bg-muted/20">
                      <TableCell className="text-xs text-muted-foreground font-mono">{idx + 1}</TableCell>
                      {sheetHeaders.map((_, ci) => {
                        const cell = row[ci] || "";
                        if (ci === 4 || ci === 14) {
                          return <TableCell key={ci} className="text-xs">{cell ? <Badge variant="outline" className={`text-[10px] ${getStatusBadge(cell)}`}>{cell}</Badge> : "—"}</TableCell>;
                        }
                        return <TableCell key={ci} className="text-xs whitespace-nowrap max-w-[180px] truncate">{cell || "—"}</TableCell>;
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AdminGoogleSheet;
