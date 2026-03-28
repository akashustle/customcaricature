import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  IndianRupee, Percent, Users, CheckCircle2, Clock, Eye, Upload,
  ChevronDown, ChevronUp, Wallet, TrendingUp, Banknote, Image as ImageIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Artist = { id: string; name: string; email: string | null; };
type PayoutSetting = {
  id: string; artist_id: string; payout_type: string; payout_value: number;
  payout_cycle: string; is_active: boolean;
};
type EventPayout = {
  id: string; artist_id: string; event_id: string; payout_type: string;
  payout_value: number; event_total: number; calculated_amount: number;
  status: string; credited_at: string | null; created_at: string;
};
type PayoutRequest = {
  id: string; artist_id: string; amount: number; request_type: string;
  note: string | null; status: string; admin_note: string | null;
  expected_credit_date: string | null; credited_at: string | null;
  screenshot_path: string | null; created_at: string;
};
type Transaction = {
  id: string; artist_id: string; transaction_type: string; amount: number;
  description: string | null; event_id: string | null; screenshot_path: string | null;
  created_at: string;
};

const AdminArtistPayouts = () => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [settings, setSettings] = useState<Record<string, PayoutSetting>>({});
  const [eventPayouts, setEventPayouts] = useState<EventPayout[]>([]);
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expandedArtist, setExpandedArtist] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<{ eventId: string; artistId: string } | null>(null);
  const [customPayoutType, setCustomPayoutType] = useState("percentage");
  const [customPayoutValue, setCustomPayoutValue] = useState("");
  const [viewScreenshot, setViewScreenshot] = useState<string | null>(null);
  const [creditNote, setCreditNote] = useState("");
  const [creditDate, setCreditDate] = useState("");
  const [creditScreenshot, setCreditScreenshot] = useState<File | null>(null);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"settings" | "requests" | "transactions">("settings");

  useEffect(() => {
    fetchAll();
    const ch = supabase.channel("admin-artist-payouts-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "artist_payout_settings" }, fetchAll)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "artist_payout_settings" }, fetchAll)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "artist_event_payouts" }, fetchAll)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "artist_event_payouts" }, fetchAll)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "artist_payout_requests" }, fetchAll)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "artist_payout_requests" }, fetchAll)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "artist_transactions" }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchAll = async () => {
    const [{ data: artistsData }, { data: settingsData }, { data: payoutsData }, { data: reqData }, { data: txData }] = await Promise.all([
      supabase.from("artists").select("id, name, email").order("name"),
      supabase.from("artist_payout_settings" as any).select("*"),
      supabase.from("artist_event_payouts" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("artist_payout_requests" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("artist_transactions" as any).select("*").order("created_at", { ascending: false }),
    ]);
    if (artistsData) setArtists(artistsData as any);
    if (settingsData) {
      const map: Record<string, PayoutSetting> = {};
      (settingsData as any[]).forEach(s => { map[s.artist_id] = s; });
      setSettings(map);
    }
    if (payoutsData) setEventPayouts(payoutsData as any);
    if (reqData) setRequests(reqData as any);
    if (txData) setTransactions(txData as any);
  };

  const savePayoutSetting = async (artistId: string, type: string, value: number, cycle: string) => {
    const existing = settings[artistId];
    if (existing) {
      await supabase.from("artist_payout_settings" as any).update({
        payout_type: type, payout_value: value, payout_cycle: cycle, updated_at: new Date().toISOString()
      } as any).eq("id", existing.id);
    } else {
      await supabase.from("artist_payout_settings" as any).insert({
        artist_id: artistId, payout_type: type, payout_value: value, payout_cycle: cycle,
      } as any);
    }
    toast({ title: "Payout settings saved! ✅" });
    fetchAll();
  };

  const saveEventPayout = async (eventId: string, artistId: string) => {
    const val = parseFloat(customPayoutValue);
    if (!val || val <= 0) { toast({ title: "Enter valid amount", variant: "destructive" }); return; }
    
    // Get event total
    const { data: event } = await supabase.from("event_bookings").select("total_price, negotiated, negotiated_total").eq("id", eventId).single();
    const eventTotal = event?.negotiated && event?.negotiated_total ? event.negotiated_total : (event?.total_price || 0);
    const calculated = customPayoutType === "percentage" ? (eventTotal * val / 100) : val;

    await supabase.from("artist_event_payouts" as any).upsert({
      artist_id: artistId, event_id: eventId, payout_type: customPayoutType,
      payout_value: val, event_total: eventTotal, calculated_amount: calculated,
      updated_at: new Date().toISOString(),
    } as any, { onConflict: "artist_id,event_id" });
    
    toast({ title: `Event payout set: ₹${calculated.toLocaleString("en-IN")}` });
    setEditingEvent(null);
    fetchAll();
  };

  const handleRequestAction = async (reqId: string, action: "accepted" | "credited" | "rejected") => {
    setProcessingRequest(reqId);
    const updates: any = { status: action, updated_at: new Date().toISOString() };
    if (action === "accepted") {
      updates.admin_note = creditNote || null;
      updates.expected_credit_date = creditDate || null;
    }
    if (action === "credited") {
      updates.credited_at = new Date().toISOString();
      updates.admin_note = creditNote || null;
      
      // Upload screenshot if provided
      if (creditScreenshot) {
        const path = `payout-screenshots/${reqId}/${Date.now()}_${creditScreenshot.name}`;
        await supabase.storage.from("event-documents").upload(path, creditScreenshot);
        updates.screenshot_path = path;
      }

      // Create transaction and deduct balance
      const req = requests.find(r => r.id === reqId);
      if (req) {
        await supabase.from("artist_transactions" as any).insert({
          artist_id: req.artist_id, transaction_type: "credit", amount: req.amount,
          description: `Payout credited${creditNote ? `: ${creditNote}` : ""}`,
          payout_request_id: reqId, screenshot_path: updates.screenshot_path || null,
        } as any);
      }
    }

    await supabase.from("artist_payout_requests" as any).update(updates).eq("id", reqId);
    toast({ title: `Request ${action}!` });
    setCreditNote(""); setCreditDate(""); setCreditScreenshot(null);
    setProcessingRequest(null);
    fetchAll();
  };

  const getArtistBalance = (artistId: string) => {
    const totalEarnings = eventPayouts.filter(p => p.artist_id === artistId).reduce((s, p) => s + p.calculated_amount, 0);
    const pendingEarnings = eventPayouts.filter(p => p.artist_id === artistId && p.status === "pending").reduce((s, p) => s + p.calculated_amount, 0);
    const credited = transactions.filter(t => t.artist_id === artistId && t.transaction_type === "credit").reduce((s, t) => s + t.amount, 0);
    return { earnings: totalEarnings, pendingEarnings, credited, balance: totalEarnings - credited };
  };

  const getScreenshotUrl = async (path: string) => {
    const { data } = await supabase.storage.from("event-documents").createSignedUrl(path, 3600);
    if (data?.signedUrl) setViewScreenshot(data.signedUrl);
  };

  return (
    <div className="space-y-4">
      {/* Section Tabs */}
      <div className="flex gap-1 bg-muted/30 rounded-xl p-1">
        {[
          { id: "settings" as const, label: "Artist Payouts", icon: Wallet },
          { id: "requests" as const, label: "Payout Requests", icon: Banknote },
          { id: "transactions" as const, label: "Transactions", icon: TrendingUp },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveSection(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-sans flex-1 transition-all ${activeSection === t.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
            {t.id === "requests" && requests.filter(r => r.status === "pending").length > 0 && (
              <Badge className="ml-1 text-[9px] bg-red-500 text-white border-none h-4 px-1">{requests.filter(r => r.status === "pending").length}</Badge>
            )}
          </button>
        ))}
      </div>

      {/* Settings Section */}
      {activeSection === "settings" && (
        <div className="space-y-3">
          {artists.map(artist => {
            const setting = settings[artist.id];
            const balance = getArtistBalance(artist.id);
            const isExpanded = expandedArtist === artist.id;
            const artistEventPayouts = eventPayouts.filter(p => p.artist_id === artist.id);

            return (
              <Card key={artist.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {artist.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-sans font-semibold">{artist.name}</p>
                        <div className="flex gap-2 text-xs text-muted-foreground font-sans">
                          <span>Balance: <strong className="text-primary">₹{balance.balance.toLocaleString("en-IN")}</strong></span>
                          <span>Credited: <strong className="text-green-600">₹{balance.credited.toLocaleString("en-IN")}</strong></span>
                        </div>
                      </div>
                    </div>
                    <Badge className={`text-[10px] border-none ${setting ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                      {setting ? `${setting.payout_type === "percentage" ? `${setting.payout_value}%` : `₹${setting.payout_value}`} / ${setting.payout_cycle.replace("_", " ")}` : "Not Set"}
                    </Badge>
                  </div>

                  {/* Inline payout config */}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[10px] font-sans">Type</Label>
                      <Select value={setting?.payout_type || "percentage"} onValueChange={v => {
                        const val = parseFloat((document.getElementById(`pval-${artist.id}`) as HTMLInputElement)?.value) || setting?.payout_value || 0;
                        const cycle = (document.getElementById(`pcycle-${artist.id}`) as HTMLSelectElement)?.dataset.value || setting?.payout_cycle || "per_event";
                        savePayoutSetting(artist.id, v, val, cycle);
                      }}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage %</SelectItem>
                          <SelectItem value="fixed">Fixed ₹</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px] font-sans">Value</Label>
                      <Input id={`pval-${artist.id}`} type="number" defaultValue={setting?.payout_value || ""} className="h-8 text-xs"
                        placeholder={setting?.payout_type === "fixed" ? "₹ Amount" : "% Rate"}
                        onBlur={e => {
                          const val = parseFloat(e.target.value);
                          if (val > 0) savePayoutSetting(artist.id, setting?.payout_type || "percentage", val, setting?.payout_cycle || "per_event");
                        }} />
                    </div>
                    <div>
                      <Label className="text-[10px] font-sans">Cycle</Label>
                      <Select value={setting?.payout_cycle || "per_event"} onValueChange={v => {
                        savePayoutSetting(artist.id, setting?.payout_type || "percentage", setting?.payout_value || 0, v);
                      }}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="per_event">Per Event</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Event payouts expand */}
                  {artistEventPayouts.length > 0 && (
                    <>
                      <button onClick={() => setExpandedArtist(isExpanded ? null : artist.id)}
                        className="w-full mt-2 flex items-center justify-center gap-1 text-xs text-primary font-sans py-1 hover:bg-primary/5 rounded-lg">
                        {isExpanded ? <><ChevronUp className="w-3 h-3" /> Hide Events</> : <><ChevronDown className="w-3 h-3" /> {artistEventPayouts.length} Event Payouts</>}
                      </button>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="space-y-1 mt-2">
                                {artistEventPayouts.map(ep => (
                                <div key={ep.id} className="bg-muted/30 rounded-lg p-2 text-xs font-sans flex justify-between items-center">
                                  <div>
                                    <p className="text-muted-foreground">Event ₹{ep.event_total.toLocaleString("en-IN")}</p>
                                    <p className="font-semibold">{ep.payout_type === "percentage" ? `${ep.payout_value}%` : `₹${ep.payout_value}`} → ₹{ep.calculated_amount.toLocaleString("en-IN")}</p>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Badge className={`text-[9px] border-none ${ep.status === "credited" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                                      {ep.status}
                                    </Badge>
                                    {ep.status === "pending" && (
                                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-primary" onClick={() => {
                                        setEditingEvent({ eventId: ep.event_id, artistId: artist.id });
                                        setCustomPayoutType(ep.payout_type);
                                        setCustomPayoutValue(String(ep.payout_value));
                                      }}>
                                        <Eye className="w-3 h-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Requests Section */}
      {activeSection === "requests" && (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <Card><CardContent className="p-8 text-center">
              <Banknote className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-sans text-muted-foreground">No payout requests yet</p>
            </CardContent></Card>
          ) : requests.map(req => {
            const artist = artists.find(a => a.id === req.artist_id);
            return (
              <Card key={req.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-sans font-semibold">{artist?.name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground font-sans">{new Date(req.created_at).toLocaleString("en-IN")}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-lg font-bold text-primary">₹{req.amount.toLocaleString("en-IN")}</p>
                      <Badge className={`text-[10px] border-none ${
                        req.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                        req.status === "accepted" ? "bg-blue-100 text-blue-700" :
                        req.status === "credited" ? "bg-green-100 text-green-700" :
                        "bg-red-100 text-red-700"
                      }`}>{req.status}</Badge>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{req.request_type === "full" ? "Full Balance" : "Partial"}</Badge>
                  {req.note && <p className="text-xs font-sans bg-muted/30 rounded p-2">📝 {req.note}</p>}
                  {req.expected_credit_date && <p className="text-xs font-sans text-muted-foreground">Expected: {new Date(req.expected_credit_date).toLocaleDateString("en-IN")}</p>}
                  {req.screenshot_path && (
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => getScreenshotUrl(req.screenshot_path!)}>
                      <ImageIcon className="w-3 h-3 mr-1" /> View Screenshot
                    </Button>
                  )}

                  {/* Action buttons */}
                  {req.status === "pending" && (
                    <div className="space-y-2 pt-2 border-t border-border">
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label className="text-[10px]">Admin Note</Label><Input value={creditNote} onChange={e => setCreditNote(e.target.value)} className="h-8 text-xs" placeholder="Note..." /></div>
                        <div><Label className="text-[10px]">Credit Date</Label><Input type="date" value={creditDate} onChange={e => setCreditDate(e.target.value)} className="h-8 text-xs" /></div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700" disabled={processingRequest === req.id}
                          onClick={() => handleRequestAction(req.id, "accepted")}>
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Accept
                        </Button>
                        <Button size="sm" variant="destructive" className="h-8 text-xs" disabled={processingRequest === req.id}
                          onClick={() => handleRequestAction(req.id, "rejected")}>
                          Reject
                        </Button>
                      </div>
                    </div>
                  )}

                  {req.status === "accepted" && (
                    <div className="space-y-2 pt-2 border-t border-border">
                      <div>
                        <Label className="text-[10px]">Payment Screenshot</Label>
                        <Input type="file" accept="image/*" className="h-8 text-xs" onChange={e => setCreditScreenshot(e.target.files?.[0] || null)} />
                      </div>
                      <Input value={creditNote} onChange={e => setCreditNote(e.target.value)} className="h-8 text-xs" placeholder="Credit note..." />
                      <Button size="sm" className="w-full h-8 text-xs bg-green-600 hover:bg-green-700" disabled={processingRequest === req.id}
                        onClick={() => handleRequestAction(req.id, "credited")}>
                        <IndianRupee className="w-3 h-3 mr-1" /> Mark as Credited
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Transactions Section */}
      {activeSection === "transactions" && (
        <div className="space-y-3">
          {transactions.length === 0 ? (
            <Card><CardContent className="p-8 text-center">
              <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-sans text-muted-foreground">No transactions yet</p>
            </CardContent></Card>
          ) : transactions.map(tx => {
            const artist = artists.find(a => a.id === tx.artist_id);
            return (
              <div key={tx.id} className="bg-muted/30 rounded-lg p-3 text-xs font-sans flex justify-between items-center">
                <div>
                  <p className="font-semibold">{artist?.name}</p>
                  <p className="text-muted-foreground">{tx.description}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleString("en-IN")}</p>
                </div>
                <div className="text-right flex items-center gap-2">
                  <span className={`font-bold ${tx.transaction_type === "credit" ? "text-green-600" : "text-primary"}`}>
                    {tx.transaction_type === "credit" ? "-" : "+"}₹{tx.amount.toLocaleString("en-IN")}
                  </span>
                  {tx.screenshot_path && (
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => getScreenshotUrl(tx.screenshot_path!)}>
                      <ImageIcon className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Screenshot Viewer */}
      {viewScreenshot && (
        <Dialog open={!!viewScreenshot} onOpenChange={() => setViewScreenshot(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Payment Screenshot</DialogTitle></DialogHeader>
            <img src={viewScreenshot} alt="Screenshot" className="w-full rounded-lg" />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AdminArtistPayouts;
