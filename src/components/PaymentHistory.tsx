import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/pricing";
import { CreditCard, Receipt } from "lucide-react";

type Payment = {
  id: string;
  payment_type: string;
  razorpay_payment_id: string | null;
  razorpay_order_id: string | null;
  amount: number;
  status: string;
  description: string | null;
  created_at: string;
  order_id: string | null;
  booking_id: string | null;
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  order: "Caricature Order",
  event_advance: "Event Advance",
  event_remaining: "Event Remaining",
  event_advance_partial_1: "Partial Advance 1",
  event_advance_partial_2: "Partial Advance 2",
};

const PaymentHistory = ({ userId }: { userId: string }) => {
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    fetchPayments();
    const channel = supabase
      .channel(`payment-history-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_history", filter: `user_id=eq.${userId}` }, () => fetchPayments())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const fetchPayments = async () => {
    const { data } = await supabase
      .from("payment_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }) as any;
    if (data) setPayments(data);
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
    });
  };

  if (payments.length === 0) {
    return (
      <Card><CardContent className="p-8 text-center">
        <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="font-sans text-muted-foreground">No payment history yet</p>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="font-display text-xl font-bold">Payment History</h2>
      {payments.map((p) => (
        <Card key={p.id}>
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-sans font-medium text-sm">{p.description || PAYMENT_TYPE_LABELS[p.payment_type] || p.payment_type}</p>
                <p className="text-xs text-muted-foreground font-sans">{formatDateTime(p.created_at)}</p>
              </div>
              <p className="font-display text-lg font-bold text-primary">{formatPrice(p.amount)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-green-100 text-green-800 border-none text-xs">
                <CreditCard className="w-3 h-3 mr-1" />{p.status === "confirmed" ? "Paid ✅" : p.status}
              </Badge>
              <Badge variant="outline" className="text-xs">{PAYMENT_TYPE_LABELS[p.payment_type] || p.payment_type}</Badge>
            </div>
            {p.razorpay_payment_id && (
              <div className="bg-muted/50 rounded-lg p-2 space-y-1 text-xs font-sans">
                <div className="flex justify-between"><span className="text-muted-foreground">Payment ID</span><span className="font-mono">{p.razorpay_payment_id}</span></div>
                {p.razorpay_order_id && <div className="flex justify-between"><span className="text-muted-foreground">Order Ref</span><span className="font-mono">{p.razorpay_order_id}</span></div>}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PaymentHistory;
