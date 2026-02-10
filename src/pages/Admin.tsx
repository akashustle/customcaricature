import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPrice } from "@/lib/pricing";
import { LogOut, Search, Eye, BarChart3, Package } from "lucide-react";
import OrderDetail from "@/components/admin/OrderDetail";
import AdminAnalytics from "@/components/admin/AdminAnalytics";

type Order = {
  id: string;
  caricature_type: string;
  order_type: string;
  customer_name: string;
  city: string | null;
  amount: number;
  is_framed: boolean | null;
  status: string;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  artwork_ready: "bg-purple-100 text-purple-800",
  dispatched: "bg-orange-100 text-orange-800",
  delivered: "bg-green-100 text-green-800",
  completed: "bg-green-200 text-green-900",
};

const STATUS_LABELS: Record<string, string> = {
  new: "New Order",
  in_progress: "In Progress",
  artwork_ready: "Artwork Ready",
  dispatched: "Dispatched",
  delivered: "Delivered",
  completed: "Completed",
};

const Admin = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    fetchOrders();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
      return;
    }
    // Check role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);
    if (!roles || roles.length === 0) {
      await supabase.auth.signOut();
      navigate("/login");
    }
  };

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("id, caricature_type, order_type, customer_name, city, amount, is_framed, status, created_at")
      .order("created_at", { ascending: false });
    if (!error && data) setOrders(data);
    setLoading(false);
  };

  const updateStatus = async (orderId: string, status: string) => {
    await supabase.from("orders").update({ status: status as any }).eq("id", orderId);
    fetchOrders();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const filtered = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (typeFilter !== "all" && o.caricature_type !== typeFilter) return false;
    if (search && !o.customer_name.toLowerCase().includes(search.toLowerCase()) && !o.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (selectedOrder) {
    return <OrderDetail orderId={selectedOrder} onBack={() => { setSelectedOrder(null); fetchOrders(); }} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-display text-xl font-bold">Creative Caricature Club — Admin</h1>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="font-sans">
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="orders">
          <TabsList className="mb-6">
            <TabsTrigger value="orders" className="font-sans"><Package className="w-4 h-4 mr-2" />Orders</TabsTrigger>
            <TabsTrigger value="analytics" className="font-sans"><BarChart3 className="w-4 h-4 mr-2" />Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or order ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 font-sans"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 font-sans"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40 font-sans"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="digital">Digital</SelectItem>
                  <SelectItem value="physical">Physical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-sans">Order ID</TableHead>
                      <TableHead className="font-sans">Type</TableHead>
                      <TableHead className="font-sans">Customer</TableHead>
                      <TableHead className="font-sans">City</TableHead>
                      <TableHead className="font-sans">Amount</TableHead>
                      <TableHead className="font-sans">Frame</TableHead>
                      <TableHead className="font-sans">Status</TableHead>
                      <TableHead className="font-sans">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-10 font-sans text-muted-foreground">Loading...</TableCell></TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-10 font-sans text-muted-foreground">No orders found</TableCell></TableRow>
                    ) : (
                      filtered.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-xs">{order.id.slice(0, 8).toUpperCase()}</TableCell>
                          <TableCell className="font-sans capitalize">{order.caricature_type}</TableCell>
                          <TableCell className="font-sans">{order.customer_name}</TableCell>
                          <TableCell className="font-sans">{order.city || "—"}</TableCell>
                          <TableCell className="font-sans font-medium">{formatPrice(order.amount)}</TableCell>
                          <TableCell className="font-sans">{order.caricature_type === "physical" ? (order.is_framed ? "Yes" : "No") : "—"}</TableCell>
                          <TableCell>
                            <Select value={order.status} onValueChange={(v) => updateStatus(order.id, v)}>
                              <SelectTrigger className="h-8 w-36">
                                <Badge className={`${STATUS_COLORS[order.status] || ""} border-none text-xs`}>
                                  {STATUS_LABELS[order.status] || order.status}
                                </Badge>
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                                  <SelectItem key={k} value={k}>{v}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order.id)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <AdminAnalytics orders={orders} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
