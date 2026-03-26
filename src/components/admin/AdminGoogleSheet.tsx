import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bar, BarChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Calendar, Filter, Loader2, Plus, RefreshCw, RotateCcw, Search, Send, Sheet, TrendingUp } from "lucide-react";

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
  city: string | null;
  event_type: string | null;
  total_price: number | null;
  advance_amount: number | null;
  status: string | null;
  payment_status: string | null;
  source?: string | null;
  sheet_pushed?: boolean | null;
}

interface SheetTabSummary {
  title: string;
  normalizedTitle: string;
  monthKey: string | null;
  eventCount: number;
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
];

const initialManualEvent: ManualEventForm = {
  event_date: "",
  venue_name: "",
  event_start_time: "",
  event_end_time: "",
  client_name: "",
  client_mobile: "",
  client_email: "",
  city: "",
  state: "",
  event_type: "wedding",
  artist_count: 1,
  total_price: 0,
  advance_amount: 0,
  status: "confirmed",
  payment_status: "pending",
  notes: "",
};

const getMonthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const formatMonthLabel = (monthKey: string) => {
  const [year, month] = monthKey.split("-");
  return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
};

const matchesMonth = (dateValue: string, monthKey: string) => getMonthKey(new Date(dateValue)) === monthKey;

const AdminGoogleSheet = () => {
  const [events, setEvents] = useState<EventBooking[]>([]);
  const [tabSummaries, setTabSummaries] = useState<SheetTabSummary[]>([]);
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
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [addingEvent, setAddingEvent] = useState(false);
  const [newEvent, setNewEvent] = useState<ManualEventForm>(initialManualEvent);

  const fetchEvents = useCallback(async () => {
    const { data, error } = await supabase.from("event_bookings").select("*").order("event_date", { ascending: true });
    if (error) throw error;
    setEvents((data || []) as EventBooking[]);
  }, []);

  const fetchSheetOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", {
        body: { action: "read_overview" },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to load sheet data");

      const summaries = (data.tabSummaries || []) as SheetTabSummary[];
      setTabSummaries(summaries);

      if (!activeTab && summaries.length > 0) {
        const currentKey = getMonthKey(new Date());
        setActiveTab(summaries.find((item) => item.monthKey === currentKey)?.title || summaries[0].title);
      }
    } catch (error: any) {
      toast({ title: "Failed to load sheet data", description: error.message, variant: "destructive" });
    } finally {
      setLoadingOverview(false);
    }
  }, [activeTab]);

  const fetchActiveTab = useCallback(async (tabName: string) => {
    if (!tabName) return;

    setLoadingTab(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", {
        body: { action: "read_tab", tab_name: tabName },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to load selected tab");

      setActiveTabRows((data.rows || []) as string[][]);
      setActiveTab(data.tabName || tabName);
    } catch (error: any) {
      toast({ title: "Failed to load sheet data", description: error.message, variant: "destructive" });
    } finally {
      setLoadingTab(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchEvents(), fetchSheetOverview()]);
  }, [fetchEvents, fetchSheetOverview]);

  useEffect(() => {
    refreshAll().catch((error: Error) => {
      toast({ title: "Failed to initialize", description: error.message, variant: "destructive" });
    });
  }, [refreshAll]);

  useEffect(() => {
    if (activeTab) {
      fetchActiveTab(activeTab).catch(() => undefined);
    }
  }, [activeTab, fetchActiveTab]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-google-sheet-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "event_bookings" }, async () => {
        await Promise.all([fetchEvents(), fetchSheetOverview()]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEvents, fetchSheetOverview]);

  const availableMonthOptions = useMemo(() => {
    return Array.from(new Set(events.map((event) => getMonthKey(new Date(event.event_date))))).sort();
  }, [events]);

  const availableSheetMonths = useMemo(() => {
    return Array.from(new Set(tabSummaries.map((tab) => tab.monthKey).filter(Boolean) as string[])).sort();
  }, [tabSummaries]);

  const filteredTabs = useMemo(() => {
    const currentKey = getMonthKey(new Date());
    const nextKey = getMonthKey(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1));

    if (sheetFilter === "this_month") return tabSummaries.filter((tab) => tab.monthKey === currentKey);
    if (sheetFilter === "next_month") return tabSummaries.filter((tab) => tab.monthKey === nextKey);
    if (sheetFilter === "upcoming") return tabSummaries.filter((tab) => tab.monthKey && tab.monthKey >= currentKey);
    if (sheetFilter === "this_year") return tabSummaries.filter((tab) => tab.monthKey?.startsWith(`${new Date().getFullYear()}-`));
    if (sheetFilter === "all") return tabSummaries;
    return tabSummaries.filter((tab) => tab.monthKey === sheetFilter);
  }, [sheetFilter, tabSummaries]);

  useEffect(() => {
    if (filteredTabs.length && !filteredTabs.some((tab) => tab.title === activeTab)) {
      setActiveTab(filteredTabs[0].title);
    }
  }, [activeTab, filteredTabs]);

  const filteredEvents = useMemo(() => {
    const currentKey = getMonthKey(new Date());
    const nextKey = getMonthKey(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1));
    const now = new Date();

    if (eventFilter === "this_month") return events.filter((event) => matchesMonth(event.event_date, currentKey));
    if (eventFilter === "next_month") return events.filter((event) => matchesMonth(event.event_date, nextKey));
    if (eventFilter === "upcoming") return events.filter((event) => new Date(event.event_date) >= now);
    if (eventFilter === "manual") return events.filter((event) => event.source === "manual");
    if (eventFilter === "all") return events;
    return events.filter((event) => matchesMonth(event.event_date, eventFilter));
  }, [eventFilter, events]);

  const analytics = useMemo(() => {
    const currentKey = getMonthKey(new Date());
    const nextKey = getMonthKey(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1));
    const now = new Date();

    const manualEvents = events.filter((event) => event.source === "manual");
    const manualThisMonth = manualEvents.filter((event) => matchesMonth(event.event_date, currentKey));
    const manualNextMonth = manualEvents.filter((event) => matchesMonth(event.event_date, nextKey));
    const totalThisMonth = events.filter((event) => matchesMonth(event.event_date, currentKey));
    const upcomingTotal = events.filter((event) => new Date(event.event_date) >= now);

    return {
      manualThisMonth,
      manualNextMonth,
      totalThisMonth,
      upcomingTotal,
      monthlyChart: tabSummaries.filter((tab) => tab.monthKey).slice(-6).map((tab) => ({
        name: tab.normalizedTitle.split(" ")[0],
        total: tab.eventCount,
      })),
      sourceChart: [
        { name: "Manual", value: manualEvents.length },
        { name: "Website", value: events.filter((event) => event.source !== "manual").length },
      ],
    };
  }, [events, tabSummaries]);

  const sheetHeaders = activeTabRows[2] || [];
  const sheetRows = activeTabRows.slice(3);
  const visibleRows = search.trim()
    ? sheetRows.filter((row) => row.some((cell) => String(cell || "").toLowerCase().includes(search.toLowerCase())))
    : sheetRows;

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", { body: { action: "sync_all" } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Sync failed");
      toast({ title: "Sync complete", description: `${data.synced || 0} events pushed.` });
      await refreshAll();
      if (activeTab) await fetchActiveTab(activeTab);
    } catch (error: any) {
      toast({ title: "Sync failed", description: error.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const handlePushSingle = async (eventId: string) => {
    setPushingId(eventId);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", { body: { action: "push_single", event_id: eventId } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Push failed");
      toast({ title: "Event pushed", description: `Updated ${data.tab || "sheet"}.` });
      await refreshAll();
      if (activeTab) await fetchActiveTab(activeTab);
    } catch (error: any) {
      toast({ title: "Push failed", description: error.message, variant: "destructive" });
    } finally {
      setPushingId(null);
    }
  };

  const handleReversePush = async (eventId: string) => {
    setReversingId(eventId);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", { body: { action: "delete_from_sheet", event_id: eventId } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Reverse failed");
      toast({ title: "Sheet reversed", description: "Pushed row removed from sheet." });
      await refreshAll();
      if (activeTab) await fetchActiveTab(activeTab);
    } catch (error: any) {
      toast({ title: "Reverse failed", description: error.message, variant: "destructive" });
    } finally {
      setReversingId(null);
    }
  };

  const handleAddManualEvent = async () => {
    if (!newEvent.event_date || !newEvent.client_name) {
      toast({ title: "Required fields missing", description: "Date and client name are required.", variant: "destructive" });
      return;
    }

    setAddingEvent(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", {
        body: { action: "add_manual_event", event_data: newEvent },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to add manual event");
      toast({ title: "Manual event added", description: `Synced to ${data.tab || "sheet"}.` });
      setNewEvent(initialManualEvent);
      setShowAddEvent(false);
      await refreshAll();
      if (activeTab) await fetchActiveTab(activeTab);
    } catch (error: any) {
      toast({ title: "Failed to add event", description: error.message, variant: "destructive" });
    } finally {
      setAddingEvent(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <Card className="border-border/40 bg-card shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Sheet className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Google Sheet Sync</CardTitle>
                <p className="text-xs text-muted-foreground">Month filters, manual event widgets, and per-tab loading.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => refreshAll()} disabled={loadingOverview}>
                {loadingOverview ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Refresh
              </Button>
              <Button size="sm" onClick={handleSyncAll} disabled={syncing}>
                {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Push All
              </Button>
              <Dialog open={showAddEvent} onOpenChange={setShowAddEvent}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="secondary">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Manual Event
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add Manual Event</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div><Label>Date</Label><Input type="date" value={newEvent.event_date} onChange={(e) => setNewEvent((prev) => ({ ...prev, event_date: e.target.value }))} /></div>
                    <div><Label>Client Name</Label><Input value={newEvent.client_name} onChange={(e) => setNewEvent((prev) => ({ ...prev, client_name: e.target.value }))} /></div>
                    <div><Label>Venue</Label><Input value={newEvent.venue_name} onChange={(e) => setNewEvent((prev) => ({ ...prev, venue_name: e.target.value }))} /></div>
                    <div><Label>City</Label><Input value={newEvent.city} onChange={(e) => setNewEvent((prev) => ({ ...prev, city: e.target.value }))} /></div>
                    <div><Label>State</Label><Input value={newEvent.state} onChange={(e) => setNewEvent((prev) => ({ ...prev, state: e.target.value }))} /></div>
                    <div><Label>Artists</Label><Input type="number" min={1} value={newEvent.artist_count} onChange={(e) => setNewEvent((prev) => ({ ...prev, artist_count: Number(e.target.value) }))} /></div>
                    <div><Label>Start Time</Label><Input type="time" value={newEvent.event_start_time} onChange={(e) => setNewEvent((prev) => ({ ...prev, event_start_time: e.target.value }))} /></div>
                    <div><Label>End Time</Label><Input type="time" value={newEvent.event_end_time} onChange={(e) => setNewEvent((prev) => ({ ...prev, event_end_time: e.target.value }))} /></div>
                    <div><Label>Total Price</Label><Input type="number" value={newEvent.total_price} onChange={(e) => setNewEvent((prev) => ({ ...prev, total_price: Number(e.target.value) }))} /></div>
                    <div><Label>Advance</Label><Input type="number" value={newEvent.advance_amount} onChange={(e) => setNewEvent((prev) => ({ ...prev, advance_amount: Number(e.target.value) }))} /></div>
                  </div>
                  <Button className="mt-4 w-full" onClick={handleAddManualEvent} disabled={addingEvent}>
                    {addingEvent ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Add & Push
                  </Button>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { title: "Manual This Month", value: analytics.manualThisMonth.length, icon: Calendar, note: "manual events" },
          { title: "Manual Next Month", value: analytics.manualNextMonth.length, icon: Filter, note: "manual upcoming" },
          { title: "This Month Total", value: analytics.totalThisMonth.length, icon: Sheet, note: "all event sources" },
          { title: "Upcoming Total", value: analytics.upcomingTotal.length, icon: TrendingUp, note: "future events" },
        ].map((item) => (
          <Card key={item.title} className="border-border/40 bg-card shadow-sm">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.title}</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{item.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
              </div>
              <div className="rounded-xl bg-secondary p-3 text-secondary-foreground">
                <item.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="border-border/40 bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm">Sheet events by month</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={analytics.monthlyChart}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip />
                <Bar dataKey="total" fill={CHART_COLORS[0]} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm">Manual vs website</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={analytics.sourceChart} dataKey="value" nameKey="name" innerRadius={54} outerRadius={84}>
                  {analytics.sourceChart.map((_, index) => <cell key={index} />)}
                </Pie>
                {analytics.sourceChart.map((_, index) => <></>)}
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-3 flex flex-wrap gap-3">
              {analytics.sourceChart.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                  {item.name}: {item.value}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/40 bg-card shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="text-sm">Events filter</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={eventFilter} onValueChange={setEventFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_month">This month</SelectItem>
                  <SelectItem value="next_month">Next month</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="manual">Manual only</SelectItem>
                  <SelectItem value="all">All events</SelectItem>
                  {availableMonthOptions.map((monthKey) => <SelectItem key={monthKey} value={monthKey}>{formatMonthLabel(monthKey)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Badge variant="outline">{filteredEvents.length} events</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Venue</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Pushed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>{event.event_date}</TableCell>
                  <TableCell>{event.venue_name || "—"}</TableCell>
                  <TableCell>{event.client_name || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{event.source || "website"}</Badge></TableCell>
                  <TableCell>{event.sheet_pushed ? "Yes" : "No"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => handlePushSingle(event.id)} disabled={pushingId === event.id}>
                        {pushingId === event.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleReversePush(event.id)} disabled={reversingId === event.id || !event.sheet_pushed}>
                        {reversingId === event.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredEvents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No events found for this filter.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-border/40 bg-card shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="text-sm">Google Sheet data</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={sheetFilter} onValueChange={setSheetFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_month">This month</SelectItem>
                  <SelectItem value="next_month">Next month</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="this_year">This year</SelectItem>
                  <SelectItem value="all">All sheet tabs</SelectItem>
                  {availableSheetMonths.map((monthKey) => <SelectItem key={monthKey} value={monthKey}>{formatMonthLabel(monthKey)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-[220px]"><SelectValue placeholder="Select tab" /></SelectTrigger>
                <SelectContent>
                  {filteredTabs.map((tab) => <SelectItem key={tab.title} value={tab.title}>{tab.normalizedTitle} ({tab.eventCount})</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sheet rows" className="w-[180px] pl-9" />
              </div>
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
                    <TableHead>#</TableHead>
                    {sheetHeaders.map((header, index) => <TableHead key={index}>{header || `Col ${index + 1}`}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRows.map((row, rowIndex) => (
                    <TableRow key={`${rowIndex}-${row.join("-")}`}>
                      <TableCell>{rowIndex + 1}</TableCell>
                      {sheetHeaders.map((_, cellIndex) => <TableCell key={cellIndex}>{row[cellIndex] || ""}</TableCell>)}
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