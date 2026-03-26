import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ArrowUpRight, Calendar, CheckCircle2, ChevronDown, ChevronUp, Clock, DollarSign,
  Filter, Loader2, MapPin, Plus, RefreshCw, RotateCcw, Search, Send, Sheet,
  TrendingUp, Upload, Users, XCircle,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";

interface EventBooking {
  id: string;
  event_date: string;
  venue_name: string | null;
  client_name: string | null;
  client_mobile: string | null;
  client_email: string | null;
  city: string | null;
  state: string | null;
  event_type: string | null;
  event_start_time: string | null;
  event_end_time: string | null;
  total_price: number | null;
  advance_amount: number | null;
  status: string | null;
  payment_status: string | null;
  source?: string | null;
  sheet_pushed?: boolean | null;
  sheet_pushed_at?: string | null;
  artist_count?: number | null;
  full_address?: string | null;
}

interface SheetTabSummary {
  title: string;
  normalizedTitle: string;
  monthKey: string | null;
  eventCount: number;
}

interface ParsedSheetEvent {
  tabTitle: string;
  monthKey: string | null;
  dateLabel: string;
  venue: string;
  time: string;
  artist: string;
  payment: string;
  pending: string;
  bookingId: string;
  clientName: string;
  mobile: string;
  email: string;
  city: string;
  state: string;
  eventType: string;
  bookingStatus: string;
  totalPrice: string;
  source: string;
  address: string;
}

interface ManualEventForm {
  event_date: string;
  venue_name: string;
  event_start_time: string;
  event_end_time: string;
  client_name: string;
  client_mobile: string;
  client_email: string;
  city: string;
  state: string;
  event_type: string;
  artist_count: number;
  total_price: number;
  advance_amount: number;
  status: string;
  payment_status: string;
  notes: string;
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--secondary))",
  "hsl(var(--muted-foreground))",
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#ef4444",
];

const initialManualEvent: ManualEventForm = {
  event_date: "", venue_name: "", event_start_time: "", event_end_time: "",
  client_name: "", client_mobile: "", client_email: "", city: "", state: "",
  event_type: "wedding", artist_count: 1, total_price: 0, advance_amount: 0,
  status: "confirmed", payment_status: "pending", notes: "",
};

const getMonthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
const formatMonthLabel = (monthKey: string) => { const [y, m] = monthKey.split("-"); return `${MONTH_NAMES[Number(m) - 1]} ${y}`; };
const matchesMonth = (dateValue: string, monthKey: string) => getMonthKey(new Date(dateValue)) === monthKey;
const parseCurrencyValue = (value: string) => Number((value || "").replace(/[^\d.-]/g, "")) || 0;
const isSheetEventRow = (row: string[]) => row.slice(1).some((cell) => String(cell || "").trim().length > 0);

const parseSheetEvents = (tabs: Record<string, string[][]>): ParsedSheetEvent[] => {
  return Object.entries(tabs).flatMap(([tabTitle, rows]) => {
    const summary = rows || [];
    let currentDate = "";
    const tabMonthKey = (() => {
      const match = tabTitle.trim().toUpperCase().match(/^([A-Z]+)\s+(\d{4})$/);
      if (!match) return null;
      const monthIndex = MONTH_NAMES.findIndex((month) => month.toUpperCase() === match[1]);
      return monthIndex >= 0 ? `${match[2]}-${String(monthIndex + 1).padStart(2, "0")}` : null;
    })();

    return summary.slice(3).flatMap((rawRow) => {
      const row = Array.from({ length: 17 }, (_, index) => String(rawRow?.[index] || "").trim());
      if (row[0]) currentDate = row[0];
      if (!currentDate || !isSheetEventRow(row)) return [];

      return [{
        tabTitle,
        monthKey: tabMonthKey,
        dateLabel: currentDate,
        venue: row[1],
        time: row[2],
        artist: row[3],
        payment: row[4],
        pending: row[5],
        bookingId: row[6],
        clientName: row[7],
        mobile: row[8],
        email: row[9],
        city: row[10],
        state: row[11],
        eventType: row[12],
        bookingStatus: row[13],
        totalPrice: row[14],
        source: row[15] || "manual",
        address: row[16],
      } satisfies ParsedSheetEvent];
    });
  });
};

/* ─────────── 3D Flash Card Widget ─────────── */
const FlashWidget = ({ title, value, icon: Icon, note, color = "primary", trend }: {
  title: string; value: string | number; icon: any; note: string; color?: string; trend?: string;
}) => (
  <motion.div
    whileHover={{ y: -4, scale: 1.02 }}
    transition={{ type: "spring", stiffness: 400, damping: 20 }}
    className="group relative"
  >
    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 blur-xl opacity-0 group-hover:opacity-60 transition-opacity duration-300" />
    <Card className="relative overflow-hidden rounded-2xl border-border/30 bg-card/80 backdrop-blur-xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)] hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.2)] transition-shadow duration-300">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full" />
      <CardContent className="flex items-center justify-between p-5">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">{title}</p>
          <p className="text-3xl font-extrabold tracking-tight text-foreground">{value}</p>
          <div className="flex items-center gap-1.5">
            {trend && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                trend.startsWith("+") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              }`}>{trend}</span>
            )}
            <p className="text-[11px] text-muted-foreground">{note}</p>
          </div>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary shadow-inner">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

/* ─────────── Main Component ─────────── */
const AdminGoogleSheet = () => {
  const [events, setEvents] = useState<EventBooking[]>([]);
  const [tabSummaries, setTabSummaries] = useState<SheetTabSummary[]>([]);
  const [sheetTabs, setSheetTabs] = useState<Record<string, string[][]>>({});
  const [activeTab, setActiveTab] = useState("");
  const [activeTabRows, setActiveTabRows] = useState<string[][]>([]);
  const [sheetFilter, setSheetFilter] = useState("this_month");
  const [eventFilter, setEventFilter] = useState("this_month");
  const [search, setSearch] = useState("");
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [loadingTab, setLoadingTab] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pushingId, setPushingId] = useState<string | null>(null);
  const [reversingId, setReversingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [addingEvent, setAddingEvent] = useState(false);
  const [newEvent, setNewEvent] = useState<ManualEventForm>(initialManualEvent);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  const fetchEvents = useCallback(async () => {
    const { data, error } = await supabase.from("event_bookings").select("*").order("event_date", { ascending: true });
    if (error) throw error;
    setEvents((data || []) as EventBooking[]);
  }, []);

  const fetchSheetOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", { body: { action: "read_overview" } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed");
      const summaries = (data.tabSummaries || []) as SheetTabSummary[];
      setTabSummaries(summaries);
      if (!activeTab && summaries.length > 0) {
        const currentKey = getMonthKey(new Date());
        setActiveTab(summaries.find((item) => item.monthKey === currentKey)?.title || summaries[0].title);
      }
    } catch (error: any) {
      toast({ title: "Failed to load sheet data", description: error.message, variant: "destructive" });
    } finally { setLoadingOverview(false); }
  }, [activeTab]);

  const fetchSheetData = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", { body: { action: "read" } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed");
      setSheetTabs((data.tabs || {}) as Record<string, string[][]>);
    } catch (error: any) {
      toast({ title: "Failed to read Google Sheet", description: error.message, variant: "destructive" });
    }
  }, []);

  const fetchActiveTab = useCallback(async (tabName: string) => {
    if (!tabName) return;
    setLoadingTab(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", { body: { action: "read_tab", tab_name: tabName } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed");
      setActiveTabRows((data.rows || []) as string[][]);
      setActiveTab(data.tabName || tabName);
    } catch (error: any) {
      toast({ title: "Failed to load tab", description: error.message, variant: "destructive" });
    } finally { setLoadingTab(false); }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchEvents(), fetchSheetOverview(), fetchSheetData()]);
  }, [fetchEvents, fetchSheetOverview, fetchSheetData]);

  useEffect(() => { refreshAll().catch(() => {}); }, [refreshAll]);
  useEffect(() => { if (activeTab) fetchActiveTab(activeTab).catch(() => {}); }, [activeTab, fetchActiveTab]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-google-sheet-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "event_bookings" }, async () => {
        await Promise.all([fetchEvents(), fetchSheetOverview(), fetchSheetData()]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchEvents, fetchSheetOverview, fetchSheetData]);

  const availableMonthOptions = useMemo(() =>
    Array.from(new Set(events.map((e) => getMonthKey(new Date(e.event_date))))).sort(), [events]);

  const availableSheetMonths = useMemo(() =>
    Array.from(new Set(tabSummaries.map((t) => t.monthKey).filter(Boolean) as string[])).sort(), [tabSummaries]);

  const filteredTabs = useMemo(() => {
    const ck = getMonthKey(new Date());
    const nk = getMonthKey(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1));
    if (sheetFilter === "this_month") return tabSummaries.filter((t) => t.monthKey === ck);
    if (sheetFilter === "next_month") return tabSummaries.filter((t) => t.monthKey === nk);
    if (sheetFilter === "upcoming") return tabSummaries.filter((t) => t.monthKey && t.monthKey >= ck);
    if (sheetFilter === "this_year") return tabSummaries.filter((t) => t.monthKey?.startsWith(`${new Date().getFullYear()}-`));
    if (sheetFilter === "all") return tabSummaries;
    return tabSummaries.filter((t) => t.monthKey === sheetFilter);
  }, [sheetFilter, tabSummaries]);

  useEffect(() => {
    if (filteredTabs.length && !filteredTabs.some((t) => t.title === activeTab)) setActiveTab(filteredTabs[0].title);
  }, [activeTab, filteredTabs]);

  const filteredEvents = useMemo(() => {
    const ck = getMonthKey(new Date());
    const nk = getMonthKey(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1));
    const now = new Date();
    let base = events;
    if (eventFilter === "this_month") base = events.filter((e) => matchesMonth(e.event_date, ck));
    else if (eventFilter === "next_month") base = events.filter((e) => matchesMonth(e.event_date, nk));
    else if (eventFilter === "upcoming") base = events.filter((e) => new Date(e.event_date) >= now);
    else if (eventFilter === "manual") base = events.filter((e) => e.source === "manual");
    else if (eventFilter === "pushed") base = events.filter((e) => e.sheet_pushed);
    else if (eventFilter === "not_pushed") base = events.filter((e) => !e.sheet_pushed);
    else if (eventFilter !== "all") base = events.filter((e) => matchesMonth(e.event_date, eventFilter));
    if (deferredSearch.trim()) base = base.filter((e) => [e.client_name, e.venue_name, e.city, e.event_type].some((v) => v?.toLowerCase().includes(deferredSearch.toLowerCase())));
    return base;
  }, [deferredSearch, eventFilter, events]);

  /* ─────── Analytics ─────── */
  const parsedSheetEvents = useMemo(() => parseSheetEvents(sheetTabs), [sheetTabs]);

  const analytics = useMemo(() => {
    const now = new Date();
    const ck = getMonthKey(now);
    const nk = getMonthKey(new Date(now.getFullYear(), now.getMonth() + 1, 1));
    const yearEnd = new Date(now.getFullYear(), 11, 31);

    const thisMonth = parsedSheetEvents.filter((e) => e.monthKey === ck);
    const nextMonth = parsedSheetEvents.filter((e) => e.monthKey === nk);
    const upcoming = parsedSheetEvents.filter((e) => {
      if (!e.monthKey || !e.dateLabel) return false;
      const [year, month] = e.monthKey.split("-").map(Number);
      const eventDate = new Date(year, month - 1, Number(e.dateLabel), 23, 59, 59);
      return eventDate >= now && eventDate <= yearEnd;
    });
    const manual = parsedSheetEvents.filter((e) => e.source.toLowerCase() === "manual");
    const website = parsedSheetEvents.filter((e) => e.source.toLowerCase() !== "manual");
    const pushed = events.filter((e) => e.sheet_pushed);
    const notPushed = events.filter((e) => !e.sheet_pushed);
    const confirmed = parsedSheetEvents.filter((e) => e.bookingStatus.toLowerCase() === "confirmed");
    const pending = parsedSheetEvents.filter((e) => e.payment.toLowerCase().includes("pending"));

    const totalRevenue = parsedSheetEvents.reduce((s, e) => s + parseCurrencyValue(e.totalPrice), 0);
    const thisMonthRevenue = thisMonth.reduce((s, e) => s + parseCurrencyValue(e.totalPrice), 0);
    const totalAdvance = parsedSheetEvents.reduce((s, e) => {
      const paymentText = e.payment.toLowerCase();
      return paymentText.includes("advance") || paymentText.includes("full paid") ? s + parseCurrencyValue(e.payment) : s;
    }, 0);
    const totalPending = totalRevenue - totalAdvance;

    const webThisMonth = website.filter((e) => e.monthKey === ck).length;
    const manThisMonth = manual.filter((e) => e.monthKey === ck).length;

    const cityMap: Record<string, number> = {};
    parsedSheetEvents.forEach((e) => { const c = e.city || "Unknown"; cityMap[c] = (cityMap[c] || 0) + 1; });
    const cityChart = Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }));

    const typeMap: Record<string, number> = {};
    parsedSheetEvents.forEach((e) => { const t = e.eventType || "other"; typeMap[t] = (typeMap[t] || 0) + 1; });
    const typeChart = Object.entries(typeMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));

    const monthlyTrend: { name: string; website: number; manual: number; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mk = getMonthKey(d);
      const mEvents = parsedSheetEvents.filter((e) => e.monthKey === mk);
      monthlyTrend.push({
        name: MONTH_NAMES[d.getMonth()].slice(0, 3),
        website: mEvents.filter((e) => e.source.toLowerCase() !== "manual").length,
        manual: mEvents.filter((e) => e.source.toLowerCase() === "manual").length,
        total: mEvents.length,
      });
    }

    return {
      thisMonth, nextMonth, upcoming, manual, website, pushed, notPushed,
      confirmed, pending, totalRevenue, thisMonthRevenue, totalPending,
      webThisMonth, manThisMonth, cityChart, typeChart, monthlyTrend,
      sourceChart: [
        { name: "Website", value: website.length },
        { name: "Manual", value: manual.length },
      ],
      pushChart: [
        { name: "Pushed", value: pushed.length },
        { name: "Not Pushed", value: notPushed.length },
      ],
    };
  }, [events, parsedSheetEvents]);

  const sheetHeaders = activeTabRows[2] || [];
  const sheetRows = activeTabRows.slice(3);
  const visibleRows = deferredSearch.trim()
    ? sheetRows.filter((row) => row.some((cell) => String(cell || "").toLowerCase().includes(deferredSearch.toLowerCase())))
    : sheetRows;

  /* ─────── Actions ─────── */
  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", { body: { action: "sync_all" } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Sync failed");
      toast({ title: "Sync complete", description: `${data.synced || 0} new events pushed. ${data.skipped || 0} skipped.` });
      await refreshAll();
      if (activeTab) await fetchActiveTab(activeTab);
    } catch (error: any) {
      toast({ title: "Sync failed", description: error.message, variant: "destructive" });
    } finally { setSyncing(false); }
  };

  const handlePushSingle = async (eventId: string) => {
    setPushingId(eventId);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", { body: { action: "push_single", event_id: eventId } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Push failed");
      toast({ title: "Event pushed", description: `${data.action === "updated" ? "Updated" : "Written"} in ${data.tab || "sheet"}.` });
      await refreshAll();
      if (activeTab) await fetchActiveTab(activeTab);
    } catch (error: any) {
      toast({ title: "Push failed", description: error.message, variant: "destructive" });
    } finally { setPushingId(null); }
  };

  const handleUpdatePushed = async (eventId: string) => {
    setUpdatingId(eventId);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", { body: { action: "update_pushed", event_id: eventId } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Update failed");
      toast({ title: "Sheet updated", description: "Changed details synced to sheet." });
      await refreshAll();
      if (activeTab) await fetchActiveTab(activeTab);
    } catch (error: any) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } finally { setUpdatingId(null); }
  };

  const handleReversePush = async (eventId: string) => {
    setReversingId(eventId);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", { body: { action: "delete_from_sheet", event_id: eventId } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Reverse failed");
      toast({ title: "Removed from sheet", description: "Row cleared from Google Sheet." });
      await refreshAll();
      if (activeTab) await fetchActiveTab(activeTab);
    } catch (error: any) {
      toast({ title: "Reverse failed", description: error.message, variant: "destructive" });
    } finally { setReversingId(null); }
  };

  const handleAddManualEvent = async () => {
    if (!newEvent.event_date || !newEvent.client_name) {
      toast({ title: "Required fields missing", description: "Date and client name are required.", variant: "destructive" });
      return;
    }
    setAddingEvent(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", { body: { action: "add_manual_event", event_data: newEvent } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed");
      toast({ title: "Manual event added", description: `Synced to ${data.tab || "sheet"}.` });
      setNewEvent(initialManualEvent);
      setShowAddEvent(false);
      await refreshAll();
      if (activeTab) await fetchActiveTab(activeTab);
    } catch (error: any) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } finally { setAddingEvent(false); }
  };

  const formatCurrency = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header Card */}
      <motion.div whileHover={{ y: -2 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}>
        <Card className="relative overflow-hidden rounded-2xl border-border/30 bg-gradient-to-r from-card/90 to-card/70 backdrop-blur-xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)]">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/3 to-accent/3" />
          <CardHeader className="relative">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20">
                  <Sheet className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Google Sheet Sync</CardTitle>
                  <p className="text-xs text-muted-foreground">Real-time event sync with month tabs & analytics</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => refreshAll()} disabled={loadingOverview} className="rounded-xl">
                  {loadingOverview ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Refresh
                </Button>
                <Button size="sm" onClick={handleSyncAll} disabled={syncing} className="rounded-xl">
                  {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Push Unpushed
                </Button>
                <Dialog open={showAddEvent} onOpenChange={setShowAddEvent}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="secondary" className="rounded-xl">
                      <Plus className="mr-2 h-4 w-4" />Manual Event
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader><DialogTitle>Add Manual Event</DialogTitle></DialogHeader>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div><Label>Date</Label><Input type="date" value={newEvent.event_date} onChange={(e) => setNewEvent((p) => ({ ...p, event_date: e.target.value }))} /></div>
                      <div><Label>Client Name</Label><Input value={newEvent.client_name} onChange={(e) => setNewEvent((p) => ({ ...p, client_name: e.target.value }))} /></div>
                      <div><Label>Venue</Label><Input value={newEvent.venue_name} onChange={(e) => setNewEvent((p) => ({ ...p, venue_name: e.target.value }))} /></div>
                      <div><Label>City</Label><Input value={newEvent.city} onChange={(e) => setNewEvent((p) => ({ ...p, city: e.target.value }))} /></div>
                      <div><Label>State</Label><Input value={newEvent.state} onChange={(e) => setNewEvent((p) => ({ ...p, state: e.target.value }))} /></div>
                      <div><Label>Mobile</Label><Input value={newEvent.client_mobile} onChange={(e) => setNewEvent((p) => ({ ...p, client_mobile: e.target.value }))} /></div>
                      <div><Label>Artists</Label><Input type="number" min={1} value={newEvent.artist_count} onChange={(e) => setNewEvent((p) => ({ ...p, artist_count: Number(e.target.value) }))} /></div>
                      <div><Label>Start Time</Label><Input type="time" value={newEvent.event_start_time} onChange={(e) => setNewEvent((p) => ({ ...p, event_start_time: e.target.value }))} /></div>
                      <div><Label>End Time</Label><Input type="time" value={newEvent.event_end_time} onChange={(e) => setNewEvent((p) => ({ ...p, event_end_time: e.target.value }))} /></div>
                      <div><Label>Total Price</Label><Input type="number" value={newEvent.total_price} onChange={(e) => setNewEvent((p) => ({ ...p, total_price: Number(e.target.value) }))} /></div>
                      <div><Label>Advance</Label><Input type="number" value={newEvent.advance_amount} onChange={(e) => setNewEvent((p) => ({ ...p, advance_amount: Number(e.target.value) }))} /></div>
                      <div><Label>Event Type</Label>
                        <Select value={newEvent.event_type} onValueChange={(v) => setNewEvent((p) => ({ ...p, event_type: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["wedding","birthday","corporate","college","other"].map((t) => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button className="mt-4 w-full rounded-xl" onClick={handleAddManualEvent} disabled={addingEvent}>
                      {addingEvent ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                      Add & Push
                    </Button>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* ─────── 9 Widgets ─────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <FlashWidget title="This Month" value={analytics.thisMonth.length} icon={Calendar} note={`${analytics.webThisMonth} web · ${analytics.manThisMonth} manual`} />
        <FlashWidget title="Next Month" value={analytics.nextMonth.length} icon={ArrowUpRight} note="booked ahead" />
        <FlashWidget title="Upcoming Year" value={analytics.upcoming.length} icon={TrendingUp} note={`rest of ${new Date().getFullYear()}`} />
        <FlashWidget title="Pushed" value={analytics.pushed.length} icon={CheckCircle2} note={`${analytics.notPushed.length} not pushed`} />
        <FlashWidget title="Not Pushed" value={analytics.notPushed.length} icon={XCircle} note="awaiting push" />
        <FlashWidget title="Total Revenue" value={formatCurrency(analytics.totalRevenue)} icon={DollarSign} note="all events" />
        <FlashWidget title="This Month Rev" value={formatCurrency(analytics.thisMonthRevenue)} icon={DollarSign} note="current month" />
        <FlashWidget title="Pending Amt" value={formatCurrency(analytics.totalPending)} icon={Clock} note="total remaining" />
        <FlashWidget title="Confirmed" value={analytics.confirmed.length} icon={CheckCircle2} note={`${analytics.pending.length} payment pending`} />
      </div>

      {/* ─────── Charts ─────── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Monthly Trend */}
        <motion.div whileHover={{ y: -2 }}>
          <Card className="rounded-2xl border-border/30 bg-card/80 backdrop-blur-xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)]">
            <CardHeader><CardTitle className="text-sm">Monthly Trend (6 months)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={analytics.monthlyTrend}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip />
                  <Bar dataKey="website" stackId="a" fill={CHART_COLORS[0]} radius={[0, 0, 0, 0]} name="Website" />
                  <Bar dataKey="manual" stackId="a" fill={CHART_COLORS[5]} radius={[6, 6, 0, 0]} name="Manual" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Source + Push Pie */}
        <motion.div whileHover={{ y: -2 }}>
          <Card className="rounded-2xl border-border/30 bg-card/80 backdrop-blur-xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)]">
            <CardHeader><CardTitle className="text-sm">Source & Push Status</CardTitle></CardHeader>
            <CardContent className="flex gap-4">
              <div className="flex-1">
                <p className="text-[10px] text-center text-muted-foreground mb-1">Source</p>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={analytics.sourceChart} dataKey="value" nameKey="name" innerRadius={30} outerRadius={50}>
                      {analytics.sourceChart.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-3">
                  {analytics.sourceChart.map((item, i) => (
                    <span key={item.name} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />{item.name}: {item.value}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-center text-muted-foreground mb-1">Push Status</p>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={analytics.pushChart} dataKey="value" nameKey="name" innerRadius={30} outerRadius={50}>
                      {analytics.pushChart.map((_, i) => <Cell key={i} fill={CHART_COLORS[i + 2]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-3">
                  {analytics.pushChart.map((item, i) => (
                    <span key={item.name} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i + 2] }} />{item.name}: {item.value}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Cities + Event Types */}
        <motion.div whileHover={{ y: -2 }}>
          <Card className="rounded-2xl border-border/30 bg-card/80 backdrop-blur-xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)]">
            <CardHeader><CardTitle className="text-sm">Top Cities & Event Types</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-[10px] text-muted-foreground mb-2">Cities</p>
                {analytics.cityChart.slice(0, 4).map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 rounded-full bg-primary/20" style={{ width: `${Math.max(20, (c.value / (analytics.cityChart[0]?.value || 1)) * 60)}px` }}>
                        <div className="h-full rounded-full bg-primary" style={{ width: "100%" }} />
                      </div>
                      <span className="text-xs font-semibold">{c.value}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-2">Event Types</p>
                {analytics.typeChart.slice(0, 4).map((t) => (
                  <div key={t.name} className="flex items-center justify-between py-1">
                    <span className="text-xs">{t.name}</span>
                    <Badge variant="secondary" className="text-[10px]">{t.value}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ─────── Events Table with Expanded Details ─────── */}
      <motion.div whileHover={{ y: -1 }}>
        <Card className="rounded-2xl border-border/30 bg-card/80 backdrop-blur-xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)]">
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="text-sm">Event Bookings</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="w-[160px] pl-9 rounded-xl h-8 text-xs" />
                </div>
                <Select value={eventFilter} onValueChange={setEventFilter}>
                  <SelectTrigger className="w-[150px] rounded-xl h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="this_month">This month</SelectItem>
                    <SelectItem value="next_month">Next month</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="pushed">Pushed only</SelectItem>
                    <SelectItem value="not_pushed">Not pushed</SelectItem>
                    <SelectItem value="manual">Manual only</SelectItem>
                    <SelectItem value="all">All events</SelectItem>
                    {availableMonthOptions.map((mk) => <SelectItem key={mk} value={mk}>{formatMonthLabel(mk)}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Badge variant="outline" className="text-[10px]">{filteredEvents.length} events</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Pushed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => (
                  <>
                    <TableRow key={event.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setExpandedEventId(expandedEventId === event.id ? null : event.id)}>
                      <TableCell>
                        {expandedEventId === event.id ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                      </TableCell>
                      <TableCell className="text-xs font-medium">{event.event_date}</TableCell>
                      <TableCell className="text-xs">{event.venue_name || "—"}</TableCell>
                      <TableCell className="text-xs">{event.client_name || "—"}</TableCell>
                      <TableCell className="text-xs">{event.city || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{event.event_type || "—"}</Badge></TableCell>
                      <TableCell className="text-xs font-medium">{event.total_price ? formatCurrency(event.total_price) : "—"}</TableCell>
                      <TableCell><Badge variant={event.source === "manual" ? "secondary" : "default"} className="text-[10px]">{event.source || "website"}</Badge></TableCell>
                      <TableCell>
                        {event.sheet_pushed ? (
                          <Badge className="bg-primary/10 text-primary text-[10px]">✓ Pushed</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">Not pushed</Badge>
                        )}
                      </TableCell>
                       <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap justify-end gap-1">
                          {!event.sheet_pushed ? (
                            <Button size="sm" variant="default" className="h-7 rounded-lg text-[10px] px-2" onClick={() => handlePushSingle(event.id)} disabled={pushingId === event.id}>
                              {pushingId === event.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Send className="mr-1 h-3 w-3" />}Push
                            </Button>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" className="h-7 rounded-lg text-[10px] px-2" onClick={() => handlePushSingle(event.id)} disabled={pushingId === event.id}>
                                {pushingId === event.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Send className="mr-1 h-3 w-3" />}Re-push
                              </Button>
                              <Button size="sm" variant="secondary" className="h-7 rounded-lg text-[10px] px-2" onClick={() => handleUpdatePushed(event.id)} disabled={updatingId === event.id}>
                                {updatingId === event.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}Update
                              </Button>
                                {(event.source || "website") !== "manual" && (
                                  <Button size="sm" variant="destructive" className="h-7 rounded-lg text-[10px] px-2" onClick={() => handleReversePush(event.id)} disabled={reversingId === event.id}>
                                    {reversingId === event.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RotateCcw className="mr-1 h-3 w-3" />}Reverse
                                  </Button>
                                )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    <AnimatePresence>
                      {expandedEventId === event.id && (
                        <TableRow key={`${event.id}-detail`}>
                          <TableCell colSpan={10} className="bg-muted/20 p-0">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="grid grid-cols-2 gap-x-6 gap-y-2 p-4 sm:grid-cols-4 text-xs">
                                <div><span className="text-muted-foreground">Mobile:</span> <span className="font-medium">{event.client_mobile || "—"}</span></div>
                                <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{event.client_email || "—"}</span></div>
                                <div><span className="text-muted-foreground">State:</span> <span className="font-medium">{event.state || "—"}</span></div>
                                <div><span className="text-muted-foreground">Artists:</span> <span className="font-medium">{event.artist_count || 1}</span></div>
                                <div><span className="text-muted-foreground">Time:</span> <span className="font-medium">{event.event_start_time || "—"} – {event.event_end_time || "—"}</span></div>
                                <div><span className="text-muted-foreground">Advance:</span> <span className="font-medium">{event.advance_amount ? formatCurrency(event.advance_amount) : "—"}</span></div>
                                <div><span className="text-muted-foreground">Pending:</span> <span className="font-medium">{(event.total_price || 0) - (event.advance_amount || 0) > 0 ? formatCurrency((event.total_price || 0) - (event.advance_amount || 0)) : "Nil"}</span></div>
                                <div><span className="text-muted-foreground">Payment:</span> <span className="font-medium">{event.payment_status || "—"}</span></div>
                                <div><span className="text-muted-foreground">Status:</span> <span className="font-medium">{event.status || "—"}</span></div>
                                <div><span className="text-muted-foreground">Address:</span> <span className="font-medium">{event.full_address || "—"}</span></div>
                                {event.sheet_pushed_at && (
                                  <div className="col-span-2"><span className="text-muted-foreground">Last pushed:</span> <span className="font-medium">{new Date(event.sheet_pushed_at).toLocaleString("en-IN")}</span></div>
                                )}
                              </div>
                            </motion.div>
                          </TableCell>
                        </TableRow>
                      )}
                    </AnimatePresence>
                  </>
                ))}
                {filteredEvents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="py-12 text-center text-muted-foreground">No events found for this filter.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─────── Sheet Data ─────── */}
      <motion.div whileHover={{ y: -1 }}>
        <Card className="rounded-2xl border-border/30 bg-card/80 backdrop-blur-xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)]">
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="text-sm">Google Sheet Data</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={sheetFilter} onValueChange={setSheetFilter}>
                  <SelectTrigger className="w-[150px] rounded-xl h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="this_month">This month</SelectItem>
                    <SelectItem value="next_month">Next month</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="this_year">This year</SelectItem>
                    <SelectItem value="all">All tabs</SelectItem>
                    {availableSheetMonths.map((mk) => <SelectItem key={mk} value={mk}>{formatMonthLabel(mk)}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={activeTab} onValueChange={setActiveTab}>
                  <SelectTrigger className="w-[200px] rounded-xl h-8 text-xs"><SelectValue placeholder="Select tab" /></SelectTrigger>
                  <SelectContent>
                    {filteredTabs.map((tab) => <SelectItem key={tab.title} value={tab.title}>{tab.normalizedTitle} ({tab.eventCount})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingTab ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading tab...</div>
            ) : visibleRows.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">No sheet rows found.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px]">#</TableHead>
                      {sheetHeaders.map((h, i) => <TableHead key={i} className="text-[10px]">{h || `Col ${i + 1}`}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleRows.map((row, ri) => (
                      <TableRow key={`${ri}-${row.join("-")}`}>
                        <TableCell className="text-[10px]">{ri + 1}</TableCell>
                        {sheetHeaders.map((_, ci) => <TableCell key={ci} className="text-[10px]">{row[ci] || ""}</TableCell>)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default AdminGoogleSheet;
