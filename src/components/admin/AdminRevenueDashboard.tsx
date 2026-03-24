import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/pricing";
import { DollarSign, TrendingUp, CreditCard, Receipt, Package, Calendar, ShoppingBag, Percent, ArrowUp, ArrowDown, X, Eye } from "lucide-react";
import { AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

const COLORS = ["hsl(22, 78%, 52%)", "hsl(210, 62%, 48%)", "hsl(152, 55%, 40%)", "hsl(280, 55%, 55%)", "hsl(38, 88%, 50%)"];

const AdminRevenueDashboard = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [shopOrders, setShopOrders] = useState<any[]>([]);
  const [drilldown, setDrilldown] = useState<{ title: string; data: any[]; columns: { key: string; label: string }[] } | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const [o, e, s] = await Promise.all([
        supabase.from("orders").select("id, amount, negotiated_amount, payment_status, status, created_at, caricature_type, customer_name, customer_email"),
        supabase.from("event_bookings").select("id, total_price, advance_amount, payment_status, status, created_at, negotiated, negotiated_total, negotiated_advance, remaining_amount, client_name, city, event_date"),
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
  const eventRemaining = events.filter(e => e.remaining_amount && e.remaining_amount > 0).reduce((s, e) => s + (e.remaining_amount || 0), 0);
  const avgOrderValue = confirmedOrders.length > 0 ? Math.round(orderRevenue / confirmedOrders.length) : 0;
  const paidRatio = (confirmedOrders.length + paidEvents.length);
  const unpaidRatio = (orders.length - confirmedOrders.length) + (events.length - paidEvents.length);
  const totalTx = paidRatio + unpaidRatio;

  const getMonthlyData = () => {
    const months: Record<string, { orders: number; events: number; shop: number }> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = { orders: 0, events: 0, shop: 0 };
    }
    confirmedOrders.forEach(o => { const key = o.created_at?.substring(0, 7); if (months[key]) months[key].orders += (o.negotiated_amount || o.amount); });
    paidEvents.forEach(e => { const key = e.created_at?.substring(0, 7); if (months[key]) months[key].events += (e.negotiated && e.negotiated_total ? e.negotiated_total : e.total_price); });
    paidShop.forEach((s: any) => { const key = s.created_at?.substring(0, 7); if (months[key]) months[key].shop += (s.total_amount || 0); });
    return Object.entries(months).map(([k, v]) => ({ month: new Date(k + "-01").toLocaleDateString("en-IN", { month: "short" }), ...v, total: v.orders + v.events + v.shop }));
  };
  const monthlyData = getMonthlyData();
  const categoryData = [{ name: "Caricatures", value: orderRevenue }, { name: "Events", value: eventRevenue }, { name: "Shop", value: shopRevenue }].filter(d => d.value > 0);
  const monthlyBookings = () => {
    const months: Record<string, { orders: number; events: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; months[key] = { orders: 0, events: 0 }; }
    orders.forEach(o => { const key = o.created_at?.substring(0, 7); if (months[key]) months[key].orders++; });
    events.forEach(e => { const key = e.created_at?.substring(0, 7); if (months[key]) months[key].events++; });
    return Object.entries(months).map(([k, v]) => ({ month: new Date(k + "-01").toLocaleDateString("en-IN", { month: "short" }), ...v }));
  };

  const openDrilldown = (type: string) => {
    const cols = [
      { key: "name", label: "Name" }, { key: "amount", label: "Amount" },
      { key: "status", label: "Status" }, { key: "date", label: "Date" },
    ];
    let data: any[] = [];
    let title = "";
    switch (type) {
      case "total": title = "All Revenue Transactions"; data = [
        ...confirmedOrders.map(o => ({ name: o.customer_name || o.customer_email, amount: formatPrice(o.negotiated_amount || o.amount), status: "Paid", date: new Date(o.created_at).toLocaleDateString() })),
        ...paidEvents.map(e => ({ name: e.client_name, amount: formatPrice(e.negotiated_total || e.total_price), status: "Paid", date: new Date(e.created_at).toLocaleDateString() })),
      ]; break;
      case "pending": title = "Pending Revenue"; data = [
        ...orders.filter(o => o.payment_status !== "confirmed").map(o => ({ name: o.customer_name || "Order", amount: formatPrice(o.amount), status: o.payment_status || "pending", date: new Date(o.created_at).toLocaleDateString() })),
        ...events.filter(e => !["confirmed", "fully_paid"].includes(e.payment_status)).map(e => ({ name: e.client_name, amount: formatPrice(e.negotiated_total || e.total_price), status: e.payment_status, date: new Date(e.created_at).toLocaleDateString() })),
      ]; break;
      case "caricature": title = "Caricature Revenue"; data = confirmedOrders.map(o => ({ name: o.customer_name || o.customer_email, amount: formatPrice(o.negotiated_amount || o.amount), status: o.caricature_type, date: new Date(o.created_at).toLocaleDateString() })); break;
      case "event": title = "Event Revenue"; data = paidEvents.map(e => ({ name: e.client_name, amount: formatPrice(e.negotiated_total || e.total_price), status: e.city, date: e.event_date })); break;
      case "advances": title = "Event Advances Collected"; data = events.filter(e => ["confirmed", "fully_paid", "partial_1_paid", "partial_2_paid"].includes(e.payment_status))
        .map(e => ({ name: e.client_name, amount: formatPrice(e.negotiated_advance || e.advance_amount), status: e.payment_status, date: e.event_date })); break;
      case "collect": title = "Amounts to Collect"; data = events.filter(e => e.remaining_amount > 0)
        .map(e => ({ name: e.client_name, amount: formatPrice(e.remaining_amount), status: e.payment_status, date: e.event_date })); break;
      default: return;
    }
    setDrilldown({ title, data, columns: cols });
  };

  const stats = [
    { icon: DollarSign, label: "Total Revenue", value: formatPrice(totalRevenue), gradient: "from-emerald-50 to-green-50", iconBg: "from-emerald-500 to-green-500", border: "border-l-emerald-500", drill: "total" },
    { icon: TrendingUp, label: "Pending", value: formatPrice(totalPending), gradient: "from-amber-50 to-orange-50", iconBg: "from-amber-500 to-orange-500", border: "border-l-amber-500", drill: "pending" },
    { icon: Package, label: "Caricature Rev", value: formatPrice(orderRevenue), gradient: "from-blue-50 to-indigo-50", iconBg: "from-blue-500 to-indigo-500", border: "border-l-blue-500", drill: "caricature" },
    { icon: Calendar, label: "Event Rev", value: formatPrice(eventRevenue), gradient: "from-indigo-50 to-violet-50", iconBg: "from-indigo-500 to-violet-500", border: "border-l-indigo-500", drill: "event" },
    { icon: ShoppingBag, label: "Shop Rev", value: formatPrice(shopRevenue), gradient: "from-purple-50 to-violet-50", iconBg: "from-purple-500 to-violet-500", border: "border-l-purple-500", drill: "" },
    { icon: Receipt, label: "Avg Order", value: formatPrice(avgOrderValue), gradient: "from-teal-50 to-cyan-50", iconBg: "from-teal-500 to-cyan-500", border: "border-l-teal-500", drill: "" },
    { icon: CreditCard, label: "Event Advances", value: formatPrice(eventAdvances), gradient: "from-cyan-50 to-sky-50", iconBg: "from-cyan-500 to-sky-500", border: "border-l-cyan-500", drill: "advances" },
    { icon: ArrowDown, label: "To Collect", value: formatPrice(eventRemaining), gradient: "from-red-50 to-rose-50", iconBg: "from-red-500 to-rose-500", border: "border-l-red-500", drill: "collect" },
    { icon: Percent, label: "Paid Ratio", value: totalTx > 0 ? `${Math.round((paidRatio / totalTx) * 100)}%` : "0%", gradient: "from-green-50 to-emerald-50", iconBg: "from-green-500 to-emerald-500", border: "border-l-green-500", drill: "" },
  ];

  return (
    <div className="space-y-6">
      {/* 3D Widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.03, type: "spring", stiffness: 300, damping: 25 }}
            whileHover={{ y: -5, scale: 1.04 }}
            onClick={() => s.drill && openDrilldown(s.drill)}
            className={`cursor-pointer ${s.drill ? "" : "cursor-default"}`}>
            <div className={`admin-widget-3d bg-gradient-to-br ${s.gradient} border-l-4 ${s.border}`}>
              <div className="p-3 relative">
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.iconBg} flex items-center justify-center shadow-lg`}>
                    <s.icon className="w-4 h-4 text-white" />
                  </div>
                  {s.drill && <Eye className="w-3 h-3 text-muted-foreground/50" />}
                </div>
                <p className="text-lg font-extrabold text-foreground leading-tight truncate">{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-sans mt-0.5 font-medium">{s.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Revenue Growth (12 Months)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatPrice(v)} />
                <Area type="monotone" dataKey="orders" stackId="1" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.3} name="Caricatures" />
                <Area type="monotone" dataKey="events" stackId="1" stroke={COLORS[1]} fill={COLORS[1]} fillOpacity={0.3} name="Events" />
                <Area type="monotone" dataKey="shop" stackId="1" stroke={COLORS[2]} fill={COLORS[2]} fillOpacity={0.3} name="Shop" />
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Revenue by Category</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart><Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><Tooltip formatter={(v: number) => formatPrice(v)} /></PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Monthly Bookings</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyBookings()}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} />
                <Tooltip /><Bar dataKey="orders" fill={COLORS[0]} name="Orders" radius={[4, 4, 0, 0]} /><Bar dataKey="events" fill={COLORS[1]} name="Events" radius={[4, 4, 0, 0]} /><Legend />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Payment Status */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Payment Status Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Paid Orders", value: confirmedOrders.length, bg: "bg-emerald-50 border-emerald-200/50", text: "text-emerald-700", bold: "text-emerald-800" },
              { label: "Pending Orders", value: orders.length - confirmedOrders.length, bg: "bg-amber-50 border-amber-200/50", text: "text-amber-700", bold: "text-amber-800" },
              { label: "Paid Events", value: paidEvents.length, bg: "bg-blue-50 border-blue-200/50", text: "text-blue-700", bold: "text-blue-800" },
              { label: "Pending Events", value: events.length - paidEvents.length, bg: "bg-red-50 border-red-200/50", text: "text-red-700", bold: "text-red-800" },
            ].map(s => (
              <div key={s.label} className={`p-3 rounded-lg ${s.bg} border`}>
                <p className={`text-xs ${s.text} font-medium`}>{s.label}</p>
                <p className={`text-xl font-bold ${s.bold}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Drilldown Dialog */}
      <Dialog open={!!drilldown} onOpenChange={() => setDrilldown(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader><DialogTitle className="font-display">{drilldown?.title}</DialogTitle></DialogHeader>
          <ScrollArea className="h-[60vh]">
            <Table>
              <TableHeader><TableRow>{drilldown?.columns.map(c => <TableHead key={c.key} className="font-sans text-xs">{c.label}</TableHead>)}</TableRow></TableHeader>
              <TableBody>
                {drilldown?.data.length === 0 ? (
                  <TableRow><TableCell colSpan={drilldown.columns.length} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>
                ) : drilldown?.data.map((row, i) => (
                  <TableRow key={i}>{drilldown.columns.map(c => <TableCell key={c.key} className="font-sans text-sm">{row[c.key]}</TableCell>)}</TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRevenueDashboard;
