import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/pricing";
import { AlertTriangle, X, CreditCard, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  userId: string;
  onPayOrder?: (order: any) => void;
  onPayEvent?: (event: any) => void;
}

const PaymentReminderBanner = ({ userId, onPayOrder, onPayEvent }: Props) => {
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [pendingEvents, setPendingEvents] = useState<any[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchPending = async () => {
      const [{ data: orders }, { data: events }] = await Promise.all([
        supabase.from("orders").select("id, customer_name, amount, status, payment_status, order_type, created_at").eq("user_id", userId).or("payment_status.eq.pending,payment_status.is.null"),
        supabase.from("event_bookings").select("id, client_name, advance_amount, total_price, payment_status, event_type, event_date").eq("user_id", userId).in("payment_status", ["pending", "partial_1_pending"]),
      ]);
      if (orders) setPendingOrders(orders);
      if (events) setPendingEvents(events);
    };
    fetchPending();
  }, [userId]);

  const items = [
    ...pendingOrders.filter(o => !dismissed.has(o.id)).map(o => ({
      id: o.id, type: "order" as const,
      title: `Complete payment for ${o.order_type} caricature`,
      amount: o.amount, date: o.created_at, data: o,
    })),
    ...pendingEvents.filter(e => !dismissed.has(e.id)).map(e => ({
      id: e.id, type: "event" as const,
      title: `Pay advance for ${e.event_type} event on ${new Date(e.event_date).toLocaleDateString()}`,
      amount: e.advance_amount, date: e.event_date, data: e,
    })),
  ];

  if (items.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      <AnimatePresence>
        {items.slice(0, 3).map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, height: 0 }}
            transition={{ delay: i * 0.08 }}
            className="relative overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-400 to-orange-500" />
            <div className="p-3 pl-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium font-sans text-amber-900 truncate">{item.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-lg font-bold font-display text-amber-700">{formatPrice(item.amount)}</span>
                  <span className="text-[10px] text-amber-600/70 flex items-center gap-1 font-sans">
                    <Clock className="w-3 h-3" />pending
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  className="rounded-full font-sans bg-amber-600 hover:bg-amber-700 text-white text-xs px-3 h-8"
                  onClick={() => {
                    if (item.type === "order" && onPayOrder) onPayOrder(item.data);
                    if (item.type === "event" && onPayEvent) onPayEvent(item.data);
                  }}
                >
                  <CreditCard className="w-3 h-3 mr-1" />Pay Now
                </Button>
                <button onClick={() => setDismissed(prev => new Set([...prev, item.id]))} className="p-1 rounded-full hover:bg-amber-200/50 transition-colors">
                  <X className="w-3.5 h-3.5 text-amber-500" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default PaymentReminderBanner;
