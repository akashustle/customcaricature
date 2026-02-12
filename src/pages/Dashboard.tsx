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
import { LogOut, Edit2, Save, X, MessageCircle, Package, User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";

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
  created_at: string;
  customer_name: string;
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
const INSTAGRAM_URL = "https://www.instagram.com/creativecaricatureclub";

const Dashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login"); return; }
    fetchProfile(session.user.id);
    fetchOrders(session.user.id);
  };

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
    if (data) { setProfile(data as any); setEditForm(data as any); }
    setLoading(false);
  };

  const fetchOrders = async (userId: string) => {
    const { data } = await supabase.from("orders").select("id, order_type, style, face_count, amount, status, payment_status, created_at, customer_name").eq("user_id", userId).order("created_at", { ascending: false });
    if (data) setOrders(data as any);
  };

  const saveProfile = async () => {
    if (!editForm) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { error } = await supabase.from("profiles").update({
      full_name: editForm.full_name,
      mobile: editForm.mobile,
      instagram_id: editForm.instagram_id,
      address: editForm.address,
      city: editForm.city,
      state: editForm.state,
      pincode: editForm.pincode,
    }).eq("user_id", session.user.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setProfile(editForm);
      setEditing(false);
      toast({ title: "Profile Updated" });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-sans text-muted-foreground">Loading...</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="CCC" className="w-8 h-8 rounded-full" />
            <h1 className="font-display text-lg font-bold">My Dashboard</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="font-sans">
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <Tabs defaultValue="orders">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="orders" className="flex-1 font-sans"><Package className="w-4 h-4 mr-2" />My Orders</TabsTrigger>
            <TabsTrigger value="profile" className="flex-1 font-sans"><User className="w-4 h-4 mr-2" />Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
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
                    <Card>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</p>
                            <p className="font-sans font-medium capitalize">{order.order_type} Caricature</p>
                            <p className="text-xs text-muted-foreground font-sans">{new Date(order.created_at).toLocaleDateString()}</p>
                          </div>
                          <p className="font-display text-lg font-bold text-primary">{formatPrice(order.amount)}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge className={`${STATUS_COLORS[order.status] || ""} border-none text-xs`}>
                            {STATUS_LABELS[order.status] || order.status}
                          </Badge>
                          <Badge className={`${order.payment_status === "confirmed" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"} border-none text-xs`}>
                            Payment: {order.payment_status === "confirmed" ? "Confirmed ✅" : "Pending"}
                          </Badge>
                        </div>
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
                    <div><Label className="font-sans">Mobile</Label><Input value={editForm.mobile} onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })} /></div>
                    <div><Label className="font-sans">Instagram</Label><Input value={editForm.instagram_id || ""} onChange={(e) => setEditForm({ ...editForm, instagram_id: e.target.value })} /></div>
                    <div><Label className="font-sans">Address</Label><Input value={editForm.address || ""} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="font-sans">City</Label><Input value={editForm.city || ""} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} /></div>
                      <div><Label className="font-sans">State</Label><Input value={editForm.state || ""} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })} /></div>
                    </div>
                    <div><Label className="font-sans">Pincode</Label><Input value={editForm.pincode || ""} onChange={(e) => setEditForm({ ...editForm, pincode: e.target.value })} /></div>
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

        {/* Support buttons */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi! I need help with my order.`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-[#25D366] text-white rounded-full py-3 px-4 font-sans font-medium text-sm hover:opacity-90 transition-opacity"
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp Support
          </a>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white rounded-full py-3 px-4 font-sans font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Instagram
          </a>
        </div>
      </div>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

export default Dashboard;
