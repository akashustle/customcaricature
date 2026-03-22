import { useState, useEffect } from "react";
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
  Store, Palette, Eye, Gift, Star, MessageCircle, Share2, Bell, HelpCircle,
  ChevronDown, ChevronUp, Heart, Sparkles, Calendar
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
  const [orderExtras, setOrderExtras] = useState<any>(null);
  const shopTrackingVisible = (siteSettings as any).shop_tracking_visible?.enabled !== false;

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
      // Fetch extended data
      const { data: full } = await supabase.from("orders").select("extended_delivery_date, extension_reason, preview_image_url, timeline_logs, current_stage, artist_message").eq("id", found.id).single();
      if (full) setOrderExtras(full);
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
      <SEOHead title="Track Your Caricature Order" description="Track the status of your custom caricature order or shop order." canonical="/track-order" />

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

                  {/* SECTION 3: Timeline */}
                  {orderExtras?.timeline_logs && Array.isArray(orderExtras.timeline_logs) && orderExtras.timeline_logs.length > 0 && (
                    <Card className="border-0 shadow-md" style={{ background: "white" }}>
                      <CardContent className="p-5">
                        <p className="font-semibold text-sm mb-3" style={{ color: "hsl(30, 30%, 25%)" }}>📋 Activity Timeline</p>
                        <div className="space-y-3">
                          {(orderExtras.timeline_logs as any[]).map((log: any, i: number) => (
                            <div key={i} className="flex items-start gap-3">
                              <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "hsl(36, 45%, 52%)" }} />
                              <div>
                                <p className="text-sm font-medium" style={{ color: "hsl(30, 30%, 25%)" }}>{log.label || log.event}</p>
                                <p className="text-xs" style={{ color: "hsl(30, 12%, 56%)" }}>{log.date ? new Date(log.date).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* SECTION 4: Artist Message */}
                  <Card className="border-0 shadow-md" style={{ background: "linear-gradient(135deg, hsl(40, 50%, 97%), hsl(35, 45%, 95%))" }}>
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, hsl(36, 45%, 52%), hsl(30, 55%, 42%))" }}>
                          <Palette className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm" style={{ color: "hsl(30, 30%, 25%)" }}>Artist's Note</p>
                          <p className="text-sm mt-1" style={{ color: "hsl(30, 15%, 40%)" }}>
                            {orderExtras?.artist_message || STAGE_MESSAGES[order.status] || STAGE_MESSAGES["in_progress"]}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* SECTION 5: Sneak Peek */}
                  <Card className="border-0 shadow-md" style={{ background: "white" }}>
                    <CardContent className="p-5 text-center">
                      <p className="font-semibold text-sm mb-3" style={{ color: "hsl(30, 30%, 25%)" }}>👀 Sneak Peek</p>
                      {orderExtras?.preview_image_url ? (
                        <motion.img
                          src={orderExtras.preview_image_url}
                          alt="Preview"
                          className="w-full max-w-xs mx-auto rounded-2xl shadow-lg"
                          style={{ filter: order.status === "artwork_ready" ? "none" : "blur(8px)" }}
                          initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ duration: 0.5 }}
                        />
                      ) : (
                        <div className="py-8 px-4 rounded-2xl" style={{ background: "hsl(35, 30%, 95%)" }}>
                          <Sparkles className="w-10 h-10 mx-auto mb-2" style={{ color: "hsl(36, 45%, 65%)" }} />
                          <p className="text-sm" style={{ color: "hsl(30, 12%, 50%)" }}>Sneak peek coming soon… ✨</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* SECTION 6 & 7: Delivery & Extension */}
                  {["delivered", "completed"].includes(order.status) ? (
                    <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                      <Card className="border-0 shadow-md" style={{ background: "linear-gradient(135deg, hsl(152, 40%, 95%), hsl(152, 45%, 92%))" }}>
                        <CardContent className="p-5 text-center">
                          <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
                            <span className="text-4xl">🎉</span>
                          </motion.div>
                          <p className="text-xl font-bold mt-2" style={{ color: "hsl(152, 45%, 28%)" }}>Delivered!</p>
                          <p className="text-sm mt-1" style={{ color: "hsl(152, 35%, 38%)" }}>
                            {new Date(order.updated_at).toLocaleString("en-IN", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ) : (
                    <Card className="border-0 shadow-md" style={{ background: "white" }}>
                      <CardContent className="p-5">
                        <p className="font-semibold text-sm" style={{ color: "hsl(30, 30%, 25%)" }}>📅 Expected Delivery</p>
                        <p className="text-lg font-bold mt-1" style={{ color: "hsl(36, 45%, 42%)" }}>
                          {getDeliveryDate(order).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
                        </p>
                        <p className="text-xs mt-1" style={{ color: "hsl(30, 12%, 56%)" }}>
                          {Math.max(0, Math.ceil((getDeliveryDate(order).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days remaining
                        </p>

                        {hasExtension && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 p-3 rounded-xl" style={{ background: "hsl(38, 80%, 95%)", border: "1px solid hsl(38, 60%, 85%)" }}>
                            <p className="text-sm font-semibold" style={{ color: "hsl(38, 50%, 35%)" }}>⚠️ Delivery Date Updated</p>
                            <p className="text-xs mt-1" style={{ color: "hsl(38, 40%, 40%)" }}>
                              New Expected Delivery: <strong>{new Date(orderExtras.extended_delivery_date).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</strong>
                            </p>
                            {orderExtras.extension_reason && (
                              <p className="text-xs mt-1 italic" style={{ color: "hsl(30, 15%, 50%)" }}>
                                Reason: {orderExtras.extension_reason}
                              </p>
                            )}
                          </motion.div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* SECTION 8: Notification */}
                  <Card className="border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow" style={{ background: "linear-gradient(135deg, hsl(152, 40%, 95%), hsl(152, 45%, 92%))" }} onClick={() => window.open("https://wa.me/919999999999?text=I want updates on my order " + order.id.slice(0, 8), "_blank")}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <Bell className="w-5 h-5" style={{ color: "hsl(152, 50%, 38%)" }} />
                      <p className="text-sm font-medium" style={{ color: "hsl(152, 45%, 28%)" }}>🔔 Get live updates on WhatsApp</p>
                    </CardContent>
                  </Card>

                  {/* SECTION 9: FAQ */}
                  <Card className="border-0 shadow-md" style={{ background: "white" }}>
                    <CardContent className="p-5">
                      <p className="font-semibold text-sm mb-3" style={{ color: "hsl(30, 30%, 25%)" }}>💡 Frequently Asked Questions</p>
                      <Accordion type="single" collapsible className="w-full">
                        {FAQ_ITEMS.map((faq, i) => (
                          <AccordionItem key={i} value={`faq-${i}`} className="border-b-0">
                            <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline" style={{ color: "hsl(30, 20%, 35%)" }}>{faq.q}</AccordionTrigger>
                            <AccordionContent className="text-xs pb-2" style={{ color: "hsl(30, 12%, 50%)" }}>{faq.a}</AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </CardContent>
                  </Card>

                  {/* SECTION 10: Upsell */}
                  <Card className="border-0 shadow-md" style={{ background: "linear-gradient(135deg, hsl(40, 55%, 97%), hsl(38, 60%, 94%))" }}>
                    <CardContent className="p-5">
                      <p className="font-semibold text-sm mb-3" style={{ color: "hsl(30, 30%, 25%)" }}>🎁 Enhance Your Order</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "Add Frame", emoji: "🖼️", desc: "Premium framing" },
                          { label: "Extra Character", emoji: "👤", desc: "+1 person" },
                          { label: "Express Delivery", emoji: "⚡", desc: "Get it faster" },
                        ].map((item, i) => (
                          <motion.div key={i} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="text-center p-3 rounded-xl cursor-pointer" style={{ background: "white", border: "1px solid hsl(30, 20%, 88%)" }}
                            onClick={() => window.open("https://wa.me/919999999999?text=I want to " + item.label + " for order " + order.id.slice(0, 8), "_blank")}>
                            <span className="text-2xl">{item.emoji}</span>
                            <p className="text-xs font-semibold mt-1" style={{ color: "hsl(30, 30%, 25%)" }}>{item.label}</p>
                            <p className="text-[10px]" style={{ color: "hsl(30, 12%, 56%)" }}>{item.desc}</p>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* SECTION 11: Social Proof */}
                  <div className="flex items-center justify-center gap-2 py-3">
                    <div className="flex -space-x-2">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: `hsl(${i * 60}, 50%, 55%)`, border: "2px solid white" }}>
                          {String.fromCharCode(64 + i)}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs font-medium" style={{ color: "hsl(30, 15%, 45%)" }}>
                      ❤️ Loved by 1000+ happy customers
                    </p>
                  </div>

                  {/* SECTION 12: Support CTA */}
                  <Card className="border-0 shadow-md" style={{ background: "white" }}>
                    <CardContent className="p-4">
                      <p className="font-semibold text-sm text-center mb-3" style={{ color: "hsl(30, 30%, 25%)" }}>💬 Need help? Talk to us instantly 😊</p>
                      <div className="flex gap-2">
                        <Button className="flex-1 text-white text-xs" style={{ background: "hsl(142, 70%, 40%)" }} onClick={() => window.open("https://wa.me/919999999999", "_blank")}>
                          <MessageCircle className="w-4 h-4 mr-1" />WhatsApp
                        </Button>
                        <Button className="flex-1 text-white text-xs" style={{ background: "linear-gradient(135deg, hsl(37, 97%, 54%), hsl(329, 70%, 58%)" }} onClick={() => window.open("https://instagram.com/creativecaricatureclub", "_blank")}>
                          <Heart className="w-4 h-4 mr-1" />Instagram
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* SECTION 13: Share */}
                  <Card className="border-0 shadow-md" style={{ background: "linear-gradient(135deg, hsl(210, 50%, 96%), hsl(210, 55%, 93%))" }}>
                    <CardContent className="p-4 text-center">
                      <p className="font-semibold text-sm mb-2" style={{ color: "hsl(210, 40%, 30%)" }}>🎨 Share your excitement!</p>
                      <div className="flex gap-2 justify-center">
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank")}>
                          <Share2 className="w-3 h-3 mr-1" />WhatsApp
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => { navigator.clipboard.writeText(shareText); toast({ title: "Copied!" }); }}>
                          <Share2 className="w-3 h-3 mr-1" />Copy Link
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          {/* SHOP ORDER TAB */}
          <TabsContent value="shop">
            <Card className="border-0 shadow-lg" style={{ background: "white", boxShadow: "0 8px 30px hsl(30 20% 45% / 0.08)" }}>
              <CardHeader className="text-center pb-3">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(340, 55%, 58%), hsl(340, 60%, 48%))" }}>
                  <Store className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl" style={{ color: "hsl(30, 30%, 25%)" }}>Track Shop Order</CardTitle>
                <CardDescription>Enter your order number (e.g. SHOP-2026-0001)</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTrackShop} className="space-y-3">
                  <Input value={orderId} onChange={e => setOrderId(e.target.value)} placeholder="Enter Order Number" className="font-mono" style={{ borderColor: "hsl(30, 20%, 85%)" }} />
                  <Input value={verifyContact} onChange={e => setVerifyContact(e.target.value)} placeholder="Your mobile number or name" style={{ borderColor: "hsl(30, 20%, 85%)" }} />
                  <Button type="submit" className="w-full text-white" disabled={loading || !orderId.trim() || !verifyContact.trim()} style={{ background: "linear-gradient(135deg, hsl(340, 55%, 58%), hsl(340, 60%, 48%))" }}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}Track Shop Order
                  </Button>
                </form>
              </CardContent>
            </Card>

            <AnimatePresence>
              {shopOrder && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-4">
                  <Card className="border-0 shadow-md" style={{ background: "white" }}>
                    <div className="h-1.5" style={{ background: "linear-gradient(90deg, hsl(340, 55%, 58%), hsl(280, 50%, 55%))" }} />
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-mono text-xs" style={{ color: "hsl(30, 12%, 56%)" }}>{shopOrder.order_number}</p>
                          <p className="font-semibold mt-1" style={{ color: "hsl(30, 30%, 25%)" }}>{shopOrder.shipping_name}</p>
                          <p className="text-xs" style={{ color: "hsl(30, 12%, 56%)" }}>{shopOrder.shipping_city}, {shopOrder.shipping_state}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold" style={{ color: "hsl(340, 45%, 42%)" }}>{formatPrice(shopOrder.total_amount)}</p>
                          <Badge className="text-xs border-0 mt-1" style={{ background: shopOrder.payment_status === "paid" ? "hsl(152, 40%, 92%)" : "hsl(38, 70%, 92%)", color: shopOrder.payment_status === "paid" ? "hsl(152, 50%, 30%)" : "hsl(38, 60%, 35%)" }}>
                            {shopOrder.payment_status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {shopItems.length > 0 && (
                    <Card className="border-0 shadow-md" style={{ background: "white" }}>
                      <CardContent className="p-5">
                        <p className="font-semibold text-sm mb-2" style={{ color: "hsl(30, 30%, 25%)" }}>Items</p>
                        {shopItems.map((item: any) => (
                          <div key={item.id} className="flex justify-between text-sm py-1.5" style={{ borderBottom: "1px solid hsl(30, 20%, 93%)" }}>
                            <span style={{ color: "hsl(30, 15%, 35%)" }}>{item.product_name} × {item.quantity}</span>
                            <span className="font-semibold" style={{ color: "hsl(30, 30%, 25%)" }}>{formatPrice(item.unit_price * item.quantity)}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  <Card className="border-0 shadow-md" style={{ background: "white" }}>
                    <CardContent className="p-5">
                      <p className="font-semibold text-sm mb-3" style={{ color: "hsl(30, 30%, 25%)" }}>Order Progress</p>
                      <div className="relative h-3 rounded-full overflow-hidden mb-4" style={{ background: "hsl(35, 30%, 92%)" }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${SHOP_STATUS_STEPS[shopStep]?.percent ?? 0}%` }} transition={{ duration: 1.2 }} className="h-full rounded-full" style={{ background: "linear-gradient(90deg, hsl(340, 55%, 58%), hsl(280, 50%, 55%))" }} />
                      </div>
                      {SHOP_STATUS_STEPS.map((step, i) => {
                        const isCompleted = i <= shopStep, isCurrent = i === shopStep;
                        return (
                          <div key={step.key} className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
                              background: isCompleted ? "linear-gradient(135deg, hsl(340, 55%, 58%), hsl(340, 60%, 48%))" : "hsl(35, 30%, 92%)",
                              boxShadow: isCurrent ? "0 0 0 3px hsl(340, 55%, 58%, 0.25)" : "none",
                            }}>
                              <step.icon className="w-4 h-4" style={{ color: isCompleted ? "white" : "hsl(30, 12%, 65%)" }} />
                            </div>
                            <p className={`text-sm ${isCompleted ? "font-semibold" : ""}`} style={{ color: isCompleted ? "hsl(30, 30%, 25%)" : "hsl(30, 12%, 60%)" }}>{step.label}</p>
                            {isCurrent && <Badge className="text-[10px] border-0" style={{ background: "hsl(340, 40%, 92%)", color: "hsl(340, 45%, 35%)" }}>Current</Badge>}
                          </div>
                        );
                      })}
                      {shopOrder.status === "delivered" && (
                        <div className="mt-4 p-4 rounded-xl text-center" style={{ background: "hsl(152, 40%, 95%)" }}>
                          <span className="text-3xl">🎉</span>
                          <p className="font-bold mt-1" style={{ color: "hsl(152, 45%, 28%)" }}>Delivered!</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>
        </Tabs>

        {searched && !order && !shopOrder && !loading && (
          <Card className="mt-6 border-0 shadow-md" style={{ background: "white" }}>
            <CardContent className="p-8 text-center">
              <Package className="w-12 h-12 mx-auto mb-4" style={{ color: "hsl(30, 12%, 70%)" }} />
              <p style={{ color: "hsl(30, 12%, 56%)" }}>No order found with that ID</p>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
};

export default TrackOrder;
