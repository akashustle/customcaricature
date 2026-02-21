import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/pricing";
import { CheckCircle2, Circle, CreditCard, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";

declare global {
  interface Window { Razorpay: any; }
}

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
  const [partialConfig, setPartialConfig] = useState<any>(null);
  const [paying, setPaying] = useState(false);

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
    // Fetch partial config
    supabase.from("user_partial_advance_config").select("*").eq("user_id", userId).maybeSingle()
      .then(({ data }) => { if (data) setPartialConfig(data); });

    const ch = supabase
      .channel(`payment-tracker-${bookingId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_history", filter: `booking_id=eq.${bookingId}` }, () => fetchPayments())
      .on("postgres_changes", { event: "*", schema: "public", table: "event_bookings", filter: `id=eq.${bookingId}` }, () => fetchPayments())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [bookingId, userId]);

  const isPartialEnabled = partialConfig?.enabled && partialConfig?.partial_1_amount > 0;
  const isPartial1Paid = paymentStatus === "partial_1_paid";
  const fullyPaid = paymentStatus === "fully_paid";
  const advancePaid = paymentStatus === "confirmed" || fullyPaid;
  const paidTotal = payments.reduce((sum, p) => sum + p.amount, 0);
  const progressPercent = totalAmount > 0 ? Math.min(100, Math.round((paidTotal / totalAmount) * 100)) : 0;
  const remaining = Math.max(0, totalAmount - paidTotal);

  const handlePayPartial2 = async () => {
    if (!partialConfig) return;
    setPaying(true);
    try {
      const { data: booking } = await supabase.from("event_bookings").select("client_name, client_email, client_mobile").eq("id", bookingId).single();
      if (!booking) throw new Error("Booking not found");

      const amount = partialConfig.partial_2_amount;
      const { data: rzpData, error: rzpError } = await supabase.functions.invoke("create-razorpay-order", {
        body: { amount, order_id: bookingId, customer_name: booking.client_name, customer_email: booking.client_email, customer_mobile: booking.client_mobile },
      });
      if (rzpError || !rzpData?.razorpay_order_id) throw new Error("Payment creation failed");

      const options = {
        key: rzpData.razorpay_key_id, amount: rzpData.amount, currency: rzpData.currency,
        name: "Creative Caricature Club", description: "Remaining Advance Payment",
        image: "/logo.png", order_id: rzpData.razorpay_order_id,
        handler: async (response: any) => {
          try {
            await supabase.functions.invoke("verify-razorpay-payment", {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                order_id: bookingId,
                is_event_advance: true,
                advance_amount: amount,
                is_partial_advance: true,
                partial_number: 2,
              },
            });
            toast({ title: "✅ Advance Payment Completed!" });
            fetchPayments();
          } catch {
            toast({ title: "Verification failed", variant: "destructive" });
          }
          setPaying(false);
        },
        prefill: { name: booking.client_name, email: booking.client_email, contact: `+91${booking.client_mobile}` },
        theme: { color: "#E3DED3" },
        modal: { ondismiss: () => setPaying(false) },
      };
      new window.Razorpay(options).open();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setPaying(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-3">
      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
    </div>
  );

  // Build steps based on partial config
  const steps = isPartialEnabled
    ? [
        { label: "Booking Created", done: true },
        { label: "Partial Payment 1", done: isPartial1Paid || advancePaid },
        { label: "Partial Payment 2", done: advancePaid },
        { label: "Remaining Payment", done: fullyPaid },
        { label: "Fully Settled", done: fullyPaid },
      ]
    : [
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

        {/* Partial Payment 2 Button */}
        {isPartialEnabled && isPartial1Paid && !advancePaid && (
          <Button
            onClick={handlePayPartial2}
            disabled={paying}
            className="w-full rounded-full font-sans bg-primary hover:bg-primary/90 text-sm"
            size="sm"
          >
            {paying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : `Pay Remaining Advance – ${formatPrice(partialConfig.partial_2_amount)}`}
          </Button>
        )}

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
                      {p.payment_type === "event_advance" ? "Advance"
                        : p.payment_type === "event_partial_1" || p.payment_type === "event_advance_partial_1" ? "Partial 1"
                        : p.payment_type === "event_partial_2" || p.payment_type === "event_advance_partial_2" ? "Partial 2"
                        : p.payment_type === "event_remaining" ? "Remaining"
                        : p.payment_type}
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
