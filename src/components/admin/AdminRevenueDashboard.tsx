import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/pricing";
import { DollarSign, TrendingUp, CreditCard, Receipt, Package, Calendar, ShoppingBag, Percent, ArrowUp, ArrowDown } from "lucide-react";
import { AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from "recharts";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COLORS = ["hsl(22, 78%, 52%)", "hsl(210, 62%, 48%)", "hsl(152, 55%, 40%)", "hsl(280, 55%, 55%)", "hsl(38, 88%, 50%)"];

const AdminRevenueDashboard = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [shopOrders, setShopOrders] = useState<any[]>([]);
  const [period, setPeriod] = useState("yearly");

  useEffect(() => {
    const fetch = async () => {
      const [o, e, s] = await Promise.all([
        supabase.from("orders").select("id, amount, negotiated_amount, payment_status, status, created_at, caricature_type"),
        supabase.from("event_bookings").select("id, total_price, advance_amount, payment_status, status, created_at, negotiated, negotiated_total, negotiated_advance, remaining_amount"),
        supabase.from("shop_orders" as any).select("id, total_amount, payment_status, created_at"),
      ]);
      if (o.data) setOrders(o.data);
      if (e.data) setEvents(e.data);
      if (s.data) setShopOrders(s.data as any[]);
    };
    fetch();
    const ch = supabase.channel("revenue-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, fetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "event_bookings" }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Revenue calculations
  const confirmedOrders = orders.filter(o => o.payment_status === "confirmed");
  const orderRevenue = confirmedOrders.reduce((s, o) => s + (o.negotiated_amount || o.amount), 0);
  
  const paidEvents = events.filter(e => ["confirmed", "fully_paid"].includes(e.payment_status));
  const eventRevenue = paidEvents.reduce((s, e) => s + (e.negotiated && e.negotiated_total ? e.negotiated_total : e.total_price), 0);
  
  const paidShop = shopOrders.filter((s: any) => s.payment_status === "paid");
  const shopRevenue = paidShop.reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
  
  const totalRevenue = orderRevenue + eventRevenue + shopRevenue;
  
  const pendingOrderRev = orders.filter(o => o.payment_status !== "confirmed").reduce((s, o) => s + o.amount, 0);
  const pendingEventRev = events.filter(e => !["confirmed", "fully_paid"].includes(e.payment_status)).reduce((s, e) => s + (e.negotiated && e.negotiated_total ? e.negotiated_total : e.total_price), 0);
  const totalPending = pendingOrderRev + pendingEventRev;

  const eventAdvances = events.filter(e => ["confirmed", "fully_paid", "partial_1_paid", "partial_2_paid"].includes(e.payment_status))
    .reduce((s, e) => s + (e.negotiated && e.negotiated_advance ? e.negotiated_advance : e.advance_amount), 0);
  const eventRemaining = events.filter(e => e.remaining_amount && e.remaining_amount > 0)
    .reduce((s, e) => s + (e.remaining_amount || 0), 0);

  const avgOrderValue = confirmedOrders.length > 0 ? Math.round(orderRevenue / confirmedOrders.length) : 0;
  const paidRatio = (confirmedOrders.length + paidEvents.length);
  const unpaidRatio = (orders.length - confirmedOrders.length) + (events.length - paidEvents.length);
  const totalTx = paidRatio + unpaidRatio;

  // Monthly revenue data
  const getMonthlyData = () => {
    const months: Record<string, { orders: number; events: number; shop: number }> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = { orders: 0, events: 0, shop: 0 };
    }
    confirmedOrders.forEach(o => {
      const key = o.created_at?.substring(0, 7);
      if (months[key]) months[key].orders += (o.negotiated_amount || o.amount);
    });
    paidEvents.forEach(e => {
      const key = e.created_at?.substring(0, 7);
      if (months[key]) months[key].events += (e.negotiated && e.negotiated_total ? e.negotiated_total : e.total_price);
    });
    paidShop.forEach((s: any) => {
      const key = s.created_at?.substring(0, 7);
      if (months[key]) months[key].shop += (s.total_amount || 0);
    });
    return Object.entries(months).map(([k, v]) => ({
      month: new Date(k + "-01").toLocaleDateString("en-IN", { month: "short" }),
      ...v,
      total: v.orders + v.events + v.shop,
    }));
  };

  const monthlyData = getMonthlyData();

  // Category split for pie
  const categoryData = [
    { name: "Custom Caricatures", value: orderRevenue },
    { name: "Events", value: eventRevenue },
    { name: "Shop", value: shopRevenue },
  ].filter(d => d.value > 0);

  // Monthly bookings
  const monthlyBookings = () => {
    const months: Record<string, { orders: number; events: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = { orders: 0, events: 0 };
    }
    orders.forEach(o => {
      const key = o.created_at?.substring(0, 7);
      if (months[key]) months[key].orders++;
    });
    events.forEach(e => {
      const key = e.created_at?.substring(0, 7);
      if (months[key]) months[key].events++;
    });
    return Object.entries(months).map(([k, v]) => ({
      month: new Date(k + "-01").toLocaleDateString("en-IN", { month: "short" }),
      ...v,
    }));
  };

  const stats = [
    { icon: DollarSign, label: "Total Revenue", value: formatPrice(totalRevenue), color: "text-emerald-600", bg: "bg-emerald-50" },
    { icon: TrendingUp, label: "Pending", value: formatPrice(totalPending), color: "text-amber-600", bg: "bg-amber-50" },
    { icon: Package, label: "Caricature Rev", value: formatPrice(orderRevenue), color: "text-blue-600", bg: "bg-blue-50" },
    { icon: Calendar, label: "Event Rev", value: formatPrice(eventRevenue), color: "text-indigo-600", bg: "bg-indigo-50" },
    { icon: ShoppingBag, label: "Shop Rev", value: formatPrice(shopRevenue), color: "text-purple-600", bg: "bg-purple-50" },
    { icon: Receipt, label: "Avg Order", value: formatPrice(avgOrderValue), color: "text-teal-600", bg: "bg-teal-50" },
    { icon: CreditCard, label: "Event Advances", value: formatPrice(eventAdvances), color: "text-cyan-600", bg: "bg-cyan-50" },
    { icon: ArrowDown, label: "To Collect", value: formatPrice(eventRemaining), color: "text-red-600", bg: "bg-red-50" },
    { icon: Percent, label: "Paid Ratio", value: totalTx > 0 ? `${Math.round((paidRatio / totalTx) * 100)}%` : "0%", color: "text-green-600", bg: "bg-green-50" },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className="border border-border/60 hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center`}>
                    <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                  </div>
                </div>
                <p className="text-lg font-bold leading-tight">{s.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Revenue Growth Line Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Revenue Growth (12 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatPrice(v)} />
                <Area type="monotone" dataKey="orders" stackId="1" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.3} name="Caricatures" />
                <Area type="monotone" dataKey="events" stackId="1" stroke={COLORS[1]} fill={COLORS[1]} fillOpacity={0.3} name="Events" />
                <Area type="monotone" dataKey="shop" stackId="1" stroke={COLORS[2]} fill={COLORS[2]} fillOpacity={0.3} name="Shop" />
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Split Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Revenue by Category</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatPrice(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Bookings Bar Chart */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Monthly Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyBookings()}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="orders" fill={COLORS[0]} name="Orders" radius={[4, 4, 0, 0]} />
                <Bar dataKey="events" fill={COLORS[1]} name="Events" radius={[4, 4, 0, 0]} />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Payment Status Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Payment Status Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200/50">
              <p className="text-xs text-emerald-700 font-medium">Paid Orders</p>
              <p className="text-xl font-bold text-emerald-800">{confirmedOrders.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200/50">
              <p className="text-xs text-amber-700 font-medium">Pending Orders</p>
              <p className="text-xl font-bold text-amber-800">{orders.length - confirmedOrders.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200/50">
              <p className="text-xs text-blue-700 font-medium">Paid Events</p>
              <p className="text-xl font-bold text-blue-800">{paidEvents.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-red-50 border border-red-200/50">
              <p className="text-xs text-red-700 font-medium">Pending Events</p>
              <p className="text-xl font-bold text-red-800">{events.length - paidEvents.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRevenueDashboard;
