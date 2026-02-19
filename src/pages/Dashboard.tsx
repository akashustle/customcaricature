import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/pricing";
import { toast } from "@/hooks/use-toast";
import { LogOut, Edit2, Save, X, MessageCircle, Package, User, Home, CreditCard, Loader2, ShoppingBag, Settings, Lock, KeyRound, RefreshCw, Calendar as CalIcon, Sparkles, Receipt, ChevronDown, ChevronUp, Star } from "lucide-react";
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
import ChatWidget from "@/components/ChatWidget";
import NotificationBell from "@/components/NotificationBell";

declare global {
  interface Window { Razorpay: any; }
}

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
  razorpay_payment_id: string | null; razorpay_order_id: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  new: "New Order", in_progress: "In Progress", artwork_ready: "Artwork Ready",
  dispatched: "Dispatched", delivered: "Delivered",
};
const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800", in_progress: "bg-yellow-100 text-yellow-800",
  artwork_ready: "bg-purple-100 text-purple-800", dispatched: "bg-primary/10 text-primary",
  delivered: "bg-green-100 text-green-800",
};
const WHATSAPP_NUMBER = "918369594271";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { settings } = useSiteSettings();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [events, setEvents] = useState<any[]>([]);
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

  // Track user location in real-time
  useLocationTracker(user?.id ?? null);

  useEffect(() => {
    if (!authLoading && !user) { navigate("/login"); return; }
    if (user) {
      // Role-based redirect: admins and artists should not be here
      const checkRole = async () => {
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
        if (roles && roles.length > 0) { navigate("/admin"); return; }
        const { data: artistData } = await (supabase.from("artists").select("id") as any).eq("auth_user_id", user.id).maybeSingle();
        if (artistData) { navigate("/artist-dashboard"); return; }
      };
      checkRole();

      fetchProfile(user.id);
      fetchOrders(user.id);
      fetchEvents(user.id);
      const channel = supabase
        .channel("user-dashboard")
        .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` }, () => fetchOrders(user.id))
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` }, () => fetchProfile(user.id))
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` }, () => {
          toast({ title: "Account Deleted", description: "Your account has been deleted. Please register or login again.", variant: "destructive" });
          supabase.auth.signOut().then(() => navigate("/register"));
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "event_bookings", filter: `user_id=eq.${user.id}` }, () => fetchEvents(user.id))
        .on("postgres_changes", { event: "*", schema: "public", table: "payment_history", filter: `user_id=eq.${user.id}` }, () => {
          fetchOrders(user.id);
          fetchEvents(user.id);
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [user, authLoading]);

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
      .select("id, order_type, style, face_count, amount, status, payment_status, payment_verified, created_at, updated_at, customer_name, customer_email, customer_mobile, delivery_address, delivery_city, delivery_state, delivery_pincode, notes, expected_delivery_date, artist_name, razorpay_payment_id, razorpay_order_id")
      .eq("user_id", userId).order("created_at", { ascending: false });
    if (data) setOrders(data as any);
  };

  const fetchEvents = async (userId: string) => {
    const { data } = await supabase.from("event_bookings").select("*").eq("user_id", userId).order("event_date", { ascending: false });
    if (data) setEvents(data as any);
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
      const { data: rzpData, error: rzpError } = await supabase.functions.invoke("create-razorpay-order", {
        body: { amount: order.amount, order_id: order.id, customer_name: order.customer_name, customer_email: order.customer_email, customer_mobile: order.customer_mobile },
      });
      if (rzpError || !rzpData?.razorpay_order_id) throw new Error(rzpError?.message || "Failed to create payment order");

      const options = {
        key: rzpData.razorpay_key_id, amount: rzpData.amount, currency: rzpData.currency,
        name: "Creative Caricature Club", description: `${order.order_type} Caricature - ${order.style}`,
        image: "/logo.png", order_id: rzpData.razorpay_order_id,
        handler: async (response: any) => {
          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke("verify-razorpay-payment", {
              body: { razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature, order_id: order.id },
            });
            if (verifyError || !verifyData?.verified) throw new Error("Verification failed");
            toast({ title: "Payment Successful!" });
            if (user) fetchOrders(user.id);
          } catch { toast({ title: "Verification Failed", description: "Contact support: " + order.id.slice(0, 8).toUpperCase(), variant: "destructive" }); }
          setPayingOrderId(null);
        },
        prefill: { name: order.customer_name, email: order.customer_email, contact: `+91${order.customer_mobile}` },
        theme: { color: "#E3DED3" },
        modal: { ondismiss: () => setPayingOrderId(null) },
      };
      new window.Razorpay(options).open();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setPayingOrderId(null);
    }
  };

  const handleLogout = async () => { await signOut(); navigate("/"); };

  const handleRefresh = useCallback(async () => {
    if (!user) return;
    toast({ title: "Refreshing..." });
    await Promise.all([fetchProfile(user.id), fetchOrders(user.id), fetchEvents(user.id)]);
    toast({ title: "Refreshed!" });
  }, [user]);

  const canBookEvent = profile?.event_booking_allowed || settings.event_booking_global.enabled;

  const handleBookEvent = () => {
    if (canBookEvent) {
      navigate("/book-event");
    } else {
      toast({ title: "🚀 Coming Soon!", description: "Event booking feature is coming soon. Stay tuned!" });
    }
  };

  if (loading || authLoading) return <div className="min-h-screen flex items-center justify-center font-sans text-muted-foreground">Loading...</div>;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <img src="/logo.png" alt="CCC" className="w-8 h-8 rounded-full" />
            <h1 className="font-display text-lg font-bold">My Dashboard</h1>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <Button variant="ghost" size="sm" onClick={handleRefresh} className="font-sans"><RefreshCw className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="font-sans"><Home className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="font-sans hidden md:flex"><LogOut className="w-4 h-4 mr-1" /> Logout</Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <LiveGreeting name={profile?.full_name} />

        <div className="hidden md:block">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full mb-6">
              <TabsTrigger value="orders" className="flex-1 font-sans"><Package className="w-4 h-4 mr-2" />Orders</TabsTrigger>
              <TabsTrigger value="events" className="flex-1 font-sans"><CalIcon className="w-4 h-4 mr-2" />Events</TabsTrigger>
              <TabsTrigger value="payments" className="flex-1 font-sans"><Receipt className="w-4 h-4 mr-2" />Payments</TabsTrigger>
              <TabsTrigger value="profile" className="flex-1 font-sans"><User className="w-4 h-4 mr-2" />Profile</TabsTrigger>
              <TabsTrigger value="settings" className="flex-1 font-sans"><Settings className="w-4 h-4 mr-2" />Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="orders"><OrdersList orders={orders} expandedOrder={expandedOrder} setExpandedOrder={setExpandedOrder} payingOrderId={payingOrderId} handlePayNow={handlePayNow} navigate={navigate} userId={user?.id} /></TabsContent>
            <TabsContent value="events"><EventsList events={events} canBookEvent={canBookEvent} handleBookEvent={handleBookEvent} userId={user?.id} /></TabsContent>
            <TabsContent value="payments">{user && <PaymentHistory userId={user.id} />}</TabsContent>
            <TabsContent value="profile"><ProfileSection profile={profile} editing={editing} editForm={editForm} setEditing={setEditing} setEditForm={setEditForm} saveProfile={saveProfile} setProfile={setProfile} /></TabsContent>
            <TabsContent value="settings">
              <SettingsSection
                newSecretCode={newSecretCode} setNewSecretCode={setNewSecretCode} changeSecretCode={changeSecretCode} changingSecret={changingSecret}
                currentPassword={currentPassword} setCurrentPassword={setCurrentPassword} newPassword={newPassword} setNewPassword={setNewPassword}
                confirmNewPassword={confirmNewPassword} setConfirmNewPassword={setConfirmNewPassword} changePassword={changePassword} changingPassword={changingPassword}
              />
            </TabsContent>
          </Tabs>
        </div>

        <div className="md:hidden">
          {activeTab === "orders" && <OrdersList orders={orders} expandedOrder={expandedOrder} setExpandedOrder={setExpandedOrder} payingOrderId={payingOrderId} handlePayNow={handlePayNow} navigate={navigate} userId={user?.id} />}
          {activeTab === "events" && <EventsList events={events} canBookEvent={canBookEvent} handleBookEvent={handleBookEvent} userId={user?.id} />}
          {activeTab === "payments" && user && <PaymentHistory userId={user.id} />}
          {activeTab === "profile" && <ProfileSection profile={profile} editing={editing} editForm={editForm} setEditing={setEditing} setEditForm={setEditForm} saveProfile={saveProfile} setProfile={setProfile} />}
          {activeTab === "settings" && (
            <SettingsSection
              newSecretCode={newSecretCode} setNewSecretCode={setNewSecretCode} changeSecretCode={changeSecretCode} changingSecret={changingSecret}
              currentPassword={currentPassword} setCurrentPassword={setCurrentPassword} newPassword={newPassword} setNewPassword={setNewPassword}
              confirmNewPassword={confirmNewPassword} setConfirmNewPassword={setConfirmNewPassword} changePassword={changePassword} changingPassword={changingPassword}
            />
          )}
        </div>

        {/* Chat Widget */}
        {user && profile && (
          <ChatWidget userId={user.id} userName={profile.full_name} />
        )}

        <div className="mt-6">
          <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi! I need help with my order.")}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-full py-3 px-4 font-sans font-medium text-sm hover:opacity-90 transition-opacity">
            <MessageCircle className="w-4 h-4" /> WhatsApp Support
          </a>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-md border-t border-border">
        <div className="flex items-center justify-around py-2">
          <BottomNavItem icon={Home} label="Home" active={false} onClick={() => navigate("/")} />
          <BottomNavItem icon={ShoppingBag} label="Orders" active={activeTab === "orders"} onClick={() => setActiveTab("orders")} />
          <BottomNavItem icon={CalIcon} label="Events" active={activeTab === "events"} onClick={() => setActiveTab("events")} />
          <BottomNavItem icon={Receipt} label="Payments" active={activeTab === "payments"} onClick={() => setActiveTab("payments")} />
          <BottomNavItem icon={User} label="Profile" active={activeTab === "profile"} onClick={() => setActiveTab("profile")} />
          <BottomNavItem icon={Settings} label="Settings" active={activeTab === "settings"} onClick={() => setActiveTab("settings")} />
          <BottomNavItem icon={LogOut} label="Logout" active={false} onClick={handleLogout} />
        </div>
      </div>
    </div>
  );
};

const BottomNavItem = ({ icon: Icon, label, active, onClick }: { icon: any; label: string; active: boolean; onClick: () => void }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}>
    <Icon className="w-5 h-5" />
    <span className="text-[10px] font-sans font-medium">{label}</span>
  </button>
);

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
  const [reviews, setReviews] = useState<Record<string, any>>({});
  const [adminReplies, setAdminReplies] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!userId) return;
    const fetchReviews = async () => {
      const { data } = await supabase.from("reviews").select("*").eq("user_id", userId).eq("review_type", "order");
      if (data) {
        const map: Record<string, any> = {};
        data.forEach((r: any) => { if (r.order_id) map[r.order_id] = r; });
        setReviews(map);
        // Check for new admin replies
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

  return (
  <>
    <div className="flex justify-between items-center mb-4">
      <h2 className="font-display text-xl font-bold">My Orders</h2>
      <Button onClick={() => navigate("/order")} className="rounded-full font-sans bg-primary hover:bg-primary/90" size="sm">+ New Order</Button>
    </div>
    {orders.length === 0 ? (
      <Card><CardContent className="p-8 text-center">
        <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="font-sans text-muted-foreground mb-4">No orders yet</p>
        <Button onClick={() => navigate("/order")} className="rounded-full font-sans bg-primary hover:bg-primary/90">Order Your Caricature</Button>
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
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="font-sans text-sm text-green-700 font-medium">
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
                  <p className="font-display text-lg font-bold text-primary">{formatPrice(order.amount)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className={`${STATUS_COLORS[order.status] || ""} border-none text-xs`}>{STATUS_LABELS[order.status] || order.status}</Badge>
                  <Badge className={`${order.payment_status === "confirmed" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"} border-none text-xs`}>
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
          <Row label="Address" value={profile.address || "—"} />
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

  // Fetch all artists & assignments
  useEffect(() => {
    const fetchArtistData = async () => {
      // Fetch all artists
      const { data: allArtists } = await supabase.from("artists").select("id, name, portfolio_url");
      if (allArtists) {
        const map: typeof artistMap = {};
        allArtists.forEach((a: any) => { map[a.id] = { name: a.name, portfolio_url: a.portfolio_url }; });
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

  const handlePayRemaining = async (ev: any) => {
    const totalAmount = ev.negotiated && ev.negotiated_total ? ev.negotiated_total : ev.total_price;
    const advanceAmount = ev.negotiated && ev.negotiated_advance ? ev.negotiated_advance : ev.advance_amount;
    const remaining = totalAmount - advanceAmount;
    if (remaining <= 0) return;

    setPayingEventId(ev.id);
    try {
      const { data: rzpData, error: rzpError } = await supabase.functions.invoke("create-razorpay-order", {
        body: { amount: remaining, order_id: ev.id, customer_name: ev.client_name, customer_email: ev.client_email, customer_mobile: ev.client_mobile },
      });
      if (rzpError || !rzpData?.razorpay_order_id) throw new Error(rzpError?.message || "Failed to create payment order");

      const options = {
        key: rzpData.razorpay_key_id, amount: rzpData.amount, currency: rzpData.currency,
        name: "Creative Caricature Club", description: `Event Remaining Payment`,
        image: "/logo.png", order_id: rzpData.razorpay_order_id,
        handler: async (response: any) => {
          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke("verify-razorpay-payment", {
              body: { razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature, order_id: ev.id, is_event_remaining: true },
            });
            if (verifyError) throw new Error("Verification failed");
            if (verifyData?.verified || verifyData?.success) {
              setShowPaymentCelebration(true);
              toast({ title: "🎉 Full Payment Received!", description: "Your event is now fully paid. Thank you!" });
              setTimeout(() => setShowPaymentCelebration(false), 8000);
            } else {
              throw new Error("Verification failed");
            }
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
      new window.Razorpay(options).open();
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

                    {/* Pay remaining button */}
                    {remaining > 0 && advancePaid && !fullyPaid && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground font-sans bg-muted/50 rounded-lg p-2">
                          💡 Remaining {formatPrice(remaining)} is payable at the event. You can also pay now if you wish.
                        </p>
                        <Button
                          size="sm"
                          className="rounded-full font-sans w-full bg-primary hover:bg-primary/90"
                          disabled={payingEventId === ev.id}
                          onClick={() => handlePayRemaining(ev)}
                        >
                          {payingEventId === ev.id ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                          ) : (
                            <><CreditCard className="w-4 h-4 mr-2" /> Pay {formatPrice(remaining)} Now</>
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

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between py-1">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-right max-w-[60%]">{value}</span>
  </div>
);

export default Dashboard;
