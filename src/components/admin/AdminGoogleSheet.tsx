import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { RefreshCw, Sheet, Upload, CheckCircle, Loader2, ExternalLink, Search, Plus, Calendar, Users, TrendingUp, BarChart3, ArrowUpRight, ArrowDownRight, X, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";

// Types
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
  created_at: string;
}

interface DrillDownData {
  title: string;
  events: EventBooking[];
}

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];

const AdminGoogleSheet = () => {
  const [sheetData, setSheetData] = useState<string[][]>([]);
  const [events, setEvents] = useState<EventBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [addingEvent, setAddingEvent] = useState(false);
  const [drillDown, setDrillDown] = useState<DrillDownData | null>(null);
  const [newEvent, setNewEvent] = useState({
    event_date: "", venue_name: "", event_start_time: "", event_end_time: "",
    client_name: "", client_mobile: "", client_email: "", city: "", state: "",
    event_type: "wedding", artist_count: 1, total_price: 0, advance_amount: 0,
    status: "confirmed", payment_status: "pending", notes: "",
  });

  // Fetch events from DB (realtime source of truth)
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
      if (data?.success && data.data) {
        setSheetData(data.data);
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
  }, []);

  const handleFullSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", {
        body: { action: "sync_all" },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: "✅ Google Sheet Synced!", description: `${data.synced} events pushed to Google Sheet` });
        await fetchSheetData();
      } else {
        throw new Error(data?.error || "Sync failed");
      }
    } catch (err: any) {
      toast({ title: "Sync Failed", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(false);
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
        toast({ title: "✅ Event Added!", description: "Manual event added and synced to Google Sheet" });
        setShowAddEvent(false);
        setNewEvent({
          event_date: "", venue_name: "", event_start_time: "", event_end_time: "",
          client_name: "", client_mobile: "", client_email: "", city: "", state: "",
          event_type: "wedding", artist_count: 1, total_price: 0, advance_amount: 0,
          status: "confirmed", payment_status: "pending", notes: "",
        });
        await Promise.all([fetchSheetData(), fetchEvents()]);
      } else {
        throw new Error(data?.error || "Failed to add event");
      }
    } catch (err: any) {
      toast({ title: "Failed to add event", description: err.message, variant: "destructive" });
    } finally {
      setAddingEvent(false);
    }
  };

  useEffect(() => {
    fetchSheetData();
    fetchEvents();
  }, [fetchSheetData, fetchEvents]);

  // Realtime subscription for event_bookings
  useEffect(() => {
    const channel = supabase
      .channel("google-sheet-events")
      .on("postgres_changes", { event: "*", schema: "public", table: "event_bookings" }, () => {
        fetchEvents();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchEvents]);

  // Analytics computations
  const analytics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonthEvents = events.filter((e) => {
      const d = new Date(e.event_date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const upcomingEvents = events.filter((e) => new Date(e.event_date) >= now);
    const completedEvents = events.filter((e) => e.status === "completed");
    const websiteEvents = events.filter((e) => !e.source || e.source === "website");
    const manualEvents = events.filter((e) => e.source === "manual");

    const totalRevenue = events.reduce((s, e) => s + (e.total_price || 0), 0);
    const thisMonthRevenue = thisMonthEvents.reduce((s, e) => s + (e.total_price || 0), 0);
    const totalAdvance = events.reduce((s, e) => s + (e.advance_amount || 0), 0);

    // Top artists - from artist_count
    const artistCountMap: Record<string, number> = {};
    events.forEach((e) => {
      const city = e.city || "Unknown";
      artistCountMap[city] = (artistCountMap[city] || 0) + 1;
    });

    // Monthly trend
    const monthlyData: Record<string, { month: string; events: number; revenue: number }> = {};
    events.forEach((e) => {
      const d = new Date(e.event_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
      if (!monthlyData[key]) monthlyData[key] = { month: label, events: 0, revenue: 0 };
      monthlyData[key].events++;
      monthlyData[key].revenue += e.total_price || 0;
    });
    const monthlyTrend = Object.entries(monthlyData).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v).slice(-6);

    // Event type distribution
    const typeMap: Record<string, number> = {};
    events.forEach((e) => {
      const t = e.event_type || "other";
      typeMap[t] = (typeMap[t] || 0) + 1;
    });
    const typeDistribution = Object.entries(typeMap).map(([name, value]) => ({ name, value }));

    // City distribution
    const cityMap: Record<string, number> = {};
    events.forEach((e) => {
      const c = e.city || "Unknown";
      cityMap[c] = (cityMap[c] || 0) + 1;
    });
    const cityDistribution = Object.entries(cityMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));

    // Status distribution
    const statusMap: Record<string, number> = {};
    events.forEach((e) => {
      const s = e.status || "unknown";
      statusMap[s] = (statusMap[s] || 0) + 1;
    });
    const statusDistribution = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

    return {
      total: events.length,
      thisMonth: thisMonthEvents.length,
      upcoming: upcomingEvents.length,
      completed: completedEvents.length,
      websiteEvents,
      manualEvents,
      totalRevenue,
      thisMonthRevenue,
      totalAdvance,
      monthlyTrend,
      typeDistribution,
      cityDistribution,
      statusDistribution,
      thisMonthEvents,
      upcomingEvents,
      completedEvents,
    };
  }, [events]);

  // Sheet table helpers
  const headerRow = sheetData.length > 2 ? sheetData[2] : [];
  const dataRows = sheetData.slice(4);
  const filteredRows = search.trim()
    ? dataRows.filter((row) => row.some((cell) => cell?.toLowerCase().includes(search.toLowerCase())))
    : dataRows;

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || "";
    if (s.includes("confirmed") || s.includes("completed") || s.includes("paid")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s.includes("pending")) return "bg-amber-50 text-amber-700 border-amber-200";
    if (s.includes("cancelled")) return "bg-red-50 text-red-700 border-red-200";
    return "bg-slate-50 text-slate-600 border-slate-200";
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <Card className="border border-border/40 shadow-sm bg-white">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
                <Sheet className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Google Sheet Sync</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Connected to creativecaricatureclub@gmail.com</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {lastSynced && (
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                  Last read: {lastSynced}
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
                  <Button size="sm" variant="outline" className="text-xs h-8">
                    <Plus className="w-3 h-3 mr-1" /> Add Manual Event
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add Manual Event</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div><Label className="text-xs">Date *</Label><Input type="date" value={newEvent.event_date} onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })} className="h-8 text-xs" /></div>
                    <div><Label className="text-xs">Client Name *</Label><Input value={newEvent.client_name} onChange={(e) => setNewEvent({ ...newEvent, client_name: e.target.value })} className="h-8 text-xs" placeholder="Client name" /></div>
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
                          {["wedding", "birthday", "corporate", "engagement", "reception", "other"].map((t) => (
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
                      <Label className="text-xs">Status</Label>
                      <Select value={newEvent.status} onValueChange={(v) => setNewEvent({ ...newEvent, status: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["confirmed", "pending", "completed", "cancelled"].map((s) => (
                            <SelectItem key={s} value={s} className="text-xs">{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2"><Label className="text-xs">Notes</Label><Input value={newEvent.notes} onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })} className="h-8 text-xs" placeholder="Optional notes" /></div>
                  </div>
                  <Button onClick={handleAddManualEvent} disabled={addingEvent} className="w-full mt-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white">
                    {addingEvent ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    {addingEvent ? "Adding..." : "Add Event & Sync to Sheet"}
                  </Button>
                </DialogContent>
              </Dialog>
              <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => window.open("https://docs.google.com/spreadsheets/d/" + (import.meta.env.VITE_GOOGLE_SHEET_ID || ""), "_blank")}>
                <ExternalLink className="w-3 h-3 mr-1" /> Open Sheet
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 4 Modern Widgets with Drill-Down */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "This Month Events",
            value: analytics.thisMonth,
            icon: Calendar,
            gradient: "from-indigo-500 to-violet-500",
            shadowColor: "shadow-indigo-500/20",
            change: analytics.thisMonth > 0 ? `+${analytics.thisMonth}` : "0",
            up: true,
            drillTitle: "This Month's Events",
            drillEvents: analytics.thisMonthEvents,
          },
          {
            title: "Upcoming Events",
            value: analytics.upcoming,
            icon: TrendingUp,
            gradient: "from-emerald-500 to-green-500",
            shadowColor: "shadow-emerald-500/20",
            change: `${analytics.upcoming} scheduled`,
            up: true,
            drillTitle: "Upcoming Events",
            drillEvents: analytics.upcomingEvents,
          },
          {
            title: "Total Events",
            value: analytics.total,
            icon: BarChart3,
            gradient: "from-amber-500 to-orange-500",
            shadowColor: "shadow-amber-500/20",
            change: `₹${(analytics.totalRevenue / 1000).toFixed(0)}K revenue`,
            up: true,
            drillTitle: "All Events",
            drillEvents: events,
          },
          {
            title: "Manual vs Website",
            value: `${analytics.manualEvents.length} / ${analytics.websiteEvents.length}`,
            icon: Users,
            gradient: "from-pink-500 to-rose-500",
            shadowColor: "shadow-pink-500/20",
            change: `${analytics.manualEvents.length} manual`,
            up: analytics.manualEvents.length > 0,
            drillTitle: "Manual Events",
            drillEvents: analytics.manualEvents,
          },
        ].map((widget) => (
          <motion.div key={widget.title} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card
              className="border border-border/40 bg-white shadow-sm cursor-pointer hover:shadow-md transition-all"
              onClick={() => setDrillDown({ title: widget.drillTitle, events: widget.drillEvents })}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${widget.gradient} flex items-center justify-center shadow-lg ${widget.shadowColor}`}>
                    <widget.icon className="w-4 h-4 text-white" />
                  </div>
                  <div className={`flex items-center gap-0.5 text-[10px] font-medium ${widget.up ? "text-emerald-600" : "text-red-500"}`}>
                    {widget.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {widget.change}
                  </div>
                </div>
                <p className="text-2xl font-black mt-3 tracking-tight">{widget.value}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mt-1">{widget.title}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Drill-Down Dialog */}
      <Dialog open={!!drillDown} onOpenChange={() => setDrillDown(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              {drillDown?.title} ({drillDown?.events.length || 0})
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto mt-2">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  {["Date", "Client", "City", "Type", "Price", "Status"].map((h) => (
                    <TableHead key={h} className="text-[10px] font-bold uppercase">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {drillDown?.events.map((e) => (
                  <TableRow key={e.id} className="hover:bg-muted/20">
                    <TableCell className="text-xs font-medium">{e.event_date}</TableCell>
                    <TableCell className="text-xs">{e.client_name || "—"}</TableCell>
                    <TableCell className="text-xs">{e.city || "—"}</TableCell>
                    <TableCell className="text-xs"><Badge variant="outline" className="text-[9px]">{e.event_type || "—"}</Badge></TableCell>
                    <TableCell className="text-xs font-medium">₹{(e.total_price || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline" className={`text-[9px] ${getStatusBadge(e.status || "")}`}>{e.status || "—"}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {(!drillDown?.events.length) && (
                  <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No events found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Trend */}
        <Card className="border border-border/40 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              Monthly Event Trend
            </CardTitle>
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
                <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} name="Revenue (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Event Type Distribution */}
        <Card className="border border-border/40 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-500" />
              Event Type Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={analytics.typeDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {analytics.typeDistribution.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Cities */}
        <Card className="border border-border/40 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" />
              Top Cities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.cityDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Events" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="border border-border/40 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-pink-500" />
              Status Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={analytics.statusDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {analytics.statusDistribution.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Revenue", value: `₹${(analytics.totalRevenue / 1000).toFixed(1)}K`, color: "text-emerald-600" },
          { label: "This Month Revenue", value: `₹${(analytics.thisMonthRevenue / 1000).toFixed(1)}K`, color: "text-indigo-600" },
          { label: "Total Advance Collected", value: `₹${(analytics.totalAdvance / 1000).toFixed(1)}K`, color: "text-amber-600" },
        ].map((stat) => (
          <Card key={stat.label} className="border border-border/40 bg-white shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{stat.label}</p>
              <p className={`text-xl font-black mt-1 ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search + Sheet Data Table */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search sheet data..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
      </div>

      <Card className="border border-border/40 bg-white shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Sheet className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No data found</p>
              <p className="text-xs mt-1">Click "Push All to Sheet" to sync your events</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-[10px] font-bold w-8">#</TableHead>
                    {headerRow.map((h, i) => (
                      <TableHead key={i} className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row, rowIdx) => (
                    <TableRow key={rowIdx} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="text-xs text-muted-foreground font-mono">{rowIdx + 1}</TableCell>
                      {headerRow.map((_, colIdx) => {
                        const cell = row[colIdx] || "";
                        if (colIdx === 4 || colIdx === 14) {
                          return (
                            <TableCell key={colIdx} className="text-xs">
                              {cell ? <Badge variant="outline" className={`text-[10px] ${getStatusBadge(cell)}`}>{cell}</Badge> : "—"}
                            </TableCell>
                          );
                        }
                        return (
                          <TableCell key={colIdx} className="text-xs whitespace-nowrap max-w-[200px] truncate">{cell || "—"}</TableCell>
                        );
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
