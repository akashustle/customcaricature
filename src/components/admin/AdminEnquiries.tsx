import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Search, Eye, ChevronDown, ChevronUp, Calendar, CalendarOff, Plus, Trash2, Save, X, Settings, IndianRupee, TestTube2, Pencil, Link as LinkIcon, Users, Filter } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import ExportButton from "./ExportButton";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import LocationDropdowns from "@/components/LocationDropdowns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const STATUS_OPTIONS = [
  { value: "new", label: "New", color: "bg-blue-100 text-blue-800" },
  { value: "contacted", label: "Contacted", color: "bg-yellow-100 text-yellow-800" },
  { value: "negotiation", label: "Negotiation", color: "bg-purple-100 text-purple-800" },
  { value: "converted", label: "Converted", color: "bg-green-100 text-green-800" },
  { value: "closed", label: "Closed", color: "bg-red-100 text-red-800" },
];

const AdminEnquiries = () => {
  const [tab, setTab] = useState("enquiries");
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");
  const [loading, setLoading] = useState(true);

  // Calendar
  const [bookedDates, setBookedDates] = useState<Record<string, number>>({});
  const [blockedDates, setBlockedDates] = useState<any[]>([]);
  const [blockDate, setBlockDate] = useState<Date | undefined>(undefined);
  const [blockReason, setBlockReason] = useState("");

  // Caricature Settings
  const [descriptions, setDescriptions] = useState<any>({});
  const [contactInfo, setContactInfo] = useState<any>({ whatsapp: "", instagram: "" });
  const [maxEvents, setMaxEvents] = useState(2);

  // Event Region Details
  const [eventDetails, setEventDetails] = useState<any>({
    maharashtra: { title: "", details: "", pricing_text: "", order_link: "" },
    pan_india: { title: "", details: "", pricing_text: "", order_link: "" },
    international: { title: "", details: "", pricing_text: "", order_link: "" },
  });

  // Event Pricing
  const [pricingRules, setPricingRules] = useState<any[]>([]);
  const [pricingForm, setPricingForm] = useState({ state: "", district: "", city: "", price: "", priority: 1, is_active: true });
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [showPricingForm, setShowPricingForm] = useState(false);

  // Pricing Preview
  const [previewState, setPreviewState] = useState("");
  const [previewDistrict, setPreviewDistrict] = useState("");
  const [previewCity, setPreviewCity] = useState("");
  const [previewResult, setPreviewResult] = useState<{ price: number; source: string } | null>(null);

  useEffect(() => {
    fetchEnquiries(); fetchCalendarData(); fetchSettings(); fetchPricingRules();
    const ch = supabase.channel("admin-enquiries")
      .on("postgres_changes", { event: "*", schema: "public", table: "enquiries" }, fetchEnquiries)
      .on("postgres_changes", { event: "*", schema: "public", table: "enquiry_settings" }, fetchSettings)
      .on("postgres_changes", { event: "*", schema: "public", table: "enquiry_event_pricing" }, fetchPricingRules)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchEnquiries = async () => {
    const { data } = await supabase.from("enquiries" as any).select("*").order("created_at", { ascending: false });
    if (data) setEnquiries(data as any[]);
    setLoading(false);
  };

  const fetchCalendarData = async () => {
    const { data: bookings } = await supabase.from("event_bookings").select("event_date, status").in("status", ["upcoming", "confirmed"]);
    if (bookings) {
      const counts: Record<string, number> = {};
      bookings.forEach((b: any) => { counts[b.event_date] = (counts[b.event_date] || 0) + 1; });
      setBookedDates(counts);
    }
    const { data: blocked } = await supabase.from("event_blocked_dates" as any).select("*").order("blocked_date");
    if (blocked) setBlockedDates(blocked as any[]);
  };

  const fetchSettings = async () => {
    const { data } = await supabase.from("enquiry_settings" as any).select("*");
    if (data) {
      (data as any[]).forEach((s: any) => {
        if (s.id === "caricature_descriptions") setDescriptions(s.value);
        if (s.id === "contact_info") setContactInfo(s.value);
        if (s.id === "event_max_per_date") setMaxEvents(s.value.max_events || 2);
        if (s.id === "event_region_details") setEventDetails(prev => ({ ...prev, ...s.value }));
      });
    }
  };

  const fetchPricingRules = async () => {
    const { data } = await supabase.from("enquiry_event_pricing" as any).select("*").order("priority", { ascending: false });
    if (data) setPricingRules(data as any[]);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("enquiries" as any).update({ status, updated_at: new Date().toISOString() } as any).eq("id", id);
    toast({ title: `Status updated to ${status}` });
  };

  const saveNotes = async (id: string) => {
    await supabase.from("enquiries" as any).update({ admin_notes: notesText, updated_at: new Date().toISOString() } as any).eq("id", id);
    toast({ title: "Notes saved" });
    setEditingNotes(null);
  };

  const deleteEnquiry = async (id: string) => {
    await supabase.from("enquiries" as any).delete().eq("id", id);
    toast({ title: "Enquiry deleted" });
  };

  const blockEventDate = async () => {
    if (!blockDate) return;
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    await supabase.from("event_blocked_dates" as any).insert({ blocked_date: format(blockDate, "yyyy-MM-dd"), reason: blockReason || null, blocked_by: user.id } as any);
    toast({ title: "Date blocked" });
    setBlockDate(undefined); setBlockReason("");
    fetchCalendarData();
  };

  const unblockDate = async (id: string) => {
    await supabase.from("event_blocked_dates" as any).delete().eq("id", id);
    toast({ title: "Date unblocked" });
    fetchCalendarData();
  };

  const saveSettings = async (key: string, value: any) => {
    await supabase.from("enquiry_settings" as any).upsert({ id: key, value, updated_at: new Date().toISOString() } as any);
    toast({ title: "Settings saved" });
  };

  // Pricing CRUD
  const savePricingRule = async () => {
    const price = parseFloat(pricingForm.price);
    if (!price || price <= 0) { toast({ title: "Enter a valid price", variant: "destructive" }); return; }
    const payload: any = { state: pricingForm.state || null, district: pricingForm.district || null, city: pricingForm.city || null, price, priority: pricingForm.priority, is_active: pricingForm.is_active };
    if (editingPriceId) {
      await supabase.from("enquiry_event_pricing" as any).update(payload).eq("id", editingPriceId);
      toast({ title: "Pricing rule updated" });
    } else {
      await supabase.from("enquiry_event_pricing" as any).insert(payload);
      toast({ title: "Pricing rule added" });
    }
    resetPricingForm(); fetchPricingRules();
  };

  const editPricingRule = (rule: any) => {
    setPricingForm({ state: rule.state || "", district: rule.district || "", city: rule.city || "", price: String(rule.price), priority: rule.priority, is_active: rule.is_active });
    setEditingPriceId(rule.id); setShowPricingForm(true);
  };

  const deletePricingRule = async (id: string) => {
    await supabase.from("enquiry_event_pricing" as any).delete().eq("id", id);
    toast({ title: "Pricing rule deleted" }); fetchPricingRules();
  };

  const togglePricingActive = async (id: string, active: boolean) => {
    await supabase.from("enquiry_event_pricing" as any).update({ is_active: active } as any).eq("id", id);
    fetchPricingRules();
  };

  const resetPricingForm = () => {
    setPricingForm({ state: "", district: "", city: "", price: "", priority: 1, is_active: true });
    setEditingPriceId(null); setShowPricingForm(false);
  };

  const testPricing = () => {
    const activeRules = pricingRules.filter((r: any) => r.is_active);
    if (previewCity) {
      const m = activeRules.find((r: any) => r.city && r.city.toLowerCase() === previewCity.toLowerCase());
      if (m) { setPreviewResult({ price: m.price, source: "City Pricing" }); return; }
    }
    if (previewDistrict) {
      const m = activeRules.find((r: any) => r.district && r.district.toLowerCase() === previewDistrict.toLowerCase() && !r.city);
      if (m) { setPreviewResult({ price: m.price, source: "District Pricing" }); return; }
    }
    if (previewState) {
      const m = activeRules.find((r: any) => r.state && r.state.toLowerCase() === previewState.toLowerCase() && !r.district && !r.city);
      if (m) { setPreviewResult({ price: m.price, source: "State Pricing" }); return; }
    }
    const d = activeRules.find((r: any) => !r.state && !r.district && !r.city);
    if (d) { setPreviewResult({ price: d.price, source: "Default India Pricing" }); return; }
    setPreviewResult(null);
  };

  const filteredEnquiries = enquiries.filter((e: any) => {
    const matchSearch = !search || e.name?.toLowerCase().includes(search.toLowerCase()) || e.mobile?.includes(search) || e.enquiry_number?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || e.status === statusFilter;
    const matchType = typeFilter === "all" || e.enquiry_type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const customEnquiries = enquiries.filter(e => e.enquiry_type === "custom_caricature");
  const eventEnquiries = enquiries.filter(e => e.enquiry_type === "event_booking");
  const linkClickedCount = enquiries.filter(e => e.link_clicked).length;

  const statusColor = (status: string) => STATUS_OPTIONS.find(s => s.value === status)?.color || "bg-muted text-foreground";

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="mb-4 bg-card border border-border rounded-xl p-1 flex-wrap">
        <TabsTrigger value="enquiries" className="font-sans rounded-full text-xs">📋 All ({enquiries.length})</TabsTrigger>
        <TabsTrigger value="custom-users" className="font-sans rounded-full text-xs">🎨 Custom ({customEnquiries.length})</TabsTrigger>
        <TabsTrigger value="event-users" className="font-sans rounded-full text-xs">🎪 Event ({eventEnquiries.length})</TabsTrigger>
        <TabsTrigger value="calendar" className="font-sans rounded-full text-xs">📅 Calendar</TabsTrigger>
        <TabsTrigger value="event-pricing" className="font-sans rounded-full text-xs">💰 Event Pricing</TabsTrigger>
        <TabsTrigger value="custom-details" className="font-sans rounded-full text-xs">✏️ Custom Details</TabsTrigger>
        <TabsTrigger value="event-details" className="font-sans rounded-full text-xs">📝 Event Details</TabsTrigger>
        <TabsTrigger value="contact-settings" className="font-sans rounded-full text-xs">⚙️ Settings</TabsTrigger>
      </TabsList>

      {/* Enquiries List (shared renderer) */}
      {["enquiries", "custom-users", "event-users"].map(tabKey => (
        <TabsContent key={tabKey} value={tabKey}>
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total", value: (tabKey === "custom-users" ? customEnquiries : tabKey === "event-users" ? eventEnquiries : enquiries).length, color: "hsl(210,65%,55%)" },
                { label: "New", value: (tabKey === "custom-users" ? customEnquiries : tabKey === "event-users" ? eventEnquiries : enquiries).filter(e => e.status === "new").length, color: "hsl(36,45%,52%)" },
                { label: "Converted", value: (tabKey === "custom-users" ? customEnquiries : tabKey === "event-users" ? eventEnquiries : enquiries).filter(e => e.status === "converted").length, color: "hsl(152,50%,48%)" },
                { label: "Link Clicked", value: (tabKey === "custom-users" ? customEnquiries : tabKey === "event-users" ? eventEnquiries : enquiries).filter(e => e.link_clicked).length, color: "hsl(340,55%,58%)" },
              ].map(s => (
                <Card key={s.label} className="border-border">
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold font-display" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-[10px] text-muted-foreground font-sans">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search name, mobile, or ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 font-sans" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <ExportButton
                data={(tabKey === "custom-users" ? customEnquiries : tabKey === "event-users" ? eventEnquiries : filteredEnquiries).map((e: any) => ({
                  "ID": e.enquiry_number, "Name": e.name, "Mobile": e.mobile, "Email": e.email || "",
                  "Instagram": e.instagram_id || "", "Type": e.enquiry_type === "custom_caricature" ? "Custom" : "Event",
                  "Caricature": e.caricature_type || "", "Event Type": e.event_type || "",
                  "City": e.city || "", "State": e.state || "", "Event Date": e.event_date || "",
                  "Price": e.estimated_price || "", "Source": e.pricing_source || "",
                  "Link Clicked": e.link_clicked ? "Yes" : "No",
                  "Link Clicked At": e.link_clicked_at ? new Date(e.link_clicked_at).toLocaleString("en-IN") : "",
                  "Status": e.status, "Notes": e.admin_notes || "", "Created": new Date(e.created_at).toLocaleString("en-IN"),
                }))}
                sheetName="Enquiries" fileName="CCC_Enquiries"
              />
            </div>

            {loading ? (
              <p className="text-center text-muted-foreground py-8 font-sans">Loading...</p>
            ) : (
              <div className="space-y-3">
                {(tabKey === "custom-users"
                  ? customEnquiries
                  : tabKey === "event-users"
                  ? eventEnquiries
                  : filteredEnquiries
                ).filter((e: any) => {
                  const matchSearch = !search || e.name?.toLowerCase().includes(search.toLowerCase()) || e.mobile?.includes(search) || e.enquiry_number?.toLowerCase().includes(search.toLowerCase());
                  const matchStatus = statusFilter === "all" || e.status === statusFilter;
                  return matchSearch && matchStatus;
                }).map((e: any) => (
                  <Card key={e.id} className="border-border">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-sans font-semibold text-sm">{e.name}</p>
                            <Badge className={cn("text-[10px] border-none", statusColor(e.status))}>{e.status}</Badge>
                            <Badge variant="outline" className="text-[10px]">{e.enquiry_number}</Badge>
                            {e.link_clicked && <Badge className="text-[10px] bg-green-100 text-green-800 border-none">🔗 Clicked</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground font-sans">
                            📱 {e.mobile} {e.email && `· ✉️ ${e.email}`} · {e.enquiry_type === "custom_caricature" ? "🎨 Custom" : "🎪 Event"}
                            {e.caricature_type && ` · ${e.caricature_type}`}
                            {e.event_type && ` · ${e.event_type}`}
                          </p>
                          {e.city && <p className="text-xs text-muted-foreground font-sans">📍 {e.city}, {e.district && `${e.district}, `}{e.state}</p>}
                          {e.event_date && <p className="text-xs text-muted-foreground font-sans">📅 {new Date(e.event_date).toLocaleDateString("en-IN")}</p>}
                          {e.estimated_price && (
                            <p className="text-xs font-sans text-primary font-medium">💰 ₹{Number(e.estimated_price).toLocaleString("en-IN")} ({e.pricing_source})</p>
                          )}
                          {e.link_clicked_at && (
                            <p className="text-[10px] text-green-600 font-sans">🔗 Link clicked at {new Date(e.link_clicked_at).toLocaleString("en-IN")}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground font-sans">{new Date(e.created_at).toLocaleString("en-IN")}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}>
                          {expandedId === e.id ? <ChevronUp className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>

                      {expandedId === e.id && (
                        <div className="mt-4 pt-4 border-t border-border space-y-3 animate-in fade-in duration-200">
                          <div className="grid grid-cols-2 gap-3 text-sm font-sans">
                            <div><span className="text-muted-foreground text-xs">Name:</span> <p className="font-medium">{e.name}</p></div>
                            <div><span className="text-muted-foreground text-xs">Mobile:</span> <p className="font-medium">{e.mobile}</p></div>
                            {e.email && <div><span className="text-muted-foreground text-xs">Email:</span> <p className="font-medium">{e.email}</p></div>}
                            {e.instagram_id && <div><span className="text-muted-foreground text-xs">Instagram:</span> <p className="font-medium">{e.instagram_id}</p></div>}
                            <div><span className="text-muted-foreground text-xs">Type:</span> <p className="font-medium">{e.enquiry_type === "custom_caricature" ? "Custom Caricature" : "Event Booking"}</p></div>
                            {e.caricature_type && <div><span className="text-muted-foreground text-xs">Caricature:</span> <p className="font-medium capitalize">{e.caricature_type}</p></div>}
                            {e.event_type && <div><span className="text-muted-foreground text-xs">Event Type:</span> <p className="font-medium">{e.event_type}</p></div>}
                            {e.event_date && <div><span className="text-muted-foreground text-xs">Event Date:</span> <p className="font-medium">{new Date(e.event_date).toLocaleDateString("en-IN")}</p></div>}
                            {e.country && <div><span className="text-muted-foreground text-xs">Country:</span> <p className="font-medium">{e.country}</p></div>}
                            {e.state && <div><span className="text-muted-foreground text-xs">State:</span> <p className="font-medium">{e.state}</p></div>}
                            {e.district && <div><span className="text-muted-foreground text-xs">District:</span> <p className="font-medium">{e.district}</p></div>}
                            {e.city && <div><span className="text-muted-foreground text-xs">City:</span> <p className="font-medium">{e.city}</p></div>}
                          </div>

                          <div>
                            <Label className="text-xs font-sans">Change Status</Label>
                            <Select value={e.status} onValueChange={v => updateStatus(e.id, v)}>
                              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs font-sans">Admin Notes</Label>
                            {editingNotes === e.id ? (
                              <div className="space-y-2">
                                <Textarea value={notesText} onChange={ev => setNotesText(ev.target.value)} rows={3} className="mt-1" />
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => saveNotes(e.id)}><Save className="w-3 h-3 mr-1" />Save</Button>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingNotes(null)}><X className="w-3 h-3" /></Button>
                                </div>
                              </div>
                            ) : (
                              <div onClick={() => { setEditingNotes(e.id); setNotesText(e.admin_notes || ""); }}
                                className="mt-1 p-2 rounded-lg bg-muted/50 cursor-pointer text-sm font-sans min-h-[40px]">
                                {e.admin_notes || <span className="text-muted-foreground italic">Click to add notes...</span>}
                              </div>
                            )}
                          </div>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive" className="font-sans"><Trash2 className="w-3 h-3 mr-1" />Delete</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Delete this enquiry?</AlertDialogTitle></AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteEnquiry(e.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {(tabKey === "custom-users" ? customEnquiries : tabKey === "event-users" ? eventEnquiries : filteredEnquiries).length === 0 && (
                  <Card><CardContent className="p-8 text-center"><p className="text-muted-foreground font-sans">No enquiries found</p></CardContent></Card>
                )}
              </div>
            )}
          </div>
        </TabsContent>
      ))}

      {/* Event Calendar */}
      <TabsContent value="calendar">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="font-display text-lg">Event Calendar & Capacity</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <CalendarComponent
                  mode="single" className={cn("p-3 pointer-events-auto")}
                  modifiers={{
                    booked1: (date) => (bookedDates[format(date, "yyyy-MM-dd")] || 0) === 1,
                    fullyBooked: (date) => {
                      const ds = format(date, "yyyy-MM-dd");
                      return (bookedDates[ds] || 0) >= maxEvents || blockedDates.some((b: any) => b.blocked_date === ds);
                    },
                  }}
                  modifiersClassNames={{ booked1: "bg-amber-100 text-amber-800 font-bold", fullyBooked: "bg-red-100 text-red-800 font-bold line-through" }}
                />
              </div>
              <div className="flex gap-3 text-xs font-sans justify-center">
                <span>🟢 Available</span><span>🟡 1 Slot Left</span><span>🔴 Full/Blocked</span>
              </div>

              <div className="space-y-3">
                <Label className="font-sans font-semibold">Max Events Per Date</Label>
                <div className="flex gap-2 items-center">
                  <Input type="number" value={maxEvents} onChange={e => setMaxEvents(parseInt(e.target.value) || 2)} className="w-20" min={1} max={10} />
                  <Button size="sm" onClick={() => saveSettings("event_max_per_date", { max_events: maxEvents })}><Save className="w-3 h-3 mr-1" />Save</Button>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="font-sans font-semibold">Block a Date</Label>
                <div className="flex flex-col md:flex-row gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full md:w-auto", !blockDate && "text-muted-foreground")}>
                        {blockDate ? format(blockDate, "PPP") : "Pick date to block"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><CalendarComponent mode="single" selected={blockDate} onSelect={setBlockDate} className={cn("p-3 pointer-events-auto")} /></PopoverContent>
                  </Popover>
                  <Input placeholder="Reason (optional)" value={blockReason} onChange={e => setBlockReason(e.target.value)} className="flex-1" />
                  <Button onClick={blockEventDate} disabled={!blockDate} size="sm"><CalendarOff className="w-3 h-3 mr-1" />Block</Button>
                </div>
              </div>

              {blockedDates.length > 0 && (
                <div className="space-y-2">
                  <Label className="font-sans font-semibold text-sm">Blocked Dates</Label>
                  {blockedDates.map((bd: any) => (
                    <div key={bd.id} className="flex justify-between items-center p-2 rounded-lg bg-red-50 border border-red-100">
                      <div>
                        <p className="font-sans text-sm font-medium">{new Date(bd.blocked_date).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}</p>
                        {bd.reason && <p className="text-xs text-muted-foreground font-sans">{bd.reason}</p>}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => unblockDate(bd.id)}><X className="w-4 h-4" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* Event Pricing */}
      <TabsContent value="event-pricing">
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-primary" /> Event Pricing Rules
              </CardTitle>
              {!showPricingForm && <Button size="sm" onClick={() => setShowPricingForm(true)}><Plus className="w-3 h-3 mr-1" /> Add Rule</Button>}
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground font-sans">Pricing resolves by specificity: City → District → State → Default.</p>

              {showPricingForm && (
                <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-3 animate-in fade-in duration-200">
                  <p className="font-sans font-semibold text-sm">{editingPriceId ? "Edit" : "Add"} Pricing Rule</p>
                  <LocationDropdowns
                    state={pricingForm.state} district={pricingForm.district} city={pricingForm.city}
                    onStateChange={v => setPricingForm(f => ({ ...f, state: v, district: "", city: "" }))}
                    onDistrictChange={v => setPricingForm(f => ({ ...f, district: v, city: "" }))}
                    onCityChange={v => setPricingForm(f => ({ ...f, city: v }))}
                  />
                  <p className="text-[10px] text-muted-foreground font-sans">Leave all empty for default India-wide pricing.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-sans">Price (₹) *</Label>
                      <Input type="number" value={pricingForm.price} onChange={e => setPricingForm(f => ({ ...f, price: e.target.value }))} placeholder="25000" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs font-sans">Priority</Label>
                      <Input type="number" value={pricingForm.priority} onChange={e => setPricingForm(f => ({ ...f, priority: parseInt(e.target.value) || 1 }))} className="mt-1" min={1} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={pricingForm.is_active} onCheckedChange={v => setPricingForm(f => ({ ...f, is_active: v }))} />
                    <Label className="text-xs font-sans">Active</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={savePricingRule}><Save className="w-3 h-3 mr-1" />{editingPriceId ? "Update" : "Save"}</Button>
                    <Button size="sm" variant="ghost" onClick={resetPricingForm}><X className="w-3 h-3 mr-1" />Cancel</Button>
                  </div>
                </div>
              )}

              {pricingRules.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6 font-sans">No pricing rules yet.</p>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">State</TableHead>
                        <TableHead className="text-xs">District</TableHead>
                        <TableHead className="text-xs">City</TableHead>
                        <TableHead className="text-xs text-right">Price</TableHead>
                        <TableHead className="text-xs text-center">Priority</TableHead>
                        <TableHead className="text-xs text-center">Active</TableHead>
                        <TableHead className="text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pricingRules.map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs font-sans">{r.state || <span className="text-muted-foreground italic">All</span>}</TableCell>
                          <TableCell className="text-xs font-sans">{r.district || <span className="text-muted-foreground italic">All</span>}</TableCell>
                          <TableCell className="text-xs font-sans">{r.city || <span className="text-muted-foreground italic">All</span>}</TableCell>
                          <TableCell className="text-xs font-sans text-right font-bold">₹{Number(r.price).toLocaleString("en-IN")}</TableCell>
                          <TableCell className="text-xs font-sans text-center">{r.priority}</TableCell>
                          <TableCell className="text-center"><Switch checked={r.is_active} onCheckedChange={v => togglePricingActive(r.id, v)} /></TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button variant="ghost" size="sm" onClick={() => editPricingRule(r)}><Pencil className="w-3 h-3" /></Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild><Button variant="ghost" size="sm"><Trash2 className="w-3 h-3 text-destructive" /></Button></AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader><AlertDialogTitle>Delete this pricing rule?</AlertDialogTitle></AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deletePricingRule(r.id)}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pricing Preview */}
          <Card>
            <CardHeader><CardTitle className="font-display text-lg flex items-center gap-2"><TestTube2 className="w-5 h-5 text-primary" /> Pricing Preview Tool</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground font-sans">Test how pricing resolves for a given location.</p>
              <LocationDropdowns
                state={previewState} district={previewDistrict} city={previewCity}
                onStateChange={v => { setPreviewState(v); setPreviewDistrict(""); setPreviewCity(""); setPreviewResult(null); }}
                onDistrictChange={v => { setPreviewDistrict(v); setPreviewCity(""); setPreviewResult(null); }}
                onCityChange={v => { setPreviewCity(v); setPreviewResult(null); }}
              />
              <Button onClick={testPricing} size="sm" disabled={!previewState && !previewDistrict && !previewCity}>
                <TestTube2 className="w-3 h-3 mr-1" /> Test Price
              </Button>
              {previewResult && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-primary/5 to-accent/10 border border-primary/20 animate-in fade-in duration-200">
                  <p className="text-xs text-muted-foreground font-sans">Resolved Price</p>
                  <p className="font-display text-2xl font-bold text-primary">₹{previewResult.price.toLocaleString("en-IN")}</p>
                  <p className="text-xs text-muted-foreground font-sans mt-1">Source: {previewResult.source}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* Custom Details - Editable content for single/couple/group */}
      <TabsContent value="custom-details">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="font-display text-lg">Caricature Details (Shown to Users)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground font-sans">These details are shown to users after they select a caricature type. Include links in the text — they will be clickable.</p>
              {["single", "couple", "group"].map(slug => (
                <div key={slug} className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
                  <p className="font-sans font-semibold capitalize text-primary">{slug} Caricature</p>
                  <div>
                    <Label className="text-xs">Display Title</Label>
                    <Input
                      value={descriptions[slug]?.title || ""}
                      onChange={e => setDescriptions({ ...descriptions, [slug]: { ...descriptions[slug], title: e.target.value } })}
                      placeholder={`${slug.charAt(0).toUpperCase() + slug.slice(1)} Caricature`}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Short Description (shown on selection)</Label>
                    <Input
                      value={descriptions[slug]?.description || ""}
                      onChange={e => setDescriptions({ ...descriptions, [slug]: { ...descriptions[slug], description: e.target.value } })}
                      placeholder="Brief one-line description"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Delivery Days</Label>
                    <Input
                      type="number"
                      value={descriptions[slug]?.delivery_days || ""}
                      onChange={e => setDescriptions({ ...descriptions, [slug]: { ...descriptions[slug], delivery_days: parseInt(e.target.value) || 0 } })}
                      className="mt-1 w-24"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Full Details (shown after selection - supports URLs)</Label>
                    <Textarea
                      value={descriptions[slug]?.full_details || ""}
                      onChange={e => setDescriptions({ ...descriptions, [slug]: { ...descriptions[slug], full_details: e.target.value } })}
                      placeholder={`Enter detailed information about ${slug} caricature.\nInclude any URLs - they will be clickable.\n\nExample:\nGet a custom ${slug} caricature made from your photo.\nOrder here: https://example.com/order`}
                      className="mt-1" rows={5}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Order / Proceed Link (button URL)</Label>
                    <Input
                      value={descriptions[slug]?.order_link || ""}
                      onChange={e => setDescriptions({ ...descriptions, [slug]: { ...descriptions[slug], order_link: e.target.value } })}
                      placeholder="https://example.com/order"
                      className="mt-1"
                    />
                  </div>
                </div>
              ))}
              <Button onClick={() => saveSettings("caricature_descriptions", descriptions)} className="font-sans">
                <Save className="w-4 h-4 mr-1" />Save All Caricature Details
              </Button>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* Event Region Details - Maharashtra / Pan India / International */}
      <TabsContent value="event-details">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="font-display text-lg">Event Region Details (Shown After Submission)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground font-sans">
                These details are shown to users after they submit an event enquiry, based on their location.
                Maharashtra = Palghar, Thane, Mumbai, Navi Mumbai, Panvel areas. All other India = Pan India. Include links — they will be clickable.
              </p>
              {[
                { key: "maharashtra", label: "Maharashtra (Mumbai Region)", emoji: "🏙️" },
                { key: "pan_india", label: "Pan India (Other States)", emoji: "🇮🇳" },
                { key: "international", label: "International", emoji: "🌍" },
              ].map(region => (
                <div key={region.key} className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
                  <p className="font-sans font-semibold text-primary">{region.emoji} {region.label}</p>
                  <div>
                    <Label className="text-xs">Section Title</Label>
                    <Input
                      value={eventDetails[region.key]?.title || ""}
                      onChange={e => setEventDetails({ ...eventDetails, [region.key]: { ...eventDetails[region.key], title: e.target.value } })}
                      placeholder={region.label}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Full Details (supports URLs)</Label>
                    <Textarea
                      value={eventDetails[region.key]?.details || ""}
                      onChange={e => setEventDetails({ ...eventDetails, [region.key]: { ...eventDetails[region.key], details: e.target.value } })}
                      placeholder={`Detailed info about event booking in ${region.label}.\nInclude pricing info, terms, and any links.`}
                      className="mt-1" rows={5}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Pricing Text (additional pricing details)</Label>
                    <Textarea
                      value={eventDetails[region.key]?.pricing_text || ""}
                      onChange={e => setEventDetails({ ...eventDetails, [region.key]: { ...eventDetails[region.key], pricing_text: e.target.value } })}
                      placeholder="e.g. Starting from ₹40,000 for 2 hours..."
                      className="mt-1" rows={3}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Book Now Link (button URL)</Label>
                    <Input
                      value={eventDetails[region.key]?.order_link || ""}
                      onChange={e => setEventDetails({ ...eventDetails, [region.key]: { ...eventDetails[region.key], order_link: e.target.value } })}
                      placeholder="https://example.com/book-event"
                      className="mt-1"
                    />
                  </div>
                </div>
              ))}
              <Button onClick={() => saveSettings("event_region_details", eventDetails)} className="font-sans">
                <Save className="w-4 h-4 mr-1" />Save All Event Details
              </Button>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* Contact Settings */}
      <TabsContent value="contact-settings">
        <div className="space-y-4 max-w-lg">
          <Card>
            <CardHeader><CardTitle className="font-display text-lg">Contact Info (Enquiry Page)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="font-sans text-xs">WhatsApp Number (with country code)</Label>
                <Input value={contactInfo.whatsapp || ""} onChange={e => setContactInfo({ ...contactInfo, whatsapp: e.target.value })} placeholder="918369594271" className="mt-1" />
              </div>
              <div>
                <Label className="font-sans text-xs">Instagram Link</Label>
                <Input value={contactInfo.instagram || ""} onChange={e => setContactInfo({ ...contactInfo, instagram: e.target.value })} placeholder="https://instagram.com/..." className="mt-1" />
              </div>
              <Button onClick={() => saveSettings("contact_info", contactInfo)} className="font-sans">
                <Save className="w-4 h-4 mr-1" />Save Contact Info
              </Button>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default AdminEnquiries;
