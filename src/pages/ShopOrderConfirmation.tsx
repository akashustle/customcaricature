import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/pricing";
import { CheckCircle, Package, ArrowRight, Home, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import CelebrationBanner from "@/components/CelebrationBanner";

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
    <div className="min-h-screen bg-background pb-20">
      <SEOHead title="Order Confirmed | CCC Shop" description="Your order has been placed successfully" />
      <div className="max-w-lg mx-auto p-4 space-y-4 pt-8">
        <CelebrationBanner message="🎉 Order Placed Successfully! 🛍️" />
        
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <Card>
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="font-display text-2xl font-bold">Thank You!</h1>
              <p className="text-sm text-muted-foreground font-sans">Your order has been placed and {order.payment_status === "paid" ? "payment confirmed" : "is awaiting payment"}.</p>
              
              <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
                <div className="flex justify-between text-sm font-sans">
                  <span className="text-muted-foreground">Order Number</span>
                  <span className="font-mono font-bold">{order.order_number}</span>
                </div>
                <div className="flex justify-between text-sm font-sans">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="font-display font-bold text-primary">{formatPrice(order.total_amount)}</span>
                </div>
                <div className="flex justify-between text-sm font-sans">
                  <span className="text-muted-foreground">Payment</span>
                  <Badge variant={order.payment_status === "paid" ? "default" : "secondary"} className="text-xs">{order.payment_status === "paid" ? "✅ Paid" : "Pending"}</Badge>
                </div>
                <div className="flex justify-between text-sm font-sans">
                  <span className="text-muted-foreground">Status</span>
                  <Badge className="text-xs capitalize">{order.status}</Badge>
                </div>
              </div>

              {/* Items */}
              <div className="text-left space-y-2">
                <p className="font-sans font-semibold text-sm">Items Ordered:</p>
                {items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm font-sans py-1 border-b border-border last:border-0">
                    <span>{item.product_name} × {item.quantity}</span>
                    <span className="font-medium">{formatPrice(item.unit_price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              {/* Shipping */}
              <div className="text-left bg-muted/50 rounded-lg p-3 space-y-1">
                <p className="font-sans font-semibold text-sm">Shipping To:</p>
                <p className="text-sm font-sans text-muted-foreground">{order.shipping_name}</p>
                <p className="text-xs font-sans text-muted-foreground">{order.shipping_address}, {order.shipping_city}, {order.shipping_state} - {order.shipping_pincode}</p>
                <p className="text-xs font-sans text-muted-foreground">📱 {order.shipping_mobile}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 rounded-full" onClick={() => navigate("/shop")}>
            <Package className="w-4 h-4 mr-2" />Continue Shopping
          </Button>
          <Button className="flex-1 rounded-full" onClick={() => navigate("/dashboard")}>
            <ArrowRight className="w-4 h-4 mr-2" />My Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ShopOrderConfirmation;
