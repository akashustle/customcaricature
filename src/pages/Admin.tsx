import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { formatPrice } from "@/lib/pricing";
import { LogOut, Search, Eye, BarChart3, Package, Trash2, AlertTriangle, Users, DollarSign, Plus, Save, X, Edit2, Settings, Upload, Image, Lock, UserPlus, KeyRound, RefreshCw, CalendarIcon, Calendar as CalIcon, Globe, Receipt, MapPin, Star } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { validateEmailFormat } from "@/lib/email-validation";
import OrderDetail from "@/components/admin/OrderDetail";
import AdminAnalytics from "@/components/admin/AdminAnalytics";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import LiveGreeting from "@/components/LiveGreeting";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import AdminEvents from "@/components/admin/AdminEvents";
import AdminArtists from "@/components/admin/AdminArtists";
import AdminCustomerPricing from "@/components/admin/AdminCustomerPricing";
import AdminCustomerEventPricing from "@/components/admin/AdminCustomerEventPricing";

import AdminPayments from "@/components/admin/AdminPayments";
import AdminLiveLocations from "@/components/admin/AdminLiveLocations";
import AdminReviews from "@/components/admin/AdminReviews";
import AdminChat from "@/components/admin/AdminChat";
import AdminLiveChatLeads from "@/components/admin/AdminLiveChatLeads";
import { MessageCircle } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

type Order = {
  id: string;
  caricature_type: string;
  order_type: string;
  customer_name: string;
  city: string | null;
  amount: number;
  negotiated_amount: number | null;
  is_framed: boolean | null;
  status: string;
  payment_status: string | null;
  priority: number | null;
  created_at: string;
  expected_delivery_date: string | null;
  customer_mobile: string;
  customer_email: string;
};

type CaricatureType = {
  id: string;
  name: string;
  slug: string;
  price: number;
  per_face: boolean;
  min_faces: number;
  max_faces: number;
  is_active: boolean;
  sort_order: number;
};

type Profile = {
  id: string;
  user_id: string;
  full_name: string;
  mobile: string;
  email: string;
  instagram_id: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  secret_code: string | null;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  artwork_ready: "bg-purple-100 text-purple-800",
  dispatched: "bg-primary/10 text-primary",
  delivered: "bg-green-100 text-green-800",
};
const STATUS_LABELS: Record<string, string> = {
  new: "New Order", in_progress: "In Progress", artwork_ready: "Artwork Ready",
  dispatched: "Dispatched", delivered: "Delivered",
};
const PAYMENT_STATUS_LABELS: Record<string, string> = { pending: "Pending", confirmed: "Confirmed" };
const PAYMENT_COLORS: Record<string, string> = { pending: "bg-amber-100 text-amber-800", confirmed: "bg-green-100 text-green-800" };

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { settings, updateSetting } = useSiteSettings();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [caricatureTypes, setCaricatureTypes] = useState<CaricatureType[]>([]);
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerTab, setCustomerTab] = useState<"all" | "registered" | "manual">("all");
  const [editingType, setEditingType] = useState<string | null>(null);
  const [editTypeData, setEditTypeData] = useState<Partial<CaricatureType>>({});
  const [negotiateOrderId, setNegotiateOrderId] = useState<string | null>(null);
  const [negotiatedAmount, setNegotiatedAmount] = useState("");
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showAddType, setShowAddType] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<string | null>(null);
  const [editCustomerData, setEditCustomerData] = useState<Partial<Profile>>({});
  const [newType, setNewType] = useState({ name: "", slug: "", price: 0, per_face: false, min_faces: 1, max_faces: 1 });
  const [newCustomer, setNewCustomer] = useState({ full_name: "", mobile: "", email: "", instagram_id: "", address: "", city: "", state: "", pincode: "", password: "" });
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [activeTab, setActiveTab] = useState("orders");
  const [customerPricingUserId, setCustomerPricingUserId] = useState<string | null>(null);
  const [customerPricingUserName, setCustomerPricingUserName] = useState("");
  const [customerEventPricingUserId, setCustomerEventPricingUserId] = useState<string | null>(null);
  const [customerEventPricingUserName, setCustomerEventPricingUserName] = useState("");
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [manualOrder, setManualOrder] = useState({
    customerId: "", orderType: "single" as string, style: "artists_choice" as string,
    faceCount: 1, amount: 0, notes: "", negotiated: false, negotiatedAmount: 0,
    deliveryAddress: "", deliveryCity: "", deliveryState: "", deliveryPincode: "",
  });
  const [manualPhotos, setManualPhotos] = useState<File[]>([]);
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [addingOrder, setAddingOrder] = useState(false);
  // Admin settings state
  const [adminCurrentPassword, setAdminCurrentPassword] = useState("");
  const [adminNewPassword, setAdminNewPassword] = useState("");
  const [adminConfirmPassword, setAdminConfirmPassword] = useState("");
  const [changingAdminPassword, setChangingAdminPassword] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminMobile, setNewAdminMobile] = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [adminProfile, setAdminProfile] = useState<Profile | null>(null);
  const [editingAdminProfile, setEditingAdminProfile] = useState(false);
  const [adminEditData, setAdminEditData] = useState<Partial<Profile>>({});
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (!authLoading && user) {
      checkAdmin();
      fetchOrders();
      fetchCaricatureTypes();
      fetchCustomers();
      fetchAdminProfile();

      // Real-time subscriptions
      const ch = supabase
        .channel("admin-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchOrders())
        .on("postgres_changes", { event: "*", schema: "public", table: "event_bookings" }, () => {})
        .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchCustomers())
        .on("postgres_changes", { event: "*", schema: "public", table: "caricature_types" }, () => fetchCaricatureTypes())
        .subscribe();
      return () => { supabase.removeChannel(ch); };
    } else if (!authLoading && !user) {
      navigate("/customcad75");
    }
  }, [user, authLoading]);

  const fetchAdminProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
    if (data) { setAdminProfile(data as any); setAdminEditData(data as any); }
  };

  const saveAdminProfile = async () => {
    if (!user) return;
    await supabase.from("profiles").update({
      full_name: adminEditData.full_name, mobile: adminEditData.mobile,
      instagram_id: adminEditData.instagram_id, address: adminEditData.address,
      city: adminEditData.city, state: adminEditData.state, pincode: adminEditData.pincode,
    } as any).eq("user_id", user.id);
    toast({ title: "Profile Updated" });
    setEditingAdminProfile(false);
    fetchAdminProfile();
  };

  const changeAdminPassword = async () => {
    if (adminNewPassword !== adminConfirmPassword) { toast({ title: "Passwords don't match", variant: "destructive" }); return; }
    if (adminNewPassword.length < 6) { toast({ title: "Min 6 characters", variant: "destructive" }); return; }
    setChangingAdminPassword(true);
    const adminEmail = user?.email || adminProfile?.email || "";
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: adminEmail, password: adminCurrentPassword });
    if (signInErr) { toast({ title: "Current password is incorrect", variant: "destructive" }); setChangingAdminPassword(false); return; }
    const { error } = await supabase.auth.updateUser({ password: adminNewPassword });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Password Changed!" }); setAdminCurrentPassword(""); setAdminNewPassword(""); setAdminConfirmPassword(""); }
    setChangingAdminPassword(false);
  };

  const addNewAdmin = async () => {
    if (!newAdminEmail || !newAdminPassword || !newAdminName || !newAdminMobile) return;
    setAddingAdmin(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: { email: newAdminEmail, password: newAdminPassword, full_name: newAdminName, mobile: newAdminMobile, make_admin: true },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "New Admin Added!", description: `${newAdminName} can now login as admin` });
      setNewAdminEmail(""); setNewAdminPassword(""); setNewAdminName(""); setNewAdminMobile("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAddingAdmin(false);
    }
  };

  const checkAdmin = async () => {
    if (!user) return;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles || roles.length === 0) {
      await supabase.auth.signOut();
      navigate("/customcad75");
    }
  };

  const fetchOrders = async () => {
    const { data } = await supabase.from("orders")
      .select("id, caricature_type, order_type, customer_name, customer_mobile, customer_email, city, amount, negotiated_amount, is_framed, status, payment_status, priority, created_at, expected_delivery_date")
      .order("created_at", { ascending: false });
    if (data) setOrders(data as any);
    setLoading(false);
  };

  const fetchCaricatureTypes = async () => {
    const { data } = await supabase.from("caricature_types").select("*").order("sort_order");
    if (data) setCaricatureTypes(data as any);
  };

  const fetchCustomers = async () => {
    const { data, error } = await supabase.from("profiles").select("id, user_id, full_name, mobile, email, instagram_id, address, city, state, pincode, secret_code, created_at, is_manual, event_booking_allowed, gateway_charges_enabled, secret_code_login_enabled");
    if (error) {
      console.error("Error fetching customers:", error);
    }
    if (data) setCustomers(data as any);
  };

  const updateStatus = async (orderId: string, status: string) => {
    if (!confirm(`Change order status to "${STATUS_LABELS[status]}"?`)) return;
    await supabase.from("orders").update({ status: status as any }).eq("id", orderId);
    toast({ title: "Status Updated" });
    fetchOrders();
  };

  const updatePaymentStatus = async (orderId: string, paymentStatus: string) => {
    if (!confirm(`Change payment to "${PAYMENT_STATUS_LABELS[paymentStatus]}"?`)) return;
    await supabase.from("orders").update({ payment_status: paymentStatus, payment_verified: paymentStatus === "confirmed" } as any).eq("id", orderId);
    toast({ title: "Payment Updated" });
    fetchOrders();
  };

  const deleteOrder = async (orderId: string) => {
    await supabase.from("orders").delete().eq("id", orderId);
    toast({ title: "Deleted" });
    fetchOrders();
  };

  const saveNegotiatedAmount = async () => {
    if (!negotiateOrderId || !negotiatedAmount) return;
    await supabase.from("orders").update({ negotiated_amount: parseInt(negotiatedAmount), amount: parseInt(negotiatedAmount) } as any).eq("id", negotiateOrderId);
    toast({ title: "Price Updated" });
    setNegotiateOrderId(null);
    setNegotiatedAmount("");
    fetchOrders();
  };

  const saveTypeEdit = async (id: string) => {
    await supabase.from("caricature_types").update(editTypeData as any).eq("id", id);
    toast({ title: "Pricing Updated — changes are live on the website!" });
    setEditingType(null);
    fetchCaricatureTypes();
  };

  const addNewType = async () => {
    if (!newType.name || !newType.slug) return;
    await supabase.from("caricature_types").insert({ ...newType, sort_order: caricatureTypes.length + 1 } as any);
    toast({ title: "Caricature Type Added" });
    setShowAddType(false);
    setNewType({ name: "", slug: "", price: 0, per_face: false, min_faces: 1, max_faces: 1 });
    fetchCaricatureTypes();
  };

  const deleteType = async (id: string) => {
    await supabase.from("caricature_types").delete().eq("id", id);
    toast({ title: "Type Deleted" });
    fetchCaricatureTypes();
  };

  const addCustomerManual = async () => {
    if (!newCustomer.full_name || !newCustomer.email || !newCustomer.mobile || !newCustomer.password) return;
    setAddingCustomer(true);
    try {
      // Use edge function to create user without affecting admin session
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          email: newCustomer.email,
          password: newCustomer.password,
          full_name: newCustomer.full_name,
          mobile: newCustomer.mobile,
          instagram_id: newCustomer.instagram_id || null,
          address: newCustomer.address || null,
          city: newCustomer.city || null,
          state: newCustomer.state || null,
          pincode: newCustomer.pincode || null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Customer Added Successfully" });
      setShowAddCustomer(false);
      setNewCustomer({ full_name: "", mobile: "", email: "", instagram_id: "", address: "", city: "", state: "", pincode: "", password: "" });
      fetchCustomers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAddingCustomer(false);
    }
  };

  const deleteCustomer = async (userId: string) => {
    await supabase.from("orders").delete().eq("user_id", userId);
    await supabase.from("profiles").delete().eq("user_id", userId);
    toast({ title: "Customer & their orders deleted" });
    fetchCustomers();
    fetchOrders();
  };

  const saveCustomerEdit = async (userId: string) => {
    const { error } = await supabase.from("profiles").update({
      full_name: editCustomerData.full_name,
      mobile: editCustomerData.mobile,
      instagram_id: editCustomerData.instagram_id,
      address: editCustomerData.address,
      city: editCustomerData.city,
      state: editCustomerData.state,
      pincode: editCustomerData.pincode,
    } as any).eq("user_id", userId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Customer Updated" });
      setEditingCustomer(null);
      fetchCustomers();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/customcad75");
  };

  const handleAdminRefresh = async () => {
    toast({ title: "Refreshing..." });
    await Promise.all([fetchOrders(), fetchCaricatureTypes(), fetchCustomers(), fetchAdminProfile()]);
    toast({ title: "Refreshed!" });
  };

  const addManualOrder = async () => {
    if (!manualOrder.customerId || !manualOrder.amount) return;
    setAddingOrder(true);
    try {
      const customer = customers.find(c => c.user_id === manualOrder.customerId);
      if (!customer) throw new Error("Customer not found");

      const finalAmount = manualOrder.negotiated ? manualOrder.negotiatedAmount : manualOrder.amount;

      const { data: orderData, error: orderErr } = await supabase.from("orders").insert({
        user_id: customer.user_id,
        customer_name: customer.full_name,
        customer_email: customer.email,
        customer_mobile: customer.mobile,
        order_type: manualOrder.orderType as any,
        caricature_type: "physical" as any,
        style: manualOrder.style as any,
        face_count: manualOrder.faceCount,
        amount: finalAmount,
        negotiated_amount: manualOrder.negotiated ? manualOrder.negotiatedAmount : null,
        notes: manualOrder.notes || null,
        delivery_address: manualOrder.deliveryAddress || customer.address || null,
        delivery_city: manualOrder.deliveryCity || customer.city || null,
        delivery_state: manualOrder.deliveryState || customer.state || null,
        delivery_pincode: manualOrder.deliveryPincode || customer.pincode || null,
        status: "new" as any,
        payment_status: "pending",
      } as any).select("id").single();

      if (orderErr || !orderData) throw new Error(orderErr?.message || "Failed to create order");

      // Upload photos
      const allFiles = [...manualPhotos, ...(paymentScreenshot ? [paymentScreenshot] : [])];
      for (const file of allFiles) {
        const path = `${orderData.id}/${Date.now()}_${file.name}`;
        const { error: upErr } = await supabase.storage.from("order-photos").upload(path, file);
        if (!upErr) {
          await supabase.from("order_images").insert({ order_id: orderData.id, storage_path: path, file_name: file.name } as any);
        }
      }

      toast({ title: "Manual Order Created!", description: `Order for ${customer.full_name} added successfully` });
      setShowAddOrder(false);
      setManualOrder({ customerId: "", orderType: "single", style: "artists_choice", faceCount: 1, amount: 0, notes: "", negotiated: false, negotiatedAmount: 0, deliveryAddress: "", deliveryCity: "", deliveryState: "", deliveryPincode: "" });
      setManualPhotos([]);
      setPaymentScreenshot(null);
      fetchOrders();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAddingOrder(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
    });
  };

  const filtered = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (paymentFilter !== "all" && (o.payment_status || "pending") !== paymentFilter) return false;
    if (search && !o.customer_name.toLowerCase().includes(search.toLowerCase()) && !o.id.toLowerCase().includes(search.toLowerCase())) return false;
    if (calendarDate) {
      const orderDate = new Date(o.created_at);
      if (orderDate.toDateString() !== calendarDate.toDateString()) return false;
    }
    return true;
  });

  const getFilteredCustomers = () => {
    let list = customers.filter((c) => {
      if (!customerSearch) return true;
      const q = customerSearch.toLowerCase();
      return c.full_name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.mobile.includes(q);
    });
    if (customerTab === "registered") {
      list = list.filter(c => !(c as any).is_manual);
    } else if (customerTab === "manual") {
      list = list.filter(c => (c as any).is_manual);
    }
    return list;
  };

  const filteredCustomers = getFilteredCustomers();

  const getDaysRemaining = (order: Order) => {
    const due = order.expected_delivery_date
      ? new Date(order.expected_delivery_date)
      : new Date(new Date(order.created_at).getTime() + 30 * 24 * 60 * 60 * 1000);
    return Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  if (selectedOrder) {
    return <OrderDetail orderId={selectedOrder} onBack={() => { setSelectedOrder(null); fetchOrders(); }} />;
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-40 admin-header backdrop-blur-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <img src="/logo.png" alt="CCC" className="w-11 h-11 rounded-full border-[3px] border-primary/50 shadow-lg" />
            <h1 className="font-display text-lg md:text-xl font-bold">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <Button variant="ghost" size="sm" onClick={handleAdminRefresh} className="font-sans"><RefreshCw className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="font-sans">
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <LiveGreeting name={adminProfile?.full_name} />
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="mb-6 hidden md:block overflow-x-auto scrollbar-thin">
            <TabsList className="w-max min-w-full bg-card/80 p-1.5 rounded-2xl border border-border shadow-md inline-flex gap-0.5">
              <TabsTrigger value="orders" className="font-sans rounded-full transition-all whitespace-nowrap"><Package className="w-4 h-4 mr-1" />Orders</TabsTrigger>
              <TabsTrigger value="events" className="font-sans rounded-full transition-all whitespace-nowrap"><CalIcon className="w-4 h-4 mr-1" />Events</TabsTrigger>
              <TabsTrigger value="payments" className="font-sans rounded-full transition-all whitespace-nowrap"><Receipt className="w-4 h-4 mr-1" />Payments</TabsTrigger>
              <TabsTrigger value="chat" className="font-sans rounded-full transition-all whitespace-nowrap"><MessageCircle className="w-4 h-4 mr-1" />Chat</TabsTrigger>
              <TabsTrigger value="live-leads" className="font-sans rounded-full transition-all whitespace-nowrap">💬 Live Leads</TabsTrigger>
              <TabsTrigger value="event-users" className="font-sans rounded-full transition-all whitespace-nowrap"><Users className="w-4 h-4 mr-1" />Event Users</TabsTrigger>
              <TabsTrigger value="pricing" className="font-sans rounded-full transition-all whitespace-nowrap"><DollarSign className="w-4 h-4 mr-1" />Pricing</TabsTrigger>
              <TabsTrigger value="customers" className="font-sans rounded-full transition-all whitespace-nowrap"><Users className="w-4 h-4 mr-1" />Customers</TabsTrigger>
              <TabsTrigger value="artists" className="font-sans rounded-full transition-all whitespace-nowrap">🎨 Artists</TabsTrigger>
              <TabsTrigger value="reviews" className="font-sans rounded-full transition-all whitespace-nowrap"><Star className="w-4 h-4 mr-1" />Reviews</TabsTrigger>
              <TabsTrigger value="analytics" className="font-sans rounded-full transition-all whitespace-nowrap"><BarChart3 className="w-4 h-4 mr-1" />Analytics</TabsTrigger>
              <TabsTrigger value="locations" className="font-sans rounded-full transition-all whitespace-nowrap"><MapPin className="w-4 h-4 mr-1" />Locations</TabsTrigger>
              <TabsTrigger value="settings" className="font-sans rounded-full transition-all whitespace-nowrap"><Settings className="w-4 h-4 mr-1" />Settings</TabsTrigger>
            </TabsList>
          </div>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search by name or ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 font-sans" />
                </div>
                <Dialog open={showAddOrder} onOpenChange={setShowAddOrder}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="font-sans rounded-full"><Plus className="w-4 h-4 mr-1" />Add Order</Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
                    <DialogHeader><DialogTitle className="font-display">Add Manual Order</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <Label>Select Customer *</Label>
                        <Select value={manualOrder.customerId} onValueChange={(v) => setManualOrder({ ...manualOrder, customerId: v })}>
                          <SelectTrigger><SelectValue placeholder="Choose customer..." /></SelectTrigger>
                          <SelectContent>
                            {customers.map((c) => (
                              <SelectItem key={c.user_id} value={c.user_id}>{c.full_name} ({c.email})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Order Type *</Label>
                          <Select value={manualOrder.orderType} onValueChange={(v) => setManualOrder({ ...manualOrder, orderType: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="single">Single</SelectItem>
                              <SelectItem value="couple">Couple</SelectItem>
                              <SelectItem value="group">Group</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Style</Label>
                          <Select value={manualOrder.style} onValueChange={(v) => setManualOrder({ ...manualOrder, style: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cute">Cute</SelectItem>
                              <SelectItem value="romantic">Romantic</SelectItem>
                              <SelectItem value="fun">Fun</SelectItem>
                              <SelectItem value="royal">Royal</SelectItem>
                              <SelectItem value="minimal">Minimal</SelectItem>
                              <SelectItem value="artists_choice">Artist's Choice</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>Face Count</Label><Input type="number" min={1} value={manualOrder.faceCount} onChange={(e) => setManualOrder({ ...manualOrder, faceCount: parseInt(e.target.value) || 1 })} /></div>
                        <div><Label>Amount (₹) *</Label><Input type="number" value={manualOrder.amount} onChange={(e) => setManualOrder({ ...manualOrder, amount: parseInt(e.target.value) || 0 })} /></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={manualOrder.negotiated} onChange={(e) => setManualOrder({ ...manualOrder, negotiated: e.target.checked })} />
                        <Label>Negotiated Price</Label>
                      </div>
                      {manualOrder.negotiated && (
                        <div><Label>Negotiated Amount (₹)</Label><Input type="number" value={manualOrder.negotiatedAmount} onChange={(e) => setManualOrder({ ...manualOrder, negotiatedAmount: parseInt(e.target.value) || 0 })} /></div>
                      )}
                      <div><Label>Notes</Label><Textarea value={manualOrder.notes} onChange={(e) => setManualOrder({ ...manualOrder, notes: e.target.value })} placeholder="Special instructions..." /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>Delivery Address</Label><Input value={manualOrder.deliveryAddress} onChange={(e) => setManualOrder({ ...manualOrder, deliveryAddress: e.target.value })} /></div>
                        <div><Label>City</Label><Input value={manualOrder.deliveryCity} onChange={(e) => setManualOrder({ ...manualOrder, deliveryCity: e.target.value })} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>State</Label><Input value={manualOrder.deliveryState} onChange={(e) => setManualOrder({ ...manualOrder, deliveryState: e.target.value })} /></div>
                        <div><Label>Pincode</Label><Input value={manualOrder.deliveryPincode} onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 6) setManualOrder({ ...manualOrder, deliveryPincode: d }); }} maxLength={6} /></div>
                      </div>
                      <div>
                        <Label className="flex items-center gap-1"><Image className="w-4 h-4" />Upload Photos</Label>
                        <Input type="file" multiple accept="image/*" onChange={(e) => setManualPhotos(Array.from(e.target.files || []))} />
                        {manualPhotos.length > 0 && <p className="text-xs text-muted-foreground mt-1">{manualPhotos.length} photo(s) selected</p>}
                      </div>
                      <div>
                        <Label className="flex items-center gap-1"><Upload className="w-4 h-4" />Payment Screenshot (optional)</Label>
                        <Input type="file" accept="image/*" onChange={(e) => setPaymentScreenshot(e.target.files?.[0] || null)} />
                        {paymentScreenshot && <p className="text-xs text-muted-foreground mt-1">{paymentScreenshot.name}</p>}
                      </div>
                      <Button onClick={addManualOrder} disabled={!manualOrder.customerId || !manualOrder.amount || addingOrder} className="w-full font-sans">
                        {addingOrder ? "Creating Order..." : "Create Order"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              {/* Status Filter Tabs */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: "all", label: `All (${orders.length})` },
                  { value: "new", label: `New (${orders.filter(o => o.status === "new").length})` },
                  { value: "in_progress", label: `In Progress (${orders.filter(o => o.status === "in_progress").length})` },
                  { value: "artwork_ready", label: `Art Ready (${orders.filter(o => o.status === "artwork_ready").length})` },
                  { value: "dispatched", label: `Dispatched (${orders.filter(o => o.status === "dispatched").length})` },
                  { value: "delivered", label: `Delivered (${orders.filter(o => o.status === "delivered").length})` },
                  
                ].map((tab) => (
                  <Button
                    key={tab.value}
                    variant={statusFilter === tab.value ? "default" : "outline"}
                    size="sm"
                    className="text-xs font-sans h-7 rounded-full"
                    onClick={() => setStatusFilter(tab.value)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
              {/* Payment Filter */}
              <div className="flex gap-1.5">
                {[
                  { value: "all", label: "All Payments" },
                  { value: "confirmed", label: `Confirmed (${orders.filter(o => o.payment_status === "confirmed").length})` },
                  { value: "pending", label: `Pending (${orders.filter(o => o.payment_status !== "confirmed").length})` },
                ].map((tab) => (
                  <Button
                    key={tab.value}
                    variant={paymentFilter === tab.value ? "default" : "outline"}
                    size="sm"
                    className="text-xs font-sans h-7 rounded-full"
                    onClick={() => setPaymentFilter(tab.value)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
              {/* Calendar Date Filter */}
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs font-sans h-7 rounded-full">
                      <CalendarIcon className="w-3 h-3 mr-1" />
                      {calendarDate ? calendarDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Pick Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={calendarDate} onSelect={setCalendarDate} initialFocus />
                  </PopoverContent>
                </Popover>
                {calendarDate && (
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setCalendarDate(undefined)}>
                    <X className="w-3 h-3 mr-1" />Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="block md:hidden space-y-3">
              {loading ? <p className="text-center text-muted-foreground font-sans py-10">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground font-sans py-10">No orders</p> : (
                filtered.map((order) => {
                  const daysLeft = getDaysRemaining(order);
                  return (
                    <Card key={order.id} className={daysLeft <= 10 && !["delivered", "completed"].includes(order.status) ? "border-destructive/50" : ""}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-sans font-semibold">{order.customer_name}</p>
                            <p className="font-mono text-xs text-muted-foreground">{order.id.slice(0, 8).toUpperCase()}</p>
                            <p className="text-[10px] text-muted-foreground font-sans">{formatDateTime(order.created_at)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-sans font-medium text-primary">{formatPrice(order.negotiated_amount || order.amount)}</p>
                            {order.negotiated_amount && order.negotiated_amount !== order.amount && (
                              <p className="text-xs text-muted-foreground line-through">{formatPrice(order.amount)}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge className={`${STATUS_COLORS[order.status] || ""} border-none text-xs`}>{STATUS_LABELS[order.status]}</Badge>
                          <Badge className={`${PAYMENT_COLORS[order.payment_status || "pending"]} border-none text-xs`}>Pay: {PAYMENT_STATUS_LABELS[order.payment_status || "pending"]}</Badge>
                          {daysLeft <= 10 && !["delivered", "completed"].includes(order.status) && (
                            <Badge className="bg-red-100 text-red-800 border-none text-xs"><AlertTriangle className="w-3 h-3 mr-1" />{daysLeft}d left</Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Select value={order.status} onValueChange={(v) => updateStatus(order.id, v)}>
                            <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                          </Select>
                          <Select value={order.payment_status || "pending"} onValueChange={(v) => updatePaymentStatus(order.id, v)}>
                            <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => setSelectedOrder(order.id)}><Eye className="w-4 h-4 mr-1" />View</Button>
                          <Button variant="outline" size="sm" onClick={() => { setNegotiateOrderId(order.id); setNegotiatedAmount(String(order.negotiated_amount || order.amount)); }}>
                            <DollarSign className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Order?</AlertDialogTitle>
                                <AlertDialogDescription>Permanently delete this order.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteOrder(order.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>

            {/* Desktop Table */}
            <Card className="hidden md:block overflow-x-auto">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-sans">ID</TableHead>
                      <TableHead className="font-sans">Customer</TableHead>
                      <TableHead className="font-sans">Date</TableHead>
                      <TableHead className="font-sans">City</TableHead>
                      <TableHead className="font-sans">Amount</TableHead>
                      <TableHead className="font-sans">Due</TableHead>
                      <TableHead className="font-sans">Payment</TableHead>
                      <TableHead className="font-sans">Status</TableHead>
                      <TableHead className="font-sans">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={9} className="text-center py-10">Loading...</TableCell></TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={9} className="text-center py-10">No orders</TableCell></TableRow>
                    ) : (
                      filtered.map((order) => {
                        const daysLeft = getDaysRemaining(order);
                        return (
                          <TableRow key={order.id} className={daysLeft <= 10 && !["delivered", "completed"].includes(order.status) ? "bg-red-50/50" : ""}>
                            <TableCell className="font-mono text-xs">{order.id.slice(0, 8).toUpperCase()}</TableCell>
                            <TableCell className="font-sans">{order.customer_name}</TableCell>
                            <TableCell className="font-sans text-xs">{formatDateTime(order.created_at)}</TableCell>
                            <TableCell className="font-sans">{order.city || "—"}</TableCell>
                            <TableCell className="font-sans">
                              <span className="font-medium">{formatPrice(order.negotiated_amount || order.amount)}</span>
                              {order.negotiated_amount && order.negotiated_amount !== order.amount && (
                                <span className="text-xs text-muted-foreground line-through ml-1">{formatPrice(order.amount)}</span>
                              )}
                            </TableCell>
                            <TableCell>{daysLeft <= 10 && !["delivered", "completed"].includes(order.status) ? (
                              <span className="text-destructive font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{daysLeft}d</span>
                            ) : <span>{daysLeft}d</span>}</TableCell>
                            <TableCell>
                              <Select value={order.payment_status || "pending"} onValueChange={(v) => updatePaymentStatus(order.id, v)}>
                                <SelectTrigger className="h-8 w-28">
                                  <Badge className={`${PAYMENT_COLORS[order.payment_status || "pending"]} border-none text-xs`}>{PAYMENT_STATUS_LABELS[order.payment_status || "pending"]}</Badge>
                                </SelectTrigger>
                                <SelectContent>{Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Select value={order.status} onValueChange={(v) => updateStatus(order.id, v)}>
                                <SelectTrigger className="h-8 w-36">
                                  <Badge className={`${STATUS_COLORS[order.status] || ""} border-none text-xs`}>{STATUS_LABELS[order.status]}</Badge>
                                </SelectTrigger>
                                <SelectContent>{Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order.id)}><Eye className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="sm" onClick={() => { setNegotiateOrderId(order.id); setNegotiatedAmount(String(order.negotiated_amount || order.amount)); }}>
                                  <DollarSign className="w-4 h-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Delete Order?</AlertDialogTitle><AlertDialogDescription>Permanently delete this order.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteOrder(order.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events">
            <AdminEvents customers={customers as any} />
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <AdminPayments />
          </TabsContent>

          {/* Event Users Tab */}
          <TabsContent value="event-users">
            <EventUsersTab />
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent value="pricing">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="font-display text-xl font-bold">Caricature Types & Pricing</h2>
                <p className="text-xs text-muted-foreground font-sans">Changes here update pricing across the entire website in real-time</p>
              </div>
              <Dialog open={showAddType} onOpenChange={setShowAddType}>
                <DialogTrigger asChild><Button size="sm" className="font-sans rounded-full"><Plus className="w-4 h-4 mr-1" />Add Type</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle className="font-display">Add Caricature Type</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Name</Label><Input value={newType.name} onChange={(e) => setNewType({ ...newType, name: e.target.value })} placeholder="e.g. Family" /></div>
                    <div><Label>Slug (must match order_type: single/couple/group)</Label><Input value={newType.slug} onChange={(e) => setNewType({ ...newType, slug: e.target.value.toLowerCase().replace(/\s/g, "_") })} placeholder="e.g. family" /></div>
                    <div><Label>Price (₹)</Label><Input type="number" value={newType.price} onChange={(e) => setNewType({ ...newType, price: parseInt(e.target.value) || 0 })} /></div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={newType.per_face} onChange={(e) => setNewType({ ...newType, per_face: e.target.checked })} />
                      <Label>Per Face Pricing</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Min Faces</Label><Input type="number" value={newType.min_faces} onChange={(e) => setNewType({ ...newType, min_faces: parseInt(e.target.value) || 1 })} /></div>
                      <div><Label>Max Faces</Label><Input type="number" value={newType.max_faces} onChange={(e) => setNewType({ ...newType, max_faces: parseInt(e.target.value) || 1 })} /></div>
                    </div>
                    <Button onClick={addNewType} className="w-full font-sans">Add Type</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-3">
              {caricatureTypes.map((type) => (
                <Card key={type.id}>
                  <CardContent className="p-4">
                    {editingType === type.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div><Label className="text-xs">Name</Label><Input value={editTypeData.name || ""} onChange={(e) => setEditTypeData({ ...editTypeData, name: e.target.value })} /></div>
                          <div><Label className="text-xs">Price (₹)</Label><Input type="number" value={editTypeData.price || 0} onChange={(e) => setEditTypeData({ ...editTypeData, price: parseInt(e.target.value) || 0 })} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div><Label className="text-xs">Min Faces</Label><Input type="number" value={editTypeData.min_faces || 1} onChange={(e) => setEditTypeData({ ...editTypeData, min_faces: parseInt(e.target.value) || 1 })} /></div>
                          <div><Label className="text-xs">Max Faces</Label><Input type="number" value={editTypeData.max_faces || 1} onChange={(e) => setEditTypeData({ ...editTypeData, max_faces: parseInt(e.target.value) || 1 })} /></div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={editTypeData.per_face || false} onChange={(e) => setEditTypeData({ ...editTypeData, per_face: e.target.checked })} />
                          <Label className="text-xs">Per Face Pricing</Label>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveTypeEdit(type.id)} className="font-sans"><Save className="w-4 h-4 mr-1" />Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingType(null)}><X className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-sans font-semibold">{type.name}</p>
                          <p className="text-sm text-muted-foreground font-sans">
                            {formatPrice(type.price)}{type.per_face ? "/face" : ""} · {type.min_faces}–{type.max_faces} faces
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingType(type.id); setEditTypeData(type); }}><Edit2 className="w-4 h-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Delete Type?</AlertDialogTitle></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteType(type.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-6">
              <h2 className="font-display text-xl font-bold">Customers ({customers.length})</h2>
              <div className="flex gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-60">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search customers..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} className="pl-10 font-sans" />
                </div>
                <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
                  <DialogTrigger asChild><Button size="sm" className="font-sans rounded-full"><Plus className="w-4 h-4 mr-1" />Add</Button></DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle className="font-display">Add Customer Manually</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div><Label>Full Name *</Label><Input value={newCustomer.full_name} onChange={(e) => setNewCustomer({ ...newCustomer, full_name: e.target.value })} /></div>
                      <div>
                        <Label>Email *</Label>
                        <Input type="email" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} />
                        {newCustomer.email && validateEmailFormat(newCustomer.email) && (
                          <p className="text-xs text-destructive font-sans mt-1">{validateEmailFormat(newCustomer.email)}</p>
                        )}
                      </div>
                      <div><Label>Mobile * (10 digits)</Label><Input value={newCustomer.mobile} onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 10) setNewCustomer({ ...newCustomer, mobile: d }); }} maxLength={10} /></div>
                      <div><Label>Password *</Label><Input type="password" value={newCustomer.password} onChange={(e) => setNewCustomer({ ...newCustomer, password: e.target.value })} /></div>
                      <div><Label>Instagram</Label><Input value={newCustomer.instagram_id} onChange={(e) => setNewCustomer({ ...newCustomer, instagram_id: e.target.value })} /></div>
                      <div><Label>Address</Label><Input value={newCustomer.address} onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })} /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>City</Label><Input value={newCustomer.city} onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })} /></div>
                        <div><Label>State</Label><Input value={newCustomer.state} onChange={(e) => setNewCustomer({ ...newCustomer, state: e.target.value })} /></div>
                      </div>
                      <div><Label>Pincode</Label><Input value={newCustomer.pincode} onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 6) setNewCustomer({ ...newCustomer, pincode: d }); }} maxLength={6} /></div>
                      <Button onClick={addCustomerManual} disabled={!newCustomer.full_name || !newCustomer.email || !newCustomer.mobile || !newCustomer.password || addingCustomer || !!validateEmailFormat(newCustomer.email)} className="w-full font-sans">
                        {addingCustomer ? "Creating..." : "Add Customer"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {[
                { value: "all" as const, label: `All (${customers.length})` },
                { value: "registered" as const, label: "Registered" },
                { value: "manual" as const, label: "Manual" },
              ].map((tab) => (
                <Button
                  key={tab.value}
                  variant={customerTab === tab.value ? "default" : "outline"}
                  size="sm"
                  className="text-xs font-sans h-7 rounded-full"
                  onClick={() => setCustomerTab(tab.value)}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
            {/* Bulk Toggle Controls */}
            <div className="flex flex-wrap gap-2 mb-4 p-3 bg-muted/50 rounded-xl">
              <span className="text-xs font-sans font-semibold text-muted-foreground w-full mb-1">Bulk Actions:</span>
              <Button size="sm" variant="outline" className="text-xs font-sans h-7 rounded-full" onClick={async () => {
                if (!confirm("Enable gateway charges (2.6%) for ALL customers?")) return;
                await supabase.from("profiles").update({ gateway_charges_enabled: true } as any).neq("user_id", "00000000-0000-0000-0000-000000000000");
                toast({ title: "Gateway charges enabled for all customers" });
                fetchCustomers();
              }}>
                <DollarSign className="w-3 h-3 mr-1" /> Gateway ON (All)
              </Button>
              <Button size="sm" variant="outline" className="text-xs font-sans h-7 rounded-full" onClick={async () => {
                if (!confirm("Disable gateway charges for ALL customers?")) return;
                await supabase.from("profiles").update({ gateway_charges_enabled: false } as any).neq("user_id", "00000000-0000-0000-0000-000000000000");
                toast({ title: "Gateway charges disabled for all customers" });
                fetchCustomers();
              }}>
                <DollarSign className="w-3 h-3 mr-1" /> Gateway OFF (All)
              </Button>
            </div>
            <div className="space-y-3">
              {filteredCustomers.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="font-sans text-muted-foreground">No customers found</p>
                  </CardContent>
                </Card>
              ) : (
                filteredCustomers.map((c) => (
                  <Card key={c.id}>
                    <CardContent className="p-4">
                      {editingCustomer === c.user_id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div><Label className="text-xs">Full Name</Label><Input value={editCustomerData.full_name || ""} onChange={(e) => setEditCustomerData({ ...editCustomerData, full_name: e.target.value })} /></div>
                            <div><Label className="text-xs">Mobile</Label><Input value={editCustomerData.mobile || ""} onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 10) setEditCustomerData({ ...editCustomerData, mobile: d }); }} maxLength={10} /></div>
                          </div>
                          <div><Label className="text-xs">Email (read-only)</Label><Input value={c.email} disabled className="opacity-60" /></div>
                          <div><Label className="text-xs">Instagram</Label><Input value={editCustomerData.instagram_id || ""} onChange={(e) => setEditCustomerData({ ...editCustomerData, instagram_id: e.target.value })} /></div>
                          <div><Label className="text-xs">Address</Label><Input value={editCustomerData.address || ""} onChange={(e) => setEditCustomerData({ ...editCustomerData, address: e.target.value })} /></div>
                          <div className="grid grid-cols-3 gap-3">
                            <div><Label className="text-xs">City</Label><Input value={editCustomerData.city || ""} onChange={(e) => setEditCustomerData({ ...editCustomerData, city: e.target.value })} /></div>
                            <div><Label className="text-xs">State</Label><Input value={editCustomerData.state || ""} onChange={(e) => setEditCustomerData({ ...editCustomerData, state: e.target.value })} /></div>
                            <div><Label className="text-xs">Pincode</Label><Input value={editCustomerData.pincode || ""} onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 6) setEditCustomerData({ ...editCustomerData, pincode: d }); }} maxLength={6} /></div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveCustomerEdit(c.user_id)} className="font-sans"><Save className="w-4 h-4 mr-1" />Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingCustomer(null)}><X className="w-4 h-4" /></Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-start">
                          <div className="space-y-1 flex-1 min-w-0">
                            <p className="font-sans font-semibold">{c.full_name}</p>
                            <p className="text-xs text-muted-foreground font-sans">{c.email} · +91 {c.mobile}</p>
                            {c.instagram_id && <p className="text-xs text-muted-foreground font-sans">IG: {c.instagram_id}</p>}
                            {c.secret_code && <p className="text-xs font-sans text-primary/80">🔑 Secret: <span className="font-mono font-bold">{c.secret_code}</span></p>}
                            {c.address && <p className="text-xs text-muted-foreground font-sans">{c.address}</p>}
                            {(c.city || c.state || c.pincode) && (
                              <p className="text-xs text-muted-foreground font-sans">
                                {[c.city, c.state, c.pincode].filter(Boolean).join(", ")}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground font-sans">
                              Registered: {formatDateTime(c.created_at)}
                            </p>
                            {/* Event Booking Access Toggle */}
                            <div className="flex items-center gap-2 pt-1">
                              <Switch
                                checked={(c as any).event_booking_allowed || false}
                                onCheckedChange={async (checked) => {
                                  if (!confirm(`${checked ? "Allow" : "Revoke"} event booking access for ${c.full_name}?`)) return;
                                  await supabase.from("profiles").update({ event_booking_allowed: checked } as any).eq("user_id", c.user_id);
                                  toast({ title: checked ? "Event booking enabled" : "Event booking disabled", description: `for ${c.full_name}` });
                                  fetchCustomers();
                                }}
                              />
                              <span className="text-xs font-sans text-muted-foreground">Event Booking</span>
                              {(c as any).event_booking_allowed && <Badge className="bg-green-100 text-green-800 border-none text-[10px]">Allowed</Badge>}
                            </div>
                            {/* Gateway Charges Toggle */}
                            <div className="flex items-center gap-2 pt-1">
                              <Switch
                                checked={(c as any).gateway_charges_enabled === true}
                                onCheckedChange={async (checked) => {
                                  if (!confirm(`${checked ? "Enable" : "Disable"} payment gateway charges (2.6%) for ${c.full_name}?`)) return;
                                  await supabase.from("profiles").update({ gateway_charges_enabled: checked } as any).eq("user_id", c.user_id);
                                  toast({ title: checked ? "Gateway charges enabled" : "Gateway charges disabled", description: `for ${c.full_name}` });
                                  fetchCustomers();
                                }}
                              />
                              <span className="text-xs font-sans text-muted-foreground">Gateway Charges (2.6%)</span>
                              {(c as any).gateway_charges_enabled === true && <Badge className="bg-green-100 text-green-800 border-none text-[10px]">Active</Badge>}
                            </div>
                            {/* Secret Code Login Toggle */}
                            <div className="flex items-center gap-2 pt-1">
                              <Switch
                                checked={(c as any).secret_code_login_enabled === true}
                                onCheckedChange={async (checked) => {
                                  if (!confirm(`${checked ? "Enable" : "Disable"} secret code login for ${c.full_name}?`)) return;
                                  await supabase.from("profiles").update({ secret_code_login_enabled: checked } as any).eq("user_id", c.user_id);
                                  toast({ title: checked ? "Secret code login enabled" : "Secret code login disabled", description: `for ${c.full_name}` });
                                  fetchCustomers();
                                }}
                              />
                              <span className="text-xs font-sans text-muted-foreground">Secret Code Login</span>
                              {(c as any).secret_code_login_enabled === true && <Badge className="bg-blue-100 text-blue-800 border-none text-[10px]">Enabled</Badge>}
                            </div>
                            <div className="flex gap-2 mt-1 flex-wrap">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs font-sans"
                                onClick={() => { setCustomerPricingUserId(c.user_id); setCustomerPricingUserName(c.full_name); }}
                              >
                                <DollarSign className="w-3 h-3 mr-1" />Custom Pricing
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs font-sans"
                                onClick={() => { setCustomerEventPricingUserId(c.user_id); setCustomerEventPricingUserName(c.full_name); }}
                              >
                                <CalIcon className="w-3 h-3 mr-1" />Event Pricing
                              </Button>
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button variant="ghost" size="sm" onClick={() => { setEditingCustomer(c.user_id); setEditCustomerData(c); }}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Customer?</AlertDialogTitle>
                                  <AlertDialogDescription>This will delete the customer profile and all their orders permanently.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteCustomer(c.user_id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      )}
                      {customerPricingUserId === c.user_id && (
                        <div className="mt-3">
                          <AdminCustomerPricing
                            userId={c.user_id}
                            userName={c.full_name}
                            onClose={() => setCustomerPricingUserId(null)}
                            caricatureTypes={caricatureTypes.map(ct => ({ slug: ct.slug, name: ct.name, price: ct.price, per_face: ct.per_face }))}
                          />
                        </div>
                      )}
                      {customerEventPricingUserId === c.user_id && (
                        <div className="mt-3">
                          <AdminCustomerEventPricing
                            userId={c.user_id}
                            userName={c.full_name}
                            onClose={() => setCustomerEventPricingUserId(null)}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="artists">
            <AdminArtists />
          </TabsContent>

          <TabsContent value="chat">
            {user && <AdminChat adminUserId={user.id} />}
          </TabsContent>

          <TabsContent value="live-leads">
            {user && <AdminLiveChatLeads adminUserId={user.id} />}
          </TabsContent>

          <TabsContent value="reviews">
            <AdminReviews />
          </TabsContent>

          <TabsContent value="analytics">
            <AdminAnalytics orders={orders as any} customers={customers} />
          </TabsContent>

          {/* Live Locations Tab */}
          <TabsContent value="locations">
            <AdminLiveLocations />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="space-y-6 max-w-lg">
              {/* Site Controls */}
              <Card>
                <CardHeader><CardTitle className="font-display text-lg flex items-center gap-2"><Globe className="w-5 h-5 text-primary" />Site Controls</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {/* Global Event Booking Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-sans font-medium text-sm">Event Booking for All Users</p>
                      <p className="text-xs text-muted-foreground font-sans">Allow all registered users to book events</p>
                    </div>
                    <Switch
                      checked={settings.event_booking_global.enabled}
                      onCheckedChange={async (checked) => {
                        if (!confirm(`${checked ? "Enable" : "Disable"} event booking for ALL users?`)) return;
                        await updateSetting("event_booking_global", { enabled: checked });
                        toast({ title: checked ? "Event booking enabled for everyone" : "Event booking restricted to approved users" });
                      }}
                    />
                  </div>
                  {/* Workshop Button */}
                  <div className="border-t border-border pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-sans font-medium text-sm">Workshop Button</p>
                        <p className="text-xs text-muted-foreground font-sans">Show/hide workshop button on website</p>
                      </div>
                      <Switch
                        checked={settings.workshop_button.enabled}
                        onCheckedChange={async (checked) => {
                          if (!confirm(`${checked ? "Show" : "Hide"} workshop button on website?`)) return;
                          await updateSetting("workshop_button", { ...settings.workshop_button, enabled: checked });
                          toast({ title: checked ? "Workshop button visible" : "Workshop button hidden" });
                        }}
                      />
                    </div>
                    {settings.workshop_button.enabled && (
                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs">Button Label</Label>
                          <Input
                            value={settings.workshop_button.label}
                            onChange={async (e) => {
                              await updateSetting("workshop_button", { ...settings.workshop_button, label: e.target.value });
                            }}
                            placeholder="Workshop"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Button URL</Label>
                          <Input
                            value={settings.workshop_button.url}
                            onChange={async (e) => {
                              await updateSetting("workshop_button", { ...settings.workshop_button, url: e.target.value });
                            }}
                            placeholder="https://..."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Admin Profile */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="font-display text-lg">Admin Profile</CardTitle>
                  {!editingAdminProfile ? (
                    <Button variant="outline" size="sm" onClick={() => { setAdminEditData(adminProfile || {}); setEditingAdminProfile(true); }} className="font-sans"><Edit2 className="w-4 h-4 mr-1" />Edit</Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveAdminProfile} className="font-sans bg-primary hover:bg-primary/90"><Save className="w-4 h-4 mr-1" />Save</Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingAdminProfile(false)}><X className="w-4 h-4" /></Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {editingAdminProfile ? (
                    <>
                      <div><Label>Name</Label><Input value={adminEditData.full_name || ""} onChange={(e) => setAdminEditData({ ...adminEditData, full_name: e.target.value })} /></div>
                      <div><Label>Email (read-only)</Label><Input value={adminProfile?.email || ""} disabled className="opacity-60" /></div>
                      <div><Label>Mobile</Label><Input value={adminEditData.mobile || ""} onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 10) setAdminEditData({ ...adminEditData, mobile: d }); }} maxLength={10} /></div>
                    </>
                  ) : adminProfile ? (
                    <div className="space-y-2 font-sans text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{adminProfile.full_name}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium">{adminProfile.email}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Mobile</span><span className="font-medium">{adminProfile.mobile}</span></div>
                    </div>
                  ) : <p className="text-muted-foreground font-sans text-sm">Loading...</p>}
                </CardContent>
              </Card>

              {/* Add New Admin */}
              <Card>
                <CardHeader><CardTitle className="font-display text-lg flex items-center gap-2"><UserPlus className="w-5 h-5 text-primary" />Add New Admin</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div><Label>Full Name *</Label><Input value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} placeholder="Admin name" /></div>
                  <div><Label>Email *</Label><Input type="email" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} placeholder="admin@email.com" /></div>
                  <div><Label>Mobile *</Label><Input value={newAdminMobile} onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 10) setNewAdminMobile(d); }} maxLength={10} placeholder="10 digits" /></div>
                  <div><Label>Password *</Label><Input type="password" value={newAdminPassword} onChange={(e) => setNewAdminPassword(e.target.value)} placeholder="Min 6 characters" /></div>
                  <Button onClick={addNewAdmin} disabled={!newAdminEmail || !newAdminPassword || !newAdminName || !newAdminMobile || addingAdmin} className="w-full rounded-full font-sans bg-primary hover:bg-primary/90">
                    {addingAdmin ? "Adding Admin..." : "Add Admin"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Negotiate Price Dialog */}
      {negotiateOrderId && (
        <div className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4" onClick={() => setNegotiateOrderId(null)}>
          <Card className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <CardHeader><CardTitle className="font-display text-lg">Set Custom Price</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="font-sans">Negotiated Amount (₹)</Label>
                <Input type="number" value={negotiatedAmount} onChange={(e) => setNegotiatedAmount(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveNegotiatedAmount} className="flex-1 font-sans"><Save className="w-4 h-4 mr-1" />Save</Button>
                <Button variant="ghost" onClick={() => setNegotiateOrderId(null)} className="font-sans">Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-md border-t border-border">
        <div className="flex items-center overflow-x-auto py-2 px-1 gap-1">
          <AdminBottomNavItem icon={Package} label="Orders" active={activeTab === "orders"} onClick={() => setActiveTab("orders")} />
          <AdminBottomNavItem icon={CalIcon} label="Events" active={activeTab === "events"} onClick={() => setActiveTab("events")} />
          <AdminBottomNavItem icon={Receipt} label="Payments" active={activeTab === "payments"} onClick={() => setActiveTab("payments")} />
          <AdminBottomNavItem icon={Users} label="Evt Users" active={activeTab === "event-users"} onClick={() => setActiveTab("event-users")} />
          <AdminBottomNavItem icon={DollarSign} label="Pricing" active={activeTab === "pricing"} onClick={() => setActiveTab("pricing")} />
          <AdminBottomNavItem icon={Users} label="Users" active={activeTab === "customers"} onClick={() => setActiveTab("customers")} />
          <AdminBottomNavItem icon={Package} label="Artists" active={activeTab === "artists"} onClick={() => setActiveTab("artists")} />
          <AdminBottomNavItem icon={BarChart3} label="Stats" active={activeTab === "analytics"} onClick={() => setActiveTab("analytics")} />
          <AdminBottomNavItem icon={Star} label="Reviews" active={activeTab === "reviews"} onClick={() => setActiveTab("reviews")} />
          <AdminBottomNavItem icon={MessageCircle} label="Chat" active={activeTab === "chat"} onClick={() => setActiveTab("chat")} />
          <AdminBottomNavItem icon={MessageCircle} label="Leads" active={activeTab === "live-leads"} onClick={() => setActiveTab("live-leads")} />
          <AdminBottomNavItem icon={MapPin} label="Location" active={activeTab === "locations"} onClick={() => setActiveTab("locations")} />
          <AdminBottomNavItem icon={Settings} label="Settings" active={activeTab === "settings"} onClick={() => setActiveTab("settings")} />
        </div>
      </div>
    </div>
  );
};

const AdminBottomNavItem = ({ icon: Icon, label, active, onClick }: { icon: any; label: string; active: boolean; onClick: () => void }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all flex-shrink-0 ${active ? "text-primary-foreground bg-primary shadow-md scale-105" : "text-muted-foreground hover:text-foreground"}`}>
    <Icon className="w-5 h-5" />
    <span className="text-[10px] font-sans font-medium whitespace-nowrap">{label}</span>
  </button>
);

const EventUsersTab = () => {
  const [eventUsers, setEventUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});

  useEffect(() => {
    fetchEventUsers();
  }, []);

  const fetchEventUsers = async () => {
    const { data } = await supabase.from("event_bookings")
      .select("id, client_name, client_email, client_mobile, client_instagram, event_type, event_date, city, state, total_price, advance_amount, payment_status, status, created_at")
      .order("created_at", { ascending: false });
    if (data) {
      const uniqueUsers = new Map<string, any>();
      data.forEach((ev: any) => {
        if (!uniqueUsers.has(ev.client_email)) {
          uniqueUsers.set(ev.client_email, { ...ev, event_count: 1 });
        } else {
          uniqueUsers.get(ev.client_email).event_count++;
        }
      });
      setEventUsers(Array.from(uniqueUsers.values()));
    }
    setLoading(false);
  };

  const saveEventUserEdit = async () => {
    if (!editingId) return;
    await supabase.from("event_bookings").update({
      client_name: editData.client_name,
      client_mobile: editData.client_mobile,
      client_instagram: editData.client_instagram || null,
    } as any).eq("id", editingId);
    toast({ title: "Event User Updated!" });
    setEditingId(null);
    fetchEventUsers();
  };

  if (loading) return <p className="text-center text-muted-foreground py-10 font-sans">Loading...</p>;

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold">Event Customers ({eventUsers.length})</h2>
      {eventUsers.length === 0 ? (
        <Card><CardContent className="p-8 text-center"><p className="text-muted-foreground font-sans">No event customers yet</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {eventUsers.map((u: any) => (
            <Card key={u.client_email}>
              <CardContent className="p-4">
                {editingId === u.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs">Name</Label><Input value={editData.client_name || ""} onChange={e => setEditData({...editData, client_name: e.target.value})} /></div>
                      <div><Label className="text-xs">Mobile</Label><Input value={editData.client_mobile || ""} onChange={e => { const d = e.target.value.replace(/\D/g,""); if(d.length<=10) setEditData({...editData, client_mobile: d}); }} maxLength={10} /></div>
                    </div>
                    <div><Label className="text-xs">Email (read-only)</Label><Input value={u.client_email} disabled className="opacity-60" /></div>
                    <div><Label className="text-xs">Instagram</Label><Input value={editData.client_instagram || ""} onChange={e => setEditData({...editData, client_instagram: e.target.value})} /></div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveEventUserEdit} className="font-sans"><Save className="w-4 h-4 mr-1" />Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 flex-1 min-w-0">
                      <p className="font-sans font-semibold">{u.client_name}</p>
                      <p className="text-xs text-muted-foreground font-sans">{u.client_email} · +91{u.client_mobile}</p>
                      {u.client_instagram && <p className="text-xs text-muted-foreground font-sans">IG: {u.client_instagram}</p>}
                      <p className="text-xs text-muted-foreground font-sans">{u.city}, {u.state}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <Badge variant="outline" className="text-[10px]">{u.event_count} Event{u.event_count > 1 ? "s" : ""}</Badge>
                        <Badge className={`border-none text-[10px] ${u.payment_status === "confirmed" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                          Last: {u.payment_status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <p className="font-display font-bold text-primary">{formatPrice(u.total_price)}</p>
                      <Button variant="ghost" size="sm" onClick={() => { setEditingId(u.id); setEditData(u); }}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Admin;
