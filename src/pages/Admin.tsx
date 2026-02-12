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
import { LogOut, Search, Eye, BarChart3, Package, Trash2, AlertTriangle } from "lucide-react";
import OrderDetail from "@/components/admin/OrderDetail";
import AdminAnalytics from "@/components/admin/AdminAnalytics";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Order = {
  id: string;
  caricature_type: string;
  order_type: string;
  customer_name: string;
  city: string | null;
  amount: number;
  is_framed: boolean | null;
  status: string;
  payment_status: string | null;
  priority: number | null;
  created_at: string;
  expected_delivery_date: string | null;
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

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
};

const PAYMENT_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-green-100 text-green-800",
};

const Admin = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    fetchOrders();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/customcad75");
      return;
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);
    if (!roles || roles.length === 0) {
      await supabase.auth.signOut();
      navigate("/customcad75");
    }
  };

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("id, caricature_type, order_type, customer_name, city, amount, is_framed, status, payment_status, priority, created_at, expected_delivery_date")
      .order("created_at", { ascending: false });
    if (!error && data) setOrders(data as any);
    setLoading(false);
  };

  const updateStatus = async (orderId: string, status: string) => {
    if (!confirm(`Change order status to "${STATUS_LABELS[status]}"?`)) return;
    await supabase.from("orders").update({ status: status as any }).eq("id", orderId);
    toast({ title: "Status Updated", description: `Order status changed to ${STATUS_LABELS[status]}` });
    fetchOrders();
  };

  const updatePaymentStatus = async (orderId: string, paymentStatus: string) => {
    if (!confirm(`Change payment status to "${PAYMENT_STATUS_LABELS[paymentStatus]}"?`)) return;
    await supabase.from("orders").update({ payment_status: paymentStatus } as any).eq("id", orderId);
    toast({ title: "Payment Status Updated", description: `Payment status changed to ${PAYMENT_STATUS_LABELS[paymentStatus]}` });
    fetchOrders();
  };

  const deleteOrder = async (orderId: string) => {
    const { error } = await supabase.from("orders").delete().eq("id", orderId);
    if (error) {
      toast({ title: "Error", description: "Cannot delete order. Admin permissions required.", variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: "Order deleted successfully" });
      fetchOrders();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/customcad75");
  };

  const filtered = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (search && !o.customer_name.toLowerCase().includes(search.toLowerCase()) && !o.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getDaysRemaining = (order: Order) => {
    if (!order.expected_delivery_date) {
      const orderDate = new Date(order.created_at);
      const dueDate = new Date(orderDate);
      dueDate.setDate(dueDate.getDate() + 30);
      const remaining = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return remaining;
    }
    const due = new Date(order.expected_delivery_date);
    return Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  if (selectedOrder) {
    return <OrderDetail orderId={selectedOrder} onBack={() => { setSelectedOrder(null); fetchOrders(); }} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="CCC" className="w-8 h-8 rounded-full" />
            <h1 className="font-display text-lg md:text-xl font-bold">Admin Panel</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="font-sans">
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="orders">
          <TabsList className="mb-6 w-full md:w-auto">
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
                <SelectTrigger className="w-full md:w-40 font-sans"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mobile Cards / Desktop Table */}
            <div className="block md:hidden space-y-3">
              {loading ? (
                <p className="text-center text-muted-foreground font-sans py-10">Loading...</p>
              ) : filtered.length === 0 ? (
                <p className="text-center text-muted-foreground font-sans py-10">No orders found</p>
              ) : (
                filtered.map((order) => {
                  const daysLeft = getDaysRemaining(order);
                  return (
                    <Card key={order.id} className={daysLeft <= 10 && !["delivered", "completed"].includes(order.status) ? "border-destructive/50" : ""}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-sans font-semibold">{order.customer_name}</p>
                            <p className="font-mono text-xs text-muted-foreground">{order.id.slice(0, 8).toUpperCase()}</p>
                          </div>
                          <p className="font-sans font-medium text-primary">{formatPrice(order.amount)}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge className={`${STATUS_COLORS[order.status] || ""} border-none text-xs`}>
                            {STATUS_LABELS[order.status] || order.status}
                          </Badge>
                          <Badge className={`${PAYMENT_COLORS[order.payment_status || "pending"]} border-none text-xs`}>
                            Pay: {PAYMENT_STATUS_LABELS[order.payment_status || "pending"]}
                          </Badge>
                          {daysLeft <= 10 && !["delivered", "completed"].includes(order.status) && (
                            <Badge className="bg-red-100 text-red-800 border-none text-xs">
                              <AlertTriangle className="w-3 h-3 mr-1" />{daysLeft}d left
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Select value={order.status} onValueChange={(v) => updateStatus(order.id, v)}>
                            <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={order.payment_status || "pending"} onValueChange={(v) => updatePaymentStatus(order.id, v)}>
                            <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => setSelectedOrder(order.id)}>
                            <Eye className="w-4 h-4 mr-1" /> View
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm"><Trash2 className="w-4 h-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Order?</AlertDialogTitle>
                                <AlertDialogDescription>This will permanently delete this order.</AlertDialogDescription>
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
            <Card className="hidden md:block">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-sans">Order ID</TableHead>
                      <TableHead className="font-sans">Customer</TableHead>
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
                      <TableRow><TableCell colSpan={8} className="text-center py-10 font-sans text-muted-foreground">Loading...</TableCell></TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-10 font-sans text-muted-foreground">No orders found</TableCell></TableRow>
                    ) : (
                      filtered.map((order) => {
                        const daysLeft = getDaysRemaining(order);
                        return (
                          <TableRow key={order.id} className={daysLeft <= 10 && !["delivered", "completed"].includes(order.status) ? "bg-red-50/50" : ""}>
                            <TableCell className="font-mono text-xs">{order.id.slice(0, 8).toUpperCase()}</TableCell>
                            <TableCell className="font-sans">{order.customer_name}</TableCell>
                            <TableCell className="font-sans">{order.city || "—"}</TableCell>
                            <TableCell className="font-sans font-medium">{formatPrice(order.amount)}</TableCell>
                            <TableCell className="font-sans">
                              {daysLeft <= 10 && !["delivered", "completed"].includes(order.status) ? (
                                <span className="text-destructive font-semibold flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />{daysLeft}d
                                </span>
                              ) : (
                                <span>{daysLeft}d</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Select value={order.payment_status || "pending"} onValueChange={(v) => updatePaymentStatus(order.id, v)}>
                                <SelectTrigger className="h-8 w-28">
                                  <Badge className={`${PAYMENT_COLORS[order.payment_status || "pending"]} border-none text-xs`}>
                                    {PAYMENT_STATUS_LABELS[order.payment_status || "pending"]}
                                  </Badge>
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => (
                                    <SelectItem key={k} value={k}>{v}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
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
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order.id)}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Order?</AlertDialogTitle>
                                      <AlertDialogDescription>This will permanently delete this order and cannot be undone.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deleteOrder(order.id)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
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

          <TabsContent value="analytics">
            <AdminAnalytics orders={orders} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
