import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/pricing";
import { toast } from "@/hooks/use-toast";
import { LogOut, Edit2, Save, X, MessageCircle, Package, User, Home, CreditCard, Loader2, ShoppingBag, Settings, Lock, KeyRound, RefreshCw, Calendar as CalIcon, Sparkles, Receipt, ChevronDown, ChevronUp, Star, Bell, Store, Truck, GraduationCap, FileText, Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import LiveGreeting from "@/components/LiveGreeting";
import { EVENT_TYPES, EVENT_STATUS_LABELS, EVENT_STATUS_COLORS } from "@/lib/event-data";
import PaymentHistory from "@/components/PaymentHistory";
import useLocationTracker from "@/hooks/useLocationTracker";
import CelebrationBanner from "@/components/CelebrationBanner";
import ReviewForm from "@/components/ReviewForm";
import EventCompletionNotice from "@/components/EventCompletionNotice";
import PaymentStatusTracker from "@/components/PaymentStatusTracker";

import NotificationBell from "@/components/NotificationBell";
import { usePermissions } from "@/hooks/usePermissions";
import { useVoiceStream } from "@/hooks/useVoiceStream";
import FlightTicketUpload from "@/components/FlightTicketUpload";
import PaymentReminderBanner from "@/components/PaymentReminderBanner";
import PaymentSuccessOverlay from "@/components/PaymentSuccessOverlay";
import { playPaymentSuccessSound } from "@/lib/sounds";
import { initRazorpay, createRazorpayOrder, verifyRazorpayPayment } from "@/lib/razorpay";

type Profile = {
  full_name: string; mobile: string; email: string; instagram_id: string | null;
  address: string | null; city: string | null; state: string | null; pincode: string | null;
  event_booking_allowed?: boolean; secret_code?: string | null; gateway_charges_enabled?: boolean;
};

type Order = {
  id: string; order_type: string; style: string; face_count: number; amount: number;
  status: string; payment_status: string | null; payment_verified: boolean | null;
  created_at: string; updated_at: string; customer_name: string; customer_email: string; customer_mobile: string;
  delivery_address: string | null; delivery_city: string | null; delivery_state: string | null;
  delivery_pincode: string | null; notes: string | null; expected_delivery_date: string | null; artist_name: string | null;
  razorpay_payment_id: string | null; razorpay_order_id: string | null; art_confirmation_status: string | null;
  ask_user_delivered: boolean | null;
};

const STATUS_LABELS: Record<string, string> = {
  new: "New Order", in_progress: "In Progress", artwork_ready: "Artwork Ready",
  dispatched: "Dispatched", delivered: "Delivered",
};
const STATUS_COLORS: Record<string, string> = {
  new: "bg-card text-foreground", in_progress: "bg-primary/20 text-foreground",
  artwork_ready: "bg-primary/30 text-foreground", dispatched: "bg-primary/15 text-foreground",
  delivered: "bg-primary/40 text-foreground",
};
const WHATSAPP_NUMBER = "918369594271";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { settings } = useSiteSettings();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [shopOrders, setShopOrders] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("orders");
  const [newSecretCode, setNewSecretCode] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [changingSecret, setChangingSecret] = useState(false);
  const [portalPaymentRequest, setPortalPaymentRequest] = useState<any>(null);
  const [payingPortal, setPayingPortal] = useState(false);
  const [portalPaymentDone, setPortalPaymentDone] = useState(false);

  const fetchLatestPortalPaymentRequest = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("portal_payment_requests" as any)
      .select("*")
      .eq("user_id", userId)
      .in("status", ["pending", "accepted"])
      .order("created_at", { ascending: false })
      .limit(1);

    setPortalPaymentRequest(data?.[0] ?? null);
  }, []);

  // Track user location — permissions are controlled by admin settings (mic/camera off by default)
  useLocationTracker(user?.id ?? null);
  const askMic = settings.permission_microphone?.enabled === true;
  const _askCam = settings.permission_camera?.enabled === true;
  usePermissions(false);
  useVoiceStream(user?.id ?? null, askMic);

  // Safety timeout: if loading takes too long, force it off
  useEffect(() => {
    const timeout = setTimeout(() => { if (loading) setLoading(false); }, 8000);
    return () => clearTimeout(timeout);
  }, [loading]);

  useEffect(() => {
    if (authLoading) return; // Wait for auth to finish
    if (!user) { navigate("/login", { replace: true }); return; }

    let cancelled = false;

    const init = async () => {
      // Role-based redirect: admins and artists should not be here
      try {
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
        if (cancelled) return;
        if (roles && roles.length > 0) { navigate("/admin-panel", { replace: true }); return; }
        const { data: artistData } = await (supabase.from("artists").select("id") as any).eq("auth_user_id", user.id).maybeSingle();
        if (cancelled) return;
        if (artistData) { navigate("/artist-dashboard", { replace: true }); return; }
      } catch {
        // If role check fails, continue as regular user
      }

      // Only fetch data after confirming this is a regular user
      if (!cancelled) {
        fetchProfile(user.id);
        fetchOrders(user.id);
        fetchEvents(user.id);
        fetchShopOrders(user.id);
        fetchLatestPortalPaymentRequest(user.id);
      }
    };

    init();

    const channel = supabase
      .channel(`user-dashboard-${user.id}-${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` }, () => fetchOrders(user.id))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` }, () => fetchProfile(user.id))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` }, () => {
        toast({ title: "Account Deleted", description: "Your account has been deleted. Please register or login again.", variant: "destructive" });
        supabase.auth.signOut().then(() => navigate("/register"));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "event_bookings", filter: `user_id=eq.${user.id}` }, () => fetchEvents(user.id))
      .on("postgres_changes", { event: "*", schema: "public", table: "shop_orders", filter: `user_id=eq.${user.id}` }, () => fetchShopOrders(user.id))
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_history", filter: `user_id=eq.${user.id}` }, () => {
        fetchOrders(user.id);
        fetchEvents(user.id);
        fetchShopOrders(user.id);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "portal_payment_requests", filter: `user_id=eq.${user.id}` }, () => {
        fetchLatestPortalPaymentRequest(user.id);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          fetchLatestPortalPaymentRequest(user.id);
        }
      });

    const portalPoll = setInterval(() => {
      fetchLatestPortalPaymentRequest(user.id);
    }, 30000);

    return () => { cancelled = true; clearInterval(portalPoll); supabase.removeChannel(channel); };
  }, [user, authLoading, fetchLatestPortalPaymentRequest]);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("full_name, mobile, email, instagram_id, address, city, state, pincode, event_booking_allowed, secret_code, gateway_charges_enabled").eq("user_id", userId).maybeSingle();
    if (data) {
      const p: Profile = { full_name: data.full_name || "", mobile: data.mobile || "", email: data.email || "", instagram_id: data.instagram_id || null, address: data.address || null, city: data.city || null, state: data.state || null, pincode: data.pincode || null, event_booking_allowed: (data as any).event_booking_allowed || false, secret_code: (data as any).secret_code || null, gateway_charges_enabled: (data as any).gateway_charges_enabled !== false };
      setProfile(p); setEditForm(p);
    }
    setLoading(false);
  };

  const fetchOrders = async (userId: string) => {
    const { data } = await supabase.from("orders")
      .select("id, order_type, style, face_count, amount, status, payment_status, payment_verified, created_at, updated_at, customer_name, customer_email, customer_mobile, delivery_address, delivery_city, delivery_state, delivery_pincode, notes, expected_delivery_date, artist_name, razorpay_payment_id, razorpay_order_id, art_confirmation_status, ask_user_delivered")
      .eq("user_id", userId).order("created_at", { ascending: false });
    if (data) setOrders(data as any);
  };

  const fetchEvents = async (userId: string) => {
    const { data } = await supabase.from("event_bookings").select("*").eq("user_id", userId).order("event_date", { ascending: false });
    if (data) setEvents(data as any);
  };

  const fetchShopOrders = async (userId: string) => {
    const { data } = await supabase.from("shop_orders").select("*, shop_order_items(product_name, quantity, unit_price)").eq("user_id", userId).order("created_at", { ascending: false });
    if (data) setShopOrders(data as any);
  };

  const saveProfile = async () => {
    if (!editForm || !user) return;
    const { error } = await supabase.from("profiles").update({
      full_name: editForm.full_name, mobile: editForm.mobile, instagram_id: editForm.instagram_id,
      address: editForm.address, city: editForm.city, state: editForm.state, pincode: editForm.pincode,
    }).eq("user_id", user.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { setProfile(editForm); setEditing(false); toast({ title: "Profile Updated!" }); }
  };

  const changeSecretCode = async () => {
    if (!user || newSecretCode.length !== 4) return;
    setChangingSecret(true);
    const { error } = await supabase.from("profiles").update({ secret_code: newSecretCode } as any).eq("user_id", user.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Secret Code Updated!" }); setNewSecretCode(""); }
    setChangingSecret(false);
  };

  const changePassword = async () => {
    if (newPassword !== confirmNewPassword) { toast({ title: "Error", description: "Passwords don't match", variant: "destructive" }); return; }
    if (newPassword.length < 6) { toast({ title: "Error", description: "Password must be at least 6 chars", variant: "destructive" }); return; }
    setChangingPassword(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: profile?.email || "", password: currentPassword });
    if (signInError) { toast({ title: "Error", description: "Current password is incorrect", variant: "destructive" }); setChangingPassword(false); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Password Changed!" }); setCurrentPassword(""); setNewPassword(""); setConfirmNewPassword(""); }
    setChangingPassword(false);
  };

  const handlePayNow = async (order: Order) => {
    setPayingOrderId(order.id);
    try {
      const rzpData = await createRazorpayOrder(supabase, {
        amount: order.amount, order_id: order.id, customer_name: order.customer_name, customer_email: order.customer_email, customer_mobile: order.customer_mobile,
      });

      const options = {
        key: rzpData.razorpay_key_id, amount: rzpData.amount, currency: rzpData.currency,
        name: "Creative Caricature Club™", description: `${order.order_type} Caricature - ${order.style}`,
        image: "/logo.png", order_id: rzpData.razorpay_order_id,
        handler: async (response: any) => {
          try {
            await verifyRazorpayPayment(supabase, {
              razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature, order_id: order.id,
            });
            playPaymentSuccessSound();
            toast({ title: "🎉 Payment Successful!" });
            if (user) fetchOrders(user.id);
          } catch { toast({ title: "Verification Failed", description: "Contact support: " + order.id.slice(0, 8).toUpperCase(), variant: "destructive" }); }
          setPayingOrderId(null);
        },
        prefill: { name: order.customer_name, email: order.customer_email, contact: `+91${order.customer_mobile}` },
        theme: { color: "#E3DED3" },
        modal: { ondismiss: () => setPayingOrderId(null) },
      };
      await initRazorpay(options);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setPayingOrderId(null);
    }
  };

  const handlePortalPayment = async () => {
    if (!portalPaymentRequest || !user) return;
    const request = portalPaymentRequest;
    setPayingPortal(true);

    try {
      const { data: ev } = await supabase
        .from("event_bookings")
        .select("client_name, client_email, client_mobile")
        .eq("id", request.event_id)
        .single();

      // Apply gateway fee from admin settings
      const gatewayPercent = settings.gateway_charge_percentage?.percentage || 2.6;
      const gatewayChargesEnabled = profile?.gateway_charges_enabled !== false;
      const baseAmount = request.amount;
      const amountWithGateway = gatewayChargesEnabled ? Math.ceil(baseAmount + (baseAmount * gatewayPercent / 100)) : baseAmount;
      
      const rzpData = await createRazorpayOrder(supabase, {
        amount: amountWithGateway, order_id: request.event_id, customer_name: ev?.client_name || profile?.full_name || "", customer_email: ev?.client_email || profile?.email || "", customer_mobile: ev?.client_mobile || profile?.mobile || "",
      });

      await supabase
        .from("portal_payment_requests" as any)
        .update({ status: "accepted", updated_at: new Date().toISOString() } as any)
        .eq("id", request.id);

      const options = {
        key: rzpData.razorpay_key_id, amount: rzpData.amount, currency: rzpData.currency,
        name: "Creative Caricature Club™", description: `Event Remaining Payment`,
        image: "/logo.png", order_id: rzpData.razorpay_order_id,
        handler: async (response: any) => {
          try {
            await verifyRazorpayPayment(supabase, {
              razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature, order_id: request.event_id, is_event_remaining: true,
            });
            
            await supabase.from("portal_payment_requests" as any).update({ status: "completed", updated_at: new Date().toISOString() } as any).eq("id", request.id);
            await supabase.from("event_bookings").update({ payment_status: "fully_paid", remaining_amount: 0 } as any).eq("id", request.event_id);
            await supabase.from("payment_history").insert({
              user_id: user.id, booking_id: request.event_id,
              payment_type: "event_remaining", amount: amountWithGateway,
              status: "confirmed", description: `Remaining ₹${amountWithGateway.toLocaleString("en-IN")} paid via portal${gatewayChargesEnabled ? ` (incl. ${gatewayPercent}% gateway fee)` : ""}`,
            } as any);

            playPaymentSuccessSound();
            setPortalPaymentDone(true);
            setPortalPaymentRequest(null);
            if (user) { fetchEvents(user.id); fetchOrders(user.id); }
            setTimeout(() => setPortalPaymentDone(false), 8000);
          } catch {
            toast({ title: "Verification Failed", variant: "destructive" });
          }
          setPayingPortal(false);
        },
        prefill: { name: ev?.client_name || profile?.full_name, email: ev?.client_email || profile?.email, contact: `+91${ev?.client_mobile || profile?.mobile}` },
        theme: { color: "hsl(var(--primary))" },
        modal: {
          escape: false,
          backdropclose: false,
          handleback: false,
          confirm_close: true,
          ondismiss: () => { setPayingPortal(false); },
        },
      };
      await initRazorpay(options);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setPayingPortal(false);
    }
  };

  const handleLogout = async () => { await signOut(); navigate("/"); };

  const handleRefresh = useCallback(async () => {
    if (!user) return;
    toast({ title: "Refreshing..." });
    await Promise.all([fetchProfile(user.id), fetchOrders(user.id), fetchEvents(user.id), fetchShopOrders(user.id)]);
    toast({ title: "Refreshed!" });
  }, [user]);

  const canBookEvent = profile?.event_booking_allowed || settings.event_booking_global.enabled;
  const dt = (settings as any).dashboard_tabs || { orders: true, events: true, shop: true, chat: true, payments: true, invoices: true, alerts: true, workshop: true, profile: true, settings: true };

  const handleBookEvent = () => {
    if (canBookEvent) {
      navigate("/book-event");
    } else {
      toast({ title: "🚀 Coming Soon!", description: "Event booking feature is coming soon. Stay tuned!" });
    }
  };

  if (loading || authLoading) return <div className="min-h-screen flex items-center justify-center font-sans text-muted-foreground">Loading...</div>;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0 overflow-x-hidden">
      <SEOHead title="My Dashboard" noindex />
      {/* App-style header */}
      {/* App-style header with glass effect */}
      <header className="sticky top-0 z-40 border-b border-border/20" style={{ background: "linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--muted)) 100%)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
        <div className="container mx-auto px-3 sm:px-4 py-3 flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-2.5 cursor-pointer" 
            onClick={() => navigate("/")}
            whileTap={{ scale: 0.95 }}
          >
            <div className="relative">
              <img src="/logo.png" alt="CCC" className="w-10 h-10 rounded-2xl shadow-lg border border-border/30" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }} />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-foreground leading-tight">Dashboard</h1>
              <p className="text-[10px] text-muted-foreground font-sans leading-none">Welcome back!</p>
            </div>
          </motion.div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <Button variant="ghost" size="sm" onClick={handleRefresh} className="font-sans h-9 w-9 p-0 rounded-xl">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="font-sans h-9 w-9 p-0 rounded-xl md:w-auto md:px-3">
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline ml-1">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-5xl px-2 sm:px-3 md:px-4 py-3 md:py-6">
        <LiveGreeting name={profile?.full_name} />

        {/* Payment Reminders */}
        {user && <PaymentReminderBanner userId={user.id} onPayOrder={handlePayNow} />}

        {/* Smart Suggestions */}
        <DashboardSuggestions orders={orders} events={events} shopOrders={shopOrders} profile={profile} navigate={navigate} canBookEvent={canBookEvent} />

        {/* Stat cards — vibrant 3D mobile-first */}
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {[
            { label: "Orders", value: orders.length, icon: Package, gradient: "from-blue-500 to-indigo-600", glow: "shadow-blue-500/25" },
            { label: "Events", value: events.length, icon: CalIcon, gradient: "from-violet-500 to-purple-600", glow: "shadow-violet-500/25" },
            { label: "Delivered", value: orders.filter(o => o.status === "delivered").length, icon: Truck, gradient: "from-emerald-500 to-green-600", glow: "shadow-emerald-500/25" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.08, type: "spring", stiffness: 260, damping: 20 }}
              whileHover={{ y: -4, scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className={`relative overflow-hidden rounded-2xl p-3 bg-gradient-to-br ${s.gradient} shadow-lg ${s.glow}`}
                style={{ transform: "perspective(600px) rotateX(2deg)", transformStyle: "preserve-3d" }}>
                {/* Glass overlay */}
                <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] rounded-2xl" />
                <div className="relative text-center text-white">
                  <div className="w-9 h-9 rounded-xl mx-auto mb-1.5 flex items-center justify-center bg-white/20 backdrop-blur-sm shadow-inner">
                    <s.icon className="w-4 h-4 text-white drop-shadow-sm" />
                  </div>
                  <p className="text-2xl font-bold font-display drop-shadow-sm">{s.value}</p>
                  <p className="text-[10px] text-white/80 font-sans font-medium">{s.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Shop Quick Stats */}
        {shopOrders.length > 0 && (
          <div className="grid grid-cols-1 gap-3 mb-6 sm:grid-cols-3">
            {[
              { label: "Shop Orders", value: shopOrders.length, icon: Store, gradient: "from-purple-500 to-violet-500", bgGradient: "from-purple-500/10 to-violet-500/5" },
              { label: "Shipped", value: shopOrders.filter(o => o.status === "shipped").length, icon: Truck, gradient: "from-amber-500 to-orange-500", bgGradient: "from-amber-500/10 to-orange-500/5" },
              { label: "Spent", value: `₹${shopOrders.filter(o => o.payment_status === "paid").reduce((s: number, o: any) => s + (o.total_amount || 0), 0).toLocaleString()}`, icon: CreditCard, gradient: "from-pink-500 to-rose-500", bgGradient: "from-pink-500/10 to-rose-500/5" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
              >
                <Card className="overflow-hidden relative border border-border/60 hover:border-border transition-all hover:shadow-md">
                  <div className={`absolute inset-0 bg-gradient-to-br ${s.bgGradient} pointer-events-none`} />
                  <CardContent className="p-3 relative">
                    <div className="text-center">
                      <p className="text-lg font-bold font-display animate-count-up">{s.value}</p>
                      <p className="text-[10px] text-muted-foreground font-sans">{s.label}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        <div className="hidden md:block">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 h-auto w-full flex-wrap justify-start">
              {dt.orders && <TabsTrigger value="orders" className="flex-1 font-sans"><Package className="w-4 h-4 mr-2" />Orders</TabsTrigger>}
              {dt.events && <TabsTrigger value="events" className="flex-1 font-sans"><CalIcon className="w-4 h-4 mr-2" />Events</TabsTrigger>}
              {dt.shop && settings.shop_nav_visible?.enabled !== false && (
                <TabsTrigger value="shop" className="flex-1 font-sans"><Store className="w-4 h-4 mr-2" />Shop</TabsTrigger>
              )}
              {dt.chat && <TabsTrigger value="chat" className="flex-1 font-sans"><MessageCircle className="w-4 h-4 mr-2" />Chat</TabsTrigger>}
              {dt.payments && <TabsTrigger value="payments" className="flex-1 font-sans"><Receipt className="w-4 h-4 mr-2" />Payments</TabsTrigger>}
              {dt.invoices && <TabsTrigger value="invoices" className="flex-1 font-sans"><FileText className="w-4 h-4 mr-2" />Invoices</TabsTrigger>}
              {dt.alerts && <TabsTrigger value="alerts" className="flex-1 font-sans"><Bell className="w-4 h-4 mr-2" />Alerts</TabsTrigger>}
              {dt.workshop && (settings as any).workshop_dashboard_visible?.enabled && (
                <TabsTrigger value="workshop" className="flex-1 font-sans"><GraduationCap className="w-4 h-4 mr-2" />Workshop</TabsTrigger>
              )}
              {dt.profile && <TabsTrigger value="profile" className="flex-1 font-sans"><User className="w-4 h-4 mr-2" />Profile</TabsTrigger>}
              {dt.settings && <TabsTrigger value="settings" className="flex-1 font-sans"><Settings className="w-4 h-4 mr-2" />Settings</TabsTrigger>}
            </TabsList>
            {dt.orders && <TabsContent value="orders"><OrdersList orders={orders} expandedOrder={expandedOrder} setExpandedOrder={setExpandedOrder} payingOrderId={payingOrderId} handlePayNow={handlePayNow} navigate={navigate} userId={user?.id} /></TabsContent>}
            {dt.events && <TabsContent value="events"><EventsList events={events} canBookEvent={canBookEvent} handleBookEvent={handleBookEvent} userId={user?.id} /></TabsContent>}
            {dt.shop && settings.shop_nav_visible?.enabled !== false && (
              <TabsContent value="shop"><ShopOrdersList shopOrders={shopOrders} navigate={navigate} /></TabsContent>
            )}
            {dt.chat && <TabsContent value="chat">{user && <ChatSection userId={user.id} userName={profile?.full_name || ""} />}</TabsContent>}
            {dt.payments && <TabsContent value="payments">{user && <PaymentHistory userId={user.id} />}</TabsContent>}
            {dt.invoices && <TabsContent value="invoices">{user && <InvoicesList userId={user.id} />}</TabsContent>}
            {dt.alerts && <TabsContent value="alerts">{user && <AlertsSection userId={user.id} />}</TabsContent>}
            {dt.workshop && (settings as any).workshop_dashboard_visible?.enabled && (
              <TabsContent value="workshop"><WorkshopSection profile={profile} user={user} navigate={navigate} /></TabsContent>
            )}
            {dt.profile && <TabsContent value="profile"><ProfileSection profile={profile} editing={editing} editForm={editForm} setEditing={setEditing} setEditForm={setEditForm} saveProfile={saveProfile} setProfile={setProfile} /></TabsContent>}
            {dt.settings && <TabsContent value="settings">
              <SettingsSection
                newSecretCode={newSecretCode} setNewSecretCode={setNewSecretCode} changeSecretCode={changeSecretCode} changingSecret={changingSecret}
                currentPassword={currentPassword} setCurrentPassword={setCurrentPassword} newPassword={newPassword} setNewPassword={setNewPassword}
                confirmNewPassword={confirmNewPassword} setConfirmNewPassword={setConfirmNewPassword} changePassword={changePassword} changingPassword={changingPassword}
              />
            </TabsContent>}
          </Tabs>
        </div>

        <div className="md:hidden">
          {activeTab === "orders" && dt.orders && <OrdersList orders={orders} expandedOrder={expandedOrder} setExpandedOrder={setExpandedOrder} payingOrderId={payingOrderId} handlePayNow={handlePayNow} navigate={navigate} userId={user?.id} />}
          {activeTab === "events" && dt.events && <EventsList events={events} canBookEvent={canBookEvent} handleBookEvent={handleBookEvent} userId={user?.id} />}
          {activeTab === "shop" && dt.shop && settings.shop_nav_visible?.enabled !== false && <ShopOrdersList shopOrders={shopOrders} navigate={navigate} />}
          {activeTab === "chat" && dt.chat && user && (
            <div className="fixed inset-0 z-40 bg-background flex flex-col" style={{ paddingBottom: "calc(56px + env(safe-area-inset-bottom))" }}>
              <ChatSection userId={user.id} userName={profile?.full_name || ""} fullScreen />
            </div>
          )}
          {activeTab === "payments" && dt.payments && user && <PaymentHistory userId={user.id} />}
          {activeTab === "invoices" && dt.invoices && user && <InvoicesList userId={user.id} />}
          {activeTab === "alerts" && dt.alerts && user && <AlertsSection userId={user.id} />}
          {activeTab === "workshop" && dt.workshop && (settings as any).workshop_dashboard_visible?.enabled && <WorkshopSection profile={profile} user={user} navigate={navigate} />}
          {activeTab === "profile" && dt.profile && <ProfileSection profile={profile} editing={editing} editForm={editForm} setEditing={setEditing} setEditForm={setEditForm} saveProfile={saveProfile} setProfile={setProfile} />}
          {activeTab === "settings" && dt.settings && (
            <SettingsSection
              newSecretCode={newSecretCode} setNewSecretCode={setNewSecretCode} changeSecretCode={changeSecretCode} changingSecret={changingSecret}
              currentPassword={currentPassword} setCurrentPassword={setCurrentPassword} newPassword={newPassword} setNewPassword={setNewPassword}
              confirmNewPassword={confirmNewPassword} setConfirmNewPassword={setConfirmNewPassword} changePassword={changePassword} changingPassword={changingPassword}
            />
          )}
        </div>

      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="bg-background/95 backdrop-blur-lg border-t border-border/30">
          <div className="flex items-center h-[56px] overflow-x-auto scrollbar-hide px-1 max-w-lg mx-auto">
            {[
              { icon: Home, key: "home", action: () => navigate("/") },
              ...(dt.orders ? [{ icon: Package, key: "orders", action: () => setActiveTab("orders") }] : []),
              ...(dt.events ? [{ icon: CalIcon, key: "events", action: () => setActiveTab("events") }] : []),
              ...(dt.shop && settings.shop_nav_visible?.enabled !== false ? [{ icon: Store, key: "shop", action: () => setActiveTab("shop") }] : []),
              ...(dt.chat ? [{ icon: MessageCircle, key: "chat", action: () => setActiveTab("chat") }] : []),
              ...(dt.payments ? [{ icon: CreditCard, key: "payments", action: () => setActiveTab("payments") }] : []),
              ...(dt.invoices ? [{ icon: FileText, key: "invoices", action: () => setActiveTab("invoices") }] : []),
              ...(dt.alerts ? [{ icon: Bell, key: "alerts", action: () => setActiveTab("alerts") }] : []),
              ...(dt.workshop && (settings as any).workshop_dashboard_visible?.enabled ? [{ icon: GraduationCap, key: "workshop", action: () => setActiveTab("workshop") }] : []),
              ...(dt.profile ? [{ icon: User, key: "profile", action: () => setActiveTab("profile") }] : []),
              ...(dt.settings ? [{ icon: Settings, key: "settings", action: () => setActiveTab("settings") }] : []),
            ].map((item, idx) => {
              const isActive = item.key === "home" ? false : activeTab === item.key;
              return (
                <motion.button key={`${item.key}-${idx}`} onClick={item.action} whileTap={{ scale: 0.75 }}
                  className="flex items-center justify-center min-w-[44px] w-12 h-14 relative flex-shrink-0">
                  <item.icon
                    className={`transition-all duration-200 ${isActive ? "text-foreground" : "text-muted-foreground/40"}`}
                    size={isActive ? 24 : 20}
                    strokeWidth={isActive ? 2.2 : 1.4}
                    fill={isActive && item.icon === Home ? "currentColor" : "none"}
                  />
                  {isActive && (
                    <motion.div layoutId="dash-insta-dot"
                      className="absolute bottom-1.5 w-1 h-1 rounded-full bg-foreground"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                  )}
                </motion.button>
              );
            })}
          </div>
          <div className="h-[env(safe-area-inset-bottom)]" />
        </div>
      </div>

      {/* Portal Payment Mandatory Popup - Cannot be closed until payment */}
      {portalPaymentRequest && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-foreground/55 px-2 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-border/60 bg-background shadow-2xl">
            <div className="border-b border-border/50 bg-gradient-to-br from-primary/15 via-background to-secondary/40 px-5 py-6 sm:px-6">
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut" }}
                className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-sm"
              >
                <CreditCard className="h-8 w-8" />
              </motion.div>
              <div className="space-y-2 text-left">
                <Badge className="border-none bg-primary/15 text-primary">Artist payment request</Badge>
                <h2 className="font-display text-2xl font-bold text-foreground">Your event is completed</h2>
                <p className="font-sans text-sm text-muted-foreground">
                  Please complete the remaining payment to close your booking and receive the final confirmation instantly.
                </p>
              </div>
            </div>

            <div className="space-y-4 p-5 sm:p-6">
              <div className="rounded-[1.5rem] border border-border/60 bg-muted/40 p-4">
                <p className="font-sans text-xs uppercase tracking-[0.2em] text-muted-foreground">Amount due</p>
                {(() => {
                  const gp = settings.gateway_charge_percentage?.percentage || 2.6;
                  const gcEnabled = profile?.gateway_charges_enabled !== false;
                  const base = portalPaymentRequest.amount;
                  const withGw = gcEnabled ? Math.ceil(base + (base * gp / 100)) : base;
                  return (
                    <>
                      <p className="mt-2 font-display text-4xl font-bold text-primary">
                        ₹{withGw.toLocaleString("en-IN")}
                      </p>
                      {gcEnabled && (
                        <p className="mt-1 font-sans text-[11px] text-muted-foreground">
                          Base: ₹{base.toLocaleString("en-IN")} + {gp}% gateway fee
                        </p>
                      )}
                    </>
                  );
                })()}
                {portalPaymentRequest.extra_hours > 0 && (
                  <p className="mt-2 font-sans text-xs text-muted-foreground">
                    Includes {portalPaymentRequest.extra_hours} extra hour(s) · ₹{portalPaymentRequest.extra_amount?.toLocaleString("en-IN")}
                  </p>
                )}
              </div>

              <div className="grid gap-2 rounded-2xl border border-border/50 bg-background p-3 sm:grid-cols-3">
                <div className="rounded-xl bg-muted/40 p-3">
                  <p className="font-sans text-[11px] text-muted-foreground">Status</p>
                  <p className="mt-1 font-sans text-sm font-semibold text-foreground capitalize">{portalPaymentRequest.status}</p>
                </div>
                <div className="rounded-xl bg-muted/40 p-3">
                  <p className="font-sans text-[11px] text-muted-foreground">Gateway</p>
                  <p className="mt-1 font-sans text-sm font-semibold text-foreground">Razorpay</p>
                </div>
                <div className="rounded-xl bg-muted/40 p-3">
                  <p className="font-sans text-[11px] text-muted-foreground">Access</p>
                  <p className="mt-1 font-sans text-sm font-semibold text-foreground">Live & instant</p>
                </div>
              </div>

              <Button
                onClick={handlePortalPayment}
                disabled={payingPortal}
                className="h-12 w-full rounded-2xl font-sans text-base"
                size="lg"
              >
                {payingPortal ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Opening secure payment...</>
                ) : (
                  <>Pay ₹{(() => {
                    const gp = settings.gateway_charge_percentage?.percentage || 2.6;
                    const gcEnabled = profile?.gateway_charges_enabled !== false;
                    const base = portalPaymentRequest.amount;
                    return gcEnabled ? Math.ceil(base + (base * gp / 100)).toLocaleString("en-IN") : base.toLocaleString("en-IN");
                  })()} now</>
                )}
              </Button>

              <p className="text-center font-sans text-[11px] text-muted-foreground">
                UPI, cards and net banking supported · this prompt stays active until payment is completed.
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Premium Payment Success Overlay */}
      <PaymentSuccessOverlay show={portalPaymentDone} onClose={() => setPortalPaymentDone(false)} />
    </div>
  );
};


const ChatSection = ({ userId, userName, fullScreen }: { userId: string; userName: string; fullScreen?: boolean }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase.from("chat_messages")
        .select("*")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq("deleted", false)
        .order("created_at", { ascending: true })
        .limit(100);
      if (data) setMessages(data);
    };
    fetchMessages();
    const ch = supabase.channel("user-chat-" + userId)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => fetchMessages())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  const sendMessage = async () => {
    if (!newMsg.trim()) return;
    setSending(true);
    await supabase.from("chat_messages").insert({ sender_id: userId, message: newMsg.trim(), is_admin: false, is_artist_chat: false });
    setNewMsg("");
    setSending(false);
  };

  return (
    <div className={fullScreen ? "flex flex-col h-full" : ""}>
      {!fullScreen && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2"><MessageCircle className="w-5 h-5 text-primary" />Chat with Admin</CardTitle>
          </CardHeader>
        </Card>
      )}
      {fullScreen && (
        <div className="flex items-center gap-2 p-3 border-b border-border bg-background">
          <MessageCircle className="w-5 h-5 text-primary" />
          <h3 className="font-display text-lg font-bold">Chat with Admin</h3>
        </div>
      )}
      <div className={`${fullScreen ? "flex-1 overflow-y-auto" : "px-4 pb-4"}`}>
        <div className={`${fullScreen ? "h-full p-3" : "h-64 overflow-y-auto border border-border rounded-xl p-3 bg-muted/20 mb-4"} space-y-2`}>
          {messages.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No messages yet. Start a conversation!</p>}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender_id === userId ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.sender_id === userId ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground"}`}>
                {m.message}
                <p className="text-[10px] opacity-60 mt-1">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="p-3 border-t border-border bg-background">
        <div className="flex gap-2">
          <Input value={newMsg} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewMsg(e.target.value)} placeholder="Type a message..."
            onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            className="flex-1 rounded-full" />
          <Button onClick={sendMessage} disabled={sending || !newMsg.trim()} size="sm" className="rounded-full px-4">Send</Button>
        </div>
      </div>
    </div>
  );
};


const SettingsSection = ({ newSecretCode, setNewSecretCode, changeSecretCode, changingSecret, currentPassword, setCurrentPassword, newPassword, setNewPassword, confirmNewPassword, setConfirmNewPassword, changePassword, changingPassword }: any) => (
  <div className="space-y-4">
    <Card>
      <CardHeader><CardTitle className="font-display text-lg flex items-center gap-2"><KeyRound className="w-5 h-5 text-primary" />Change Secret Code</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="font-sans">New 4-digit Secret Code</Label>
          <Input value={newSecretCode} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 4) setNewSecretCode(d); }} maxLength={4} type="password" placeholder="Enter new code" />
        </div>
        <Button onClick={changeSecretCode} disabled={newSecretCode.length !== 4 || changingSecret} className="w-full rounded-full font-sans bg-primary hover:bg-primary/90">
          {changingSecret ? "Updating..." : "Update Secret Code"}
        </Button>
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle className="font-display text-lg flex items-center gap-2"><Lock className="w-5 h-5 text-primary" />Change Password</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div><Label className="font-sans">Current Password</Label><Input type="password" value={currentPassword} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)} /></div>
        <div><Label className="font-sans">New Password (min 6 chars)</Label><Input type="password" value={newPassword} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)} /></div>
        <div><Label className="font-sans">Confirm New Password</Label><Input type="password" value={confirmNewPassword} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmNewPassword(e.target.value)} /></div>
        {newPassword && confirmNewPassword && newPassword !== confirmNewPassword && <p className="text-xs text-destructive font-sans">Passwords don't match</p>}
        <Button onClick={changePassword} disabled={!currentPassword || newPassword.length < 6 || newPassword !== confirmNewPassword || changingPassword} className="w-full rounded-full font-sans bg-primary hover:bg-primary/90">
          {changingPassword ? "Changing..." : "Change Password"}
        </Button>
      </CardContent>
    </Card>
  </div>
);

const OrdersList = ({ orders, expandedOrder, setExpandedOrder, payingOrderId, handlePayNow, navigate, userId }: any) => {
  const { settings: _siteSettings } = useSiteSettings();
  const caricatureOff = _siteSettings.custom_caricature_visible?.enabled === false;
  const [reviews, setReviews] = useState<Record<string, any>>({});
  const [adminReplies, setAdminReplies] = useState<Record<string, any>>({});
  const [artworkPhotos, setArtworkPhotos] = useState<Record<string, any[]>>({});
  const [artworkUrls, setArtworkUrls] = useState<Record<string, string>>({});
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
  const [artPreviewUrl, setArtPreviewUrl] = useState<string | null>(null);
  const [artZoom, setArtZoom] = useState(1);
  const [markingDelivered, setMarkingDelivered] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    const fetchReviews = async () => {
      const { data } = await supabase.from("reviews").select("*").eq("user_id", userId).eq("review_type", "order");
      if (data) {
        const map: Record<string, any> = {};
        data.forEach((r: any) => { if (r.order_id) map[r.order_id] = r; });
        setReviews(map);
        const replied: Record<string, any> = {};
        data.forEach((r: any) => { if (r.admin_reply && r.order_id) replied[r.order_id] = r; });
        setAdminReplies(replied);
      }
    };
    fetchReviews();
    const ch = supabase.channel("user-order-reviews")
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () => fetchReviews())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  // Fetch artwork photos for artwork_ready orders
  useEffect(() => {
    if (!userId) return;
    const artReadyOrders = orders.filter((o: any) => o.status === "artwork_ready" || o.art_confirmation_status);
    if (artReadyOrders.length === 0) return;
    const fetchArtwork = async () => {
      for (const order of artReadyOrders) {
        const { data } = await supabase.from("artwork_ready_photos").select("*").eq("order_id", order.id) as any;
        if (data && data.length > 0) {
          setArtworkPhotos(prev => ({ ...prev, [order.id]: data }));
          for (const p of data) {
            const { data: signed } = await supabase.storage.from("order-photos").createSignedUrl(p.storage_path, 3600);
            if (signed?.signedUrl) setArtworkUrls(prev => ({ ...prev, [p.id]: signed.signedUrl }));
          }
        }
      }
    };
    fetchArtwork();
    // Listen for artwork_ready_photos changes
    const ch = supabase.channel("user-artwork-photos")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "artwork_ready_photos" }, () => fetchArtwork())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [orders, userId]);

  const [slideIndex, setSlideIndex] = useState(0);

  const handleConfirmDispatch = async (orderId: string) => {
    if (!confirm("⚠️ Are you sure you want to confirm dispatch? This action cannot be undone.")) return;
    setConfirmingOrderId(orderId);
    await supabase.from("orders").update({ art_confirmation_status: "confirmed", status: "dispatched" as any } as any).eq("id", orderId);
    toast({ title: "✅ Dispatch confirmed!", description: "Your artwork has been confirmed and will be dispatched soon." });
    setConfirmingOrderId(null);
  };

  const handleRaiseChat = async (orderId: string) => {
    await supabase.from("orders").update({ art_confirmation_status: "chat" } as any).eq("id", orderId);
    const whatsappMsg = encodeURIComponent(`Hi, I have a query regarding my artwork caricature (Order #${orderId.slice(0, 8).toUpperCase()}). Please assist.`);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMsg}`, "_blank");
    toast({ title: "💬 Query raised on WhatsApp", description: "Admin will respond soon." });
  };

  const handleDownloadArtwork = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = fileName || "artwork.jpg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast({ title: "📥 Download started!" });
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    }
  };

  const handleMarkDelivered = async (orderId: string) => {
    setMarkingDelivered(orderId);
    await supabase.from("orders").update({ status: "delivered" as any } as any).eq("id", orderId);
    toast({ title: "📦 Marked as Delivered!", description: "Thank you for confirming delivery." });
    setMarkingDelivered(null);
  };

  return (
  <>
    <div className="flex justify-between items-center mb-4">
      <h2 className="font-display text-xl font-bold">My Orders</h2>
      {!caricatureOff && <Button onClick={() => navigate("/order")} className="rounded-full font-sans bg-primary hover:bg-primary/90" size="sm">+ New Order</Button>}
    </div>
    {orders.length === 0 ? (
      <Card><CardContent className="p-8 text-center">
        <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="font-sans text-muted-foreground mb-4">No orders yet</p>
        {!caricatureOff && <Button onClick={() => navigate("/order")} className="rounded-full font-sans bg-primary hover:bg-primary/90">Order Your Caricature</Button>}
      </CardContent></Card>
    ) : (
      <div className="space-y-3">
        {orders.map((order: any) => (
          <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}>
              <CardContent className="p-4 space-y-2">
                {/* Congratulations on delivery */}
                {order.status === "delivered" && (
                  <CelebrationBanner message="🎉 Congratulations! Your caricature has been delivered! 🎊" />
                )}
                {order.status === "delivered" && (
                  <div className="bg-card rounded-lg p-3 text-center border border-border">
                    <p className="font-body text-sm text-foreground font-medium">
                      Delivered on: {new Date(order.updated_at || order.created_at).toLocaleString("en-IN", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}
                    </p>
                  </div>
                )}
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</p>
                    <p className="font-sans font-medium capitalize">{order.order_type} Caricature — {order.style}</p>
                    <p className="text-xs text-muted-foreground font-sans">Ordered: {new Date(order.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}</p>
                  </div>
                  <p className="font-sans text-lg font-bold text-foreground">{formatPrice(order.amount)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className={`${STATUS_COLORS[order.status] || ""} border-none text-xs`}>{STATUS_LABELS[order.status] || order.status}</Badge>
                  <Badge className={`${order.payment_status === "confirmed" ? "bg-primary/30 text-foreground" : "bg-primary/10 text-foreground"} border-none text-xs`}>
                    <CreditCard className="w-3 h-3 mr-1" />Payment: {order.payment_status === "confirmed" ? "Confirmed ✅" : "Pending"}
                  </Badge>
                </div>
                {expandedOrder === order.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="border-t border-border pt-3 mt-2 space-y-2 text-sm font-sans" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                    <Row label="Faces" value={String(order.face_count)} />
                    {order.delivery_address && <Row label="Delivery" value={`${order.delivery_address}, ${order.delivery_city} - ${order.delivery_pincode}`} />}
                    {order.notes && <Row label="Notes" value={order.notes} />}
                    {order.artist_name && <Row label="Artist" value={order.artist_name} />}
                    <Row label="Expected Delivery" value={order.expected_delivery_date ? new Date(order.expected_delivery_date).toLocaleDateString("en-IN") : "25-30 days from order date"} />
                    {order.payment_status === "confirmed" && (
                      <div className="bg-green-50 rounded-lg p-3 space-y-1">
                        <p className="font-semibold text-green-800 text-xs">✅ Payment Confirmed</p>
                        {order.razorpay_payment_id && <Row label="Payment ID" value={order.razorpay_payment_id} />}
                        {order.razorpay_order_id && <Row label="Order Ref" value={order.razorpay_order_id} />}
                      </div>
                    )}
                    {order.payment_status !== "confirmed" && (
                      <div className="pt-2">
                        <Button size="sm" className="rounded-full font-sans w-full bg-primary hover:bg-primary/90" disabled={payingOrderId === order.id}
                          onClick={(e: React.MouseEvent) => { e.stopPropagation(); handlePayNow(order); }}>
                          {payingOrderId === order.id ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : <><CreditCard className="w-4 h-4 mr-2" /> Pay {formatPrice(order.amount)} Now</>}
                        </Button>
                      </div>
                    )}
                    {/* Art Ready Confirmation Section - only show if pending */}
                    {order.status === "artwork_ready" && (!order.art_confirmation_status || order.art_confirmation_status === "pending") && (
                      <div className="mt-3 bg-primary/5 rounded-xl p-4 space-y-3 border border-primary/20">
                        <p className="font-display text-sm font-bold text-primary">🎨 Your Artwork is Ready!</p>
                        <p className="text-xs font-sans text-muted-foreground">Please review your artwork and confirm to proceed with dispatch.</p>
                        {/* Show artwork photos */}
                        {artworkPhotos[order.id] && artworkPhotos[order.id].length > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            {artworkPhotos[order.id].map((p: any) => (
                              <div key={p.id} className="w-20 h-20 rounded-lg border border-border overflow-hidden cursor-pointer" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setArtPreviewUrl(artworkUrls[p.id] || null); setArtZoom(1); }}>
                                {artworkUrls[p.id] ? <img src={artworkUrls[p.id]} alt="Artwork" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-muted flex items-center justify-center"><Package className="w-6 h-6 text-muted-foreground" /></div>}
                              </div>
                            ))}
                          </div>
                        )}
                        {order.delivery_state && !["maharashtra"].includes(order.delivery_state?.toLowerCase()) && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                            <p className="text-[10px] text-yellow-800 font-sans">⚠️ Since your order is outside Mumbai, we do not provide a frame to prevent damage in transit (glass breakage).</p>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1 rounded-full font-sans bg-primary hover:bg-primary/90 text-xs" disabled={confirmingOrderId === order.id}
                            onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleConfirmDispatch(order.id); }}>
                            {confirmingOrderId === order.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <></>}
                            ✅ Confirm Dispatch
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 rounded-full font-sans text-xs"
                            onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleRaiseChat(order.id); }}>
                            💬 Raise Query
                          </Button>
                        </div>
                      </div>
                    )}
                    {/* Show artwork photos even after confirmation for viewing */}
                    {order.art_confirmation_status && order.art_confirmation_status !== "pending" && artworkPhotos[order.id] && artworkPhotos[order.id].length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-sans font-medium text-muted-foreground mb-2">🎨 Your Artwork:</p>
                        <div className="flex gap-2 flex-wrap">
                          {artworkPhotos[order.id].map((p: any) => (
                            <div key={p.id} className="w-20 h-20 rounded-lg border border-border overflow-hidden cursor-pointer" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setArtPreviewUrl(artworkUrls[p.id] || null); setArtZoom(1); }}>
                              {artworkUrls[p.id] ? <img src={artworkUrls[p.id]} alt="Artwork" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-muted flex items-center justify-center"><Package className="w-6 h-6 text-muted-foreground" /></div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {order.art_confirmation_status === "confirmed" && (
                      <div className="mt-3 bg-primary/10 rounded-lg p-3">
                        <p className="text-xs font-sans font-medium text-primary">✅ You confirmed artwork. Dispatch in progress!</p>
                      </div>
                    )}
                    {order.art_confirmation_status === "chat" && (
                      <div className="mt-3 bg-yellow-50 rounded-lg p-3">
                        <p className="text-xs font-sans font-medium text-yellow-800">💬 Query raised. Admin will respond soon via chat.</p>
                      </div>
                    )}
                    {/* Mark as Delivered button */}
                    {order.ask_user_delivered && order.status === "dispatched" && (
                      <div className="mt-3 bg-primary/5 rounded-xl p-4 space-y-2 border border-primary/20">
                        <p className="font-sans text-sm font-medium">📦 Have you received your caricature?</p>
                        <Button size="sm" className="w-full rounded-full font-sans bg-primary hover:bg-primary/90" disabled={markingDelivered === order.id}
                          onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleMarkDelivered(order.id); }}>
                          {markingDelivered === order.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <></>}
                          ✅ Yes, Mark as Delivered
                        </Button>
                      </div>
                    )}
                    {/* Review section for delivered orders */}
                    {order.status === "delivered" && !reviews[order.id] && userId && (
                      <div className="mt-3">
                        <ReviewForm userId={userId} orderId={order.id} reviewType="order" />
                      </div>
                    )}
                    {/* Show existing review */}
                    {reviews[order.id] && (
                      <div className="mt-3 bg-primary/5 rounded-xl p-3 space-y-2">
                        <div className="flex items-center gap-1">
                          <p className="text-xs font-semibold">Your Review:</p>
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(i => <Star key={i} className={`w-3 h-3 ${i <= reviews[order.id].rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />)}
                          </div>
                        </div>
                        {reviews[order.id].comment && <p className="text-xs">{reviews[order.id].comment}</p>}
                        {adminReplies[order.id]?.admin_reply && (
                          <div className="bg-card rounded-lg p-2 mt-1">
                            <p className="text-[10px] font-semibold text-primary">Admin Reply:</p>
                            <p className="text-xs">{adminReplies[order.id].admin_reply}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    )}
  {/* Full-screen Artwork Slideshow with Download */}
  {artPreviewUrl && (() => {
    // Find the order that this artwork belongs to for slideshow
    const currentOrderPhotos = Object.entries(artworkPhotos).find(([_, photos]) =>
      photos.some((p: any) => artworkUrls[p.id] === artPreviewUrl)
    );
    const slidePhotos = currentOrderPhotos ? currentOrderPhotos[1] : [];
    const currentSlideIdx = slidePhotos.findIndex((p: any) => artworkUrls[p.id] === artPreviewUrl);

    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4" onClick={() => { setArtPreviewUrl(null); setArtZoom(1); }}>
        <div className="flex gap-2 mb-4 flex-wrap justify-center" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="secondary" className="rounded-full font-sans" onClick={() => setArtZoom(z => Math.max(0.5, z - 0.25))}>− Zoom</Button>
          <Button size="sm" variant="secondary" className="rounded-full font-sans" onClick={() => setArtZoom(z => Math.min(3, z + 0.25))}>+ Zoom</Button>
          <Button size="sm" variant="secondary" className="rounded-full font-sans" onClick={() => handleDownloadArtwork(artPreviewUrl, slidePhotos[currentSlideIdx]?.file_name || "artwork.jpg")}>
            📥 Download
          </Button>
          <Button size="sm" variant="secondary" className="rounded-full font-sans" onClick={() => { setArtPreviewUrl(null); setArtZoom(1); }}>✕ Close</Button>
        </div>
        <div className="relative flex items-center justify-center w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
          {slidePhotos.length > 1 && currentSlideIdx > 0 && (
            <button className="absolute left-0 z-10 bg-white/20 hover:bg-white/40 rounded-full p-2 text-white" onClick={() => {
              const prev = slidePhotos[currentSlideIdx - 1];
              if (prev && artworkUrls[prev.id]) { setArtPreviewUrl(artworkUrls[prev.id]); setArtZoom(1); }
            }}>
              <ChevronUp className="w-6 h-6 rotate-[-90deg]" />
            </button>
          )}
          <div className="overflow-auto max-w-full max-h-[75vh]">
            <img src={artPreviewUrl} alt="Artwork Preview" className="rounded-xl shadow-2xl transition-transform duration-200" style={{ transform: `scale(${artZoom})`, transformOrigin: "center center" }} />
          </div>
          {slidePhotos.length > 1 && currentSlideIdx < slidePhotos.length - 1 && (
            <button className="absolute right-0 z-10 bg-white/20 hover:bg-white/40 rounded-full p-2 text-white" onClick={() => {
              const next = slidePhotos[currentSlideIdx + 1];
              if (next && artworkUrls[next.id]) { setArtPreviewUrl(artworkUrls[next.id]); setArtZoom(1); }
            }}>
              <ChevronDown className="w-6 h-6 rotate-[-90deg]" />
            </button>
          )}
        </div>
        {slidePhotos.length > 1 && (
          <p className="text-white/60 text-sm mt-3 font-sans">{currentSlideIdx + 1} / {slidePhotos.length}</p>
        )}
      </div>
    );
  })()}
  </>
  );
};

const ProfileSection = ({ profile, editing, editForm, setEditing, setEditForm, saveProfile }: any) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between">
      <CardTitle className="font-display text-lg">My Profile</CardTitle>
      {!editing ? (
        <Button variant="outline" size="sm" onClick={() => { setEditForm(profile); setEditing(true); }} className="font-sans"><Edit2 className="w-4 h-4 mr-1" /> Edit</Button>
      ) : (
        <div className="flex gap-2">
          <Button size="sm" onClick={saveProfile} className="font-sans bg-primary hover:bg-primary/90"><Save className="w-4 h-4 mr-1" />Save</Button>
          <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setEditForm(profile); }} className="font-sans"><X className="w-4 h-4" /></Button>
        </div>
      )}
    </CardHeader>
    <CardContent className="space-y-4">
      {editing && editForm ? (
        <>
          <div><Label className="font-sans">Full Name</Label><Input value={editForm.full_name || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, full_name: e.target.value })} /></div>
          <div><Label className="font-sans">Email (cannot be changed)</Label><Input value={editForm.email || ""} disabled className="opacity-60" /></div>
          <div><Label className="font-sans">Mobile (10 digits)</Label><Input value={editForm.mobile || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 10) setEditForm({ ...editForm, mobile: d }); }} maxLength={10} /></div>
          <div><Label className="font-sans">Instagram</Label><Input value={editForm.instagram_id || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, instagram_id: e.target.value })} /></div>
          <div><Label className="font-sans">Address</Label><Input value={editForm.address || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, address: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="font-sans">City</Label><Input value={editForm.city || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, city: e.target.value })} /></div>
            <div><Label className="font-sans">State</Label><Input value={editForm.state || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, state: e.target.value })} /></div>
          </div>
          <div><Label className="font-sans">Pincode</Label><Input value={editForm.pincode || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 6) setEditForm({ ...editForm, pincode: d }); }} maxLength={6} /></div>
        </>
      ) : profile ? (
        <div className="space-y-3 font-sans text-sm">
          <Row label="Name" value={profile.full_name || "—"} />
          <Row label="Email" value={profile.email || "—"} />
          <Row label="Mobile" value={profile.mobile ? `+91 ${profile.mobile}` : "—"} />
          <Row label="Instagram" value={profile.instagram_id || "—"} />
          <Row label="Full Address" value={[profile.address, profile.city, profile.state, profile.pincode].filter(Boolean).join(", ") || "—"} />
          <Row label="City" value={profile.city || "—"} />
          <Row label="State" value={profile.state || "—"} />
          <Row label="Pincode" value={profile.pincode || "—"} />
          <Row label="Secret Code" value={profile.secret_code || "Not set"} />
        </div>
      ) : (
        <p className="text-muted-foreground font-sans">No profile data found.</p>
      )}
    </CardContent>
  </Card>
);

const EventsList = ({ events, canBookEvent, handleBookEvent, userId }: { events: any[]; canBookEvent: boolean; handleBookEvent: () => void; userId?: string }) => {
  const [artistMap, setArtistMap] = useState<Record<string, { name: string; portfolio_url: string | null }>>({});
  const [eventArtists, setEventArtists] = useState<Record<string, string[]>>({}); // eventId -> artistIds
  const [payingEventId, setPayingEventId] = useState<string | null>(null);
  const [showPaymentCelebration, setShowPaymentCelebration] = useState(false);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [eventReviews, setEventReviews] = useState<Record<string, any>>({});
  const [partialConfig, setPartialConfig] = useState<{ enabled: boolean; partial_1_amount: number; partial_2_amount: number } | null>(null);

  // Fetch partial advance config for this user
  useEffect(() => {
    if (!userId) return;
    const fetchPartialConfig = async () => {
      const { data } = await supabase.from("user_partial_advance_config").select("*").eq("user_id", userId).maybeSingle() as any;
      if (data) setPartialConfig(data);
    };
    fetchPartialConfig();
    const ch = supabase.channel("user-partial-config")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_partial_advance_config", filter: `user_id=eq.${userId}` }, () => fetchPartialConfig())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  // Fetch all artists & assignments
  useEffect(() => {
    const fetchArtistData = async () => {
      // Fetch all artists
      const { data: allArtists } = await supabase.from("artists").select("id, name, portfolio_url");
      if (allArtists) {
        const map: typeof artistMap = {};
        for (const a of allArtists as any[]) {
          let portfolioUrl = a.portfolio_url;
          // If portfolio is stored in our storage, generate a signed URL
          if (portfolioUrl && !portfolioUrl.startsWith("http")) {
            const { data: signedData } = await supabase.storage.from("artist-portfolios").createSignedUrl(portfolioUrl, 3600);
            if (signedData?.signedUrl) portfolioUrl = signedData.signedUrl;
          } else if (portfolioUrl && portfolioUrl.includes("/storage/v1/object/public/artist-portfolios/")) {
            // Extract path from public URL and create signed URL
            const pathMatch = portfolioUrl.split("/artist-portfolios/")[1];
            if (pathMatch) {
              const { data: signedData } = await supabase.storage.from("artist-portfolios").createSignedUrl(pathMatch, 3600);
              if (signedData?.signedUrl) portfolioUrl = signedData.signedUrl;
            }
          }
          map[a.id] = { name: a.name, portfolio_url: portfolioUrl };
        }
        setArtistMap(map);
      }
      // Fetch assignments from event_artist_assignments
      const eventIds = events.map(e => e.id);
      if (eventIds.length > 0) {
        const { data: assignments } = await supabase.from("event_artist_assignments").select("event_id, artist_id").in("event_id", eventIds) as any;
        if (assignments) {
          const map: Record<string, string[]> = {};
          assignments.forEach((a: any) => {
            if (!map[a.event_id]) map[a.event_id] = [];
            map[a.event_id].push(a.artist_id);
          });
          setEventArtists(map);
        }
      }
    };
    fetchArtistData();
    // Real-time for assignments
    const ch = supabase.channel("user-artist-assignments")
      .on("postgres_changes", { event: "*", schema: "public", table: "event_artist_assignments" }, () => fetchArtistData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [events]);

  // Fetch event reviews
  useEffect(() => {
    if (!userId) return;
    const fetchEventReviews = async () => {
      const { data } = await supabase.from("reviews").select("*").eq("user_id", userId).eq("review_type", "event");
      if (data) {
        const map: Record<string, any> = {};
        data.forEach((r: any) => { if (r.booking_id) map[r.booking_id] = r; });
        setEventReviews(map);
      }
    };
    fetchEventReviews();
    const ch2 = supabase.channel("user-event-reviews")
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () => fetchEventReviews())
      .subscribe();
    return () => { supabase.removeChannel(ch2); };
  }, [userId]);

  const handlePayPartial2 = async (ev: any) => {
    // Pay partial 2 to complete advance
    setPayingEventId(ev.id);
    try {
      // Fetch partial advance config to get partial_2_amount
      const { data: config } = await supabase.from("user_partial_advance_config").select("*").eq("user_id", userId!).maybeSingle();
      const advanceAmount = ev.negotiated && ev.negotiated_advance ? ev.negotiated_advance : ev.advance_amount;
      const partial2Amount = config?.partial_2_amount || Math.ceil(advanceAmount / 2);

      const rzpData = await createRazorpayOrder(supabase, {
        amount: partial2Amount, order_id: ev.id, customer_name: ev.client_name, customer_email: ev.client_email, customer_mobile: ev.client_mobile,
      });

      const options = {
        key: rzpData.razorpay_key_id, amount: rzpData.amount, currency: rzpData.currency,
        name: "Creative Caricature Club™", description: `Event Advance - Partial 2`,
        image: "/logo.png", order_id: rzpData.razorpay_order_id,
        handler: async (response: any) => {
          try {
            await verifyRazorpayPayment(supabase, {
              razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature, order_id: ev.id, is_event_advance: true, is_partial_advance: true, partial_number: 2, advance_amount: partial2Amount,
            });
            playPaymentSuccessSound();
            toast({ title: "✅ Advance Payment Complete!", description: "Your full advance is now paid. Booking confirmed!" });
          } catch (err: any) {
            console.error("Partial 2 verification error:", err);
            toast({ title: "Payment Verification Issue", description: "If amount was deducted, it will be verified automatically. Contact support if needed.", variant: "destructive" });
          }
          setPayingEventId(null);
        },
        prefill: { name: ev.client_name, email: ev.client_email, contact: `+91${ev.client_mobile}` },
        theme: { color: "#E3DED3" },
        modal: { ondismiss: () => setPayingEventId(null) },
      };
      await initRazorpay(options);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setPayingEventId(null);
    }
  };

  const handlePayRemaining = async (ev: any) => {
    const totalAmount = ev.negotiated && ev.negotiated_total ? ev.negotiated_total : ev.total_price;
    const advanceAmount = ev.negotiated && ev.negotiated_advance ? ev.negotiated_advance : ev.advance_amount;
    const remaining = totalAmount - advanceAmount;
    if (remaining <= 0) return;

    setPayingEventId(ev.id);
    try {
      // Apply gateway fee
      const gatewayPercent = _siteSettings?.gateway_charge_percentage?.percentage || 2.6;
      const gatewayFee = Math.ceil(remaining * gatewayPercent / 100);
      const amountWithGateway = remaining + gatewayFee;

      const rzpData = await createRazorpayOrder(supabase, {
        amount: amountWithGateway, order_id: ev.id, customer_name: ev.client_name, customer_email: ev.client_email, customer_mobile: ev.client_mobile,
      });

      const options = {
        key: rzpData.razorpay_key_id, amount: rzpData.amount, currency: rzpData.currency,
        name: "Creative Caricature Club™", description: `Event Remaining Payment`,
        image: "/logo.png", order_id: rzpData.razorpay_order_id,
        handler: async (response: any) => {
          try {
            await verifyRazorpayPayment(supabase, {
              razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature, order_id: ev.id, is_event_remaining: true,
            });
            playPaymentSuccessSound();
            setShowPaymentCelebration(true);
            toast({ title: "🎉 Full Payment Received!", description: "Your event is now fully paid. Thank you!" });
            setTimeout(() => setShowPaymentCelebration(false), 8000);
          } catch (err: any) {
            console.error("Remaining payment verification error:", err);
            toast({ title: "Payment Verification Issue", description: "If amount was deducted, it will be verified automatically. Contact support if needed.", variant: "destructive" });
          }
          setPayingEventId(null);
        },
        prefill: { name: ev.client_name, email: ev.client_email, contact: `+91${ev.client_mobile}` },
        theme: { color: "#E3DED3" },
        modal: { ondismiss: () => setPayingEventId(null) },
      };
      await initRazorpay(options);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setPayingEventId(null);
    }
  };

  // Get payment history for an event
  const [paymentDates, setPaymentDates] = useState<Record<string, { advance_date?: string; full_date?: string }>>({});
  useEffect(() => {
    const bookingIds = events.map(e => e.id);
    if (bookingIds.length > 0) {
      supabase.from("payment_history").select("booking_id, payment_type, created_at").in("booking_id", bookingIds)
        .then(({ data }) => {
          if (data) {
            const map: Record<string, { advance_date?: string; full_date?: string }> = {};
            data.forEach((p: any) => {
              if (!map[p.booking_id]) map[p.booking_id] = {};
              if (p.payment_type === "event_advance") map[p.booking_id].advance_date = p.created_at;
              if (p.payment_type === "event_remaining") map[p.booking_id].full_date = p.created_at;
            });
            setPaymentDates(map);
          }
        });
    }
  }, [events]);

  return (
    <>
      {showPaymentCelebration && (
        <div className="mb-4">
          <CelebrationBanner message="🎉 Full Payment Received! You're all set! ✅" onDismiss={() => setShowPaymentCelebration(false)} />
        </div>
      )}
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-display text-xl font-bold">My Events</h2>
        <Button onClick={handleBookEvent} className={`rounded-full font-sans ${canBookEvent ? "bg-primary hover:bg-primary/90" : "bg-muted text-muted-foreground hover:bg-muted"}`} size="sm">
          {canBookEvent ? "+ Book Event" : <><Sparkles className="w-3 h-3 mr-1" />Book Event</>}
        </Button>
      </div>
      {!canBookEvent && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mb-4 border-primary/20 bg-primary/5">
            <CardContent className="p-4 text-center">
              <Sparkles className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="font-display text-lg font-bold text-foreground">Event Booking — Coming Soon! 🚀</p>
              <p className="text-sm text-muted-foreground font-sans mt-1">We're working on bringing live caricature event booking to you. Stay tuned!</p>
            </CardContent>
          </Card>
        </motion.div>
      )}
      {events.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <CalIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-sans text-muted-foreground mb-4">No events booked yet</p>
          {canBookEvent && (
            <Button onClick={handleBookEvent} className="rounded-full font-sans bg-primary hover:bg-primary/90">Book an Event</Button>
          )}
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {events.map((ev: any) => {
            const isPartial1Paid = ev.payment_status === "partial_1_paid";
            const advancePaid = ev.payment_status === "confirmed" || ev.payment_status === "fully_paid";
            const fullyPaid = ev.payment_status === "fully_paid";
            const totalAmount = ev.negotiated && ev.negotiated_total ? ev.negotiated_total : ev.total_price;
            const advanceAmount = ev.negotiated && ev.negotiated_advance ? ev.negotiated_advance : ev.advance_amount;
            const remaining = fullyPaid ? 0 : totalAmount - advanceAmount;
            const assignedArtistIds = eventArtists[ev.id] || (ev.assigned_artist_id ? [ev.assigned_artist_id] : []);
            const assignedArtists = assignedArtistIds.map((id: string) => artistMap[id]).filter(Boolean);
            const isExpanded = expandedEventId === ev.id;
            const dates = paymentDates[ev.id] || {};

            return (
              <motion.div key={ev.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardContent className="p-4 space-y-2">
                    {/* Event Countdown */}
                    {ev.status === "upcoming" && (() => {
                      const [year, month, day] = ev.event_date.split("-").map(Number);
                      const today = new Date();
                      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                      const eventDate = new Date(year, month - 1, day);
                      const daysLeft = Math.round((eventDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
                      if (daysLeft > 0) {
                        return (
                          <div className="bg-primary/10 rounded-xl p-3 text-center">
                            <p className="font-display text-2xl font-bold text-primary">{daysLeft}</p>
                            <p className="text-xs font-sans text-muted-foreground">
                              {daysLeft === 1 ? "✨ Tomorrow is the big day!" : daysLeft <= 7 ? `🎉 Just ${daysLeft} days to go! Get ready!` : `📅 Days until your special event`}
                            </p>
                          </div>
                        );
                      } else if (daysLeft === 0) {
                        return (
                          <div className="bg-green-100 rounded-xl p-3 text-center">
                            <p className="font-display text-lg font-bold text-green-800">🎊 Today is the Day!</p>
                            <p className="text-xs font-sans text-green-700">Enjoy your event! Have an amazing time!</p>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    {/* Completed Event - Completion Notice with shareable summary */}
                    {ev.status === "completed" && (
                      <EventCompletionNotice event={ev} assignedArtists={assignedArtists} />
                    )}
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-sans font-medium capitalize">{EVENT_TYPES.find((t: any) => t.value === ev.event_type)?.label || ev.event_type}</p>
                        <p className="text-xs text-muted-foreground font-sans">
                          {new Date(ev.event_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} · {ev.event_start_time} - {ev.event_end_time}
                        </p>
                        <p className="text-xs text-muted-foreground font-sans">{ev.venue_name}, {ev.city}, {ev.state}</p>
                        <p className="text-xs text-muted-foreground font-sans mt-1">Booked: {new Date(ev.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}</p>
                      </div>
                      <p className="font-display text-lg font-bold text-primary">{formatPrice(totalAmount)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={`${EVENT_STATUS_COLORS[ev.status]} border-none text-xs`}>{EVENT_STATUS_LABELS[ev.status]}</Badge>
                      {fullyPaid ? (
                        <Badge className="border-none text-xs bg-green-100 text-green-800">
                          <CreditCard className="w-3 h-3 mr-1" />Fully Paid ✅
                        </Badge>
                      ) : advancePaid ? (
                        <Badge className="border-none text-xs bg-blue-100 text-blue-800">
                          <CreditCard className="w-3 h-3 mr-1" />Advance Received
                        </Badge>
                      ) : isPartial1Paid ? (
                        <Badge className="border-none text-xs bg-orange-100 text-orange-800">
                          <CreditCard className="w-3 h-3 mr-1" />Partial 1 Paid
                        </Badge>
                      ) : (
                        <Badge className="border-none text-xs bg-amber-100 text-amber-800">
                          <CreditCard className="w-3 h-3 mr-1" />Payment Pending
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">{ev.artist_count} Artist{ev.artist_count > 1 ? "s" : ""}</Badge>
                    </div>

                    {/* Artist Info */}
                    {assignedArtists.length > 0 && (
                      <div className="bg-primary/5 rounded-lg p-3 text-sm font-sans space-y-2">
                        <p className="font-medium">🎨 Your Artist{assignedArtists.length > 1 ? "s" : ""}:</p>
                        {assignedArtists.map((a: any, i: number) => (
                          <div key={i} className="flex items-center justify-between">
                            <span>{a.name}</span>
                            {a.portfolio_url && (
                              <a
                                href={a.portfolio_url.startsWith("http") ? a.portfolio_url : `https://${a.portfolio_url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                              >
                                <Button size="sm" variant="outline" className="rounded-full text-xs font-sans">
                                  📄 Portfolio
                                </Button>
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Flight Ticket Upload for outside Mumbai events with advance paid */}
                    {userId && (advancePaid || fullyPaid) && !ev.is_mumbai && (
                      <FlightTicketUpload
                        eventId={ev.id}
                        userId={userId}
                        isOutsideMumbai={!ev.is_mumbai}
                        advancePaid={advancePaid || fullyPaid}
                      />
                    )}

                    {/* Real-time Payment Status Tracker */}
                    {userId && (
                      <PaymentStatusTracker
                        bookingId={ev.id}
                        totalAmount={totalAmount}
                        advanceAmount={advanceAmount}
                        paymentStatus={ev.payment_status}
                        userId={userId}
                      />
                    )}

                    {/* Pay partial 2 to complete advance - ONLY if PaymentStatusTracker not handling it */}

                    {/* Pay remaining balance button (green) */}
                    {remaining > 0 && advancePaid && !fullyPaid && (
                      <div className="space-y-2">
                        <p className="text-xs font-sans bg-green-50 text-green-700 rounded-lg p-3 font-medium border border-green-200">
                          ✅ Advance paid! Remaining balance {formatPrice(remaining)} can be paid now or at the event.
                        </p>
                        <Button
                          size="sm"
                          className="rounded-full font-sans w-full bg-green-600 hover:bg-green-700 text-white"
                          disabled={payingEventId === ev.id}
                          onClick={() => handlePayRemaining(ev)}
                        >
                          {payingEventId === ev.id ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                          ) : (
                            <><CreditCard className="w-4 h-4 mr-2" /> Pay Remaining {formatPrice(remaining)}</>
                          )}
                        </Button>
                      </div>
                    )}

                    {/* Show Event Details toggle (for completed/fully paid) */}
                    {(ev.status === "completed" || fullyPaid) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full rounded-full font-sans text-xs"
                        onClick={() => setExpandedEventId(isExpanded ? null : ev.id)}
                      >
                        {isExpanded ? <><ChevronUp className="w-3 h-3 mr-1" />Hide Details</> : <><ChevronDown className="w-3 h-3 mr-1" />Show Event Details</>}
                      </Button>
                    )}

                    {isExpanded && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="border-t border-border pt-3 space-y-2 text-sm font-sans">
                        <Row label="Booking ID" value={ev.id.slice(0, 8).toUpperCase()} />
                        <Row label="Booked On" value={new Date(ev.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} />
                        <Row label="Event Date" value={new Date(ev.event_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} />
                        <Row label="Time" value={`${ev.event_start_time} - ${ev.event_end_time}`} />
                        <Row label="Venue" value={`${ev.venue_name}, ${ev.city}`} />
                        <Row label="Artists" value={String(ev.artist_count)} />
                        {assignedArtists.length > 0 && <Row label="Assigned Artist(s)" value={assignedArtists.map((a: any) => a.name).join(", ")} />}
                        {dates.advance_date && <Row label="Advance Paid On" value={new Date(dates.advance_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} />}
                        {dates.full_date && <Row label="Full Payment On" value={new Date(dates.full_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} />}
                        <Row label="Total Amount" value={formatPrice(totalAmount)} />
                        {/* Review for completed events */}
                        {ev.status === "completed" && !eventReviews[ev.id] && userId && (
                          <div className="mt-3">
                            <ReviewForm userId={userId} bookingId={ev.id} reviewType="event" />
                          </div>
                        )}
                        {eventReviews[ev.id] && (
                          <div className="mt-3 bg-primary/5 rounded-xl p-3 space-y-2">
                            <div className="flex items-center gap-1">
                              <p className="text-xs font-semibold">Your Review:</p>
                              <div className="flex gap-0.5">
                                {[1,2,3,4,5].map(i => <Star key={i} className={`w-3 h-3 ${i <= eventReviews[ev.id].rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />)}
                              </div>
                            </div>
                            {eventReviews[ev.id].comment && <p className="text-xs">{eventReviews[ev.id].comment}</p>}
                            {eventReviews[ev.id].admin_reply && (
                              <div className="bg-card rounded-lg p-2 mt-1">
                                <p className="text-[10px] font-semibold text-primary">Admin Reply:</p>
                                <p className="text-xs">{eventReviews[ev.id].admin_reply}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </>
  );
};

const SHOP_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  processing: "bg-blue-50 text-blue-700 border border-blue-200",
  shipped: "bg-cyan-50 text-cyan-700 border border-cyan-200",
  delivered: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  cancelled: "bg-red-50 text-red-700 border border-red-200",
};

const ShopOrdersList = ({ shopOrders, navigate }: { shopOrders: any[]; navigate: any }) => {
  const [expandedShopOrder, setExpandedShopOrder] = useState<string | null>(null);
  const [shopFilter, setShopFilter] = useState("all");

  const filteredShopOrders = shopOrders.filter(o => shopFilter === "all" || o.status === shopFilter);
  const totalSpent = shopOrders.filter(o => o.payment_status === "paid").reduce((s: number, o: any) => s + (o.total_amount || 0), 0);

  const statusCounts = {
    all: shopOrders.length,
    pending: shopOrders.filter(o => o.status === "pending").length,
    processing: shopOrders.filter(o => o.status === "processing").length,
    shipped: shopOrders.filter(o => o.status === "shipped").length,
    delivered: shopOrders.filter(o => o.status === "delivered").length,
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-display text-xl font-bold">My Shop Orders</h2>
        <Button onClick={() => navigate("/shop")} className="rounded-full font-sans bg-primary hover:bg-primary/90" size="sm">
          <Store className="w-4 h-4 mr-1" />Shop Now
        </Button>
      </div>

      {/* Quick shop stats */}
      {shopOrders.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: "Total", value: shopOrders.length, emoji: "📦" },
            { label: "Active", value: statusCounts.processing + statusCounts.shipped, emoji: "🔄" },
            { label: "Delivered", value: statusCounts.delivered, emoji: "✅" },
            { label: "Spent", value: `₹${totalSpent.toLocaleString()}`, emoji: "💰" },
          ].map((s, i) => (
            <div key={i} className="text-center bg-muted/30 rounded-xl p-2">
              <span className="text-lg">{s.emoji}</span>
              <p className="text-sm font-bold font-display">{s.value}</p>
              <p className="text-[9px] text-muted-foreground font-sans">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      {shopOrders.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-3">
          {(["all", "pending", "processing", "shipped", "delivered"] as const).map(s => (
            <Button key={s} size="sm" variant={shopFilter === s ? "default" : "outline"} 
              className="text-[10px] h-6 rounded-full capitalize" onClick={() => setShopFilter(s)}>
              {s} ({statusCounts[s]})
            </Button>
          ))}
        </div>
      )}

      {shopOrders.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <Store className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-sans text-muted-foreground mb-4">No shop orders yet</p>
          <Button onClick={() => navigate("/shop")} className="rounded-full font-sans bg-primary hover:bg-primary/90">Browse Shop</Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filteredShopOrders.map((order: any) => {
            const isExpanded = expandedShopOrder === order.id;
            return (
              <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setExpandedShopOrder(isExpanded ? null : order.id)}>
                  <CardContent className="p-4 space-y-3">
                    {order.status === "delivered" && (
                      <CelebrationBanner message="🎉 Your order has been delivered! 🛍️" />
                    )}
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-mono text-xs text-muted-foreground">{order.order_number}</p>
                        <p className="text-xs text-muted-foreground font-sans">
                          {new Date(order.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}
                        </p>
                      </div>
                      <p className="font-display text-lg font-bold text-primary">{formatPrice(order.total_amount)}</p>
                    </div>

                    {/* Status Progress Bar */}
                    <div className="flex items-center gap-1">
                      {["pending", "processing", "shipped", "delivered"].map((step, idx) => {
                        const steps = ["pending", "processing", "shipped", "delivered"];
                        const currentIdx = steps.indexOf(order.status);
                        const done = idx <= currentIdx && order.status !== "cancelled";
                        return (
                          <div key={step} className="flex-1 flex flex-col items-center gap-0.5">
                            <div className={`w-full h-1.5 rounded-full ${done ? "bg-primary" : "bg-muted"}`} />
                            <span className={`text-[8px] font-sans capitalize ${done ? "text-primary font-semibold" : "text-muted-foreground"}`}>{step}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge className={`${SHOP_STATUS_COLORS[order.status] || "bg-muted text-foreground"} border-none text-xs capitalize`}>
                        {order.status === "shipped" ? <><Truck className="w-3 h-3 mr-1" />Shipped</> : order.status}
                      </Badge>
                      <Badge className={`${order.payment_status === "paid" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"} border-none text-xs`}>
                        <CreditCard className="w-3 h-3 mr-1" />{order.payment_status === "paid" ? "Paid ✅" : "Pending"}
                      </Badge>
                      {order.tracking_number && (
                        <Badge variant="outline" className="text-xs">🚚 {order.tracking_number}</Badge>
                      )}
                    </div>

                    {/* Items */}
                    {order.shop_order_items?.length > 0 && (
                      <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                        {order.shop_order_items.map((item: any, i: number) => (
                          <div key={i} className="flex justify-between text-xs font-sans">
                            <span>{item.product_name} × {item.quantity}</span>
                            <span className="font-medium">{formatPrice(item.unit_price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Expanded Details */}
                    {isExpanded && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="border-t border-border pt-3 space-y-2">
                        <div className="text-xs font-sans space-y-1">
                          <Row label="Order ID" value={order.id.slice(0, 8).toUpperCase()} />
                          <Row label="Shipping" value={`${order.shipping_address || ""}, ${order.shipping_city || ""}, ${order.shipping_state || ""} - ${order.shipping_pincode || ""}`} />
                          {order.tracking_number && <Row label="Tracking #" value={order.tracking_number} />}
                          {order.shipped_at && <Row label="Shipped On" value={new Date(order.shipped_at).toLocaleDateString("en-IN")} />}
                          {order.delivered_at && <Row label="Delivered On" value={new Date(order.delivered_at).toLocaleDateString("en-IN")} />}
                          {order.razorpay_payment_id && <Row label="Payment ID" value={order.razorpay_payment_id} />}
                          {order.admin_notes && (
                            <div className="bg-primary/5 rounded-lg p-2 mt-2">
                              <p className="text-[10px] font-semibold text-primary">Admin Note:</p>
                              <p className="text-xs">{order.admin_notes}</p>
                            </div>
                          )}
                        </div>
                        {/* Reorder button */}
                        <Button size="sm" variant="outline" className="rounded-full w-full text-xs" onClick={(e) => { e.stopPropagation(); navigate("/shop"); }}>
                          <ShoppingBag className="w-3 h-3 mr-1" /> Reorder / Browse Shop
                        </Button>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </>
  );
};

/* Alerts Section - Inline notifications */
const AlertsSection = ({ userId }: { userId: string }) => {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    fetchNotifications();
    const ch = supabase.channel(`user-alerts-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => fetchNotifications())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  const fetchNotifications = async () => {
    const { data } = await supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
    if (data) setNotifications(data);
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    fetchNotifications();
  };

  const markAllRead = async () => {
    await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
    fetchNotifications();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-display text-xl font-bold flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" /> Alerts
          {unreadCount > 0 && <Badge className="bg-primary text-primary-foreground text-xs">{unreadCount}</Badge>}
        </h2>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} className="font-sans text-xs rounded-full">Mark All Read</Button>
        )}
      </div>
      {notifications.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-sans text-muted-foreground">No notifications yet</p>
        </CardContent></Card>
      ) : (
        notifications.map((n) => (
          <motion.div key={n.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className={`cursor-pointer transition-all ${!n.read ? "border-primary/30 bg-primary/5" : ""}`}
              onClick={() => { if (!n.read) markRead(n.id); if (n.link) window.location.href = n.link; }}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <p className={`font-sans text-sm ${!n.read ? "font-bold" : "font-medium"}`}>{n.title}</p>
                    <p className="text-xs text-muted-foreground font-sans mt-1">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 font-sans mt-2">
                      {new Date(n.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true })}
                    </p>
                  </div>
                  {!n.read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))
      )}
    </div>
  );
};

/* Workshop Section - Registration from dashboard */
const WorkshopSection = ({ profile, user, navigate }: { profile: any; user: any; navigate: any }) => {
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("workshops").select("*").eq("is_active", true).limit(1);
      if (data) setWorkshops(data);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <div className="text-center py-8"><p className="text-muted-foreground font-sans">Loading...</p></div>;

  const activeWorkshop = workshops[0];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-display text-xl font-bold flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-primary" /> Workshop
        </h2>
      </div>

      {activeWorkshop ? (
        <Card className="border-primary/20">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-lg font-bold">{activeWorkshop.title}</h3>
                {activeWorkshop.dates && <p className="text-sm text-muted-foreground font-sans">📅 {activeWorkshop.dates}</p>}
                {activeWorkshop.duration && <p className="text-sm text-muted-foreground font-sans">⏱ {activeWorkshop.duration}</p>}
                {activeWorkshop.price && <p className="text-sm font-sans font-semibold text-primary mt-1">💰 {activeWorkshop.price}</p>}
              </div>
              <Badge className={`${activeWorkshop.status === "active" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"} border-none`}>
                {activeWorkshop.status === "active" ? "Enrolling" : activeWorkshop.status}
              </Badge>
            </div>
            {activeWorkshop.description && (
              <p className="text-sm text-muted-foreground font-sans">{activeWorkshop.description}</p>
            )}
            {activeWorkshop.highlights?.length > 0 && (
              <div className="space-y-1">
                {activeWorkshop.highlights.map((h: string, i: number) => (
                  <p key={i} className="text-xs font-sans text-muted-foreground">✅ {h}</p>
                ))}
              </div>
            )}
            <Button onClick={() => navigate("/workshop")} className="w-full rounded-full font-sans bg-primary hover:bg-primary/90 mb-2">
              <GraduationCap className="w-4 h-4 mr-2" /> View Workshop & Register
            </Button>
            <Button variant="outline" onClick={() => navigate("/workshop/dashboard")} className="w-full rounded-full font-sans">
              Open Workshop Dashboard
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card><CardContent className="p-8 text-center">
          <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-sans text-muted-foreground mb-2">No active workshops right now</p>
          <p className="text-xs text-muted-foreground font-sans">Check back soon for upcoming workshops!</p>
        </CardContent></Card>
      )}
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between py-1">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-right max-w-[60%]">{value}</span>
  </div>
);

const InvoicesList = ({ userId }: { userId: string }) => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("invoices").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      if (data) setInvoices(data);
      setLoading(false);
    };
    fetch();
  }, [userId]);

  const downloadInvoice = (inv: any) => {
    const isEvent = inv.invoice_type === "event_booking";
    const items = Array.isArray(inv.items) ? inv.items : (typeof inv.items === "string" ? JSON.parse(inv.items || "[]") : []);
    const isAdvance = items.some((i: any) => /advance/i.test(i.name || ""));
    const isRemaining = items.some((i: any) => /remaining/i.test(i.name || ""));

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${inv.invoice_number}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;padding:40px;color:#3a2e22;max-width:800px;margin:auto;background:#fdf8f3}
.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #3a2e22;padding-bottom:20px;margin-bottom:30px}
.brand{display:flex;align-items:center;gap:12px}.brand img{width:48px;height:48px;border-radius:12px}
.brand-name{font-size:22px;font-weight:800;color:#3a2e22}.brand-tm{font-size:10px;vertical-align:super}
.inv-num{font-size:14px;color:#8b7355;margin-top:4px}
.meta{text-align:right;font-size:13px;color:#6b5b47;line-height:1.8}
.section{margin-bottom:24px}.section h3{font-size:13px;text-transform:uppercase;color:#3a2e22;letter-spacing:1px;margin-bottom:8px;font-weight:700}
.detail{font-size:14px;line-height:1.7;color:#5a4a36}
table{width:100%;border-collapse:collapse;margin:20px 0}th{background:#f0e8dc;text-align:left;padding:10px 14px;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#6b5b47;border-bottom:2px solid #d4c4a8}
td{padding:10px 14px;font-size:14px;border-bottom:1px solid #f0e8dc}
.total-row td{font-weight:700;font-size:16px;border-top:2px solid #3a2e22;color:#3a2e22}
.balance-row td{font-weight:600;font-size:14px;color:#b8860b;background:#fef9e7}
.footer{margin-top:40px;padding-top:20px;border-top:1px solid #d4c4a8;text-align:center;font-size:12px;color:#8b7355}
.badge{display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;background:${inv.status==='paid'||inv.status==='generated'?'#ecfdf5;color:#059669':'#f0e8dc;color:#6b5b47'}}
.thank-you{background:linear-gradient(135deg,#fdf8f3,#f0e8dc);border:1px solid #d4c4a8;border-radius:12px;padding:20px;text-align:center;margin-top:30px}
.thank-you h3{color:#3a2e22;font-size:18px;margin-bottom:4px}.thank-you p{color:#8b7355;font-size:13px}
@media print{body{padding:20px;background:#fff}}</style></head><body>
<div class="header"><div class="brand"><img src="${window.location.origin}/logo.png" alt="CCC" /><div><div class="brand-name">Creative Caricature Club<span class="brand-tm">™</span></div><div class="inv-num">${inv.invoice_number}</div></div></div>
<div class="meta">Date: ${new Date(inv.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}<br>Status: <span class="badge">${(inv.status==='generated'?'PAID':inv.status).toUpperCase()}</span><br>${isAdvance ? '<span style="color:#b8860b;font-weight:600">⚡ Advance Payment</span>' : isRemaining ? '<span style="color:#059669;font-weight:600">✅ Full Payment</span>' : ''}</div></div>
<div class="section"><h3>Bill To</h3><div class="detail">${inv.customer_name}<br>${inv.customer_email}<br>${inv.customer_mobile}</div></div>
<table><thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead><tbody>
${items.map((i: any) => `<tr><td>${i.name || inv.invoice_type}</td><td style="text-align:right">₹${Number(i.total || i.price || inv.amount).toLocaleString('en-IN')}</td></tr>`).join('')}
${inv.tax_amount > 0 ? `<tr><td>Tax / GST</td><td style="text-align:right">₹${Number(inv.tax_amount).toLocaleString('en-IN')}</td></tr>` : ''}
<tr class="total-row"><td>${isAdvance ? 'Advance Paid' : 'Total'}</td><td style="text-align:right">₹${Number(inv.total_amount).toLocaleString('en-IN')}</td></tr>
</tbody></table>
${inv.payment_method ? `<div class="section"><h3>Payment</h3><div class="detail">Method: ${inv.payment_method}${inv.payment_id ? ` • ID: ${inv.payment_id}` : ''}</div></div>` : ''}
${inv.notes ? `<div class="section"><h3>Notes</h3><div class="detail">${inv.notes}</div></div>` : ''}
${isRemaining ? '<div class="thank-you"><h3>🎉 Thank You!</h3><p>Your live caricature booking is fully paid. We look forward to making your event memorable!</p></div>' : ''}
${isAdvance ? '<div class="thank-you"><h3>🎨 Booking Confirmed!</h3><p>Your advance payment has been received. The remaining balance will be collected at the event.</p></div>' : ''}
${!isEvent ? '<div class="thank-you"><h3>🎨 Thank You for Your Order!</h3><p>Your custom caricature is being crafted with love. We appreciate your trust in Creative Caricature Club™</p></div>' : ''}
<div class="footer">Creative Caricature Club™ • Premium Caricature Services Across India<br>This is a computer-generated invoice.</div>
<script>window.onload=()=>window.print()</script></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  if (loading) return <div className="py-8 text-center text-muted-foreground font-sans"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>;

  if (invoices.length === 0) return (
    <Card><CardContent className="p-8 text-center">
      <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
      <p className="text-muted-foreground font-sans">No invoices yet</p>
    </CardContent></Card>
  );

  return (
    <div className="space-y-3">
      <h3 className="font-display text-lg font-bold flex items-center gap-2"><FileText className="w-5 h-5 text-primary" />Your Invoices</h3>
      {invoices.map(inv => (
        <Card key={inv.id} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-mono text-sm font-bold">{inv.invoice_number}</p>
                <p className="text-xs text-muted-foreground font-sans">{new Date(inv.created_at).toLocaleDateString()} • {inv.invoice_type}</p>
              </div>
              <Badge className={inv.status === "paid" || inv.status === "generated" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-muted text-muted-foreground"}>{inv.status === "generated" ? "paid" : inv.status}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-bold text-primary">{formatPrice(inv.total_amount)}</p>
              <Button variant="outline" size="sm" className="rounded-full font-sans" onClick={() => downloadInvoice(inv)}>
                <Download className="w-3.5 h-3.5 mr-1" />Download
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const DashboardSuggestions = ({ orders, events, shopOrders, profile, navigate, canBookEvent }: any) => {
  const { settings: _siteSettings2 } = useSiteSettings();
  const caricatureOff = _siteSettings2.custom_caricature_visible?.enabled === false;
  const suggestions: { icon: any; text: string; action: () => void; color: string }[] = [];

  const pendingPayment = orders.find((o: any) => o.payment_status !== "confirmed");
  if (pendingPayment) {
    suggestions.push({ icon: CreditCard, text: `Complete payment for order #${pendingPayment.id.slice(0, 8).toUpperCase()}`, action: () => {}, color: "hsl(0,65%,55%)" });
  }

  const inProgressOrder = orders.find((o: any) => o.status === "in_progress");
  if (inProgressOrder) {
    suggestions.push({ icon: Sparkles, text: `Your caricature is being crafted! Check order details`, action: () => {}, color: "hsl(210,65%,55%)" });
  }

  if (orders.length === 0 && !caricatureOff) {
    suggestions.push({ icon: Package, text: "Order your first custom caricature today!", action: () => navigate("/order"), color: "hsl(36,45%,52%)" });
  }

  if (events.length === 0 && canBookEvent) {
    suggestions.push({ icon: CalIcon, text: "Book a live caricature artist for your next event", action: () => navigate("/book-event"), color: "hsl(280,50%,55%)" });
  }

  const upcomingEvent = events.find((e: any) => new Date(e.event_date) > new Date());
  if (upcomingEvent) {
    const daysLeft = Math.ceil((new Date(upcomingEvent.event_date).getTime() - Date.now()) / 86400000);
    suggestions.push({ icon: CalIcon, text: `Event in ${daysLeft} days — ${upcomingEvent.event_type} at ${upcomingEvent.city}`, action: () => {}, color: "hsl(152,50%,48%)" });
  }

  if (!profile?.address) {
    suggestions.push({ icon: User, text: "Complete your profile for faster checkout", action: () => {}, color: "hsl(38,92%,55%)" });
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {suggestions.slice(0, 3).map((s, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          onClick={s.action}
          className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border cursor-pointer hover:shadow-sm transition-shadow"
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: s.color }}>
            <s.icon className="w-4 h-4 text-white" />
          </div>
          <p className="text-sm font-body text-foreground">{s.text}</p>
        </motion.div>
      ))}
    </div>
  );
};

export default Dashboard;
