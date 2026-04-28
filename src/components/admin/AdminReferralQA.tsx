/**
 * AdminReferralQA
 *
 * Admin-facing automated checklist that verifies the entire referral funnel
 * is wired correctly. Each check inspects live data from `referral_events`
 * and the source of truth tables (orders / event_bookings) and reports
 * pass / fail with a one-line explanation.
 *
 * The goal is to catch silent regressions: e.g. a deploy that forgets to
 * call `logReferralEvent("order", ...)` would make the "orders fire events"
 * check fail.
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, RefreshCw, AlertTriangle } from "lucide-react";

type CheckStatus = "pass" | "fail" | "warn" | "running" | "idle";

interface CheckResult {
  id: string;
  title: string;
  status: CheckStatus;
  detail?: string;
}

const STEPS = [
  { id: "click", title: "Click events recorded (last 30d)" },
  { id: "register", title: "Register events recorded (last 30d)" },
  { id: "login", title: "Login events recorded (last 30d)" },
  { id: "booking", title: "Booking events recorded (last 30d)" },
  { id: "order", title: "Order events recorded (last 30d)" },
  { id: "table_referral_codes", title: "referral_codes table reachable" },
  { id: "table_referral_events", title: "referral_events table reachable" },
  { id: "table_lead_links", title: "lead_links table reachable" },
  { id: "stuck_orders", title: "No caricature orders stuck > 30 min in pending" },
  { id: "reconciler", title: "Reconciliation cron has run in last 24h" },
];

const ago = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();

const AdminReferralQA = () => {
  const [results, setResults] = useState<Record<string, CheckResult>>(() =>
    Object.fromEntries(STEPS.map((s) => [s.id, { ...s, status: "idle" as CheckStatus }])),
  );
  const [running, setRunning] = useState(false);

  const set = (id: string, patch: Partial<CheckResult>) =>
    setResults((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const checkEventType = async (type: string) => {
    set(type, { status: "running" });
    const { count, error } = await (supabase.from("referral_events" as any))
      .select("id", { count: "exact", head: true })
      .eq("event_type", type)
      .gte("created_at", ago(30 * 24 * 60));
    if (error) {
      set(type, { status: "fail", detail: error.message });
    } else if ((count ?? 0) === 0) {
      set(type, { status: "warn", detail: "0 events in 30d — handler may not be wired." });
    } else {
      set(type, { status: "pass", detail: `${count} event(s) recorded.` });
    }
  };

  const checkTable = async (id: string, table: string) => {
    set(id, { status: "running" });
    const { error } = await (supabase.from(table as any))
      .select("id", { count: "exact", head: true })
      .limit(1);
    if (error) set(id, { status: "fail", detail: error.message });
    else set(id, { status: "pass", detail: "Reachable." });
  };

  const checkStuckOrders = async () => {
    set("stuck_orders", { status: "running" });
    const { data, error } = await supabase
      .from("orders")
      .select("id, created_at")
      .eq("payment_status", "pending")
      .not("razorpay_order_id", "is", null)
      .lte("created_at", ago(30))
      .limit(10);
    if (error) set("stuck_orders", { status: "fail", detail: error.message });
    else if ((data || []).length === 0)
      set("stuck_orders", { status: "pass", detail: "No stuck pending orders." });
    else
      set("stuck_orders", {
        status: "warn",
        detail: `${data!.length} stuck order(s). Run reconciler.`,
      });
  };

  const checkReconciler = async () => {
    set("reconciler", { status: "running" });
    const { data, error } = await (supabase.from("payment_reconciliation_log" as any))
      .select("id, created_at")
      .gte("created_at", ago(24 * 60))
      .limit(1) as any;
    if (error) set("reconciler", { status: "fail", detail: error.message });
    else if ((data || []).length === 0)
      set("reconciler", { status: "warn", detail: "No reconciler runs in 24h. Cron may be off." });
    else set("reconciler", { status: "pass", detail: "Reconciler is running." });
  };

  const runAll = async () => {
    setRunning(true);
    await Promise.all([
      checkEventType("click"), checkEventType("register"), checkEventType("login"),
      checkEventType("booking"), checkEventType("order"),
      checkTable("table_referral_codes", "referral_codes"),
      checkTable("table_referral_events", "referral_events"),
      checkTable("table_lead_links", "lead_links"),
      checkStuckOrders(),
      checkReconciler(),
    ]);
    setRunning(false);
  };

  useEffect(() => { runAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const summary = Object.values(results).reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    {} as Record<CheckStatus, number>,
  );

  const Icon = ({ s }: { s: CheckStatus }) => {
    if (s === "pass") return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
    if (s === "fail") return <XCircle className="w-5 h-5 text-destructive" />;
    if (s === "warn") return <AlertTriangle className="w-5 h-5 text-amber-600" />;
    if (s === "running") return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;
    return <div className="w-5 h-5 rounded-full bg-muted" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-body">Referral Funnel QA</h2>
          <p className="text-sm text-muted-foreground font-body">
            Click → Register → Login → Booking → Order. Each check verifies the corresponding
            handler is firing and the underlying tables are healthy.
          </p>
        </div>
        <Button size="sm" onClick={runAll} disabled={running} className="rounded-full gap-2">
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Run all checks
        </Button>
      </div>

      <div className="flex gap-2 text-xs font-body">
        <Badge className="bg-emerald-100 text-emerald-700">Pass: {summary.pass || 0}</Badge>
        <Badge className="bg-amber-100 text-amber-800">Warn: {summary.warn || 0}</Badge>
        <Badge className="bg-rose-100 text-rose-700">Fail: {summary.fail || 0}</Badge>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-body">Checks</CardTitle></CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {STEPS.map((step) => {
              const r = results[step.id];
              return (
                <li key={step.id} className="flex items-start gap-3 px-4 py-3">
                  <Icon s={r.status} />
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm">{step.title}</p>
                    {r.detail && (
                      <p className="text-xs text-muted-foreground font-body mt-0.5">{r.detail}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReferralQA;
