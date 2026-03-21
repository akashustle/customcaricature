import { useState } from "react";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPrice } from "@/lib/pricing";
import { toast } from "@/hooks/use-toast";
import { Search, Package, ArrowLeft, Clock, CreditCard, Truck, CheckCircle, Loader2, Store } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { motion } from "framer-motion";

const ORDER_STATUS_STEPS = [
  { key: "new", label: "Order Placed", icon: Package },
  { key: "in_progress", label: "In Progress", icon: Clock },
  { key: "artwork_ready", label: "Artwork Ready", icon: CheckCircle },
  { key: "dispatched", label: "Dispatched", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle },
];

const SHOP_STATUS_STEPS = [
  { key: "pending", label: "Order Placed", icon: Package },
  { key: "processing", label: "Processing", icon: Clock },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle },
];

const ORDER_STATUS_INDEX: Record<string, number> = {
  new: 0, in_progress: 1, artwork_ready: 2, dispatched: 3, delivered: 4, completed: 4,
};

const SHOP_STATUS_INDEX: Record<string, number> = {
  pending: 0, processing: 1, shipped: 2, delivered: 3,
};

type TrackedOrder = {
  id: string; order_type: string; style: string; amount: number; status: string;
  payment_status: string | null; created_at: string; expected_delivery_date: string | null;
  face_count: number; updated_at: string;
};

type TrackedShopOrder = {
  id: string; order_number: string; total_amount: number; status: string;
  payment_status: string; shipping_name: string; shipping_city: string;
  shipping_state: string; created_at: string; updated_at: string;
};

const TrackOrder = () => {
  const navigate = useNavigate();
  const { settings: siteSettings } = useSiteSettings();
  const [orderId, setOrderId] = useState("");
  const [verifyContact, setVerifyContact] = useState("");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [shopOrder, setShopOrder] = useState<TrackedShopOrder | null>(null);
  const [shopItems, setShopItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [trackType, setTrackType] = useState<"custom" | "shop">("custom");
  const shopTrackingVisible = (siteSettings as any).shop_tracking_visible?.enabled !== false;

  const handleTrackCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim() || !verifyContact.trim()) return;
    setLoading(true); setSearched(true); setOrder(null);

    const { data, error } = await supabase.rpc("track_order", { order_id_input: orderId.trim().toLowerCase(), customer_verify: verifyContact.trim() });
    if (error || !data || (Array.isArray(data) && data.length === 0)) {
      toast({ title: "Order Not Found", description: "Please check your Order ID and try again.", variant: "destructive" });
    } else {
      setOrder((Array.isArray(data) ? data[0] : data) as TrackedOrder);
    }
    setLoading(false);
  };

  const handleTrackShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim() || !verifyContact.trim()) return;
    setLoading(true); setSearched(true); setShopOrder(null); setShopItems([]);

    const searchTerm = orderId.trim();
    // Try by order_number or first 8 chars of id
    let query = supabase.from("shop_orders").select("*");
    if (searchTerm.toUpperCase().startsWith("SHOP-")) {
      query = query.eq("order_number", searchTerm.toUpperCase());
    } else {
      query = query.or(`id.eq.${searchTerm},order_number.ilike.%${searchTerm}%`);
    }
    const { data } = await query.limit(1);

    if (data && data.length > 0) {
      const so = data[0];
      // Verify contact
      if (so.shipping_mobile === verifyContact.trim() || so.shipping_name?.toLowerCase().includes(verifyContact.trim().toLowerCase())) {
        setShopOrder(so as TrackedShopOrder);
        const { data: items } = await supabase.from("shop_order_items").select("*").eq("order_id", so.id);
        if (items) setShopItems(items);
      } else {
        toast({ title: "Verification Failed", description: "Contact info doesn't match this order.", variant: "destructive" });
      }
    } else {
      toast({ title: "Order Not Found", variant: "destructive" });
    }
    setLoading(false);
  };

  const getDeliveryDate = (order: TrackedOrder) => {
    if (order.expected_delivery_date) return new Date(order.expected_delivery_date);
    const d = new Date(order.created_at); d.setDate(d.getDate() + 30); return d;
  };

  const currentStep = order ? (ORDER_STATUS_INDEX[order.status] ?? 0) : 0;
  const shopStep = shopOrder ? (SHOP_STATUS_INDEX[shopOrder.status] ?? 0) : 0;

  return (
    <div className="min-h-screen brand-gradient-bg pb-16 md:pb-0">
      <SEOHead title="Track Your Caricature Order" description="Track the status of your custom caricature order or shop order. Get real-time updates on production progress and delivery." canonical="/track-order" />
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-full"><ArrowLeft className="w-5 h-5" /></Button>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <img src="/logo.png" alt="CCC" className="w-8 h-8 rounded-full shadow-3d" />
            <h1 className="font-calligraphy text-lg font-bold text-3d">Track Your Order</h1>
          </div>
        </div>
      </header>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }} className="container mx-auto px-4 py-8 max-w-lg">
        <Tabs value={trackType} onValueChange={(v) => { setTrackType(v as any); setOrder(null); setShopOrder(null); setSearched(false); }}>
          {shopTrackingVisible && (
            <TabsList className="w-full mb-4">
              <TabsTrigger value="custom" className="flex-1 font-sans"><Package className="w-4 h-4 mr-1" />Custom Order</TabsTrigger>
              <TabsTrigger value="shop" className="flex-1 font-sans"><Store className="w-4 h-4 mr-1" />Shop Order</TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="custom">
            <Card>
              <CardHeader className="text-center">
                <Package className="w-12 h-12 text-primary mx-auto mb-2" />
                <CardTitle className="font-display text-xl">Track Custom Order</CardTitle>
                <CardDescription className="font-sans">Enter your Order ID to check status</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTrackCustom} className="space-y-3">
                  <Input value={orderId} onChange={e => setOrderId(e.target.value)} placeholder="Enter Order ID (e.g. A1B2C3D4)" className="font-mono" />
                  <Input value={verifyContact} onChange={e => setVerifyContact(e.target.value)} placeholder="Your email or mobile number" className="font-sans" />
                  <Button type="submit" className="w-full" disabled={loading || !orderId.trim() || !verifyContact.trim()}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}Track Order
                  </Button>
                </form>
              </CardContent>
            </Card>

            {order && (
              <Card className="mt-6"><CardContent className="p-6 space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</p>
                    <p className="font-sans font-semibold capitalize">{order.order_type} Caricature — {order.style}</p>
                    <p className="text-xs text-muted-foreground font-sans">Ordered: {new Date(order.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                  </div>
                  <p className="font-display text-lg font-bold text-primary">{formatPrice(order.amount)}</p>
                </div>
                <Badge className={`${order.payment_status === "confirmed" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"} border-none text-xs`}>
                  <CreditCard className="w-3 h-3 mr-1" />Payment: {order.payment_status === "confirmed" ? "Confirmed ✅" : "Pending"}
                </Badge>
                <div className="space-y-4">
                  <p className="font-sans font-semibold text-sm">Order Progress</p>
                  {ORDER_STATUS_STEPS.map((step, i) => {
                    const isCompleted = i <= currentStep, isCurrent = i === currentStep;
                    return (
                      <div key={step.key} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isCompleted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"} ${isCurrent ? "ring-2 ring-primary ring-offset-2" : ""}`}>
                          <step.icon className="w-4 h-4" />
                        </div>
                        <p className={`font-sans text-sm flex-1 ${isCompleted ? "font-semibold" : "text-muted-foreground"}`}>{step.label}</p>
                        {isCurrent && <Badge className="bg-primary/10 text-primary border-none text-xs">Current</Badge>}
                      </div>
                    );
                  })}
                </div>
                {["delivered", "completed"].includes(order.status) ? (
                  <div className="border-t border-border pt-4 bg-green-50 rounded-lg p-4">
                    <p className="font-display text-lg font-bold text-green-800 mb-1">🎉 Delivered!</p>
                    <p className="font-sans text-sm text-green-700">Delivered on: {new Date(order.updated_at).toLocaleString("en-IN", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}</p>
                  </div>
                ) : (
                  <div className="border-t border-border pt-4">
                    <p className="font-sans text-sm text-muted-foreground">Expected Delivery</p>
                    <p className="font-sans font-semibold">{getDeliveryDate(order).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</p>
                    <p className="text-xs text-muted-foreground font-sans mt-1">{Math.max(0, Math.ceil((getDeliveryDate(order).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days remaining</p>
                  </div>
                )}
              </CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="shop">
            <Card>
              <CardHeader className="text-center">
                <Store className="w-12 h-12 text-primary mx-auto mb-2" />
                <CardTitle className="font-display text-xl">Track Shop Order</CardTitle>
                <CardDescription className="font-sans">Enter your order number (e.g. SHOP-2026-0001)</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTrackShop} className="space-y-3">
                  <Input value={orderId} onChange={e => setOrderId(e.target.value)} placeholder="Enter Order Number" className="font-mono" />
                  <Input value={verifyContact} onChange={e => setVerifyContact(e.target.value)} placeholder="Your mobile number or name" className="font-sans" />
                  <Button type="submit" className="w-full" disabled={loading || !orderId.trim() || !verifyContact.trim()}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}Track Shop Order
                  </Button>
                </form>
              </CardContent>
            </Card>

            {shopOrder && (
              <Card className="mt-6"><CardContent className="p-6 space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">{shopOrder.order_number}</p>
                    <p className="font-sans font-semibold">{shopOrder.shipping_name}</p>
                    <p className="text-xs text-muted-foreground font-sans">{shopOrder.shipping_city}, {shopOrder.shipping_state}</p>
                    <p className="text-xs text-muted-foreground font-sans">Ordered: {new Date(shopOrder.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg font-bold text-primary">{formatPrice(shopOrder.total_amount)}</p>
                    <Badge variant={shopOrder.payment_status === "paid" ? "default" : "secondary"} className="text-xs">{shopOrder.payment_status}</Badge>
                  </div>
                </div>
                {shopItems.length > 0 && (
                  <div className="space-y-2 border-t border-border pt-3">
                    <p className="font-sans font-semibold text-sm">Items</p>
                    {shopItems.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-sm font-sans">
                        <span>{item.product_name} × {item.quantity}</span>
                        <span className="font-semibold">{formatPrice(item.unit_price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-4">
                  <p className="font-sans font-semibold text-sm">Order Progress</p>
                  {SHOP_STATUS_STEPS.map((step, i) => {
                    const isCompleted = i <= shopStep, isCurrent = i === shopStep;
                    return (
                      <div key={step.key} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isCompleted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"} ${isCurrent ? "ring-2 ring-primary ring-offset-2" : ""}`}>
                          <step.icon className="w-4 h-4" />
                        </div>
                        <p className={`font-sans text-sm flex-1 ${isCompleted ? "font-semibold" : "text-muted-foreground"}`}>{step.label}</p>
                        {isCurrent && <Badge className="bg-primary/10 text-primary border-none text-xs">Current</Badge>}
                      </div>
                    );
                  })}
                </div>
                {shopOrder.status === "delivered" && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="font-display text-lg font-bold text-green-800">🎉 Delivered!</p>
                    <p className="font-sans text-sm text-green-700">Delivered on: {new Date(shopOrder.updated_at).toLocaleString("en-IN", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}</p>
                  </div>
                )}
              </CardContent></Card>
            )}
          </TabsContent>
        </Tabs>

        {searched && !order && !shopOrder && !loading && (
          <Card className="mt-6"><CardContent className="p-8 text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-sans text-muted-foreground">No order found with that ID</p>
          </CardContent></Card>
        )}
      </div>
    </div>
  );
};

export default TrackOrder;
