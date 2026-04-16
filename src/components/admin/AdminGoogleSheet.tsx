import { Fragment, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ArrowUpRight, Calendar, Check, CheckCircle2, ChevronDown, ChevronUp, Clock, DollarSign,
  Edit2, Filter, Loader2, MapPin, Plus, RefreshCw, RotateCcw, Save, Search, Send, Sheet,
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
  remaining_amount: number | null;
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
  "hsl(var(--primary) / 0.7)",
  "hsl(var(--accent) / 0.75)",
  "hsl(var(--secondary) / 0.75)",
  "hsl(var(--foreground) / 0.55)",
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

/* ─────────── 3D Flash Card Widget ─────────── */
const FlashWidget = ({ title, value, icon: Icon, note, trend }: {
  title: string; value: string | number; icon: any; note: string; trend?: string;
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
        <div className="space-y-1.5 min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">{title}</p>
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground truncate">{value}</p>
          <div className="flex items-center gap-1.5">
            {trend && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                trend.startsWith("+") ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}>{trend}</span>
            )}
            <p className="text-[11px] text-muted-foreground truncate">{note}</p>
          </div>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary shadow-inner">
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
  const [sheetFilter, setSheetFilter] = useState("this_month");
  const [eventFilter, setEventFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pushingId, setPushingId] = useState<string | null>(null);
  const [reversingId, setReversingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [addingEvent, setAddingEvent] = useState(false);
  const [newEvent, setNewEvent] = useState<ManualEventForm>(initialManualEvent);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [editingPendingId, setEditingPendingId] = useState<string | null>(null);
  const [pendingValue, setPendingValue] = useState("");
  const [savingPending, setSavingPending] = useState(false);
  const [savingPaymentStatus, setSavingPaymentStatus] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchEvents = useCallback(async () => {
    const { data } = await supabase.from("event_bookings").select("*").order("event_date", { ascending: true });
    setEvents((data || []) as EventBooking[]);
  }, []);

  const fetchSheetData = useCallback(async () => {
    setLoading(true);
    try {
      // Single API call for everything
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", { body: { action: "read_all" } });
      if (error) throw error;
      if (data?.success === false && data?.error) {
        toast({ title: "Sheet data issue", description: data.error, variant: "destructive" });
      }
      const summaries = (data?.tabSummaries || []) as SheetTabSummary[];
      setTabSummaries(summaries);
      setSheetTabs((data?.tabs || {}) as Record<string, string[][]>);
      if (!activeTab && summaries.length > 0) {
        const currentKey = getMonthKey(new Date());
        setActiveTab(summaries.find((item) => item.monthKey === currentKey)?.title || summaries[0].title);
      }
    } catch (error: any) {
      toast({ title: "Failed to load sheet data", description: error.message, variant: "destructive" });
    } finally { setLoading(false); }
  }, [activeTab]);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchEvents(), fetchSheetData()]);
  }, [fetchEvents, fetchSheetData]);

  useEffect(() => { refreshAll().catch(() => {}); }, []);

  // Debounced realtime refresh - re-fetch both DB events AND sheet data
  const debouncedRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      refreshAll().catch(() => {});
    }, 3000);
  }, [refreshAll]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-google-sheet-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "event_bookings" }, debouncedRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_history" }, debouncedRefresh)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [debouncedRefresh]);

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
  }, [filteredTabs]);

  const filteredEvents = useMemo(() => {
    const ck = getMonthKey(new Date());
    const nk = getMonthKey(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1));
    const now = new Date();
    let base = events;
    if (eventFilter === "this_month") base = events.filter((e) => matchesMonth(e.event_date, ck));
    else if (eventFilter === "next_month") base = events.filter((e) => matchesMonth(e.event_date, nk));
    else if (eventFilter === "upcoming") base = events.filter((e) => new Date(e.event_date) >= new Date(now.toDateString()));
    else if (eventFilter === "manual") base = events.filter((e) => e.source === "manual");
    else if (eventFilter === "pushed") base = events.filter((e) => e.sheet_pushed);
    else if (eventFilter === "not_pushed") base = events.filter((e) => !e.sheet_pushed);
    else if (eventFilter !== "all") base = events.filter((e) => matchesMonth(e.event_date, eventFilter));
    if (deferredSearch.trim()) base = base.filter((e) => [e.client_name, e.venue_name, e.city, e.event_type].some((v) => v?.toLowerCase().includes(deferredSearch.toLowerCase())));
    return base;
  }, [deferredSearch, eventFilter, events]);

  /* ─────── Analytics from DB bookings (website data only) ─────── */
  const analytics = useMemo(() => {
    const now = new Date();
    const ck = getMonthKey(now);
    const nk = getMonthKey(new Date(now.getFullYear(), now.getMonth() + 1, 1));

    const thisMonth = events.filter((e) => matchesMonth(e.event_date, ck));
    const nextMonth = events.filter((e) => matchesMonth(e.event_date, nk));
    const upcoming = events.filter((e) => new Date(e.event_date) >= new Date(now.toDateString()));
    const pushed = events.filter((e) => e.sheet_pushed);
    const notPushed = events.filter((e) => !e.sheet_pushed);
    const confirmed = events.filter((e) => e.payment_status === "confirmed" || e.payment_status === "paid" || e.payment_status === "fully_paid");
    const paymentPending = events.filter((e) => !e.payment_status || e.payment_status === "pending");

    const totalRevenue = events.reduce((s, e) => s + (e.total_price || 0), 0);
    const totalPending = events.reduce((s, e) => {
      if (e.remaining_amount != null && e.remaining_amount > 0) return s + e.remaining_amount;
      const remaining = (e.total_price || 0) - (e.advance_amount || 0);
      return s + (remaining > 0 ? remaining : 0);
    }, 0);
    const thisMonthRevenue = thisMonth.reduce((s, e) => s + (e.total_price || 0), 0);

    const cityMap: Record<string, number> = {};
    events.forEach((e) => { const c = e.city || "Unknown"; cityMap[c] = (cityMap[c] || 0) + 1; });
    const cityChart = Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }));

    const typeMap: Record<string, number> = {};
    events.forEach((e) => { const t = e.event_type || "other"; typeMap[t] = (typeMap[t] || 0) + 1; });
    const typeChart = Object.entries(typeMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));

    const monthlyTrend: { name: string; website: number; manual: number; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mk = getMonthKey(d);
      const mEvents = events.filter((e) => matchesMonth(e.event_date, mk));
      monthlyTrend.push({
        name: MONTH_NAMES[d.getMonth()].slice(0, 3),
        website: mEvents.filter((e) => e.source !== "manual").length,
        manual: mEvents.filter((e) => e.source === "manual").length,
        total: mEvents.length,
      });
    }

    return {
      thisMonth, nextMonth, upcoming, manual: events.filter(e => e.source === "manual"),
      website: events.filter(e => e.source !== "manual"), pushed, notPushed,
      confirmed, paymentPending, totalRevenue, thisMonthRevenue, totalPending,
      webThisMonth: thisMonth.filter(e => e.source !== "manual").length,
      manThisMonth: thisMonth.filter(e => e.source === "manual").length,
      cityChart, typeChart, monthlyTrend,
      sourceChart: [
        { name: "Website", value: events.filter(e => e.source !== "manual").length },
        { name: "Manual", value: events.filter(e => e.source === "manual").length },
      ],
      pushChart: [
        { name: "Pushed", value: pushed.length },
        { name: "Not Pushed", value: notPushed.length },
      ],
    };
  }, [events]);

  // Active tab rows from cached data (new structure: header is row 0)
  const activeTabRows = useMemo(() => sheetTabs[activeTab] || [], [sheetTabs, activeTab]);
  const sheetHeaders = activeTabRows[0] || [];
  const sheetRows = activeTabRows.slice(1);
  const visibleRows = deferredSearch.trim()
    ? sheetRows.filter((row) => row.some((cell) => String(cell || "").toLowerCase().includes(deferredSearch.toLowerCase())))
    : sheetRows;

  /* ─────── Actions ─────── */
  const [settingUp, setSettingUp] = useState(false);

  const handleSetupSheets = async () => {
    setSettingUp(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", { body: { action: "setup_sheets" } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Setup failed");
      toast({ title: "Sheets created!", description: `${data.created || 0} monthly tabs created with formatting, dropdowns & conditional colors.` });
      await refreshAll();
    } catch (error: any) {
      toast({ title: "Setup failed", description: error.message, variant: "destructive" });
    } finally { setSettingUp(false); }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", { body: { action: "sync_all" } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Sync failed");
      toast({ title: "Sync complete", description: `${data.synced || 0} new events pushed. ${data.skipped || 0} skipped.` });
      await refreshAll();
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
    } catch (error: any) {
      toast({ title: "Reverse failed", description: error.message, variant: "destructive" });
    } finally { setReversingId(null); }
  };

  const handleSavePending = async (eventId: string) => {
    const numValue = Number(pendingValue);
    if (isNaN(numValue) || numValue < 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }
    setSavingPending(true);
    try {
      const event = events.find((e) => e.id === eventId);
      if (!event) throw new Error("Event not found");
      // remaining_amount = pending, advance = total - pending
      const newAdvance = (event.total_price || 0) - numValue;
      const { error } = await supabase.from("event_bookings").update({
        advance_amount: Math.max(0, newAdvance),
        remaining_amount: numValue,
      }).eq("id", eventId);
      if (error) throw error;
      toast({ title: "Pending amount updated" });
      setEditingPendingId(null);
      setPendingValue("");
      await fetchEvents();
    } catch (error: any) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    } finally { setSavingPending(false); }
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
    } catch (error: any) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } finally { setAddingEvent(false); }
  };

  const handleChangePaymentStatus = async (eventId: string, newStatus: string) => {
    setSavingPaymentStatus(eventId);
    try {
      const event = events.find((e) => e.id === eventId);
      if (!event) throw new Error("Event not found");
      const updates: Record<string, any> = { payment_status: newStatus };
      if (newStatus === "fully_paid") {
        updates.remaining_amount = 0;
        updates.advance_amount = event.total_price || 0;
      }
      const { error } = await supabase.from("event_bookings").update(updates).eq("id", eventId);
      if (error) throw error;
      toast({ title: "Payment status updated", description: `Set to ${newStatus.replace(/_/g, " ")}` });
      await fetchEvents();
    } catch (error: any) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    } finally { setSavingPaymentStatus(null); }
  };

  const getPendingAmount = (event: EventBooking) => {
    if (event.remaining_amount != null && event.remaining_amount > 0) return event.remaining_amount;
    const remaining = (event.total_price || 0) - (event.advance_amount || 0);
    return remaining > 0 ? remaining : 0;
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
                  <CardTitle className="text-lg">Event Bookings Sheet</CardTitle>
                  <p className="text-xs text-muted-foreground">Live sync with Website Event Booking spreadsheet</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => refreshAll()} disabled={loading} className="rounded-xl">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Refresh
                </Button>
                <Button size="sm" onClick={handleSetupSheets} disabled={settingUp} className="rounded-xl" variant="outline">
                  {settingUp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sheet className="mr-2 h-4 w-4" />}
                  Setup Sheets
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
        <FlashWidget title="Total Revenue" value={formatCurrency(analytics.totalRevenue)} icon={DollarSign} note="from sheet data" />
        <FlashWidget title="This Month Rev" value={formatCurrency(analytics.thisMonthRevenue)} icon={DollarSign} note="current month" />
        <FlashWidget title="Pending Amt" value={formatCurrency(analytics.totalPending)} icon={Clock} note="total remaining" />
        <FlashWidget title="Confirmed" value={analytics.confirmed.length} icon={CheckCircle2} note={`${analytics.paymentPending.length} payment pending`} />
      </div>

      {/* ─────── Charts ─────── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
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

        <motion.div whileHover={{ y: -2 }}>
          <Card className="rounded-2xl border-border/30 bg-card/80 backdrop-blur-xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)]">
            <CardHeader><CardTitle className="text-sm">Top Cities & Event Types</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-[10px] text-muted-foreground mb-2">Cities</p>
                {analytics.cityChart.slice(0, 4).map((c) => (
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
                  <TableHead>Artist</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paid</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Payment</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Pushed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => {
                  const pendingAmt = getPendingAmount(event);
                  return (
                    <Fragment key={event.id}>
                      <TableRow className="cursor-pointer hover:bg-muted/30" onClick={() => setExpandedEventId(expandedEventId === event.id ? null : event.id)}>
                        <TableCell>
                          {expandedEventId === event.id ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                        </TableCell>
                        <TableCell className="text-xs font-medium">{event.event_date}</TableCell>
                        <TableCell className="text-xs">{[event.city, event.venue_name].filter(Boolean).join(" - ") || "—"}</TableCell>
                        <TableCell className="text-xs">{(event.artist_count || 1) === 1 ? "1 Artist" : `${event.artist_count} Artists`}</TableCell>
                        <TableCell className="text-xs font-medium">{event.total_price ? formatCurrency(event.total_price) : "—"}</TableCell>
                        <TableCell className="text-xs font-medium text-primary">{event.advance_amount ? formatCurrency(event.advance_amount) : "—"}</TableCell>
                        <TableCell className="text-xs font-medium">
                          {pendingAmt > 0 ? (
                            <span className="text-destructive">{formatCurrency(pendingAmt)}</span>
                          ) : (
                            <span className="text-primary">Nil</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs" onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={event.payment_status || "pending"}
                            onValueChange={(v) => handleChangePaymentStatus(event.id, v)}
                            disabled={savingPaymentStatus === event.id}
                          >
                            <SelectTrigger className="h-6 w-[100px] rounded-lg text-[10px] border-border/40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="partial">Partial</SelectItem>
                              <SelectItem value="paid">Paid</SelectItem>
                              <SelectItem value="fully_paid">Fully Paid</SelectItem>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="refunded">Refunded</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-xs max-w-[160px] truncate" title={event.full_address || ""}>{event.full_address || [event.venue_name, event.city, event.state].filter(Boolean).join(", ") || "—"}</TableCell>
                        <TableCell className="text-xs">{event.client_name || "—"}</TableCell>
                        <TableCell className="text-xs">{event.client_mobile || "—"}</TableCell>
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
                                <Button size="sm" variant="destructive" className="h-7 rounded-lg text-[10px] px-2" onClick={() => handleReversePush(event.id)} disabled={reversingId === event.id}>
                                  {reversingId === event.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RotateCcw className="mr-1 h-3 w-3" />}Reverse
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      <AnimatePresence>
                        {expandedEventId === event.id && (
                          <TableRow key={`${event.id}-detail`}>
                            <TableCell colSpan={12} className="p-0">
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden"
                              >
                                <div className="relative rounded-b-xl bg-gradient-to-br from-muted/40 to-muted/20 border-t border-border/40">
                                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-primary/30 rounded-bl-xl" />
                                  <div className="pl-5 pr-4 py-4 space-y-3">
                                    {/* Row 1: Contact */}
                                    <div className="flex items-center gap-2 mb-1">
                                      <Users className="h-3.5 w-3.5 text-primary" />
                                      <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">Contact & Location</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-4">
                                      <div className="space-y-0.5">
                                        <p className="text-[10px] text-muted-foreground font-medium">Mobile</p>
                                        <p className="text-xs font-semibold">{event.client_mobile || "—"}</p>
                                      </div>
                                      <div className="space-y-0.5">
                                        <p className="text-[10px] text-muted-foreground font-medium">Email</p>
                                        <p className="text-xs font-semibold truncate">{event.client_email || "—"}</p>
                                      </div>
                                      <div className="space-y-0.5">
                                        <p className="text-[10px] text-muted-foreground font-medium">State</p>
                                        <p className="text-xs font-semibold">{event.state || "—"}</p>
                                      </div>
                                      <div className="space-y-0.5">
                                        <p className="text-[10px] text-muted-foreground font-medium">Artists</p>
                                        <p className="text-xs font-semibold">{(event.artist_count || 1) === 1 ? "1 Artist" : `${event.artist_count} Artists`}</p>
                                      </div>
                                    </div>

                                    {/* Divider */}
                                    <div className="border-t border-border/30" />

                                    {/* Row 2: Booking & Payment */}
                                    <div className="flex items-center gap-2 mb-1">
                                      <DollarSign className="h-3.5 w-3.5 text-primary" />
                                      <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">Booking & Payment</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-4">
                                      <div className="space-y-0.5">
                                        <p className="text-[10px] text-muted-foreground font-medium">Time</p>
                                        <p className="text-xs font-semibold">{event.event_start_time || "—"} – {event.event_end_time || "—"}</p>
                                      </div>
                                      <div className="space-y-0.5">
                                        <p className="text-[10px] text-muted-foreground font-medium">Advance</p>
                                        <p className="text-xs font-semibold text-primary">{event.advance_amount ? formatCurrency(event.advance_amount) : "—"}</p>
                                      </div>
                                      <div className="space-y-0.5">
                                        <p className="text-[10px] text-muted-foreground font-medium">Pending</p>
                                        <div className="flex items-center gap-1.5">
                                          {editingPendingId === event.id ? (
                                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                              <Input type="number" value={pendingValue} onChange={(e) => setPendingValue(e.target.value)} className="h-6 w-24 text-xs rounded-lg" min={0} />
                                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleSavePending(event.id)} disabled={savingPending}>
                                                {savingPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-primary" />}
                                              </Button>
                                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setEditingPendingId(null); setPendingValue(""); }}>
                                                <XCircle className="h-3 w-3 text-muted-foreground" />
                                              </Button>
                                            </div>
                                          ) : (
                                            <>
                                              <span className={`text-xs font-semibold ${pendingAmt > 0 ? "text-destructive" : "text-primary"}`}>{pendingAmt > 0 ? formatCurrency(pendingAmt) : "Nil"}</span>
                                              <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={(e) => { e.stopPropagation(); setEditingPendingId(event.id); setPendingValue(String(pendingAmt)); }}>
                                                <Edit2 className="h-3 w-3 text-muted-foreground hover:text-primary transition-colors" />
                                              </Button>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                      <div className="space-y-0.5">
                                        <p className="text-[10px] text-muted-foreground font-medium">Payment Status</p>
                                        <div onClick={(e) => e.stopPropagation()}>
                                          <Select
                                            value={event.payment_status || "pending"}
                                            onValueChange={(v) => handleChangePaymentStatus(event.id, v)}
                                            disabled={savingPaymentStatus === event.id}
                                          >
                                            <SelectTrigger className="h-7 w-[130px] rounded-lg text-[10px]">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="pending">Pending</SelectItem>
                                              <SelectItem value="partial">Partial</SelectItem>
                                              <SelectItem value="paid">Paid</SelectItem>
                                              <SelectItem value="fully_paid">Fully Paid</SelectItem>
                                              <SelectItem value="confirmed">Confirmed</SelectItem>
                                              <SelectItem value="refunded">Refunded</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Divider */}
                                    <div className="border-t border-border/30" />

                                    {/* Row 3: Additional */}
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-4">
                                      <div className="space-y-0.5">
                                        <p className="text-[10px] text-muted-foreground font-medium">Booking Status</p>
                                        <Badge variant="secondary" className="text-[10px]">{event.status || "—"}</Badge>
                                      </div>
                                      <div className="col-span-2 space-y-0.5">
                                        <p className="text-[10px] text-muted-foreground font-medium">Address / Venue</p>
                                        <p className="text-xs font-semibold">{event.full_address || event.venue_name || "—"}</p>
                                      </div>
                                      {event.sheet_pushed_at && (
                                        <div className="space-y-0.5">
                                          <p className="text-[10px] text-muted-foreground font-medium">Last Pushed</p>
                                          <p className="text-[10px] font-medium text-muted-foreground">{new Date(event.sheet_pushed_at).toLocaleString("en-IN")}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            </TableCell>
                          </TableRow>
                        )}
                      </AnimatePresence>
                    </Fragment>
                  );
                })}
                {filteredEvents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={12} className="py-12 text-center text-muted-foreground">No events found for this filter.</TableCell>
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
            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading...</div>
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
                      <TableRow key={ri}>
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
