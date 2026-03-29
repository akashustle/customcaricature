import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  Wallet, IndianRupee, TrendingUp, Clock, CheckCircle2, Send,
  Image as ImageIcon, Banknote, ArrowDownCircle, ArrowUpCircle, CreditCard
} from "lucide-react";
import ArtistPaymentDetails from "./ArtistPaymentDetails";
import { motion } from "framer-motion";

type EventPayout = {
  id: string; event_id: string; payout_type: string; payout_value: number;
  event_total: number; calculated_amount: number; status: string;
  credited_at: string | null; created_at: string;
};
type PayoutRequest = {
  id: string; amount: number; request_type: string; note: string | null;
  status: string; admin_note: string | null; expected_credit_date: string | null;
  credited_at: string | null; screenshot_path: string | null; created_at: string;
};
type Transaction = {
  id: string; transaction_type: string; amount: number; description: string | null;
  screenshot_path: string | null; created_at: string;
};
type PayoutSetting = { payout_type: string; payout_value: number; payout_cycle: string; };

const ArtistEarnings = ({ artistId }: { artistId: string }) => {
  const [payouts, setPayouts] = useState<EventPayout[]>([]);
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [setting, setSetting] = useState<PayoutSetting | null>(null);
  const [showRequest, setShowRequest] = useState(false);
  const [requestType, setRequestType] = useState("full");
  const [requestAmount, setRequestAmount] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [viewScreenshot, setViewScreenshot] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "transactions" | "requests" | "payment_details">("overview");
  const [preferredMethod, setPreferredMethod] = useState("upi_id");

  useEffect(() => {
    fetchAll();
    const ch = supabase.channel(`artist-earnings-${artistId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "artist_event_payouts" }, fetchAll)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "artist_event_payouts" }, fetchAll)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "artist_payout_requests" }, fetchAll)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "artist_payout_requests" }, fetchAll)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "artist_transactions" }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [artistId]);

  const fetchAll = async () => {
    const [{ data: p }, { data: r }, { data: t }, { data: s }] = await Promise.all([
      supabase.from("artist_event_payouts" as any).select("*").eq("artist_id", artistId).order("created_at", { ascending: false }),
      supabase.from("artist_payout_requests" as any).select("*").eq("artist_id", artistId).order("created_at", { ascending: false }),
      supabase.from("artist_transactions" as any).select("*").eq("artist_id", artistId).order("created_at", { ascending: false }),
      supabase.from("artist_payout_settings" as any).select("payout_type, payout_value, payout_cycle").eq("artist_id", artistId).maybeSingle(),
    ]);
    if (p) setPayouts(p as any);
    if (r) setRequests(r as any);
    if (t) setTransactions(t as any);
    if (s) setSetting(s as any);
  };

  const totalEarnings = payouts.reduce((s, p) => s + p.calculated_amount, 0);
  const creditedAmount = transactions.filter(t => t.transaction_type === "credit").reduce((s, t) => s + t.amount, 0);
  const pendingEarnings = payouts.filter(p => p.status === "pending").reduce((s, p) => s + p.calculated_amount, 0);
  const balance = totalEarnings - creditedAmount;

  const submitRequest = async () => {
    const amount = requestType === "full" ? balance : parseFloat(requestAmount);
    if (!amount || amount <= 0) { toast({ title: "Enter valid amount", variant: "destructive" }); return; }
    if (amount > balance) { toast({ title: "Amount exceeds balance", variant: "destructive" }); return; }
    
    setSubmitting(true);
    const { error } = await supabase.from("artist_payout_requests" as any).insert({
      artist_id: artistId, amount, request_type: requestType,
      note: requestNote || null,
    } as any);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Payout request submitted! 🎉" });
      setShowRequest(false); setRequestNote(""); setRequestAmount("");
    }
    setSubmitting(false);
    fetchAll();
  };

  const getScreenshotUrl = async (path: string) => {
    const { data } = await supabase.storage.from("event-documents").createSignedUrl(path, 3600);
    if (data?.signedUrl) setViewScreenshot(data.signedUrl);
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Total Income", value: `₹${totalEarnings.toLocaleString("en-IN")}`, icon: TrendingUp, color: "from-primary/60 to-primary" },
          { label: "Balance", value: `₹${balance.toLocaleString("en-IN")}`, icon: Wallet, color: "from-green-400 to-green-600" },
          { label: "Credited", value: `₹${creditedAmount.toLocaleString("en-IN")}`, icon: CheckCircle2, color: "from-blue-400 to-blue-600" },
          { label: "Pending", value: `₹${pendingEarnings.toLocaleString("en-IN")}`, icon: Clock, color: "from-amber-400 to-amber-600" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="overflow-hidden relative"><CardContent className="p-3 text-center">
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${s.color}`} />
              <s.icon className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold font-display">{s.value}</p>
              <p className="text-[9px] text-muted-foreground font-sans">{s.label}</p>
            </CardContent></Card>
          </motion.div>
        ))}
      </div>

      {/* Payout cycle info */}
      {setting && (
        <div className="bg-primary/5 rounded-xl p-3 text-center text-xs font-sans">
          <p className="text-muted-foreground">Your payout: <strong className="text-primary">
            {setting.payout_type === "percentage" ? `${setting.payout_value}%` : `₹${setting.payout_value}`}
          </strong> · Cycle: <strong>{setting.payout_cycle.replace("_", " ")}</strong></p>
        </div>
      )}

      {/* Apply for payout */}
      {balance > 0 && (
        <Button onClick={() => setShowRequest(true)} className="w-full h-11 rounded-xl font-sans">
          <Send className="w-4 h-4 mr-2" /> Apply for Payout (₹{balance.toLocaleString("en-IN")} available)
        </Button>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/30 rounded-xl p-1">
        {[
          { id: "overview" as const, label: "Income" },
          { id: "transactions" as const, label: "Transactions" },
          { id: "requests" as const, label: "Requests" },
          { id: "payment_details" as const, label: "Payment Info" },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-sans transition-all ${activeTab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Income Tab */}
      {activeTab === "overview" && (
        <div className="space-y-2">
          <h3 className="font-display text-sm font-bold flex items-center gap-1"><IndianRupee className="w-4 h-4 text-primary" /> Income History</h3>
            <Card><CardContent className="p-6 text-center">
              <IndianRupee className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-sans text-muted-foreground">No earnings yet</p>
            </CardContent></Card>
          ) : payouts.map(p => (
            <div key={p.id} className="bg-muted/30 rounded-lg p-3 text-xs font-sans flex justify-between items-center">
              <div>
                <p className="text-muted-foreground">Event ₹{p.event_total.toLocaleString("en-IN")}</p>
                <p className="font-semibold">{p.payout_type === "percentage" ? `${p.payout_value}%` : "Fixed"} → ₹{p.calculated_amount.toLocaleString("en-IN")}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleDateString("en-IN")}</p>
              </div>
              <Badge className={`text-[9px] border-none ${p.status === "credited" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                {p.status}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === "transactions" && (
        <div className="space-y-2">
          {transactions.length === 0 ? (
            <Card><CardContent className="p-6 text-center">
              <TrendingUp className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-sans text-muted-foreground">No transactions yet</p>
            </CardContent></Card>
          ) : transactions.map(tx => (
            <div key={tx.id} className="bg-muted/30 rounded-lg p-3 text-xs font-sans flex justify-between items-center">
              <div className="flex items-center gap-2">
                {tx.transaction_type === "earning" ? (
                  <ArrowDownCircle className="w-5 h-5 text-primary flex-shrink-0" />
                ) : (
                  <ArrowUpCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                )}
                <div>
                  <p className="font-semibold">{tx.description || tx.transaction_type}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleString("en-IN")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-bold ${tx.transaction_type === "earning" ? "text-primary" : "text-green-600"}`}>
                  {tx.transaction_type === "earning" ? "+" : "-"}₹{tx.amount.toLocaleString("en-IN")}
                </span>
                {tx.screenshot_path && (
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => getScreenshotUrl(tx.screenshot_path!)}>
                    <ImageIcon className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Requests Tab */}
      {activeTab === "requests" && (
        <div className="space-y-2">
          {requests.length === 0 ? (
            <Card><CardContent className="p-6 text-center">
              <Banknote className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-sans text-muted-foreground">No payout requests</p>
            </CardContent></Card>
          ) : requests.map(req => (
            <Card key={req.id}>
              <CardContent className="p-3 space-y-1">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-sans font-semibold text-sm">₹{req.amount.toLocaleString("en-IN")}</p>
                    <Badge variant="outline" className="text-[9px]">{req.request_type === "full" ? "Full" : "Partial"}</Badge>
                  </div>
                  <Badge className={`text-[10px] border-none ${
                    req.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                    req.status === "accepted" ? "bg-blue-100 text-blue-700" :
                    req.status === "credited" ? "bg-green-100 text-green-700" :
                    "bg-red-100 text-red-700"
                  }`}>{req.status}</Badge>
                </div>
                {req.note && <p className="text-[10px] font-sans text-muted-foreground">📝 {req.note}</p>}
                {req.admin_note && <p className="text-[10px] font-sans text-blue-600">💬 {req.admin_note}</p>}
                {req.expected_credit_date && <p className="text-[10px] font-sans text-muted-foreground">📅 Expected: {new Date(req.expected_credit_date).toLocaleDateString("en-IN")}</p>}
                {req.screenshot_path && (
                  <Button variant="outline" size="sm" className="text-[10px] h-6" onClick={() => getScreenshotUrl(req.screenshot_path!)}>
                    <ImageIcon className="w-3 h-3 mr-1" /> View Receipt
                  </Button>
                )}
                <p className="text-[9px] text-muted-foreground font-sans">{new Date(req.created_at).toLocaleString("en-IN")}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Payout Request Dialog */}
      <Dialog open={showRequest} onOpenChange={setShowRequest}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-display flex items-center gap-2"><Send className="w-5 h-5 text-primary" /> Apply for Payout</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="bg-primary/10 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground font-sans">Available Balance</p>
              <p className="text-2xl font-display font-bold text-primary">₹{balance.toLocaleString("en-IN")}</p>
            </div>

            <div>
              <Label className="text-xs font-sans">Request Type</Label>
              <Select value={requestType} onValueChange={setRequestType}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Balance (₹{balance.toLocaleString("en-IN")})</SelectItem>
                  <SelectItem value="partial">Custom Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {requestType === "partial" && (
              <div>
                <Label className="text-xs font-sans">Amount (₹)</Label>
                <Input type="number" value={requestAmount} onChange={e => setRequestAmount(e.target.value)}
                  placeholder="Enter amount" className="h-9" max={balance} />
              </div>
            )}

            <div>
              <Label className="text-xs font-sans">Note (optional)</Label>
              <Textarea value={requestNote} onChange={e => setRequestNote(e.target.value)}
                placeholder="Add a note for admin..." className="text-sm" rows={2} />
            </div>

            <Button onClick={submitRequest} disabled={submitting} className="w-full h-10 rounded-xl font-sans">
              {submitting ? "Submitting..." : `Submit Request for ₹${(requestType === "full" ? balance : parseFloat(requestAmount) || 0).toLocaleString("en-IN")}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Screenshot Viewer */}
      {viewScreenshot && (
        <Dialog open={!!viewScreenshot} onOpenChange={() => setViewScreenshot(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Payment Receipt</DialogTitle></DialogHeader>
            <img src={viewScreenshot} alt="Receipt" className="w-full rounded-lg" />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ArtistEarnings;
