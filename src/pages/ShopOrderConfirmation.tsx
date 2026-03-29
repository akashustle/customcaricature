import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/pricing";
import { CheckCircle, Package, ArrowRight, Loader2, Sparkles, PartyPopper, MapPin, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import { playPaymentSuccessSound } from "@/lib/sounds";

const confettiColors = ["hsl(var(--primary))", "hsl(142 76% 50%)", "hsl(45 93% 58%)", "hsl(280 87% 65%)", "hsl(199 89% 48%)", "hsl(350 80% 60%)"];

const ShopOrderConfirmation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const orderId = searchParams.get("order_id");
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) { navigate("/shop"); return; }
    fetchOrder();
    playPaymentSuccessSound();
  }, [orderId]);

  const fetchOrder = async () => {
    const { data: o } = await supabase.from("shop_orders").select("*").eq("id", orderId).maybeSingle();
    if (o) {
      setOrder(o);
      const { data: oi } = await supabase.from("shop_order_items").select("*").eq("order_id", o.id);
      if (oi) setItems(oi);
    }
    setLoading(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!order) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Order not found</p></div>;

  return (
    <div className="min-h-screen bg-background pb-20 relative overflow-hidden">
      <SEOHead title="Order Confirmed | CCC Shop" description="Your order has been placed successfully" />

      {/* Confetti */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-sm"
          style={{
            width: 6 + Math.random() * 6, height: 6 + Math.random() * 6,
            background: confettiColors[i % confettiColors.length],
            left: `${5 + Math.random() * 90}%`, top: "-5%",
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
          }}
          animate={{ y: ["0vh", "110vh"], x: [0, (Math.random() - 0.5) * 200], rotate: [0, 360], opacity: [1, 1, 0] }}
          transition={{ duration: 2.5 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 3, ease: "easeIn" }}
        />
      ))}

      <div className="max-w-lg mx-auto p-4 space-y-4 pt-8 relative z-10">
        <motion.div initial={{ opacity: 0, scale: 0.8, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", bounce: 0.35, duration: 0.7 }}>
          <Card className="border-0 shadow-2xl overflow-hidden">
            {/* Header */}
            <motion.div
              className="relative h-32 flex items-center justify-center overflow-hidden"
              style={{ background: "linear-gradient(135deg, hsl(142 76% 36%), hsl(199 89% 38%), hsl(168 65% 38%))" }}
            >
              <motion.div className="absolute inset-0" style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)" }} animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }} />
              <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.3, type: "spring", bounce: 0.5 }}>
                <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center ring-4 ring-white/10">
                  <CheckCircle className="w-12 h-12 text-white drop-shadow-lg" />
                </div>
                <motion.div className="absolute inset-0 rounded-full border-2 border-white/30" animate={{ scale: [1, 1.6], opacity: [0.6, 0] }} transition={{ duration: 1.5, repeat: Infinity }} />
              </motion.div>
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="absolute top-3 left-3"><PartyPopper className="w-6 h-6 text-white/60" /></motion.div>
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }} className="absolute top-3 right-3"><Sparkles className="w-6 h-6 text-white/60" /></motion.div>
            </motion.div>

            <CardContent className="p-6 text-center -mt-4 relative">
              <div className="bg-background rounded-2xl p-6 shadow-inner border border-border/50 space-y-4">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                  <h1 className="font-display text-2xl font-bold">Order Placed! 🛍️</h1>
                  <p className="text-sm text-muted-foreground font-sans mt-1">
                    {order.payment_status === "paid" ? "Payment confirmed — your order is on its way!" : "Order saved — complete payment to process."}
                  </p>
                </motion.div>

                {/* Order details */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="rounded-xl p-4 text-left space-y-2 border border-border bg-muted/30">
                  <div className="flex justify-between text-sm font-sans">
                    <span className="text-muted-foreground">Order Number</span>
                    <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{order.order_number}</span>
                  </div>
                  <div className="flex justify-between text-sm font-sans">
                    <span className="text-muted-foreground">Total Amount</span>
                    <span className="font-display font-bold text-primary">{formatPrice(order.total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-sans items-center">
                    <span className="text-muted-foreground">Payment</span>
                    <Badge variant={order.payment_status === "paid" ? "default" : "secondary"} className="text-xs">{order.payment_status === "paid" ? "✅ Paid" : "Pending"}</Badge>
                  </div>
                  <div className="flex justify-between text-sm font-sans items-center">
                    <span className="text-muted-foreground">Status</span>
                    <Badge className="text-xs capitalize">{order.status}</Badge>
                  </div>
                </motion.div>

                {/* Items */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="text-left space-y-2">
                  <p className="font-sans font-semibold text-sm flex items-center gap-1.5"><ShoppingBag className="w-4 h-4" /> Items Ordered</p>
                  {items.map((item, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 + i * 0.05 }} className="flex justify-between text-sm font-sans py-1.5 border-b border-border last:border-0">
                      <span>{item.product_name} × {item.quantity}</span>
                      <span className="font-medium">{formatPrice(item.unit_price * item.quantity)}</span>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Shipping */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="text-left rounded-xl p-3 space-y-1 border border-border bg-muted/30">
                  <p className="font-sans font-semibold text-sm flex items-center gap-1.5"><MapPin className="w-4 h-4" /> Shipping To</p>
                  <p className="text-sm font-sans text-muted-foreground">{order.shipping_name}</p>
                  <p className="text-xs font-sans text-muted-foreground">{order.shipping_address}, {order.shipping_city}, {order.shipping_state} - {order.shipping_pincode}</p>
                  <p className="text-xs font-sans text-muted-foreground">📱 {order.shipping_mobile}</p>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="flex gap-3">
          <Button variant="outline" className="flex-1 rounded-full" onClick={() => navigate("/shop")}>
            <Package className="w-4 h-4 mr-2" />Continue Shopping
          </Button>
          <Button className="flex-1 rounded-full shadow-lg" onClick={() => navigate("/dashboard")}>
            <ArrowRight className="w-4 h-4 mr-2" />My Dashboard
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default ShopOrderConfirmation;
