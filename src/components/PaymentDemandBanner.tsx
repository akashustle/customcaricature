/**
 * PaymentDemandBanner — surfaces unpaid `payment_demands` raised by an admin
 * for one of the user's events. Lets the user pay via Razorpay directly from
 * the dashboard. On success, the demand is marked paid (server-side) and the
 * event's payment_status is updated to whatever the admin chose.
 */
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/pricing";
import { createRazorpayOrder, initRazorpay } from "@/lib/razorpay";
import { Bell, CreditCard, Loader2, Sparkles } from "lucide-react";

type Demand = {
  id: string;
  event_id: string;
  amount: number;
  note: string | null;
  status_on_paid: string | null;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
};

type EventLite = {
  id: string;
  client_name: string;
  client_email: string;
  client_mobile: string;
  event_type: string;
  event_date: string;
  user_id: string | null;
};

interface Props {
  userId: string;
  events: EventLite[];
}

const PaymentDemandBanner = ({ userId, events }: Props) => {
  const [demands, setDemands] = useState<Demand[]>([]);
  const [paying, setPaying] = useState<string | null>(null);

  const eventMap = useMemo(() => {
    const m = new Map<string, EventLite>();
    events.forEach((e) => m.set(e.id, e));
    return m;
  }, [events]);

  // Only demands for events that belong to this user.
  const eventIdsKey = useMemo(() => events.map((e) => e.id).sort().join("|"), [events]);

  useEffect(() => {
    const myEventIds = eventIdsKey ? eventIdsKey.split("|") : [];
    if (!userId || myEventIds.length === 0) { setDemands([]); return; }
    let cancelled = false;

    const fetchDemands = async () => {
      const { data } = await supabase
        .from("payment_demands" as any)
        .select("*")
        .in("event_id", myEventIds)
        .eq("is_paid", false)
        .order("created_at", { ascending: false });
      if (!cancelled && data) setDemands(data as any);
    };
    fetchDemands();

    // Realtime: instantly reflect admin creating/updating a demand.
    const channel = supabase
      .channel(`payment-demands-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_demands" }, fetchDemands)
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [userId, eventIdsKey]);

  const handlePay = async (demand: Demand) => {
    const ev = eventMap.get(demand.event_id);
    if (!ev) {
      toast({ title: "Event not found", description: "Refresh the page and try again.", variant: "destructive" });
      return;
    }
    setPaying(demand.id);
    try {
      const rzp = await createRazorpayOrder(supabase, {
        amount: Number(demand.amount),
        order_id: ev.id,
        customer_name: ev.client_name,
        customer_email: ev.client_email,
        customer_mobile: ev.client_mobile,
      });

      await initRazorpay({
        key: rzp.razorpay_key_id,
        amount: rzp.amount,
        currency: rzp.currency,
        name: "Creative Caricature Club™",
        description: demand.note || `Payment request for ${ev.event_type} event`,
        order_id: rzp.razorpay_order_id,
        prefill: { name: ev.client_name, email: ev.client_email, contact: ev.client_mobile },
        theme: { color: "#8B5CF6" },
        handler: async (response: any) => {
          try {
            const { data, error } = await supabase.functions.invoke("verify-razorpay-payment", {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                order_id: ev.id,
                is_demand_payment: true,
                demand_id: demand.id,
                amount: Number(demand.amount),
              },
            });
            if (error || !data?.success) throw new Error(data?.error || error?.message || "Verification failed");
            toast({ title: "Payment received 🎉", description: "Thanks! Your payment has been recorded." });
          } catch (err: any) {
            toast({ title: "Verification issue", description: err.message || "Contact support if amount was deducted.", variant: "destructive" });
          } finally {
            setPaying(null);
          }
        },
        modal: { ondismiss: () => setPaying(null) },
      });
    } catch (e: any) {
      toast({ title: "Couldn't start payment", description: e.message || "Please try again.", variant: "destructive" });
      setPaying(null);
    }
  };

  if (demands.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      <AnimatePresence>
        {demands.map((d, i) => {
          const ev = eventMap.get(d.event_id);
          return (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: -10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, height: 0 }}
              transition={{ delay: i * 0.06 }}
              className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/8 via-primary/5 to-transparent backdrop-blur"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-primary/60" />
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary/15 blur-2xl pointer-events-none" />
              <div className="relative p-3.5 pl-5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-primary font-sans">
                      <Sparkles className="w-3 h-3" /> Payment requested
                    </span>
                    {ev && (
                      <span className="text-[10px] text-muted-foreground font-sans bg-card border border-border px-2 py-0.5 rounded-full">
                        {ev.event_type} · {new Date(ev.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-sans font-semibold text-foreground mt-0.5 leading-tight break-words">
                    {d.note || "Admin has requested an additional payment for your event."}
                  </p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="font-display text-2xl font-bold text-primary">{formatPrice(Number(d.amount))}</span>
                    <span className="text-[10px] text-muted-foreground font-sans">due now</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-sans shadow-md flex-shrink-0"
                  onClick={() => handlePay(d)}
                  disabled={paying === d.id}
                >
                  {paying === d.id ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Processing…</>
                  ) : (
                    <><CreditCard className="w-3.5 h-3.5 mr-1" /> Pay Now</>
                  )}
                </Button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default PaymentDemandBanner;
