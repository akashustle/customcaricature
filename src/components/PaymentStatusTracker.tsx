import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatPrice } from "@/lib/pricing";
import { CheckCircle2, Circle, CreditCard, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PaymentStatusTrackerProps {
  bookingId: string;
  totalAmount: number;
  advanceAmount: number;
  paymentStatus: string;
  userId: string;
}

type PaymentRecord = {
  id: string;
  amount: number;
  payment_type: string;
  status: string;
  created_at: string;
  razorpay_payment_id: string | null;
};

const PaymentStatusTracker = ({ bookingId, totalAmount, advanceAmount, paymentStatus, userId }: PaymentStatusTrackerProps) => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = async () => {
    const { data } = await supabase
      .from("payment_history")
      .select("id, amount, payment_type, status, created_at, razorpay_payment_id")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true });
    if (data) setPayments(data as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchPayments();
    const ch = supabase
      .channel(`payment-tracker-${bookingId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_history", filter: `booking_id=eq.${bookingId}` }, () => fetchPayments())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [bookingId]);

  const fullyPaid = paymentStatus === "fully_paid";
  const advancePaid = paymentStatus === "confirmed" || fullyPaid;
  const paidTotal = payments.reduce((sum, p) => sum + p.amount, 0);
  const progressPercent = totalAmount > 0 ? Math.min(100, Math.round((paidTotal / totalAmount) * 100)) : 0;
  const remaining = Math.max(0, totalAmount - paidTotal);

  if (loading) return (
    <div className="flex items-center justify-center py-3">
      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
    </div>
  );

  const steps = [
    { label: "Booking Created", done: true },
    { label: "Advance Payment", done: advancePaid },
    { label: "Remaining Payment", done: fullyPaid },
    { label: "Fully Settled", done: fullyPaid },
  ];

  return (
    <Card className="border-primary/10">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary" />
          <p className="text-xs font-semibold font-sans uppercase tracking-wide text-muted-foreground">Payment Tracker</p>
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <Progress value={progressPercent} className="h-2.5" />
          <div className="flex justify-between text-[10px] font-sans">
            <span className="text-green-600 font-medium">Paid: {formatPrice(paidTotal)}</span>
            {!fullyPaid && <span className="text-amber-600">Remaining: {formatPrice(remaining)}</span>}
            {fullyPaid && <span className="text-green-600 font-bold">✅ Fully Paid</span>}
          </div>
        </div>

        {/* Steps */}
        <div className="flex items-start justify-between relative">
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted z-0" />
          {steps.map((step, i) => (
            <div key={step.label} className="flex flex-col items-center gap-1 relative z-10" style={{ flex: 1 }}>
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className={`w-8 h-8 rounded-full flex items-center justify-center ${step.done ? "bg-green-100" : "bg-card border border-border"}`}
              >
                {step.done ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground" />
                )}
              </motion.div>
              <span className={`text-[8px] font-sans text-center leading-tight ${step.done ? "text-green-700 font-medium" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Payment history */}
        <AnimatePresence>
          {payments.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1.5 border-t border-border pt-2">
              <p className="text-[10px] font-sans text-muted-foreground font-medium">Transaction History</p>
              {payments.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between text-[11px] font-sans bg-muted/30 rounded-md px-2 py-1.5"
                >
                  <div>
                    <span className="font-medium">
                      {p.payment_type === "event_advance" ? "Advance" : p.payment_type === "event_remaining" ? "Remaining" : p.payment_type}
                    </span>
                    <span className="text-muted-foreground ml-1">
                      · {new Date(p.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </span>
                  </div>
                  <span className="font-bold text-green-700">{formatPrice(p.amount)}</span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

export default PaymentStatusTracker;
