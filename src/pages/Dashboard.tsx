import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/pricing";
import { toast } from "@/hooks/use-toast";
import { LogOut, Edit2, Save, X, MessageCircle, Package, User, Home, CreditCard, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

declare global {
  interface Window {
    Razorpay: any;
  }
}

type Profile = {
  full_name: string;
  mobile: string;
  email: string;
  instagram_id: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
};

type Order = {
  id: string;
  order_type: string;
  style: string;
  face_count: number;
  amount: number;
  status: string;
  payment_status: string | null;
  payment_verified: boolean | null;
  created_at: string;
  customer_name: string;
  customer_email: string;
  customer_mobile: string;
  delivery_address: string | null;
  delivery_city: string | null;
  delivery_state: string | null;
  delivery_pincode: string | null;
  notes: string | null;
  expected_delivery_date: string | null;
  artist_name: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  new: "New Order",
  in_progress: "In Progress",
  artwork_ready: "Artwork Ready",
  dispatched: "Dispatched",
  delivered: "Delivered",
  completed: "Completed",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  artwork_ready: "bg-purple-100 text-purple-800",
  dispatched: "bg-orange-100 text-orange-800",
  delivered: "bg-green-100 text-green-800",
  completed: "bg-green-200 text-green-900",
};

const WHATSAPP_NUMBER = "918369594271";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }
    if (user) {
      fetchProfile(user.id);
      fetchOrders(user.id);
      const channel = supabase
        .channel("user-dashboard")
        .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` }, () => {
          fetchOrders(user.id);
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` }, () => {
          fetchProfile(user.id);
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [user, authLoading]);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
    if (data) { setProfile(data as any); setEditForm(data as any); }
    setLoading(false);
  };

  const fetchOrders = async (userId: string) => {
    const { data } = await supabase.from("orders")
      .select("id, order_type, style, face_count, amount, status, payment_status, payment_verified, created_at, customer_name, customer_email, customer_mobile, delivery_address, delivery_city, delivery_state, delivery_pincode, notes, expected_delivery_date, artist_name")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (data) setOrders(data as any);
  };

  const saveProfile = async () => {
    if (!editForm || !user) return;
    const { error } = await supabase.from("profiles").update({
      full_name: editForm.full_name,
      mobile: editForm.mobile,
      instagram_id: editForm.instagram_id,
      address: editForm.address,
      city: editForm.city,
      state: editForm.state,
      pincode: editForm.pincode,
    }).eq("user_id", user.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setProfile(editForm);
      setEditing(false);
      toast({ title: "Profile Updated" });
    }
  };

  const handlePayNow = async (order: Order) => {
    setPayingOrderId(order.id);
    try {
      const { data: rzpData, error: rzpError } = await supabase.functions.invoke("create-razorpay-order", {
        body: {
          amount: order.amount,
          order_id: order.id,
          customer_name: order.customer_name,
          customer_email: order.customer_email,
          customer_mobile: order.customer_mobile,
        },
      });

      if (rzpError || !rzpData?.razorpay_order_id) {
        throw new Error(rzpError?.message || "Failed to create payment order");
      }

      const options = {
        key: rzpData.razorpay_key_id,
        amount: rzpData.amount,
        currency: rzpData.currency,
        name: "Creative Caricature Club",
        description: `${order.order_type} Caricature - ${order.style}`,
        image: "/logo.png",
        order_id: rzpData.razorpay_order_id,
        handler: async (response: any) => {
          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke("verify-razorpay-payment", {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                order_id: order.id,
              },
            });
            if (verifyError || !verifyData?.verified) {
              throw new Error("Payment verification failed");
            }
            toast({ title: "Payment Successful!", description: "Your payment has been confirmed." });
            if (user) fetchOrders(user.id);
          } catch (err: any) {
            toast({ title: "Payment Verification Failed", description: "Contact support with order ID: " + order.id.slice(0, 8).toUpperCase(), variant: "destructive" });
          }
          setPayingOrderId(null);
        },
        prefill: {
          name: order.customer_name,
          email: order.customer_email,
          contact: `+91${order.customer_mobile}`,
        },
        theme: { color: "#E8633B" },
        modal: {
          ondismiss: () => {
            setPayingOrderId(null);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to initiate payment", variant: "destructive" });
      setPayingOrderId(null);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  if (loading || authLoading) return <div className="min-h-screen flex items-center justify-center font-sans text-muted-foreground">Loading...</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="CCC" className="w-8 h-8 rounded-full" />
            <h1 className="font-display text-lg font-bold">My Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="font-sans">
              <Home className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="font-sans">
              <LogOut className="w-4 h-4 mr-1" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <Tabs defaultValue="orders">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="orders" className="flex-1 font-sans"><Package className="w-4 h-4 mr-2" />My Orders</TabsTrigger>
            <TabsTrigger value="profile" className="flex-1 font-sans"><User className="w-4 h-4 mr-2" />Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <div className="flex justify-end mb-4">
              <Button onClick={() => navigate("/order")} className="rounded-full font-sans" size="sm">
                + New Order
              </Button>
            </div>
            {orders.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="font-sans text-muted-foreground mb-4">No orders yet</p>
                  <Button onClick={() => navigate("/order")} className="rounded-full font-sans">Order Your Caricature</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Card
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                    >
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</p>
                            <p className="font-sans font-medium capitalize">{order.order_type} Caricature — {order.style}</p>
                            <p className="text-xs text-muted-foreground font-sans">
                              Ordered: {new Date(order.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            </p>
                          </div>
                          <p className="font-display text-lg font-bold text-primary">{formatPrice(order.amount)}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge className={`${STATUS_COLORS[order.status] || ""} border-none text-xs`}>
                            {STATUS_LABELS[order.status] || order.status}
                          </Badge>
                          <Badge className={`${order.payment_status === "confirmed" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"} border-none text-xs`}>
                            <CreditCard className="w-3 h-3 mr-1" />
                            Payment: {order.payment_status === "confirmed" ? "Confirmed ✅" : "Pending"}
                          </Badge>
                        </div>

                        {expandedOrder === order.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="border-t border-border pt-3 mt-2 space-y-2 text-sm font-sans"
                          >
                            <Row label="Faces" value={String(order.face_count)} />
                            {order.delivery_address && (
                              <Row label="Delivery" value={`${order.delivery_address}, ${order.delivery_city} - ${order.delivery_pincode}`} />
                            )}
                            {order.notes && <Row label="Notes" value={order.notes} />}
                            {order.artist_name && <Row label="Artist" value={order.artist_name} />}
                            <Row label="Expected Delivery" value={
                              order.expected_delivery_date
                                ? new Date(order.expected_delivery_date).toLocaleDateString("en-IN")
                                : "25-30 days from order date"
                            } />
                            {order.payment_status !== "confirmed" && (
                              <div className="pt-2">
                                <Button
                                  size="sm"
                                  className="rounded-full font-sans w-full"
                                  disabled={payingOrderId === order.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePayNow(order);
                                  }}
                                >
                                  {payingOrderId === order.id ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                                  ) : (
                                    <><CreditCard className="w-4 h-4 mr-2" /> Pay {formatPrice(order.amount)} Now</>
                                  )}
                                </Button>
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
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-display text-lg">My Details</CardTitle>
                {!editing ? (
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="font-sans">
                    <Edit2 className="w-4 h-4 mr-1" /> Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveProfile} className="font-sans"><Save className="w-4 h-4 mr-1" />Save</Button>
                    <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setEditForm(profile); }} className="font-sans"><X className="w-4 h-4" /></Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {editing && editForm ? (
                  <>
                    <div><Label className="font-sans">Full Name</Label><Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} /></div>
                    <div><Label className="font-sans">Mobile</Label><Input value={editForm.mobile} onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 10) setEditForm({ ...editForm, mobile: d }); }} maxLength={10} /></div>
                    <div><Label className="font-sans">Instagram</Label><Input value={editForm.instagram_id || ""} onChange={(e) => setEditForm({ ...editForm, instagram_id: e.target.value })} /></div>
                    <div><Label className="font-sans">Address</Label><Input value={editForm.address || ""} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="font-sans">City</Label><Input value={editForm.city || ""} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} /></div>
                      <div><Label className="font-sans">State</Label><Input value={editForm.state || ""} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })} /></div>
                    </div>
                    <div><Label className="font-sans">Pincode</Label><Input value={editForm.pincode || ""} onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 6) setEditForm({ ...editForm, pincode: d }); }} maxLength={6} /></div>
                  </>
                ) : profile ? (
                  <div className="space-y-2 font-sans text-sm">
                    <Row label="Name" value={profile.full_name} />
                    <Row label="Mobile" value={`+91 ${profile.mobile}`} />
                    <Row label="Email" value={profile.email} />
                    {profile.instagram_id && <Row label="Instagram" value={profile.instagram_id} />}
                    {profile.address && <Row label="Address" value={profile.address} />}
                    {profile.city && <Row label="City" value={profile.city} />}
                    {profile.state && <Row label="State" value={profile.state} />}
                    {profile.pincode && <Row label="Pincode" value={profile.pincode} />}
                  </div>
                ) : (
                  <p className="text-muted-foreground font-sans">No profile data</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6">
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi! I need help with my order.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-[#25D366] text-white rounded-full py-3 px-4 font-sans font-medium text-sm hover:opacity-90 transition-opacity"
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp Support
          </a>
        </div>
      </div>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-right max-w-[60%]">{value}</span>
  </div>
);

export default Dashboard;
