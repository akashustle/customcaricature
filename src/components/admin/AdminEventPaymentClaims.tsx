import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, CheckCircle2, XCircle, Banknote, CreditCard, Image as ImageIcon, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/pricing";
import { motion } from "framer-motion";

type Claim = {
  id: string;
  event_id: string;
  user_id: string;
  claim_type: "cash" | "online";
  amount: number;
  screenshot_path: string | null;
  user_note: string | null;
  status: "pending" | "approved" | "rejected";
  admin_reply: string | null;
  reviewed_at: string | null;
  created_at: string;
  event?: { client_name: string; event_date: string; event_type: string; city: string; total_price: number; remaining_amount: number | null };
};

const AdminEventPaymentClaims = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [actionId, setActionId] = useState<string | null>(null);
  const [reply, setReply] = useState<Record<string, string>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("event_payment_claims")
      .select(`id, event_id, user_id, claim_type, amount, screenshot_path, user_note, status, admin_reply, reviewed_at, created_at,
               event:event_bookings(client_name, event_date, event_type, city, total_price, remaining_amount)`)
      .order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    setClaims((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-event-claims")
      .on("postgres_changes", { event: "*", schema: "public", table: "event_payment_claims" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const openScreenshot = async (path: string) => {
    const { data, error } = await supabase.storage.from("payment-claims").createSignedUrl(path, 300);
    if (error) { toast({ title: "Could not load screenshot", variant: "destructive" }); return; }
    setPreviewUrl(data.signedUrl);
  };

  const decide = async (claim: Claim, decision: "approved" | "rejected") => {
    setActionId(claim.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("event_payment_claims").update({
        status: decision,
        admin_reply: reply[claim.id] || null,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      } as any).eq("id", claim.id);
      if (error) throw error;

      if (decision === "approved") {
        await supabase.from("event_bookings").update({
          payment_status: "fully_paid",
          remaining_amount: 0,
          updated_at: new Date().toISOString(),
        } as any).eq("id", claim.event_id);

        await supabase.from("payment_history").insert({
          booking_id: claim.event_id,
          user_id: claim.user_id,
          amount: claim.amount,
          payment_type: claim.claim_type === "cash" ? "event_remaining_cash" : "event_remaining_offline",
          status: "completed",
          notes: `Admin-approved ${claim.claim_type} payment claim. ${reply[claim.id] || ""}`.trim(),
        } as any);

        await supabase.from("notifications").insert({
          user_id: claim.user_id,
          title: "✅ Payment Approved",
          message: `Your ${claim.claim_type} payment of ${formatPrice(claim.amount)} has been verified. Event is fully settled.`,
          type: "payment",
          link: "/dashboard",
        } as any);
      } else {
        await supabase.from("notifications").insert({
          user_id: claim.user_id,
          title: "⚠️ Payment Claim Rejected",
          message: `Your payment claim was rejected. ${reply[claim.id] || "Please contact support."}`,
          type: "payment",
          link: "/dashboard",
        } as any);
      }
      toast({ title: decision === "approved" ? "✅ Approved" : "❌ Rejected" });
      load();
    } catch (err: any) {
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
    }
    setActionId(null);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="font-display flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" /> Post-Event Payment Claims
        </CardTitle>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-3 h-3 mr-1" /> Refresh</Button>
      </CardHeader>
      <CardContent>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList className="grid grid-cols-4 mb-3">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
          <TabsContent value={filter}>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : claims.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 font-sans text-sm">No {filter === "all" ? "" : filter} claims.</p>
            ) : (
              <div className="space-y-3">
                {claims.map((c) => (
                  <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="border-primary/10">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <p className="font-sans font-semibold">{c.event?.client_name || "Unknown"} <span className="text-xs text-muted-foreground">· {c.event?.event_type}</span></p>
                            <p className="text-xs text-muted-foreground font-sans">
                              {c.event?.event_date} · {c.event?.city}
                            </p>
                          </div>
                          <Badge className={
                            c.status === "approved" ? "bg-green-100 text-green-800" :
                            c.status === "rejected" ? "bg-red-100 text-red-800" :
                            "bg-amber-100 text-amber-800"
                          }>
                            {c.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                          <div className="flex items-center gap-1 bg-muted/40 rounded p-2">
                            {c.claim_type === "cash" ? <Banknote className="w-3 h-3 text-primary" /> : <CreditCard className="w-3 h-3 text-primary" />}
                            <span>{c.claim_type === "cash" ? "Cash" : "Online"}</span>
                          </div>
                          <div className="bg-muted/40 rounded p-2">
                            <span className="font-bold text-primary">{formatPrice(c.amount)}</span>
                          </div>
                        </div>
                        {c.user_note && (
                          <div className="bg-muted/30 rounded-lg p-2 text-xs font-sans">
                            <span className="font-semibold">User note: </span>{c.user_note}
                          </div>
                        )}
                        {c.screenshot_path && (
                          <Button variant="outline" size="sm" className="w-full" onClick={() => openScreenshot(c.screenshot_path!)}>
                            <ImageIcon className="w-3 h-3 mr-1" /> View Screenshot
                          </Button>
                        )}
                        {c.status === "pending" && (
                          <div className="space-y-2">
                            <Textarea
                              value={reply[c.id] || ""}
                              onChange={(e) => setReply((p) => ({ ...p, [c.id]: e.target.value }))}
                              placeholder="Optional admin reply..."
                              rows={2}
                              className="text-xs"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                size="sm"
                                className="rounded-full bg-green-600 hover:bg-green-700 text-white"
                                disabled={actionId === c.id}
                                onClick={() => decide(c, "approved")}
                              >
                                {actionId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><CheckCircle2 className="w-3 h-3 mr-1" /> Approve</>}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-full border-red-300 text-red-700 hover:bg-red-50"
                                disabled={actionId === c.id}
                                onClick={() => decide(c, "rejected")}
                              >
                                <XCircle className="w-3 h-3 mr-1" /> Reject
                              </Button>
                            </div>
                          </div>
                        )}
                        {c.status !== "pending" && c.admin_reply && (
                          <div className="bg-card border border-border rounded-lg p-2 text-xs">
                            <p className="font-semibold text-primary text-[10px]">Admin reply:</p>
                            <p className="font-sans">{c.admin_reply}</p>
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground font-sans">
                          Submitted {new Date(c.created_at).toLocaleString("en-IN")}
                          {c.reviewed_at && <> · Reviewed {new Date(c.reviewed_at).toLocaleString("en-IN")}</>}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {previewUrl && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
          <img src={previewUrl} alt="Payment screenshot" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </Card>
  );
};

export default AdminEventPaymentClaims;
