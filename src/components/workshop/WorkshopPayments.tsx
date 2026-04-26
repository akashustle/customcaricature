/**
 * WorkshopPayments — Payments tab for the Workshop dashboard.
 * Mirrors the booking PaymentHistory layout fully (white 3D hero card,
 * payment summary, AND a per-transaction list with full Razorpay payment ID
 * and order ID — same look as the booking dashboard's Payments tab).
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Wallet, IndianRupee, BadgeCheck, Clock, Receipt, Hash, CreditCard,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  user: any;
  darkMode?: boolean;
}

type Payment = {
  id: string;
  payment_type: string;
  razorpay_payment_id: string | null;
  razorpay_order_id: string | null;
  amount: number;
  status: string;
  description: string | null;
  created_at: string;
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  workshop: "Workshop Fee",
  workshop_advance: "Workshop Advance",
  workshop_remaining: "Workshop Balance",
  manual: "Manual Payment",
};

const formatDateTime = (dateStr: string) =>
  new Date(dateStr).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });

const WorkshopPayments = ({ user }: Props) => {
  const status = (user?.payment_status || "pending").toLowerCase();
  const paid = status === "paid" || status === "completed" || status === "success";
  const partial = status === "partial" || status === "partially_paid";
  const amount = user?.payment_amount ? Number(user.payment_amount) : 0;
  const paymentId = user?.razorpay_payment_id || null;
  const orderId = user?.razorpay_order_id || null;

  const statusBadge = paid
    ? { label: "Paid", className: "bg-emerald-500 text-white" }
    : partial
    ? { label: "Partially Paid", className: "bg-amber-500 text-white" }
    : { label: "Pending", className: "bg-muted text-foreground" };

  // Pull any related rows from payment_history for this workshop user. We try
  // both auth-user-id and workshop email/mobile to capture every transaction.
  const [payments, setPayments] = useState<Payment[]>([]);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const ors: string[] = [];
      if (user?.auth_user_id) ors.push(`user_id.eq.${user.auth_user_id}`);
      if (user?.email) ors.push(`description.ilike.%${user.email}%`);
      let query: any = supabase
        .from("payment_history")
        .select("id, payment_type, razorpay_payment_id, razorpay_order_id, amount, status, description, created_at")
        .order("created_at", { ascending: false });
      if (ors.length > 0) query = query.or(ors.join(","));
      const { data } = await query;
      if (!cancelled && Array.isArray(data)) setPayments(data as Payment[]);
    };
    load();
    return () => { cancelled = true; };
  }, [user?.auth_user_id, user?.email]);

  return (
    <div className="space-y-5">
      {/* HERO — booking-dashboard parity (white 3D, primary/accent orbs) */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="relative" style={{ perspective: 1200 }}>
          <div className="absolute inset-x-3 -bottom-2 top-3 rounded-3xl bg-primary/10 blur-2xl pointer-events-none" />
          <div
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card to-secondary/40 border border-border/50 p-5 sm:p-6 shadow-[0_20px_50px_-12px_hsl(var(--primary)/0.28),0_4px_12px_-4px_rgba(0,0,0,0.08)]"
            style={{ transformStyle: "preserve-3d" }}
          >
            <div className="absolute -top-16 -right-12 w-52 h-52 rounded-full bg-primary/25 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-14 w-60 h-60 rounded-full bg-accent/25 blur-3xl pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

            <div className="relative">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5">
                <Wallet className="w-3 h-3 text-primary" />
                <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-primary font-bold">
                  Workshop Payments
                </p>
              </div>
              <h2 className="mt-3 font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
                Your fee status
              </h2>
              <div className="mt-4 flex items-end gap-2">
                <p className="font-display text-5xl font-bold leading-none bg-gradient-to-br from-foreground via-foreground to-primary bg-clip-text text-transparent">
                  ₹{amount.toLocaleString("en-IN")}
                </p>
                <p className="pb-2 text-xs text-muted-foreground font-sans">total fee</p>
              </div>
              <div className="mt-3">
                <Badge className={`border-0 text-[11px] font-bold px-3 py-1 ${statusBadge.className}`}>
                  {statusBadge.label}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Payment summary card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-3xl border border-border/50 p-5 bg-card shadow-[0_10px_30px_-15px_hsl(var(--primary)/0.18)]"
      >
        <h3 className="font-bold text-base mb-3 flex items-center gap-2 text-foreground">
          <Receipt className="w-4 h-4 text-primary" /> Payment summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
          <Cell
            icon={IndianRupee}
            label="Amount"
            value={amount ? `₹${amount.toLocaleString("en-IN")}` : "—"}
          />
          <Cell
            icon={paid ? BadgeCheck : Clock}
            label="Status"
            value={statusBadge.label}
          />
        </div>
        {(paymentId || orderId) && (
          <div className="mt-3 rounded-xl bg-secondary/40 border border-border/50 p-3 space-y-2 text-xs font-sans">
            {paymentId && (
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                  <Hash className="w-3 h-3" /> Payment ID
                </span>
                <span className="font-mono text-foreground break-all text-right">{paymentId}</span>
              </div>
            )}
            {orderId && (
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                  <Hash className="w-3 h-3" /> Order Ref
                </span>
                <span className="font-mono text-foreground break-all text-right">{orderId}</span>
              </div>
            )}
          </div>
        )}
        {!paid && !partial && (
          <p className="mt-4 text-xs font-sans text-muted-foreground">
            Your payment status will update automatically once confirmed by the admin team.
          </p>
        )}
      </motion.div>

      {/* Per-transaction history — mirrors booking PaymentHistory cards */}
      {payments.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display text-xl font-bold text-foreground">Payment History</h3>
          {payments.map((p) => (
            <Card key={p.id} className="rounded-2xl border-border/50 shadow-[0_8px_24px_-16px_hsl(var(--primary)/0.2)]">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <p className="font-sans font-bold text-sm text-foreground truncate">
                      {p.description || PAYMENT_TYPE_LABELS[p.payment_type] || p.payment_type}
                    </p>
                    <p className="text-xs text-muted-foreground font-sans">{formatDateTime(p.created_at)}</p>
                  </div>
                  <p className="font-display text-lg font-bold text-primary whitespace-nowrap">
                    ₹{Number(p.amount || 0).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-emerald-100 text-emerald-800 border-none text-xs">
                    <CreditCard className="w-3 h-3 mr-1" />
                    {p.status === "confirmed" || p.status === "success" ? "Paid ✅" : p.status}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {PAYMENT_TYPE_LABELS[p.payment_type] || p.payment_type}
                  </Badge>
                </div>
                {p.razorpay_payment_id && (
                  <div className="bg-secondary/40 rounded-lg p-2 space-y-1 text-xs font-sans border border-border/50">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Payment ID</span>
                      <span className="font-mono break-all text-right text-foreground">{p.razorpay_payment_id}</span>
                    </div>
                    {p.razorpay_order_id && (
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Order Ref</span>
                        <span className="font-mono break-all text-right text-foreground">{p.razorpay_order_id}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Help card — match booking PaymentHistory tone */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-3xl border border-primary/30 bg-primary/5 p-5"
      >
        <h3 className="font-bold text-base flex items-center gap-2 text-foreground">
          <Wallet className="w-4 h-4 text-primary" /> Need help with your payment?
        </h3>
        <p className="text-sm font-sans text-muted-foreground mt-1">
          For invoices, partial-payment plans, or refund queries, reach out to our team — we'll sort it out within
          one working day.
        </p>
      </motion.div>
    </div>
  );
};

const Cell = ({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: any;
  label: string;
  value: string;
  mono?: boolean;
}) => (
  <div className="rounded-xl bg-secondary/40 border border-border/50 p-3 shadow-sm">
    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
      <Icon className="w-3 h-3" /> {label}
    </p>
    <p className={`text-sm font-bold mt-1 text-foreground break-all ${mono ? "font-mono" : ""}`}>{value}</p>
  </div>
);

export default WorkshopPayments;
