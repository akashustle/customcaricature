import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Copy, Trash2, Eye, RefreshCw, Link2, Edit2, ExternalLink, Users, DollarSign } from "lucide-react";
import { usePricing } from "@/hooks/usePricing";
import { useEventPricing } from "@/hooks/useEventPricing";
import { formatPrice } from "@/lib/pricing";
import { format } from "date-fns";

type LeadLink = {
  id: string;
  link_code: string;
  label: string;
  created_by: string;
  is_active: boolean;
  is_used: boolean;
  used_at: string | null;
  used_by_user_id: string | null;
  used_by_name: string | null;
  used_by_email: string | null;
  used_by_mobile: string | null;
  booking_status: string;
  booking_id: string | null;
  notes: string | null;
  created_at: string;
};

type CaricPriceRow = { caricature_type_slug: string; custom_price: number };
type EventPriceRow = { region: string; artist_count: number; custom_total_price: number; custom_advance_amount: number; custom_extra_hour_rate: number };

const AdminLeadLinks = () => {
  const [links, setLinks] = useState<LeadLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<LeadLink | null>(null);
  const [actions, setActions] = useState<any[]>([]);

  // Create form state
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [caricPrices, setCaricPrices] = useState<CaricPriceRow[]>([]);
  const [eventPrices, setEventPrices] = useState<EventPriceRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [assignToUserId, setAssignToUserId] = useState<string>("");
  const [profiles, setProfiles] = useState<Array<{ user_id: string; full_name: string | null; email: string | null; mobile: string | null }>>([]);

  const { types: caricTypes } = usePricing();
  const { pricing: defaultEventPricing } = useEventPricing();

  const fetchLinks = useCallback(async () => {
    const { data } = await supabase.from("lead_links").select("*").order("created_at", { ascending: false });
    if (data) setLinks(data as LeadLink[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLinks();
    const ch = supabase.channel("lead-links-rt").on("postgres_changes", { event: "*", schema: "public", table: "lead_links" }, () => fetchLinks()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchLinks]);

  const fetchActions = async (linkId: string) => {
    const { data } = await supabase.from("lead_link_actions").select("*").eq("lead_link_id", linkId).order("created_at", { ascending: false });
    setActions(data || []);
  };

  const addCaricRow = () => setCaricPrices([...caricPrices, { caricature_type_slug: "", custom_price: 0 }]);
  const addEventRow = () => setEventPrices([...eventPrices, { region: "mumbai", artist_count: 1, custom_total_price: 0, custom_advance_amount: 0, custom_extra_hour_rate: 0 }]);

  const removeCaricRow = (i: number) => setCaricPrices(caricPrices.filter((_, idx) => idx !== i));
  const removeEventRow = (i: number) => setEventPrices(eventPrices.filter((_, idx) => idx !== i));

  const updateCaricRow = (i: number, field: keyof CaricPriceRow, val: any) => {
    const arr = [...caricPrices];
    (arr[i] as any)[field] = val;
    setCaricPrices(arr);
  };
  const updateEventRow = (i: number, field: keyof EventPriceRow, val: any) => {
    const arr = [...eventPrices];
    (arr[i] as any)[field] = val;
    setEventPrices(arr);
  };

  const handleCreate = async () => {
    if (!label.trim()) { toast({ title: "Label required", variant: "destructive" }); return; }
    if (caricPrices.length === 0 && eventPrices.length === 0) { toast({ title: "Add at least one pricing override", variant: "destructive" }); return; }

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const adminName = localStorage.getItem("admin_name") || "Admin";

      const { data: link, error } = await supabase.from("lead_links").insert({
        label: label.trim(),
        created_by: adminName,
        created_by_user_id: user!.id,
        notes: notes.trim() || null,
      }).select().single();

      if (error || !link) throw error;

      // Insert caricature pricing
      if (caricPrices.length > 0) {
        const rows = caricPrices.filter(c => c.caricature_type_slug && c.custom_price > 0).map(c => ({
          lead_link_id: link.id,
          caricature_type_slug: c.caricature_type_slug,
          custom_price: c.custom_price,
        }));
        if (rows.length > 0) await supabase.from("lead_link_caricature_pricing").insert(rows);
      }

      // Insert event pricing
      if (eventPrices.length > 0) {
        const rows = eventPrices.filter(e => e.custom_total_price > 0).map(e => ({
          lead_link_id: link.id,
          region: e.region,
          artist_count: e.artist_count,
          custom_total_price: e.custom_total_price,
          custom_advance_amount: e.custom_advance_amount,
          custom_extra_hour_rate: e.custom_extra_hour_rate,
        }));
        if (rows.length > 0) await supabase.from("lead_link_event_pricing").insert(rows);
      }

      // Log action
      await supabase.from("lead_link_actions").insert({
        lead_link_id: link.id,
        user_id: user!.id,
        action_type: "created",
        details: `Link created by ${adminName}`,
      });

      toast({ title: "✅ Lead link created!" });
      setShowCreate(false);
      resetForm();
      fetchLinks();
    } catch (e: any) {
      toast({ title: "Error creating link", description: e?.message, variant: "destructive" });
    }
    setCreating(false);
  };

  const resetForm = () => { setLabel(""); setNotes(""); setCaricPrices([]); setEventPrices([]); };

  const copyLink = (code: string) => {
    const url = `${window.location.origin}/claim-link?code=${code}`;
    navigator.clipboard.writeText(url);
    toast({ title: "📋 Link copied!" });
  };

  const toggleActive = async (link: LeadLink) => {
    await supabase.from("lead_links").update({ is_active: !link.is_active, updated_at: new Date().toISOString() }).eq("id", link.id);
    toast({ title: link.is_active ? "Link deactivated" : "Link reactivated" });
    fetchLinks();
  };

  const reEnableLink = async (link: LeadLink) => {
    await supabase.from("lead_links").update({ is_used: false, used_at: null, used_by_user_id: null, used_by_name: null, used_by_email: null, used_by_mobile: null, is_active: true, updated_at: new Date().toISOString() }).eq("id", link.id);
    toast({ title: "🔄 Link re-enabled for reuse" });
    fetchLinks();
  };

  const deleteLink = async (id: string) => {
    await supabase.from("lead_links").delete().eq("id", id);
    toast({ title: "🗑️ Link deleted" });
    fetchLinks();
  };

  const checkBookingStatus = async (link: LeadLink) => {
    if (!link.used_by_user_id) return;
    const { data: events } = await supabase.from("event_bookings").select("id, status, event_date").eq("user_id", link.used_by_user_id).order("created_at", { ascending: false }).limit(1);
    const { data: orders } = await supabase.from("orders").select("id, status").eq("user_id", link.used_by_user_id).order("created_at", { ascending: false }).limit(1);

    let bookingStatus = "not_booked";
    let bookingId: string | null = null;
    if (events && events.length > 0) { bookingStatus = "event_" + events[0].status; bookingId = events[0].id; }
    else if (orders && orders.length > 0) { bookingStatus = "order_" + orders[0].status; bookingId = orders[0].id; }

    await supabase.from("lead_links").update({ booking_status: bookingStatus, booking_id: bookingId, updated_at: new Date().toISOString() }).eq("id", link.id);
    toast({ title: "Booking status refreshed" });
    fetchLinks();
  };

  const viewDetail = (link: LeadLink) => {
    setShowDetail(link);
    fetchActions(link.id);
  };

  const getStatusBadge = (link: LeadLink) => {
    if (!link.is_active) return <Badge variant="secondary">Inactive</Badge>;
    if (link.is_used) return <Badge className="bg-green-100 text-green-800">Used</Badge>;
    return <Badge className="bg-blue-100 text-blue-800">Active</Badge>;
  };

  const getBookingBadge = (status: string) => {
    if (status === "not_booked") return <Badge variant="outline">Not Booked</Badge>;
    if (status.includes("confirmed") || status.includes("completed")) return <Badge className="bg-green-100 text-green-800">{status.replace("_", " ")}</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-800">{status.replace(/_/g, " ")}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Link2 className="w-6 h-6" /> Lead Links</h2>
          <p className="text-sm text-muted-foreground mt-1">Generate one-time custom pricing links for leads & clients</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2"><Plus className="w-4 h-4" /> Generate Link</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{links.length}</p><p className="text-xs text-muted-foreground">Total Links</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-blue-600">{links.filter(l => l.is_active && !l.is_used).length}</p><p className="text-xs text-muted-foreground">Active</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-green-600">{links.filter(l => l.is_used).length}</p><p className="text-xs text-muted-foreground">Claimed</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-amber-600">{links.filter(l => l.is_used && l.booking_status !== "not_booked").length}</p><p className="text-xs text-muted-foreground">Converted</p></CardContent></Card>
      </div>

      {/* Links Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : links.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No lead links yet</TableCell></TableRow>
                ) : links.map(link => (
                  <TableRow key={link.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{link.label || "Untitled"}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{link.link_code.slice(0, 12)}...</p>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(link)}</TableCell>
                    <TableCell>
                      {link.is_used ? (
                        <div className="text-xs">
                          <p className="font-medium">{link.used_by_name || "—"}</p>
                          <p className="text-muted-foreground">{link.used_by_email || ""}</p>
                          {link.used_by_mobile && <p className="text-muted-foreground">{link.used_by_mobile}</p>}
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {link.is_used ? (
                        <div className="flex items-center gap-1">
                          {getBookingBadge(link.booking_status || "not_booked")}
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => checkBookingStatus(link)}>
                            <RefreshCw className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(link.created_at), "dd MMM yyyy")}
                      <br />
                      <span className="text-[10px]">by {link.created_by}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyLink(link.link_code)} title="Copy link">
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => viewDetail(link)} title="View details">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        {link.is_used && (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => reEnableLink(link)} title="Re-enable">
                            <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toggleActive(link)} title={link.is_active ? "Deactivate" : "Activate"}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteLink(link.id)} title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Generate Lead Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <Label>Link Label *</Label>
              <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Rahul Wedding Quote" />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes..." rows={2} />
            </div>

            {/* Caricature Pricing */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1"><DollarSign className="w-4 h-4" /> Caricature Pricing</Label>
                <Button variant="outline" size="sm" onClick={addCaricRow} className="gap-1"><Plus className="w-3 h-3" /> Add</Button>
              </div>
              {caricPrices.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select value={row.caricature_type_slug} onValueChange={v => updateCaricRow(i, "caricature_type_slug", v)}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {caricTypes.map(t => <SelectItem key={t.slug} value={t.slug}>{t.name} (₹{t.price})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="number" value={row.custom_price || ""} onChange={e => updateCaricRow(i, "custom_price", Number(e.target.value))} placeholder="Custom ₹" className="w-28" />
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => removeCaricRow(i)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              ))}
            </div>

            {/* Event Pricing */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1"><Users className="w-4 h-4" /> Event Pricing</Label>
                <Button variant="outline" size="sm" onClick={addEventRow} className="gap-1"><Plus className="w-3 h-3" /> Add</Button>
              </div>
              {eventPrices.map((row, i) => (
                <div key={i} className="space-y-2 p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Select value={row.region} onValueChange={v => updateEventRow(i, "region", v)}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mumbai">Mumbai</SelectItem>
                        <SelectItem value="pan_india">Pan India</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1">
                      <Label className="text-xs whitespace-nowrap">Artists:</Label>
                      <Input type="number" min={1} max={5} value={row.artist_count} onChange={e => updateEventRow(i, "artist_count", Number(e.target.value))} className="w-16" />
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive ml-auto" onClick={() => removeEventRow(i)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[10px]">Total Price</Label>
                      <Input type="number" value={row.custom_total_price || ""} onChange={e => updateEventRow(i, "custom_total_price", Number(e.target.value))} placeholder="₹" />
                    </div>
                    <div>
                      <Label className="text-[10px]">Advance</Label>
                      <Input type="number" value={row.custom_advance_amount || ""} onChange={e => updateEventRow(i, "custom_advance_amount", Number(e.target.value))} placeholder="₹" />
                    </div>
                    <div>
                      <Label className="text-[10px]">Extra Hr Rate</Label>
                      <Input type="number" value={row.custom_extra_hour_rate || ""} onChange={e => updateEventRow(i, "custom_extra_hour_rate", Number(e.target.value))} placeholder="₹" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={handleCreate} disabled={creating} className="w-full gap-2">
              {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              Generate Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Link Details</DialogTitle>
          </DialogHeader>
          {showDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground text-xs">Label</p><p className="font-medium">{showDetail.label}</p></div>
                <div><p className="text-muted-foreground text-xs">Status</p>{getStatusBadge(showDetail)}</div>
                <div><p className="text-muted-foreground text-xs">Created by</p><p>{showDetail.created_by}</p></div>
                <div><p className="text-muted-foreground text-xs">Created</p><p>{format(new Date(showDetail.created_at), "dd MMM yyyy HH:mm")}</p></div>
              </div>

              {showDetail.is_used && (
                <Card>
                  <CardHeader className="py-3 px-4"><CardTitle className="text-sm">Claimed By</CardTitle></CardHeader>
                  <CardContent className="px-4 pb-3 text-sm space-y-1">
                    <p><strong>Name:</strong> {showDetail.used_by_name || "—"}</p>
                    <p><strong>Email:</strong> {showDetail.used_by_email || "—"}</p>
                    <p><strong>Mobile:</strong> {showDetail.used_by_mobile || "—"}</p>
                    <p><strong>Claimed at:</strong> {showDetail.used_at ? format(new Date(showDetail.used_at), "dd MMM yyyy HH:mm") : "—"}</p>
                    <p><strong>Booking:</strong> {getBookingBadge(showDetail.booking_status || "not_booked")}</p>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => copyLink(showDetail.link_code)} className="gap-1"><Copy className="w-3 h-3" /> Copy Link</Button>
                <Button size="sm" variant="outline" onClick={() => window.open(`${window.location.origin}/claim-link?code=${showDetail.link_code}`, "_blank")} className="gap-1"><ExternalLink className="w-3 h-3" /> Open</Button>
              </div>

              {/* Activity Log */}
              <div>
                <p className="text-sm font-medium mb-2">Activity Log</p>
                {actions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No actions recorded</p>
                ) : (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {actions.map((a: any) => (
                      <div key={a.id} className="flex items-center gap-2 text-xs border-b py-1.5">
                        <Badge variant="outline" className="text-[10px]">{a.action_type}</Badge>
                        <span className="text-muted-foreground flex-1">{a.details}</span>
                        <span className="text-[10px] text-muted-foreground">{format(new Date(a.created_at), "dd MMM HH:mm")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {showDetail.notes && (
                <div>
                  <p className="text-sm font-medium mb-1">Notes</p>
                  <p className="text-xs text-muted-foreground">{showDetail.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLeadLinks;
