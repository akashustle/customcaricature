/**
 * AdminDataExports
 *
 * One-stop CSV export panel for the data the team needs most often:
 *   • Referral events (click → register → login → booking → order)
 *   • Order / payment timelines (caricature orders, shop orders, event bookings)
 *
 * Every export supports:
 *   • Date-range filter (defaults to last 30 days)
 *   • Referral-code filter (referral exports)
 *   • Order-type filter (orders export)
 *
 * Output is CSV via the existing exportToExcel helper so it opens cleanly in
 * Excel, Numbers, and Google Sheets.
 */

import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { exportToExcel } from "@/lib/export-excel";
import { Download, Loader2, FileText, Receipt, GitBranch } from "lucide-react";

type RefEvent = "all" | "click" | "register" | "login" | "booking" | "order";

const todayISO = () => new Date().toISOString().slice(0, 10);
const daysAgoISO = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const AdminDataExports = () => {
  const [from, setFrom] = useState(daysAgoISO(30));
  const [to, setTo] = useState(todayISO());
  const [refCode, setRefCode] = useState("");
  const [refEventType, setRefEventType] = useState<RefEvent>("all");
  const [orderType, setOrderType] = useState<"all" | "single" | "couple" | "group">("all");
  const [busy, setBusy] = useState<string | null>(null);

  const dateBounds = useMemo(() => {
    const fromIso = `${from}T00:00:00.000Z`;
    const toIso = `${to}T23:59:59.999Z`;
    return { fromIso, toIso };
  }, [from, to]);

  const exportReferralEvents = async () => {
    setBusy("referrals");
    try {
      let q = (supabase.from("referral_events" as any))
        .select("*")
        .gte("created_at", dateBounds.fromIso)
        .lte("created_at", dateBounds.toIso)
        .order("created_at", { ascending: false })
        .limit(10000);
      if (refCode.trim()) q = q.eq("referral_code", refCode.trim());
      if (refEventType !== "all") q = q.eq("event_type", refEventType);
      const { data, error } = (await q) as any;
      if (error) throw error;
      const rows = (data || []).map((e: any) => ({
        when: new Date(e.created_at).toISOString(),
        event_type: e.event_type,
        referral_code: e.referral_code,
        referrer_user_id: e.referrer_user_id || "",
        referred_user_id: e.referred_user_id || "",
        source: e.source || "",
        metadata: e.metadata ? JSON.stringify(e.metadata) : "",
      }));
      if (!rows.length) {
        toast({ title: "No data", description: "No referral events match these filters." });
      } else {
        exportToExcel(rows, "referral_events", "referral_events");
        toast({ title: "Exported", description: `${rows.length} referral events.` });
      }
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message || String(err), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const exportOrderTimeline = async () => {
    setBusy("orders");
    try {
      let q = supabase
        .from("orders")
        .select("id, order_type, style, customer_name, customer_email, customer_mobile, amount, payment_status, status, razorpay_order_id, razorpay_payment_id, created_at, updated_at, expected_delivery_date")
        .gte("created_at", dateBounds.fromIso)
        .lte("created_at", dateBounds.toIso)
        .order("created_at", { ascending: false })
        .limit(10000);
      if (orderType !== "all") q = q.eq("order_type", orderType as any);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data || []).map((o: any) => ({
        order_id_short: o.id.slice(0, 8).toUpperCase(),
        order_type: o.order_type,
        style: o.style,
        customer_name: o.customer_name,
        customer_email: o.customer_email,
        customer_mobile: o.customer_mobile,
        amount: o.amount,
        payment_status: o.payment_status,
        status: o.status,
        razorpay_order_id: o.razorpay_order_id || "",
        razorpay_payment_id: o.razorpay_payment_id || "",
        created_at: new Date(o.created_at).toISOString(),
        updated_at: new Date(o.updated_at).toISOString(),
        expected_delivery_date: o.expected_delivery_date || "",
      }));
      if (!rows.length) {
        toast({ title: "No data", description: "No orders match these filters." });
      } else {
        exportToExcel(rows, "orders", "orders_timeline");
        toast({ title: "Exported", description: `${rows.length} orders.` });
      }
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message || String(err), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const exportPaymentHistory = async () => {
    setBusy("payments");
    try {
      const { data, error } = await supabase
        .from("payment_history")
        .select("*")
        .gte("created_at", dateBounds.fromIso)
        .lte("created_at", dateBounds.toIso)
        .order("created_at", { ascending: false })
        .limit(10000);
      if (error) throw error;
      const rows = (data || []).map((p: any) => ({
        when: new Date(p.created_at).toISOString(),
        payment_type: p.payment_type,
        amount: p.amount,
        status: p.status,
        razorpay_order_id: p.razorpay_order_id || "",
        razorpay_payment_id: p.razorpay_payment_id || "",
        order_id: p.order_id || "",
        booking_id: p.booking_id || "",
        user_id: p.user_id || "",
        description: p.description || "",
      }));
      if (!rows.length) {
        toast({ title: "No data", description: "No payments in this range." });
      } else {
        exportToExcel(rows, "payments", "payment_timeline");
        toast({ title: "Exported", description: `${rows.length} payments.` });
      }
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message || String(err), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const exportReconciliationLog = async () => {
    setBusy("recon");
    try {
      const { data, error } = await (supabase.from("payment_reconciliation_log" as any))
        .select("*")
        .gte("created_at", dateBounds.fromIso)
        .lte("created_at", dateBounds.toIso)
        .order("created_at", { ascending: false })
        .limit(10000) as any;
      if (error) throw error;
      const rows = (data || []).map((r: any) => ({
        when: new Date(r.created_at).toISOString(),
        source: r.source,
        target_table: r.target_table,
        target_id: r.target_id,
        outcome: r.outcome,
        prev_status: r.prev_status || "",
        new_status: r.new_status || "",
        razorpay_order_id: r.razorpay_order_id || "",
        razorpay_payment_id: r.razorpay_payment_id || "",
        notes: r.notes || "",
      }));
      if (!rows.length) {
        toast({ title: "No data", description: "Reconciler hasn't run in this range." });
      } else {
        exportToExcel(rows, "reconciliation", "reconciliation_log");
        toast({ title: "Exported", description: `${rows.length} reconciliation entries.` });
      }
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message || String(err), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-body">Data Exports</h2>
        <p className="text-sm text-muted-foreground font-body">
          Download CSVs of referral events, payments, and orders. All exports are filtered by the
          date range below.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-body">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <Label className="text-xs font-body">From</Label>
            <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs font-body">To</Label>
            <Input type="date" value={to} min={from} max={todayISO()} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs font-body">Referral code</Label>
            <Input placeholder="e.g. REF-AB12CD" value={refCode} onChange={(e) => setRefCode(e.target.value.toUpperCase())} />
          </div>
          <div>
            <Label className="text-xs font-body">Referral event type</Label>
            <Select value={refEventType} onValueChange={(v) => setRefEventType(v as RefEvent)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All events</SelectItem>
                <SelectItem value="click">Click</SelectItem>
                <SelectItem value="register">Register</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="booking">Booking</SelectItem>
                <SelectItem value="order">Order</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-body">Order type</Label>
            <Select value={orderType} onValueChange={(v) => setOrderType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="couple">Couple</SelectItem>
                <SelectItem value="group">Group</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Export tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          {
            key: "referrals", title: "Referral events", icon: GitBranch,
            desc: "Every click / register / login / booking / order tied to a referral code.",
            run: exportReferralEvents,
          },
          {
            key: "orders", title: "Caricature orders", icon: FileText,
            desc: "Order timeline with Razorpay IDs, payment_status and order status.",
            run: exportOrderTimeline,
          },
          {
            key: "payments", title: "Payment history", icon: Receipt,
            desc: "All confirmed payments across orders, shop, and events.",
            run: exportPaymentHistory,
          },
          {
            key: "recon", title: "Reconciliation log", icon: Download,
            desc: "Every recovery attempt by the cron / admin / client poll.",
            run: exportReconciliationLog,
          },
        ].map((tile) => (
          <Card key={tile.key}>
            <CardContent className="p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-primary">
                  <tile.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold font-body">{tile.title}</p>
                  <Badge variant="outline" className="text-[10px]">CSV</Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground font-body">{tile.desc}</p>
              <Button
                onClick={tile.run}
                disabled={busy === tile.key}
                className="rounded-full font-body gap-2 self-start"
                size="sm"
              >
                {busy === tile.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Export
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminDataExports;
