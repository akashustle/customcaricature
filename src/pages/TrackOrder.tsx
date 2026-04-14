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
import {
  Search, Package, ArrowLeft, Clock, CreditCard, Truck, CheckCircle, Loader2,
  Store, Palette, Eye, MessageCircle, Share2, Sparkles, Calendar
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { motion, AnimatePresence } from "framer-motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const ORDER_STATUS_STEPS = [
  { key: "new", label: "Order Placed", icon: Package, emoji: "📦", percent: 0 },
  { key: "in_progress", label: "In Progress", icon: Palette, emoji: "🎨", percent: 25 },
  { key: "artwork_ready", label: "Artwork Ready", icon: Eye, emoji: "✨", percent: 60 },
  { key: "dispatched", label: "Dispatched", icon: Truck, emoji: "🚚", percent: 85 },
  { key: "delivered", label: "Delivered", icon: CheckCircle, emoji: "🎉", percent: 100 },
];

const SHOP_STATUS_STEPS = [
  { key: "pending", label: "Order Placed", icon: Package, percent: 0 },
  { key: "processing", label: "Processing", icon: Clock, percent: 33 },
  { key: "shipped", label: "Shipped", icon: Truck, percent: 66 },
  { key: "delivered", label: "Delivered", icon: CheckCircle, percent: 100 },
];

const ORDER_STATUS_INDEX: Record<string, number> = {
  new: 0, in_progress: 1, artwork_ready: 2, dispatched: 3, delivered: 4, completed: 4,
};
const SHOP_STATUS_INDEX: Record<string, number> = {
  pending: 0, processing: 1, shipped: 2, delivered: 3,
};

const STAGE_MESSAGES: Record<string, string> = {
  new: "📦 Your order has been received! Our team is reviewing your photos and details.",
  in_progress: "🎨 Our artist is carefully working on your artwork. We're excited to share it with you soon!",
  artwork_ready: "✨ Your caricature is ready! Check the preview and confirm for dispatch.",
  dispatched: "🚚 Your artwork is on its way! Track your delivery for updates.",
  delivered: "🎉 Your artwork has been delivered! We hope you love it!",
};

const DELIVERY_MESSAGES: Record<string, string> = {
  new: "📦 Your artwork journey has just begun!",
  in_progress: "✨ Final touches going on!",
  artwork_ready: "📦 Dispatching soon!",
  dispatched: "🚚 Arriving soon! 🎉",
  delivered: "🎉 Delivered successfully!",
};

const FAQ_ITEMS = [
  { q: "When will I receive my artwork?", a: "Your custom caricature is typically delivered within 20-30 days of order placement. You'll receive updates at every stage!" },
  { q: "Can I request changes?", a: "Yes! When you see the artwork preview, you can raise a query and our team will make adjustments." },
  { q: "How does delivery work?", a: "We carefully package your artwork and ship it via trusted courier. You'll receive tracking details once dispatched." },
  { q: "What if I'm not satisfied?", a: "We offer revisions before dispatch. Your satisfaction is our priority — reach out via WhatsApp anytime!" },
];

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

const CaricaturePausedBanner = () => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 flex items-start gap-3"
  >
    <Sparkles className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
    <div>
      <p className="font-semibold text-sm text-amber-800">Custom Caricature Orders Paused 🎨</p>
      <p className="text-xs text-amber-600 mt-1">New orders are temporarily paused due to high demand, but you can still track your existing orders below!</p>
    </div>
  </motion.div>
);

const TrackOrder = () => {
  const navigate = useNavigate();
  const { settings: siteSettings } = useSiteSettings();
  const caricatureOff = siteSettings.custom_caricature_visible?.enabled === false;

  const [orderId, setOrderId] = useState("");
  const [verifyContact, setVerifyContact] = useState("");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [shopOrder, setShopOrder] = useState<TrackedShopOrder | null>(null);
  const [shopItems, setShopItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [trackType, setTrackType] = useState<"custom" | "shop">("custom");
  const [orderExtras, setOrderExtras] = useState<any>(null);
  const shopTrackingVisible = (siteSettings as any).shop_tracking_visible?.enabled !== false;

  // Remove the coming soon block — show banner instead inside the UI

  const handleTrackCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim() || !verifyContact.trim()) return;
    setLoading(true); setSearched(true); setOrder(null); setOrderExtras(null);
    const { data, error } = await supabase.rpc("track_order", { order_id_input: orderId.trim().toLowerCase(), customer_verify: verifyContact.trim() });
    if (error || !data || (Array.isArray(data) && data.length === 0)) {
      toast({ title: "Order Not Found", description: "Please check your Order ID and try again.", variant: "destructive" });
    } else {
      const found = (Array.isArray(data) ? data[0] : data) as TrackedOrder;
      setOrder(found);
      const [fullRes, extRes] = await Promise.all([
        supabase.from("orders").select("extended_delivery_date, extension_reason, preview_image_url, timeline_logs, current_stage, artist_message").eq("id", found.id).single(),
        supabase.from("order_extensions").select("new_date, reason, created_at").eq("order_id", found.id).order("created_at", { ascending: false }).limit(1),
      ]);
      const full = fullRes.data;
      const latestExt = extRes.data?.[0];
      if (full) {
        if (latestExt) {
          full.extended_delivery_date = latestExt.new_date;
          full.extension_reason = latestExt.reason;
        }
        setOrderExtras(full);
      }
    }
    setLoading(false);
  };

  const handleTrackShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim() || !verifyContact.trim()) return;
    setLoading(true); setSearched(true); setShopOrder(null); setShopItems([]);
    const searchTerm = orderId.trim();
    let query = supabase.from("shop_orders").select("*");
    if (searchTerm.toUpperCase().startsWith("SHOP-")) {
      query = query.eq("order_number", searchTerm.toUpperCase());
    } else {
      query = query.or(`id.eq.${searchTerm},order_number.ilike.%${searchTerm}%`);
    }
    const { data } = await query.limit(1);
    if (data && data.length > 0) {
      const so = data[0];
      if (so.shipping_mobile === verifyContact.trim() || so.shipping_name?.toLowerCase().includes(verifyContact.trim().toLowerCase())) {
        setShopOrder(so as TrackedShopOrder);
        const { data: items } = await supabase.from("shop_order_items").select("*").eq("order_id", so.id);
        if (items) setShopItems(items);
      } else {
        toast({ title: "Verification Failed", description: "Contact info doesn't match.", variant: "destructive" });
      }
    } else {
      toast({ title: "Order Not Found", variant: "destructive" });
    }
    setLoading(false);
  };

  const getDeliveryDate = (order: TrackedOrder) => {
    if (orderExtras?.extended_delivery_date) return new Date(orderExtras.extended_delivery_date);
    if (order.expected_delivery_date) return new Date(order.expected_delivery_date);
    const d = new Date(order.created_at); d.setDate(d.getDate() + 30); return d;
  };

  const hasExtension = orderExtras?.extended_delivery_date && order?.expected_delivery_date && orderExtras.extended_delivery_date !== order.expected_delivery_date;

  const currentStep = order ? (ORDER_STATUS_INDEX[order.status] ?? 0) : 0;
  const currentStepData = ORDER_STATUS_STEPS[currentStep];
  const progressPercent = currentStepData?.percent ?? 0;
  const shopStep = shopOrder ? (SHOP_STATUS_INDEX[shopOrder.status] ?? 0) : 0;

  const shareText = order ? `🎨 My custom caricature is ${progressPercent}% ready! So excited! #CreativeCaricatureClub` : "";

  return (
    <div className="min-h-screen pb-16 md:pb-0" style={{ background: "linear-gradient(180deg, hsl(40, 50%, 97%) 0%, hsl(35, 40%, 94%) 100%)" }}>
      <SEOHead title="Track Your Caricature Order | Creative Caricature Club™" description="Track the real-time status of your custom caricature order or shop order. Enter your order ID to see progress updates from Creative Caricature Club™." canonical="/track-order" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b backdrop-blur-md" style={{ background: "hsla(40, 50%, 98%, 0.9)", borderColor: "hsl(30, 20%, 88%)" }}>
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-full"><ArrowLeft className="w-5 h-5" /></Button>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <img src="/logo.png" alt="CCC" className="w-8 h-8 rounded-full shadow-sm" />
            <h1 className="text-lg font-bold" style={{ color: "hsl(30, 30%, 25%)" }}>Track Your Order</h1>
          </div>
        </div>
      </header>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }} className="container mx-auto px-4 py-6 max-w-lg">
        <Tabs value={trackType} onValueChange={(v) => { setTrackType(v as any); setOrder(null); setShopOrder(null); setSearched(false); setOrderExtras(null); }}>
          {shopTrackingVisible && (
            <TabsList className="w-full mb-4" style={{ background: "hsl(35, 30%, 92%)" }}>
              <TabsTrigger value="custom" className="flex-1"><Package className="w-4 h-4 mr-1" />Custom Order</TabsTrigger>
              <TabsTrigger value="shop" className="flex-1"><Store className="w-4 h-4 mr-1" />Shop Order</TabsTrigger>
            </TabsList>
          )}

          {/* CUSTOM ORDER TAB */}
          <TabsContent value="custom">
            <Card className="border-0 shadow-lg" style={{ background: "white", boxShadow: "0 8px 30px hsl(30 20% 45% / 0.08)" }}>
              <CardHeader className="text-center pb-3">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(36, 45%, 52%), hsl(30, 55%, 42%))" }}>
                  <Package className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl" style={{ color: "hsl(30, 30%, 25%)" }}>Track Custom Order</CardTitle>
                <CardDescription>Enter your Order ID to check status</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTrackCustom} className="space-y-3">
                  <Input value={orderId} onChange={e => setOrderId(e.target.value)} placeholder="Enter Order ID (e.g. A1B2C3D4)" className="font-mono" style={{ borderColor: "hsl(30, 20%, 85%)" }} />
                  <Input value={verifyContact} onChange={e => setVerifyContact(e.target.value)} placeholder="Your email or mobile number" style={{ borderColor: "hsl(30, 20%, 85%)" }} />
                  <Button type="submit" className="w-full text-white" disabled={loading || !orderId.trim() || !verifyContact.trim()} style={{ background: "linear-gradient(135deg, hsl(36, 45%, 52%), hsl(30, 55%, 42%))" }}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}Track Order
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* ORDER RESULTS */}
            <AnimatePresence>
              {order && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="mt-6 space-y-4">

                  {/* SECTION 1: Order Header */}
                  <Card className="border-0 shadow-md overflow-hidden" style={{ background: "white" }}>
                    <div className="h-1.5" style={{ background: "linear-gradient(90deg, hsl(36, 45%, 52%), hsl(152, 50%, 48%), hsl(210, 65%, 55%))" }} />
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-mono text-xs" style={{ color: "hsl(30, 12%, 56%)" }}>#{order.id.slice(0, 8).toUpperCase()}</p>
                          <p className="font-semibold capitalize text-base mt-1" style={{ color: "hsl(30, 30%, 25%)" }}>{order.order_type} Caricature — {order.style}</p>
                          <p className="text-xs mt-0.5" style={{ color: "hsl(30, 12%, 56%)" }}>
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {new Date(order.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        <p className="text-xl font-bold" style={{ color: "hsl(36, 45%, 42%)" }}>{formatPrice(order.amount)}</p>
                      </div>
                      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring" }} className="mt-3">
                        <Badge className="text-xs px-3 py-1 border-0" style={{
                          background: order.payment_status === "confirmed" ? "hsl(152, 40%, 92%)" : "hsl(38, 70%, 92%)",
                          color: order.payment_status === "confirmed" ? "hsl(152, 50%, 30%)" : "hsl(38, 60%, 35%)",
                        }}>
                          <CreditCard className="w-3 h-3 mr-1" />
                          {order.payment_status === "confirmed" ? "Payment Confirmed ✅" : "Payment Pending"}
                        </Badge>
                      </motion.div>
                    </CardContent>
                  </Card>

                  {/* SECTION 2: Dynamic Progress Bar */}
                  <Card className="border-0 shadow-md" style={{ background: "white" }}>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-semibold text-sm" style={{ color: "hsl(30, 30%, 25%)" }}>Order Progress</p>
                        <Badge className="text-xs border-0 font-bold px-2" style={{ background: "hsl(36, 50%, 92%)", color: "hsl(36, 45%, 35%)" }}>
                          {currentStepData?.emoji} {progressPercent}%
                        </Badge>
                      </div>

                      {/* Animated Progress Bar */}
                      <div className="relative h-3 rounded-full overflow-hidden mb-1" style={{ background: "hsl(35, 30%, 92%)" }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPercent}%` }}
                          transition={{ duration: 1.2, ease: "easeOut" }}
                          className="h-full rounded-full relative"
                          style={{ background: "linear-gradient(90deg, hsl(36, 45%, 52%), hsl(152, 50%, 48%))" }}
                        >
                          <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute right-0 top-0 w-4 h-full rounded-full" style={{ background: "hsla(0, 0%, 100%, 0.5)" }} />
                        </motion.div>
                      </div>
                      <p className="text-xs text-center mt-2" style={{ color: "hsl(30, 12%, 50%)" }}>
                        {DELIVERY_MESSAGES[order.status] || "Processing..."}
                      </p>

                      {/* Step Indicators */}
                      <div className="mt-5 space-y-3">
                        {ORDER_STATUS_STEPS.map((step, i) => {
                          const isCompleted = i <= currentStep;
                          const isCurrent = i === currentStep;
                          return (
                            <motion.div key={step.key} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.1 }} className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-500`} style={{
                                background: isCompleted ? "linear-gradient(135deg, hsl(36, 45%, 52%), hsl(30, 55%, 42%))" : "hsl(35, 30%, 92%)",
                                boxShadow: isCurrent ? "0 0 0 3px hsl(36, 45%, 52%, 0.25)" : "none",
                              }}>
                                {isCurrent ? (
                                  <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                                    <step.icon className="w-4 h-4" style={{ color: "white" }} />
                                  </motion.div>
                                ) : (
                                  <step.icon className="w-4 h-4" style={{ color: isCompleted ? "white" : "hsl(30, 12%, 65%)" }} />
                                )}
                              </div>
                              <p className={`text-sm flex-1 ${isCompleted ? "font-semibold" : ""}`} style={{ color: isCompleted ? "hsl(30, 30%, 25%)" : "hsl(30, 12%, 60%)" }}>
                                {step.emoji} {step.label}
                              </p>
                              {isCurrent && (
                                <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                                  <Badge className="text-[10px] border-0 px-2" style={{ background: "hsl(36, 50%, 92%)", color: "hsl(36, 45%, 35%)" }}>Current</Badge>
                                </motion.span>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Stage Message */}
                  <Card className="border-0 shadow-md" style={{ background: "white" }}>
                    <CardContent className="p-5">
                      <p className="text-sm" style={{ color: "hsl(30, 20%, 35%)" }}>{STAGE_MESSAGES[order.status] || "Processing your order..."}</p>
                      {orderExtras?.artist_message && (
                        <div className="mt-3 p-3 rounded-xl" style={{ background: "hsl(36, 50%, 95%)" }}>
                          <p className="text-xs font-semibold mb-1" style={{ color: "hsl(36, 45%, 35%)" }}>💬 Message from Artist</p>
                          <p className="text-sm" style={{ color: "hsl(30, 20%, 30%)" }}>{orderExtras.artist_message}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Delivery Info */}
                  <Card className="border-0 shadow-md" style={{ background: "white" }}>
                    <CardContent className="p-5">
                      <p className="font-semibold text-sm mb-2" style={{ color: "hsl(30, 30%, 25%)" }}>📅 Delivery Details</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span style={{ color: "hsl(30, 12%, 50%)" }}>Expected By</span>
                          <span className="font-semibold" style={{ color: "hsl(30, 30%, 25%)" }}>{getDeliveryDate(order).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                        </div>
                        {hasExtension && (
                          <div className="p-2 rounded-lg text-xs" style={{ background: "hsl(38, 70%, 95%)", color: "hsl(38, 60%, 35%)" }}>
                            ⏰ Date extended{orderExtras?.extension_reason ? `: ${orderExtras.extension_reason}` : ""}
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span style={{ color: "hsl(30, 12%, 50%)" }}>Faces</span>
                          <span className="font-semibold" style={{ color: "hsl(30, 30%, 25%)" }}>{order.face_count}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Preview Image */}
                  {orderExtras?.preview_image_url && (
                    <Card className="border-0 shadow-md overflow-hidden" style={{ background: "white" }}>
                      <CardContent className="p-5">
                        <p className="font-semibold text-sm mb-3" style={{ color: "hsl(30, 30%, 25%)" }}>🖼️ Artwork Preview</p>
                        <img src={orderExtras.preview_image_url} alt="Preview" className="w-full rounded-xl" />
                      </CardContent>
                    </Card>
                  )}

                  {/* Share & Actions */}
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 text-xs" onClick={() => {
                      navigator.clipboard?.writeText(shareText);
                      toast({ title: "Copied to clipboard!" });
                    }}>
                      <Share2 className="w-3 h-3 mr-1" /> Share
                    </Button>
                    <Button className="flex-1 text-xs text-white" style={{ background: "#25D366" }} onClick={() => {
                      const msg = `Hi! I'd like an update on my order #${order.id.slice(0, 8).toUpperCase()}. Current status: ${order.status}. Thanks!`;
                      window.open(`https://wa.me/918369594271?text=${encodeURIComponent(msg)}`, "_blank");
                    }}>
                      <MessageCircle className="w-3 h-3 mr-1" /> WhatsApp
                    </Button>
                  </div>

                  {/* FAQ */}
                  <Card className="border-0 shadow-md" style={{ background: "white" }}>
                    <CardContent className="p-5">
                      <p className="font-semibold text-sm mb-3" style={{ color: "hsl(30, 30%, 25%)" }}>❓ Frequently Asked</p>
                      <Accordion type="single" collapsible>
                        {FAQ_ITEMS.map((faq, i) => (
                          <AccordionItem key={i} value={`faq-${i}`}>
                            <AccordionTrigger className="text-sm text-left" style={{ color: "hsl(30, 20%, 30%)" }}>{faq.q}</AccordionTrigger>
                            <AccordionContent className="text-sm" style={{ color: "hsl(30, 12%, 50%)" }}>{faq.a}</AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {searched && !order && !loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 text-center">
                <Card className="border-0 shadow-md" style={{ background: "white" }}>
                  <CardContent className="p-8">
                    <Package className="w-12 h-12 mx-auto mb-3" style={{ color: "hsl(30, 12%, 70%)" }} />
                    <p className="font-semibold text-base mb-1" style={{ color: "hsl(30, 30%, 25%)" }}>Order Not Found</p>
                    <p className="text-sm mb-4" style={{ color: "hsl(30, 12%, 56%)" }}>Double-check your Order ID and contact info</p>
                    <Button onClick={() => {
                      window.open(`https://wa.me/918369594271?text=${encodeURIComponent("Hi! I need help tracking my order.")}`, "_blank");
                    }} className="text-white" style={{ background: "#25D366" }}>
                      <MessageCircle className="w-4 h-4 mr-1" /> Get Help via WhatsApp
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </TabsContent>

          {/* SHOP ORDER TAB */}
          <TabsContent value="shop">
            <Card className="border-0 shadow-lg" style={{ background: "white", boxShadow: "0 8px 30px hsl(30 20% 45% / 0.08)" }}>
              <CardHeader className="text-center pb-3">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(210, 65%, 55%), hsl(210, 55%, 45%))" }}>
                  <Store className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl" style={{ color: "hsl(30, 30%, 25%)" }}>Track Shop Order</CardTitle>
                <CardDescription>Enter your Shop Order Number</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTrackShop} className="space-y-3">
                  <Input value={orderId} onChange={e => setOrderId(e.target.value)} placeholder="Enter Order Number (e.g. SHOP-12345)" className="font-mono" style={{ borderColor: "hsl(30, 20%, 85%)" }} />
                  <Input value={verifyContact} onChange={e => setVerifyContact(e.target.value)} placeholder="Your name or mobile number" style={{ borderColor: "hsl(30, 20%, 85%)" }} />
                  <Button type="submit" className="w-full text-white" disabled={loading || !orderId.trim() || !verifyContact.trim()} style={{ background: "linear-gradient(135deg, hsl(210, 65%, 55%), hsl(210, 55%, 45%))" }}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}Track Shop Order
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* SHOP ORDER RESULTS */}
            <AnimatePresence>
              {shopOrder && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6 space-y-4">
                  <Card className="border-0 shadow-md overflow-hidden" style={{ background: "white" }}>
                    <div className="h-1.5" style={{ background: "linear-gradient(90deg, hsl(210, 65%, 55%), hsl(152, 50%, 48%))" }} />
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-mono text-xs" style={{ color: "hsl(30, 12%, 56%)" }}>{shopOrder.order_number}</p>
                          <p className="text-xs mt-0.5" style={{ color: "hsl(30, 12%, 56%)" }}>
                            {new Date(shopOrder.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        <p className="text-xl font-bold" style={{ color: "hsl(210, 55%, 40%)" }}>{formatPrice(shopOrder.total_amount)}</p>
                      </div>
                      <div className="mt-3 flex gap-2 flex-wrap">
                        <Badge className="text-xs border-0 px-3 py-1" style={{
                          background: shopOrder.payment_status === "paid" ? "hsl(152, 40%, 92%)" : "hsl(38, 70%, 92%)",
                          color: shopOrder.payment_status === "paid" ? "hsl(152, 50%, 30%)" : "hsl(38, 60%, 35%)",
                        }}>
                          {shopOrder.payment_status === "paid" ? "Paid ✅" : "Payment Pending"}
                        </Badge>
                        <Badge className="text-xs border-0 px-3 py-1 capitalize" style={{ background: "hsl(210, 50%, 92%)", color: "hsl(210, 50%, 35%)" }}>
                          {shopOrder.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Shop Progress */}
                  <Card className="border-0 shadow-md" style={{ background: "white" }}>
                    <CardContent className="p-5">
                      <div className="mt-2 space-y-3">
                        {SHOP_STATUS_STEPS.map((step, i) => {
                          const isCompleted = i <= shopStep;
                          const isCurrent = i === shopStep;
                          return (
                            <motion.div key={step.key} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.1 }} className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{
                                background: isCompleted ? "linear-gradient(135deg, hsl(210, 65%, 55%), hsl(210, 55%, 45%))" : "hsl(35, 30%, 92%)",
                                boxShadow: isCurrent ? "0 0 0 3px hsl(210, 65%, 55%, 0.25)" : "none",
                              }}>
                                <step.icon className="w-4 h-4" style={{ color: isCompleted ? "white" : "hsl(30, 12%, 65%)" }} />
                              </div>
                              <p className={`text-sm flex-1 ${isCompleted ? "font-semibold" : ""}`} style={{ color: isCompleted ? "hsl(30, 30%, 25%)" : "hsl(30, 12%, 60%)" }}>
                                {step.label}
                              </p>
                            </motion.div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Shop Items */}
                  {shopItems.length > 0 && (
                    <Card className="border-0 shadow-md" style={{ background: "white" }}>
                      <CardContent className="p-5">
                        <p className="font-semibold text-sm mb-3" style={{ color: "hsl(30, 30%, 25%)" }}>🛍️ Items</p>
                        <div className="space-y-2">
                          {shopItems.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between items-center p-2 rounded-lg" style={{ background: "hsl(35, 30%, 97%)" }}>
                              <div>
                                <p className="text-sm font-medium" style={{ color: "hsl(30, 30%, 25%)" }}>{item.product_name || "Product"}</p>
                                <p className="text-xs" style={{ color: "hsl(30, 12%, 56%)" }}>Qty: {item.quantity}</p>
                              </div>
                              <p className="font-semibold text-sm" style={{ color: "hsl(210, 55%, 40%)" }}>{formatPrice(item.price * item.quantity)}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Shipping */}
                  <Card className="border-0 shadow-md" style={{ background: "white" }}>
                    <CardContent className="p-5">
                      <p className="font-semibold text-sm mb-2" style={{ color: "hsl(30, 30%, 25%)" }}>📦 Shipping</p>
                      <p className="text-sm" style={{ color: "hsl(30, 12%, 50%)" }}>
                        {shopOrder.shipping_name} · {shopOrder.shipping_city}, {shopOrder.shipping_state}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {searched && !shopOrder && !loading && trackType === "shop" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 text-center">
                <Card className="border-0 shadow-md" style={{ background: "white" }}>
                  <CardContent className="p-8">
                    <Store className="w-12 h-12 mx-auto mb-3" style={{ color: "hsl(30, 12%, 70%)" }} />
                    <p className="font-semibold" style={{ color: "hsl(30, 30%, 25%)" }}>Shop Order Not Found</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default TrackOrder;
